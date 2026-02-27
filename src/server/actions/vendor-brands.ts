'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getBrandGuideExtractor } from '@/server/services/brand-guide-extractor';
import { logger } from '@/lib/logger';
import type { VendorBrand, VendorBrandContext } from '@/types/vendor-brands';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type VendorBrandActor = {
  uid: string;
  orgId?: string;
  currentOrgId?: string;
  brandId?: string;
};

function getOrgId(user: VendorBrandActor): string | null {
  return user.currentOrgId || user.orgId || user.brandId || null;
}

function isValidOrgId(orgId: string): boolean {
  return !!orgId && !orgId.includes('/');
}

function requireOrgId(user: VendorBrandActor, action: string): string {
  const orgId = getOrgId(user);
  if (!orgId || !isValidOrgId(orgId)) {
    throw new Error(`Missing organization context for ${action}`);
  }
  return orgId;
}

function normalizeUrl(input: string): string {
  const s = input.trim().toLowerCase();
  if (s.startsWith('http://') || s.startsWith('https://')) return input.trim();
  return `https://${input.trim()}`;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getVendorBrands(): Promise<VendorBrand[]> {
  try {
    const user = await requireUser([
      'dispensary', 'dispensary_admin', 'brand', 'brand_admin', 'super_user',
    ]);
    const orgId = requireOrgId(user as VendorBrandActor, 'getVendorBrands');
    const db = getAdminFirestore();

    const snap = await db
      .collection('tenants').doc(orgId)
      .collection('vendor_brands')
      .orderBy('name')
      .get();

    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        orgId,
        name: d.name,
        website: d.website,
        logoUrl: d.logoUrl,
        primaryColor: d.primaryColor,
        description: d.description,
        brandStory: d.brandStory,
        voiceKeywords: d.voiceKeywords,
        productLines: d.productLines,
        categories: d.categories,
        extractionConfidence: d.extractionConfidence,
        ingestedAt: d.ingestedAt?.toDate?.() ?? new Date(d.ingestedAt),
        lastUpdatedAt: d.lastUpdatedAt?.toDate?.() ?? new Date(d.lastUpdatedAt),
      } as VendorBrand;
    });
  } catch (err) {
    logger.warn('[VendorBrands] Failed to fetch vendor brands', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ─── Ingest ───────────────────────────────────────────────────────────────────

export async function ingestVendorBrand(
  website: string
): Promise<{ success: boolean; brand?: VendorBrand; error?: string }> {
  try {
    const user = await requireUser([
      'dispensary', 'dispensary_admin', 'brand', 'brand_admin', 'super_user',
    ]);
    const orgId = requireOrgId(user as VendorBrandActor, 'ingestVendorBrand');
    const url = normalizeUrl(website);

    logger.info('[VendorBrands] Ingesting vendor brand', { url, orgId });

    // Reuse the brand guide extraction pipeline
    const extractor = getBrandGuideExtractor();
    const result = await extractor.extractFromUrl({ url });

    // Map extraction result → slim VendorBrand profile
    const voiceKeywords: string[] = (result.voice?.personality ?? []).slice(0, 6);

    const categories: string[] = [];
    if (result.messaging?.brandName) {
      // Try to infer categories from description / text samples
    }

    const brand: Omit<VendorBrand, 'id'> = {
      orgId,
      name: result.messaging?.brandName
        ?? result.metadata?.title?.split('|')[0]?.split('–')[0]?.trim()
        ?? new URL(url).hostname.replace(/^www\./, '').split('.')[0],
      website: url,
      logoUrl: result.metadata?.ogImage ?? result.visualIdentity?.logo?.primary ?? undefined,
      primaryColor: (result.visualIdentity?.colors as any)?.primary?.hex ?? undefined,
      description: result.messaging?.tagline
        ?? result.metadata?.description
        ?? undefined,
      brandStory: result.messaging?.missionStatement
        ?? result.messaging?.positioning
        ?? undefined,
      voiceKeywords,
      productLines: [],  // Populated manually or on refresh
      categories,
      extractionConfidence: result.confidence,
      ingestedAt: new Date(),
      lastUpdatedAt: new Date(),
    };

    const db = getAdminFirestore();
    const colRef = db
      .collection('tenants').doc(orgId)
      .collection('vendor_brands');

    // Upsert by website domain to avoid duplicates
    const domain = new URL(url).hostname.replace(/^www\./, '');
    const existing = await colRef.where('website', '>=', domain).limit(5).get();
    const dup = existing.docs.find(d => {
      try { return new URL(d.data().website).hostname.replace(/^www\./, '') === domain; }
      catch { return false; }
    });

    let docId: string;
    if (dup) {
      docId = dup.id;
      await colRef.doc(docId).set(brand, { merge: false });
      logger.info('[VendorBrands] Updated existing vendor brand', { docId, name: brand.name });
    } else {
      const ref = await colRef.add(brand);
      docId = ref.id;
      logger.info('[VendorBrands] Created vendor brand', { docId, name: brand.name });
    }

    return { success: true, brand: { id: docId, ...brand } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[VendorBrands] Ingest failed', { website, error: msg });
    return { success: false, error: msg };
  }
}

// ─── Update (manual edits) ────────────────────────────────────────────────────

export async function updateVendorBrand(
  id: string,
  updates: Partial<Pick<VendorBrand, 'name' | 'description' | 'brandStory' | 'voiceKeywords' | 'productLines' | 'categories'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser([
      'dispensary', 'dispensary_admin', 'brand', 'brand_admin', 'super_user',
    ]);
    const orgId = requireOrgId(user as VendorBrandActor, 'updateVendorBrand');
    const db = getAdminFirestore();

    await db
      .collection('tenants').doc(orgId)
      .collection('vendor_brands').doc(id)
      .update({ ...updates, lastUpdatedAt: new Date() });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteVendorBrand(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser([
      'dispensary', 'dispensary_admin', 'brand', 'brand_admin', 'super_user',
    ]);
    const orgId = requireOrgId(user as VendorBrandActor, 'deleteVendorBrand');
    const db = getAdminFirestore();

    await db
      .collection('tenants').doc(orgId)
      .collection('vendor_brands').doc(id)
      .delete();

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Smokey context helper ────────────────────────────────────────────────────

/**
 * Returns a compact summary of all vendor brands for injection into
 * Smokey's system prompt. Call from buildBrandVoiceBrief() when needed.
 * Capped at 10 brands × ~100 tokens each to stay under context budget.
 */
export async function getVendorBrandSummary(orgId: string): Promise<VendorBrandContext[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tenants').doc(orgId)
      .collection('vendor_brands')
      .orderBy('name')
      .limit(10)
      .get();

    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        name: d.name,
        description: d.description,
        brandStory: d.brandStory,
        voiceKeywords: d.voiceKeywords,
        productLines: d.productLines,
        categories: d.categories,
      } as VendorBrandContext;
    });
  } catch {
    return [];
  }
}
