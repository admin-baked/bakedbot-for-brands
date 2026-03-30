/**
 * Brand Guide Server Actions
 *
 * Server actions for managing brand guides from client components.
 */

'use server';

import { getAdminFirestore, getAdminStorage } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { makeBrandGuideRepo } from '@/server/repos/brandGuideRepo';
import { getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';
import { getBrandVoiceAnalyzer } from '@/server/services/brand-voice-analyzer';
import { enrichBrandGuide } from '@/server/services/brand-guide-enricher';
import { generateBrandImagesForNewAccount } from '@/server/actions/brand-images';
import { getTemplateById, getAllTemplates } from '@/lib/brand-guide-templates';
import { validateBrandPalette } from '@/lib/accessibility-checker';
import { callClaude } from '@/ai/claude';
import type {
  BrandAsset,
  BrandGuide,
  BrandGuideCompetitorSuggestion,
  CreateBrandGuideInput,
  UpdateBrandGuideInput,
  ExtractBrandGuideFromUrlInput,
  BrandGuideTemplate,
  BrandVoiceABTest,
  BrandAuditReport,
} from '@/types/brand-guide';
import { BRAND_ARCHETYPES, type ArchetypeId } from '@/constants/brand-archetypes';
import { logger } from '@/lib/logger';
import { discoverCompetitorsByLocation } from '@/server/services/ezal/competitor-discovery';
import { searchEntities } from '@/server/actions/discovery-search';
import { isRetailCannabisOrganization } from '@/lib/brand-guide-utils';

const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  'District of Columbia': 'DC',
  Illinois: 'IL',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Missouri: 'MO',
  Montana: 'MT',
  Nevada: 'NV',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  Virginia: 'VA',
  Vermont: 'VT',
  Washington: 'WA',
};

const scheduleBackgroundTask = (callback: () => void) => {
  if (typeof setImmediate === 'function') {
    setImmediate(callback);
    return;
  }

  setTimeout(callback, 0);
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeStateAbbreviation(state?: string): string | undefined {
  const cleaned = cleanString(state);
  if (!cleaned) return undefined;
  if (/^[A-Za-z]{2}$/.test(cleaned)) return cleaned.toUpperCase();
  return STATE_ABBREVIATIONS[cleaned] || cleaned;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function inferCompetitorType({
  websiteTitle,
  messaging,
}: {
  websiteTitle?: string;
  messaging?: Record<string, unknown>;
}): 'dispensary' | 'brand' | 'company' {
  const organizationType = cleanString(messaging?.organizationType);
  const businessModel = cleanString(messaging?.businessModel);
  const dispensaryType = cleanString(messaging?.dispensaryType);
  const titleBlob = `${websiteTitle || ''} ${cleanString(messaging?.positioning) || ''}`.toLowerCase();

  if (
    organizationType === 'technology_platform'
    || businessModel === 'saas_ai_platform'
    || businessModel === 'services'
    || /(software|saas|platform|artificial intelligence|\bai\b|automation|crm|analytics|technology)/.test(titleBlob)
  ) {
    return 'company';
  }

  if (dispensaryType || organizationType === 'dispensary') return 'dispensary';

  if (/(dispensary|adult-use|recreational|medical cannabis|cannabis menu|shop weed|dispensary menu)/.test(titleBlob)) {
    return 'dispensary';
  }

  if (
    organizationType === 'cannabis_brand'
    || businessModel === 'product_brand'
    || /(cannabis brand|product brand|flower|pre-roll|vape|edible|wellness brand)/.test(titleBlob)
  ) {
    return 'brand';
  }

  return 'company';
}

function dedupeSuggestions(
  suggestions: BrandGuideCompetitorSuggestion[],
  ownHost: string | null,
  limit: number
): BrandGuideCompetitorSuggestion[] {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const suggestionHost = getHostname(suggestion.url);
    if (!suggestionHost || suggestionHost === ownHost) return false;
    if (seen.has(suggestionHost)) return false;
    seen.add(suggestionHost);
    return true;
  }).slice(0, limit);
}

async function buildBrandCompetitorSuggestions(params: {
  url: string;
  brandName?: string;
  city?: string;
  state?: string;
  limit: number;
  type: 'brand' | 'company';
}): Promise<BrandGuideCompetitorSuggestion[]> {
  const { url, brandName, city, state, limit, type } = params;
  const ownHost = getHostname(url);
  const query = [brandName, city, state].filter(Boolean).join(' ').trim()
    || ownHost
    || (type === 'company' ? 'cannabis technology company' : 'cannabis brand');
  const result = await searchEntities(query, type);

  if (!result.success) {
    logger.warn('[extractBrandGuideFromUrl] Non-dispensary competitor search failed', {
      query,
      type,
      error: result.error,
    });
    return [];
  }

  return dedupeSuggestions(
    result.data.map((entity) => ({
      id: entity.id,
      name: entity.name,
      url: entity.url,
      type,
      city,
      state,
      description: entity.description,
      source: 'website_scan' as const,
    })),
    ownHost,
    limit
  );
}

