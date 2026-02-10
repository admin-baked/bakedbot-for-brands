/**
 * Brand Guide Server Actions
 *
 * Server actions for managing brand guides from client components.
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { makeBrandGuideRepo } from '@/server/repos/brandGuideRepo';
import { getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';
import { getBrandVoiceAnalyzer } from '@/server/services/brand-voice-analyzer';
import { getTemplateById, getAllTemplates } from '@/lib/brand-guide-templates';
import { validateBrandPalette } from '@/lib/accessibility-checker';
import type {
  BrandGuide,
  CreateBrandGuideInput,
  UpdateBrandGuideInput,
  ExtractBrandGuideFromUrlInput,
  BrandGuideTemplate,
  BrandVoiceABTest,
  BrandAuditReport,
} from '@/types/brand-guide';
import { logger } from '@/lib/logger';

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

    return { success: true, brandGuide };
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
  confidence?: number;
  error?: string;
}> {
  try {
    const extractor = getBrandGuideExtractor();
    const result = await extractor.extractFromUrl(input);

    return {
      success: true,
      visualIdentity: result.visualIdentity,
      voice: result.voice,
      messaging: result.messaging,
      confidence: result.confidence,
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

    return { success: true, versions };
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