async function buildDispensaryCompetitorSuggestions(params: {
  brandId?: string;
  url: string;
  brandName?: string;
  city?: string;
  state?: string;
  limit: number;
}): Promise<BrandGuideCompetitorSuggestion[]> {
  const { brandId, url, brandName, city, state, limit } = params;
  const ownHost = getHostname(url);
  const normalizedCity = cleanString(city);
  const normalizedState = normalizeStateAbbreviation(state);

  if (normalizedCity && normalizedState) {
    const discovery = await discoverCompetitorsByLocation(brandId || 'brand-guide-scan', {
      city: normalizedCity,
      state: normalizedState,
      orgName: brandName,
      maxResults: Math.max(limit * 2, limit),
    });

    const directSuggestions = discovery.discovered
      .filter((candidate) => candidate.isDirect)
      .map((candidate) => ({
        id: candidate.existingId || candidate.domain,
        name: candidate.name,
        url: candidate.url,
        type: 'dispensary' as const,
        city: normalizedCity,
        state: normalizedState,
        description: candidate.snippet,
        source: 'website_scan' as const,
      }));

    const deduped = dedupeSuggestions(directSuggestions, ownHost, limit);
    if (deduped.length > 0) return deduped;
  }

  const fallbackQuery = [brandName, normalizedCity, normalizedState].filter(Boolean).join(' ').trim() || ownHost || 'dispensary';
  const fallback = await searchEntities(fallbackQuery, 'dispensary');

  if (!fallback.success) {
    logger.warn('[extractBrandGuideFromUrl] Dispensary fallback competitor search failed', {
      fallbackQuery,
      error: fallback.error,
    });
    return [];
  }

  return dedupeSuggestions(
    fallback.data.map((entity) => ({
      id: entity.id,
      name: entity.name,
      url: entity.url,
      type: 'dispensary' as const,
      city: normalizedCity,
      state: normalizedState,
      description: entity.description,
      source: 'website_scan' as const,
    })),
    ownHost,
    limit
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch a representative product image from the active catalog.
 * Dispensaries prefer Flower menu items; brands fall back to any valid product image.
 */
async function fetchFeaturedProductImage(
  brandId: string,
  options: { preferFlower: boolean }
): Promise<string | null> {
  const isValidImage = (url: unknown): url is string =>
    typeof url === 'string' &&
    url.startsWith('http') &&
    !url.includes('placeholder') &&
    !url.includes('/icon');

  const extractImageUrl = (data: Record<string, unknown>): string | null => {
    const imageUrl = data.imageUrl;
    if (isValidImage(imageUrl)) return imageUrl;

    const imageUrls = data.imageUrls;
    if (Array.isArray(imageUrls)) {
      const firstImageUrl = imageUrls.find(isValidImage);
      if (firstImageUrl) return firstImageUrl;
    }

    const images = data.images;
    if (Array.isArray(images)) {
      const firstImage = images.find(isValidImage);
      if (firstImage) return firstImage;
    }

    return null;
  };

  const scoreCandidate = (
    data: Record<string, unknown>,
    options: { preferFlower: boolean }
  ): number => {
    const imageUrl = extractImageUrl(data);
    if (!imageUrl) return -1;

    const context = [data.category, data.name, data.imageHint]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();

    let score = 100;
    if (options.preferFlower && context.includes('flower')) score += 50;
    if (!options.preferFlower && context.includes('product')) score += 10;
    if (data.featured === true) score += 15;

    const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : null;
    if (sortOrder !== null) {
      score += Math.max(0, 10 - sortOrder);
    }

    return score;
  };

  const pickBestImageFromDocs = (
    docs: Array<{ data(): Record<string, unknown> }>,
    options: { preferFlower: boolean }
  ): string | null => {
    let bestImageUrl: string | null = null;
    let bestScore = -1;

    for (const doc of docs) {
      const data = doc.data();
      const candidateScore = scoreCandidate(data, options);
      if (candidateScore <= bestScore) continue;

      const imageUrl = extractImageUrl(data);
      if (!imageUrl) continue;

      bestScore = candidateScore;
      bestImageUrl = imageUrl;
    }

    return bestImageUrl;
  };

  try {
    const firestore = getAdminFirestore();

    // The settings page passes the active orgId for dispensaries, but some legacy brand-guide
    // paths still pass a brand document ID. Query both shapes before falling back.
    const brandDoc = await firestore.collection('brands').doc(brandId).get();
    const brandOrgId = brandDoc.exists && typeof brandDoc.data()?.orgId === 'string'
      ? (brandDoc.data()?.orgId as string)
      : null;
    const orgIds = Array.from(new Set([brandId, brandOrgId].filter((value): value is string => Boolean(value))));

    const queryPlans: Array<() => Promise<{ docs: Array<{ data(): Record<string, unknown> }> }>> = [
      ...orgIds.map((orgId) => () =>
        firestore
          .collection('tenants').doc(orgId)
          .collection('publicViews').doc('products')
          .collection('items')
          .limit(5)
          .get()
      ),
      ...orgIds.map((orgId) => () =>
        firestore.collection('products').where('orgId', '==', orgId).limit(5).get()
      ),
      () =>
        firestore.collection('products').where('brandId', '==', brandId).limit(5).get(),
      ...orgIds.map((orgId) => () =>
        firestore.collection('products').where('retailerIds', 'array-contains', orgId).limit(5).get()
      ),
    ];

    for (const loadSnapshot of queryPlans) {
      const snapshot = await loadSnapshot();
      const featuredImage = pickBestImageFromDocs(snapshot.docs, options);
      if (featuredImage) return featuredImage;
    }

    return null;
  } catch (err) {
    logger.warn('[BrandGuide] fetchFeaturedProductImage failed', {
      brandId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function buildFeaturedImageAsset(
  brandId: string,
  imageUrl: string,
  options: { preferFlower: boolean }
): BrandAsset {
  return {
    id: `featured-image-${brandId}`,
    type: 'image',
    name: options.preferFlower ? 'Featured menu product image' : 'Featured brand product image',
    url: imageUrl,
    category: options.preferFlower ? 'Hero Images' : 'Product Photography',
    tags: ['brand-guide', 'featured'],
    uploadedBy: brandId,
    uploadedAt: new Date(),
  };
}

function normalizeFeaturedImageAssets(
  brandId: string,
  data: Partial<BrandGuide>
): Partial<BrandGuide> {
  const featuredImageUrl = data.visualIdentity?.imagery?.examples?.find(
    (example): example is string => typeof example === 'string' && example.startsWith('http')
  );

  if (!featuredImageUrl) {
    return data;
  }

  const preferFlower =
    data.messaging?.organizationType === 'dispensary'
    || Boolean(data.messaging?.dispensaryType);

  const featuredAsset = buildFeaturedImageAsset(brandId, featuredImageUrl, { preferFlower });
  const defaultTemplates = {
    instagram: [],
    instagramStory: [],
    facebook: [],
    twitter: [],
    email: [],
    printable: [],
  };

  return {
    ...data,
    assets: {
      ...data.assets,
      heroImages:
        data.assets?.heroImages && data.assets.heroImages.length > 0
          ? data.assets.heroImages
          : [featuredAsset],
      productPhotography: {
        style: data.assets?.productPhotography?.style || (preferFlower ? 'white-background' : 'lifestyle'),
        guidelines: data.assets?.productPhotography?.guidelines,
        examples:
          data.assets?.productPhotography?.examples && data.assets.productPhotography.examples.length > 0
            ? data.assets.productPhotography.examples
            : [featuredAsset],
      },
      templates: data.assets?.templates || defaultTemplates,
    },
  };
}

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new brand guide
 */
export async function createBrandGuide(
  input: CreateBrandGuideInput
): Promise<{ success: boolean; brandGuide?: BrandGuide; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    let brandGuideData: Partial<BrandGuide> = {
      brandId: input.brandId,
      brandName: input.brandName,
      createdBy: input.brandId, // TODO: Get from auth context
      status: 'draft',
    };

    // Handle different creation methods
    switch (input.method) {
      case 'url':
        if (!input.sourceUrl) {
          return { success: false, error: 'Source URL required for URL extraction' };
        }

        // Extract from URL
        const extractor = getBrandGuideExtractor();
        const extractionResult = await extractor.extractFromUrl({
          url: input.sourceUrl,
          socialHandles: input.socialHandles,
        });

        // Merge extracted data (may be partial)
        if (extractionResult.visualIdentity) {
          brandGuideData.visualIdentity = extractionResult.visualIdentity as any;
        }
        if (extractionResult.voice) {
          brandGuideData.voice = extractionResult.voice as any;
        }
        if (extractionResult.messaging) {
          brandGuideData.messaging = extractionResult.messaging as any;
        }
        brandGuideData.source = extractionResult.source;
        break;

      case 'template':
        if (!input.templateId) {
          return { success: false, error: 'Template ID required for template creation' };
        }

        // Load from template
        const template = getTemplateById(input.templateId as any);
        if (!template) {
          return { success: false, error: 'Template not found' };
        }

        // Apply template defaults (may be partial)
        if (template.defaults.visualIdentity) {
          brandGuideData.visualIdentity = template.defaults.visualIdentity as any;
        }
        if (template.defaults.voice) {
          brandGuideData.voice = template.defaults.voice as any;
        }
        if (template.defaults.messaging) {
          brandGuideData.messaging = template.defaults.messaging as any;
        }
        if (template.defaults.compliance) {
          brandGuideData.compliance = template.defaults.compliance as any;
        }
        brandGuideData.template = template.category;
        brandGuideData.source = {
          method: 'template',
          templateId: template.id,
        };
        break;

      case 'manual':
        // Use initial data if provided
        if (input.initialData) {
          brandGuideData = { ...brandGuideData, ...input.initialData };
        }
        break;
    }

    brandGuideData = normalizeFeaturedImageAssets(input.brandId, brandGuideData);

    // Create the brand guide
    const brandGuide = await repo.create(input.brandId, brandGuideData);

    // Create initial version
    await repo.createVersion(input.brandId, {
      version: 1,
      timestamp: new Date(),
      updatedBy: input.brandId,
      changes: [
        {
          field: 'initial',
          oldValue: null,
          newValue: 'created',
          reason: 'Initial creation',
        },
      ],
      snapshot: brandGuide,
      isActive: true,
    });

    // Kick off async enrichment (voice samples, audience, archetype, compliance)
    // Non-blocking — user doesn't wait; completes in background ~10-30s
    scheduleBackgroundTask(() => {
      enrichBrandGuide(input.brandId).catch(err =>
        logger.warn('[BrandGuide] Post-create enrichment failed', { error: (err as Error).message })
      );
    });

    // Pre-generate brand kit images (hero, product_bg, ambient, texture)
    // Only on first creation — idempotent, fire-and-forget
    scheduleBackgroundTask(() => {
      generateBrandImagesForNewAccount(input.brandId, brandGuide).catch(err =>
        logger.warn('[BrandGuide] Brand image pre-generation failed', { error: (err as Error).message })
      );
    });

    return { success: true, brandGuide };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to create brand guide', {
      error: errorMessage,
      stack: errorStack,
      input,
      brandId: input.brandId,
      method: input.method,
    });
    return {
      success: false,
      error: `Failed to create brand guide: ${errorMessage}`,
    };
  }
}

/** Convert a Firestore Timestamp, Date, or anything to a plain JS Date (safe to pass server→client). */
function tsToDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && 'seconds' in (val as object)) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

/** Strip all Firestore Timestamp instances so the object is serializable across the server→client boundary. */
function serializeBrandGuide(guide: BrandGuide): BrandGuide {
  return {
    ...guide,
    createdAt: tsToDate(guide.createdAt),
    lastUpdatedAt: tsToDate(guide.lastUpdatedAt),
    archetype: guide.archetype
      ? { ...guide.archetype, selected_at: tsToDate(guide.archetype.selected_at) as unknown as import('@google-cloud/firestore').Timestamp }
      : guide.archetype,
  };
}

/**
 * Get brand guide by ID
 */
export async function getBrandGuide(
  brandId: string
): Promise<{ success: boolean; brandGuide?: BrandGuide; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const brandGuide = await repo.getById(brandId);

    if (!brandGuide) {
      return { success: false, error: 'Brand guide not found' };
    }

    return { success: true, brandGuide: serializeBrandGuide(brandGuide) };
  } catch (error) {
    logger.error('Failed to get brand guide', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get brand guide',
    };
  }
}

/**
 * Update brand guide
 */
export async function updateBrandGuide(
  input: UpdateBrandGuideInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    // Get current guide for version history
    const current = await repo.getById(input.brandId);
    if (!current) {
      return { success: false, error: 'Brand guide not found' };
    }

    // Update the guide
    await repo.update(input.brandId, {
      ...input.updates,
      version: current.version + 1,
      lastUpdatedBy: input.brandId, // TODO: Get from auth context
    });

    // Create version history if requested
    if (input.createVersion) {
      // Calculate changes
      const changes = calculateChanges(current, input.updates);

      await repo.createVersion(input.brandId, {
        version: current.version + 1,
        timestamp: new Date(),
        updatedBy: input.brandId,
        changes,
        snapshot: { ...current, ...input.updates },
        isActive: true,
        tags: input.reason ? [input.reason] : undefined,
      });
    }

    // Re-run enrichment whenever the guide is updated (catches new fields from manual edits)
    scheduleBackgroundTask(() => {
      enrichBrandGuide(input.brandId).catch(err =>
        logger.warn('[BrandGuide] Post-update enrichment failed', { error: (err as Error).message })
      );
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update brand guide', { error, input });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update brand guide',
    };
  }
}

/**
 * Delete brand guide
 */
export async function deleteBrandGuide(
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    await repo.delete(brandId);

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete brand guide', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete brand guide',
    };
  }
}

// ============================================================================
// EXTRACTION & ANALYSIS
// ============================================================================

/**
 * Extract brand guide from URL
 */
export async function extractBrandGuideFromUrl(
  input: ExtractBrandGuideFromUrlInput
): Promise<{
  success: boolean;
  visualIdentity?: any;
  voice?: any;
  messaging?: any;
  metadata?: any;
  confidence?: number;
  websiteTitle?: string;
  suggestedArchetype?: ArchetypeId;
  competitorSuggestions?: BrandGuideCompetitorSuggestion[];
  featuredProductImage?: string;
  error?: string;
}> {
  try {
    const extractor = getBrandGuideExtractor();
    const result = await extractor.extractFromUrl(input);
    const messaging = (result.messaging || {}) as Record<string, unknown>;
    let competitorSuggestions: BrandGuideCompetitorSuggestion[] = [];

    const organizationType = cleanString(messaging.organizationType) as Parameters<typeof isRetailCannabisOrganization>[0];
    const dispensaryType = cleanString(messaging.dispensaryType);
    const preferFlowerImage = organizationType === 'dispensary' || Boolean(dispensaryType);

    // Run competitor analysis and product image fetch in parallel — independent operations
    const [competitorSuggestionsResult, featuredProductImage] = await Promise.all([
      input.includeCompetitorAnalysis
        ? (async () => {
            try {
              const competitorType = inferCompetitorType({ websiteTitle: result.websiteTitle, messaging });
              const brandName = cleanString(messaging.brandName);
              const city = cleanString(messaging.city);
              const state = cleanString(messaging.state);
              return competitorType === 'dispensary'
                ? buildDispensaryCompetitorSuggestions({ brandId: input.brandId, url: input.url, brandName, city, state, limit: 5 })
                : buildBrandCompetitorSuggestions({ url: input.url, brandName, city, state, limit: 5, type: competitorType });
            } catch (competitorError) {
              logger.warn('[extractBrandGuideFromUrl] Competitor suggestion lookup failed', {
                url: input.url,
                error: competitorError instanceof Error ? competitorError.message : String(competitorError),
              });
              return [];
            }
          })()
        : Promise.resolve([]),
      input.brandId && isRetailCannabisOrganization(organizationType, dispensaryType)
        ? fetchFeaturedProductImage(input.brandId, { preferFlower: preferFlowerImage })
        : Promise.resolve(null),
    ]);
    competitorSuggestions = competitorSuggestionsResult;

    logger.info('[extractBrandGuideFromUrl] Extraction result', {
      url: input.url,
      confidence: result.confidence,
      brandName: result.messaging?.brandName || '(none)',
      hasMetadata: !!result.metadata,
      metadataTitle: result.metadata?.title || '(none)',
      metadataDescription: (result.metadata?.description || '').substring(0, 120) || '(none)',
      websiteTitle: result.websiteTitle || '(none)',
      suggestedArchetype: result.suggestedArchetype || '(none)',
      competitorSuggestions: competitorSuggestions.length,
      featuredProductImage: featuredProductImage ? 'found' : 'none',
    });

    return {
      success: true,
      visualIdentity: result.visualIdentity,
      voice: result.voice,
      messaging: result.messaging,
      metadata: result.metadata,        // ← was missing; client reads metadata.description
      confidence: result.confidence,
      websiteTitle: result.websiteTitle,
      suggestedArchetype: result.suggestedArchetype,
      competitorSuggestions,
      featuredProductImage: featuredProductImage || undefined,
    };
  } catch (error) {
    logger.error('Failed to extract brand guide from URL', { error, input });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract brand guide',
    };
  }
}

/**
 * Analyze brand voice from content samples
 */
export async function analyzeBrandVoice(
  brandId: string,
  samples: Array<{
    type: 'website' | 'social' | 'email' | 'product' | 'blog';
    text: string;
    platform?: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'tiktok';
  }>
): Promise<{
  success: boolean;
  voice?: any;
  insights?: any;
  patterns?: any;
  error?: string;
}> {
  try {
    const analyzer = getBrandVoiceAnalyzer();
    const result = await analyzer.analyzeBrandVoice(samples, brandId);

    return {
      success: true,
      voice: result.voice,
      insights: result.insights,
      patterns: result.patterns,
    };
  } catch (error) {
    logger.error('Failed to analyze brand voice', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze brand voice',
    };
  }
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get all brand guide templates
 */
export async function getBrandGuideTemplates(): Promise<{
  success: boolean;
  templates?: BrandGuideTemplate[];
  error?: string;
}> {
  try {
    const templates = getAllTemplates();
    return { success: true, templates };
  } catch (error) {
    logger.error('Failed to get templates', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get templates',
    };
  }
}

/**
 * Apply template to brand guide
 */
export async function applyTemplate(
  brandId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = getTemplateById(templateId as any);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const updates: any = {
      template: template.category,
    };
    if (template.defaults.visualIdentity) updates.visualIdentity = template.defaults.visualIdentity;
    if (template.defaults.voice) updates.voice = template.defaults.voice;
    if (template.defaults.messaging) updates.messaging = template.defaults.messaging;
    if (template.defaults.compliance) updates.compliance = template.defaults.compliance;

    await repo.update(brandId, updates);

    return { success: true };
  } catch (error) {
    logger.error('Failed to apply template', { error, brandId, templateId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply template',
    };
  }
}

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Validate color palette accessibility
 */
export async function validateColorAccessibility(colors: {
  primary: any;
  secondary: any;
  accent: any;
  text: any;
  background: any;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  try {
    const result = validateBrandPalette(colors);
    return { success: true, result };
  } catch (error) {
    logger.error('Failed to validate colors', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate colors',
    };
  }
}

// ============================================================================
// VERSION HISTORY
// ============================================================================

/**
 * Get version history
 */
export async function getVersionHistory(
  brandId: string
): Promise<{ success: boolean; versions?: any[]; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const versions = await repo.getVersionHistory(brandId);

    // Strip snapshot (contains Timestamps) and oldValue/newValue from changes —
    // the UI only needs field names, not the full diffs, and snapshot is only
    // needed for rollback (fetched separately by rollbackToVersion).
    const serializable = versions.map(({ snapshot: _snap, ...v }) => ({
      version:   v.version,
      timestamp: v.timestamp instanceof Date ? v.timestamp.toISOString() : String(v.timestamp),
      updatedBy: v.updatedBy ?? '',
      isActive:  v.isActive ?? false,
      tags:      v.tags ?? [],
      changes:   (v.changes ?? []).map((c) => ({ field: c.field, reason: c.reason ?? '' })),
    }));

    return { success: true, versions: serializable };
  } catch (error) {
    logger.error('Failed to get version history', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get version history',
    };
  }
}

/**
 * Rollback to version
 */
export async function rollbackToVersion(
  brandId: string,
  version: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    await repo.rollbackToVersion(brandId, version);

    return { success: true };
  } catch (error) {
    logger.error('Failed to rollback version', { error, brandId, version });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback version',
    };
  }
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * Create A/B test
 */
export async function createABTest(
  brandId: string,
  test: Omit<BrandVoiceABTest, 'id'>
): Promise<{ success: boolean; testId?: string; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const testId = await repo.createABTest(brandId, test as BrandVoiceABTest);

    return { success: true, testId };
  } catch (error) {
    logger.error('Failed to create A/B test', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create A/B test',
    };
  }
}

/**
 * Get A/B tests
 */
export async function getABTests(
  brandId: string
): Promise<{ success: boolean; tests?: BrandVoiceABTest[]; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const tests = await repo.getABTests(brandId);

    return { success: true, tests };
  } catch (error) {
    logger.error('Failed to get A/B tests', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get A/B tests',
    };
  }
}

// ============================================================================
// AUDIT REPORTS
// ============================================================================

/**
 * Get latest audit report
 */
export async function getLatestAuditReport(
  brandId: string
): Promise<{ success: boolean; report?: BrandAuditReport; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const report = await repo.getLatestAuditReport(brandId);

    return { success: true, report: report || undefined };
  } catch (error) {
    logger.error('Failed to get audit report', { error, brandId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audit report',
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate changes between old and new data
 */
function calculateChanges(
  oldData: Partial<BrandGuide>,
  newData: Partial<BrandGuide>
): Array<{
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string;
}> {
  const changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }> = [];

  // Check top-level fields
  const fieldsToCheck: (keyof BrandGuide)[] = [
    'brandName',
    'visualIdentity',
    'voice',
    'messaging',
    'compliance',
    'status',
  ];

  for (const field of fieldsToCheck) {
    if (newData[field] !== undefined && newData[field] !== oldData[field]) {
      changes.push({
        field,
        oldValue: oldData[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

/**
 * Analyze competitor brand
 */
export async function analyzeCompetitorBrand(
  brandId: string,
  competitorUrl: string,
  competitorName?: string
): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    // Get current brand guide
    const currentBrand = await repo.getById(brandId);
    if (!currentBrand) {
      return { success: false, error: 'Brand guide not found' };
    }

    // Import analyzer
    const { getBrandCompetitorAnalyzer } = await import('@/server/services/brand-competitor-analyzer');
    const analyzer = getBrandCompetitorAnalyzer();

    // Analyze competitor
    const analysis = await analyzer.analyzeCompetitor({
      currentBrandGuide: currentBrand,
      competitorUrl,
      competitorName,
    });

    return { success: true, analysis };
  } catch (error) {
    logger.error('Failed to analyze competitor brand:', error as any);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze competitor',
    };
  }
}

/**
 * Batch analyze multiple competitors
 */
export async function analyzeCompetitorsBatch(
  brandId: string,
  competitors: Array<{ url: string; name?: string }>
): Promise<{ success: boolean; analyses?: any[]; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const currentBrand = await repo.getById(brandId);
    if (!currentBrand) {
      return { success: false, error: 'Brand guide not found' };
    }

    const { getBrandCompetitorAnalyzer } = await import('@/server/services/brand-competitor-analyzer');
    const analyzer = getBrandCompetitorAnalyzer();

    const analyses = await analyzer.analyzeCompetitors(currentBrand, competitors);

    return { success: true, analyses };
  } catch (error) {
    logger.error('Failed to batch analyze competitors:', error as any);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze competitors',
    };
  }
}

/**
 * Get list of brand guides for a brand (summary view)
 */
/**
 * Lightweight: fetch only the brand colors needed for dashboard theming.
 * Called on every dashboard load — must be fast.
 */
export async function getOrgBrandColors(
  orgId: string
): Promise<{ primary?: string; secondary?: string; accent?: string }> {
  if (!orgId) return {};
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    // getByBrandId returns all guides for the org; pick the active/latest one
    const guides = await repo.getByBrandId(orgId);
    if (!guides.length) return {};
    // Prefer active guide, then draft, then any
    const guide =
      guides.find(g => g.status === 'active') ||
      guides.find(g => g.status === 'draft') ||
      guides[0];
    const colors = guide?.visualIdentity?.colors;
    if (!colors) return {};
    return {
      primary: colors.primary?.hex || undefined,
      secondary: colors.secondary?.hex || undefined,
      accent: colors.accent?.hex || undefined,
    };
  } catch {
    return {};
  }
}

export async function getBrandGuidesList(
  brandId: string
): Promise<{ success: boolean; guides?: Array<{
  id: string;
  brandName: string;
  status: string;
  completenessScore: number;
}>; error?: string }> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);

    const guides = await repo.getByBrandId(brandId);

    // Return summary view
    const summaries = guides.map((guide) => ({
      id: guide.id,
      brandName: guide.brandName,
      status: guide.status,
      completenessScore: guide.completenessScore,
    }));

    return { success: true, guides: summaries };
  } catch (error) {
    logger.error('Failed to get brand guides list:', error as any);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get brand guides list',
    };
  }
}

// ============================================================================
// BRAND ARCHETYPE (Spec 01 — Brand Guide 2.0)
// ============================================================================

/**
 * Save brand archetype selection for a brand guide.
 * Validates primary/secondary combination before writing.
 */
export async function saveBrandArchetype(
  brandId: string,
  primary: ArchetypeId,
  secondary: ArchetypeId | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!BRAND_ARCHETYPES[primary]) {
      return { success: false, error: `Invalid archetype: ${primary}` };
    }
    if (secondary && !BRAND_ARCHETYPES[secondary]) {
      return { success: false, error: `Invalid secondary archetype: ${secondary}` };
    }
    if (secondary && secondary === primary) {
      return { success: false, error: 'Secondary must differ from primary' };
    }

    const firestore = getAdminFirestore();

    // Write archetype fields using dot-notation field paths to avoid Timestamp
    // serialization issues when passing nested objects through repo.update().
    // This mirrors the pattern used by recordScannerArchetypeSuggestion.
    await firestore.collection('brandGuides').doc(brandId).update({
      'archetype.primary': primary,
      'archetype.secondary': secondary ?? null,
      'archetype.selected_at': new Date(),
      'archetype.suggested_by_scanner': null,
    });

    logger.info('[BrandGuide] Archetype saved', { brandId, primary, secondary });
    return { success: true };
  } catch (error) {
    logger.error('[BrandGuide] saveBrandArchetype failed', {
      error: (error as Error).message,
      brandId,
    });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Record the website scanner's archetype suggestion without overwriting the user's selection.
 * Called internally by the brand guide extractor after a URL scan.
 */
export async function recordScannerArchetypeSuggestion(
  brandId: string,
  suggestedArchetype: ArchetypeId
): Promise<void> {
  try {
    const firestore = getAdminFirestore();
    // Use Firestore directly to merge only the suggested_by_scanner field
    await firestore.collection('brandGuides').doc(brandId).set(
      { archetype: { suggested_by_scanner: suggestedArchetype } },
      { merge: true }
    );
    logger.info('[BrandGuide] Scanner archetype suggestion recorded', { brandId, suggestedArchetype });
  } catch (error) {
    // Non-fatal — scanner suggestion is best-effort
    logger.warn('[BrandGuide] Failed to record scanner archetype suggestion', {
      error: (error as Error).message,
      brandId,
    });
  }
}

// ============================================================================
// MAGIC BUTTONS — AI-assisted content generation
// ============================================================================

/**
 * Resolve the best Claude model for an org based on subscription tier.
 * growth/empire → Sonnet (better brand copy quality, they're paying for it)
 * scout/pro/none → Haiku (fast, cheap, good enough)
 */
async function getModelForOrg(orgId: string): Promise<string> {
  try {
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('subscriptions').doc(orgId).get();
    const tierId = doc.exists ? (doc.data()?.tierId as string | undefined) : undefined;
    if (tierId === 'empire' || tierId === 'growth') {
      return 'claude-sonnet-4-6';
    }
  } catch {
    // Fall through to default
  }
  return 'claude-haiku-4-5-20251001';
}

/**
 * Generate brand messaging from existing brand guide context.
 * Only populates fields that are currently empty.
 */
export async function generateBrandMessagingContent(brandId: string): Promise<{
  success: boolean;
  messaging?: {
    tagline?: string;
    positioning?: string;
    missionStatement?: string;
    valuePropositions?: string[];
    keyMessages?: Array<{ audience: string; message: string; supportingPoints: string[] }>;
    brandStoryOrigin?: string;
  };
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    const [guide, model] = await Promise.all([repo.getById(brandId), getModelForOrg(brandId)]);
    if (!guide) return { success: false, error: 'Brand guide not found' };

    const name = guide.messaging?.brandName || (guide as any).metadata?.brandName || 'this brand';
    const archetypeId = guide.archetype?.primary as ArchetypeId | undefined;
    const archetype = archetypeId ? `${BRAND_ARCHETYPES[archetypeId]?.label} archetype` : null;
    const tone = guide.voice?.tone || 'professional';
    const personality = guide.voice?.personality?.join(', ') || null;
    const location = [guide.messaging?.city, guide.messaging?.state].filter(Boolean).join(', ');
    const orgType = (guide.messaging as any)?.organizationType || null;
    const existing = guide.messaging || {};

    const contextParts = [
      `Brand name: ${name}`,
      archetype && `Brand archetype: ${archetype}`,
      tone && `Voice tone: ${tone}`,
      personality && `Personality traits: ${personality}`,
      location && `Location: ${location}`,
      orgType && `Organization type: ${orgType}`,
      existing.positioning && `Existing positioning: ${existing.positioning}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are a cannabis brand strategist. Generate compelling brand messaging for the following brand.

BRAND CONTEXT:
${contextParts}

Generate ONLY fields that would be empty (I'll indicate which to generate):
- Generate: tagline (punchy, memorable, max 8 words)
- Generate: positioning statement (1-2 sentences, "For X, [Brand] is the Y that Z")
- Generate: mission statement (1-2 sentences starting with "Our mission is to...")
- Generate: 4 value propositions (short benefit statements, max 12 words each)
- Generate: 3 key messages for different audience segments
- Generate: brand origin story (2-3 sentences about what this brand stands for)

Cannabis industry context: avoid medical claims, focus on experience, community, quality, and education.

Return ONLY valid JSON in this exact structure:
{
  "tagline": "string",
  "positioning": "string",
  "missionStatement": "string",
  "valuePropositions": ["string", "string", "string", "string"],
  "keyMessages": [
    { "audience": "string", "message": "string" },
    { "audience": "string", "message": "string" },
    { "audience": "string", "message": "string" }
  ],
  "brandStoryOrigin": "string"
}`;

    const raw = await callClaude({ userMessage: prompt, maxTokens: 1000, model });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const generated = JSON.parse(jsonMatch[0]);

    logger.info('[BrandGuide] Messaging content generated', { brandId });
    return { success: true, messaging: generated };
  } catch (error) {
    logger.error('[BrandGuide] generateBrandMessagingContent failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate state-appropriate required disclaimers from existing compliance settings.
 */
export async function generateBrandDisclaimers(brandId: string): Promise<{
  success: boolean;
  disclaimers?: { age: string; health: string; legal: string };
  ageGateLanguage?: string;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    const [guide, model] = await Promise.all([repo.getById(brandId), getModelForOrg(brandId)]);
    if (!guide) return { success: false, error: 'Brand guide not found' };

    const primaryState = guide.compliance?.primaryState || 'CA';
    const operatingStates = guide.compliance?.operatingStates || [];
    const medicalClaims = guide.compliance?.medicalClaims || 'none';
    const brandName = guide.messaging?.brandName || 'this brand';
    const allStates = Array.from(new Set([primaryState, ...operatingStates])).join(', ');

    const prompt = `You are a cannabis compliance attorney. Generate required disclaimers for a cannabis brand operating in the following states.

Brand: ${brandName}
Operating states: ${allStates}
Medical claims policy: ${medicalClaims}

Generate the following for cannabis marketing in these states:

1. AGE DISCLAIMER — short, required on all marketing (1 sentence)
2. HEALTH DISCLAIMER — FDA-style disclaimer about not treating/curing conditions (2-3 sentences)
3. LEGAL DISCLAIMER — state-specific legal use disclaimer (1-2 sentences)
4. AGE GATE LANGUAGE — the prompt shown on the age verification gate before entering the website (1-2 sentences, e.g. "You must be 21 or older to enter...")

Be specific to the states listed. For NY: reference OCM. For CA: reference CDTFA/DCC. For CO: reference MED.

Return ONLY valid JSON:
{
  "age": "string",
  "health": "string",
  "legal": "string",
  "ageGateLanguage": "string"
}`;

    const raw = await callClaude({ userMessage: prompt, maxTokens: 600, model });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(jsonMatch[0]);
    const { ageGateLanguage, ...disclaimers } = parsed;

    logger.info('[BrandGuide] Disclaimers generated', { brandId, primaryState });
    return { success: true, disclaimers, ageGateLanguage: ageGateLanguage ?? '' };
  } catch (error) {
    logger.error('[BrandGuide] generateBrandDisclaimers failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Generate 4 branded sample social media posts (populates voice.sampleContent,
 * which is required for 100% completeness score).
 */
export async function generateSampleContent(brandId: string): Promise<{
  success: boolean;
  samples?: Array<{ type: string; text: string }>;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    const [guide, model] = await Promise.all([repo.getById(brandId), getModelForOrg(brandId)]);
    if (!guide) return { success: false, error: 'Brand guide not found' };

    const brandName = guide.messaging?.brandName || guide.brandName || 'this brand';
    const tone = guide.voice?.tone || 'professional';
    const archetype = guide.archetype?.primary || 'wellness';
    const tagline = guide.messaging?.tagline || '';
    const state = guide.compliance?.primaryState || 'NY';

    const prompt = `Generate 4 sample social media posts for a cannabis brand.

Brand: ${brandName}
Tone: ${tone}
Archetype: ${archetype}
Tagline: ${tagline}
State: ${state}

Create one post for each channel:
1. instagram — engaging, visual, with 3-5 relevant hashtags
2. email_subject — subject line for a weekly deals email (under 50 chars)
3. sms — short SMS marketing message (under 160 chars, include opt-out)
4. in_store_signage — short headline for in-store display (under 10 words)

All content must be compliant with ${state} cannabis marketing rules: no health claims, no appeal to minors, include age disclaimer where appropriate.

Return ONLY valid JSON array:
[
  { "type": "instagram", "text": "..." },
  { "type": "email_subject", "text": "..." },
  { "type": "sms", "text": "..." },
  { "type": "in_store_signage", "text": "..." }
]`;

    const raw = await callClaude({ userMessage: prompt, maxTokens: 800, model });
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in AI response');
    const samples = JSON.parse(jsonMatch[0]);

    logger.info('[BrandGuide] Sample content generated', { brandId, count: samples.length });
    return { success: true, samples };
  } catch (error) {
    logger.error('[BrandGuide] generateSampleContent failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Downloads an external logo URL and re-uploads it to Firebase Storage,
 * then updates the brand guide's visualIdentity.logo.primary with the new URL.
 */
export async function mirrorLogoToStorage(brandId: string, externalUrl: string): Promise<{
  success: boolean;
  storageUrl?: string;
  error?: string;
}> {
  try {
    if (!externalUrl || !externalUrl.startsWith('http')) {
      return { success: false, error: 'Invalid URL' };
    }

    // Download the image
    const response = await fetch(externalUrl);
    if (!response.ok) throw new Error(`Failed to fetch logo: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('svg') ? 'svg' : contentType.includes('webp') ? 'webp' : contentType.includes('jpeg') ? 'jpg' : 'png';

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket('bakedbot-global-assets');
    const filePath = `brands/${brandId}/logo/primary.${ext}`;
    const file = bucket.file(filePath);
    await file.save(buffer, { metadata: { contentType }, resumable: false });
    await file.makePublic();
    const storageUrl = `https://storage.googleapis.com/bakedbot-global-assets/${filePath}`;

    // Update brand guide
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    await repo.update(brandId, {
      visualIdentity: {
        logo: { primary: storageUrl },
      } as any,
    });

    logger.info('[BrandGuide] Logo mirrored to Storage', { brandId, storageUrl });
    return { success: true, storageUrl };
  } catch (error) {
    logger.error('[BrandGuide] mirrorLogoToStorage failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Suggest cannabis industry vocabulary terms based on brand archetype and tone.
 */
export async function suggestVocabularyTerms(brandId: string): Promise<{
  success: boolean;
  preferred?: Array<{ term: string; instead: string }>;
  avoid?: Array<{ term: string; reason: string }>;
  error?: string;
}> {
  try {
    const firestore = getAdminFirestore();
    const repo = makeBrandGuideRepo(firestore);
    const [guide, model] = await Promise.all([repo.getById(brandId), getModelForOrg(brandId)]);
    if (!guide) return { success: false, error: 'Brand guide not found' };

    const archetypeId2 = guide.archetype?.primary as ArchetypeId | undefined;
    const archetype = archetypeId2 ? BRAND_ARCHETYPES[archetypeId2]?.label : null;
    const tone = guide.voice?.tone || 'professional';
    const personality = guide.voice?.personality?.join(', ') || null;
    const orgType = (guide.messaging as any)?.organizationType || 'dispensary';

    const prompt = `You are a cannabis brand voice expert. Suggest vocabulary terms for a cannabis brand.

Brand tone: ${tone}
${archetype ? `Brand archetype: ${archetype}` : ''}
${personality ? `Personality: ${personality}` : ''}
Organization type: ${orgType}

Generate cannabis industry vocabulary guidance:
- 6 PREFERRED TERM PAIRS: terms to use vs what to say instead (cannabis terminology that fits this brand's voice)
- 5 TERMS TO AVOID: words/phrases to never use, with reasons (compliance/brand fit issues)

Examples of preferred pairs: "flower" instead of "marijuana weed", "pre-roll" instead of "joint"
Examples of avoid: "get high" (too casual/negative), "drug" (stigmatizing)

Tailor vocabulary to the brand's tone and archetype. For wellness/caregiver brands use clinical-adjacent terms. For rebel/streetwear use culture-forward terms.

Return ONLY valid JSON:
{
  "preferred": [
    { "term": "string", "instead": "string" },
    ...
  ],
  "avoid": [
    { "term": "string", "reason": "string" },
    ...
  ]
}`;

    const raw = await callClaude({ userMessage: prompt, maxTokens: 600, model });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const result = JSON.parse(jsonMatch[0]);

    logger.info('[BrandGuide] Vocabulary terms suggested', { brandId });
    return { success: true, preferred: result.preferred, avoid: result.avoid };
  } catch (error) {
    logger.error('[BrandGuide] suggestVocabularyTerms failed', { error: (error as Error).message, brandId });
    return { success: false, error: (error as Error).message };
  }
}
