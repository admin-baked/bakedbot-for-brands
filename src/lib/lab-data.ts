/**
 * Lab Data — Server-side data fetching for the public lab results directory.
 *
 * Reads from Firestore `lab_results_public` collection (denormalized, cross-tenant).
 * Each document = one publicly visible COA lab result.
 * Used by /lab-results index and /lab-results/[slug] pages (ISR cached).
 */

import { getAdminFirestore } from '@/firebase/admin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LabResultSummary {
  slug: string;
  strainName: string;
  productName: string;
  brandName: string;
  labName: string;
  testDate: string;
  totalThc: number | null;
  totalCbd: number | null;
  totalTerpenes: number | null;
  safetyPassed: boolean;
  category: string | null; // indica, sativa, hybrid
  state: string | null;
  source: string;
}

export interface LabResultDetail extends LabResultSummary {
  batchNumber: string | null;
  terpenes: Array<{ name: string; percentage: number }>;
  cannabinoids: Record<string, { value: number; unit: string }>;
  pesticides: { passed: boolean; details?: string } | null;
  heavyMetals: { passed: boolean; details?: string } | null;
  microbials: { passed: boolean; details?: string } | null;
  residualSolvents: { passed: boolean; details?: string } | null;
  coaUrl: string | null;
  metrcTag: string | null;
  orgId: string;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

function labCollection() {
  return getAdminFirestore().collection('lab_results_public');
}

// ---------------------------------------------------------------------------
// Index queries
// ---------------------------------------------------------------------------

export interface LabResultFilters {
  strain?: string;
  lab?: string;
  minThc?: number;
  state?: string;
  terpene?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 24;

export async function fetchLabResults(filters: LabResultFilters = {}): Promise<{
  results: LabResultSummary[];
  total: number;
}> {
  const pageSize = Math.min(filters.pageSize || DEFAULT_PAGE_SIZE, 100);

  try {
    let query: FirebaseFirestore.Query = labCollection();

    if (filters.lab) {
      query = query.where('labName', '==', filters.lab);
    }
    if (filters.state) {
      query = query.where('state', '==', filters.state.toUpperCase());
    }
    if (filters.minThc != null) {
      query = query.where('totalThc', '>=', filters.minThc);
    }

    // Get total count (separate query)
    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    // Get paginated results
    query = query
      .orderBy('testDate', 'desc')
      .limit(pageSize);

    const snap = await query.get();
    const results: LabResultSummary[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        slug: doc.id,
        strainName: d.strainName || '',
        productName: d.productName || '',
        brandName: d.brandName || '',
        labName: d.labName || '',
        testDate: d.testDate || '',
        totalThc: d.totalThc ?? null,
        totalCbd: d.totalCbd ?? null,
        totalTerpenes: d.totalTerpenes ?? null,
        safetyPassed: d.safetyPassed ?? true,
        category: d.category || null,
        state: d.state || null,
        source: d.source || 'unknown',
      };
    });

    // Client-side strain filter (Firestore can't do substring match)
    const filtered = filters.strain
      ? results.filter((r) =>
          r.strainName.toLowerCase().includes(filters.strain!.toLowerCase()) ||
          r.productName.toLowerCase().includes(filters.strain!.toLowerCase())
        )
      : results;

    return { results: filtered, total };
  } catch {
    return { results: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Detail query
// ---------------------------------------------------------------------------

export async function fetchLabResultBySlug(slug: string): Promise<LabResultDetail | null> {
  try {
    const doc = await labCollection().doc(slug).get();
    if (!doc.exists) return null;

    const d = doc.data()!;
    return {
      slug: doc.id,
      strainName: d.strainName || '',
      productName: d.productName || '',
      brandName: d.brandName || '',
      labName: d.labName || '',
      testDate: d.testDate || '',
      totalThc: d.totalThc ?? null,
      totalCbd: d.totalCbd ?? null,
      totalTerpenes: d.totalTerpenes ?? null,
      safetyPassed: d.safetyPassed ?? true,
      category: d.category || null,
      state: d.state || null,
      source: d.source || 'unknown',
      batchNumber: d.batchNumber || null,
      terpenes: d.terpenes || [],
      cannabinoids: d.cannabinoids || {},
      pesticides: d.pesticides || null,
      heavyMetals: d.heavyMetals || null,
      microbials: d.microbials || null,
      residualSolvents: d.residualSolvents || null,
      coaUrl: d.coaUrl || null,
      metrcTag: d.metrcTag || null,
      orgId: d.orgId || '',
      publishedAt: d.publishedAt || '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lab directory (unique lab names)
// ---------------------------------------------------------------------------

export async function fetchLabDirectory(): Promise<Array<{ name: string; slug: string; count: number }>> {
  try {
    const snap = await labCollection().select('labName').get();
    const labCounts: Record<string, number> = {};
    for (const doc of snap.docs) {
      const name = doc.data().labName;
      if (name) labCounts[name] = (labCounts[name] || 0) + 1;
    }
    return Object.entries(labCounts)
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Publisher: write COA result to public directory
// ---------------------------------------------------------------------------

export interface PublishLabResultInput {
  orgId: string;
  brandName: string;
  strainName: string;
  productName: string;
  category?: string;
  state?: string;
  labName: string;
  testDate: string;
  batchNumber?: string;
  totalThc?: number;
  totalCbd?: number;
  totalTerpenes?: number;
  terpenes?: Array<{ name: string; percentage: number }>;
  cannabinoids?: Record<string, { value: number; unit: string }>;
  safetyPassed: boolean;
  pesticides?: { passed: boolean; details?: string };
  heavyMetals?: { passed: boolean; details?: string };
  microbials?: { passed: boolean; details?: string };
  residualSolvents?: { passed: boolean; details?: string };
  coaUrl?: string;
  metrcTag?: string;
}

function generateSlug(strainName: string, batchNumber?: string): string {
  const base = strainName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '')
    .slice(0, 50);
  const hash = batchNumber
    ? batchNumber.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()
    : Math.random().toString(36).slice(2, 10);
  return `${base}-${hash}`;
}

export async function publishLabResult(input: PublishLabResultInput): Promise<string> {
  const slug = generateSlug(input.strainName || input.productName, input.batchNumber);

  await labCollection().doc(slug).set({
    ...input,
    slug,
    safetyPassed: input.safetyPassed,
    publishedAt: new Date().toISOString(),
    // Pre-computed JSON-LD for zero-cost rendering
    structuredData: buildLabResultJsonLd(slug, input),
  });

  return slug;
}

// ---------------------------------------------------------------------------
// Schema.org JSON-LD
// ---------------------------------------------------------------------------

export function buildLabResultJsonLd(slug: string, r: PublishLabResultInput | LabResultDetail): object {
  const terps = ('terpenes' in r && Array.isArray(r.terpenes)) ? r.terpenes : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${r.strainName || r.productName} Lab Results${r.batchNumber ? ` — Batch ${r.batchNumber}` : ''}`,
    description: `Certificate of Analysis for ${r.strainName || r.productName}. ${r.totalThc != null ? `THC: ${r.totalThc}%` : ''}${r.totalCbd != null ? `, CBD: ${r.totalCbd}%` : ''}. Tested by ${r.labName}.`,
    url: `https://bakedbot.ai/lab-results/${slug}`,
    datePublished: r.testDate,
    creator: {
      '@type': 'Organization',
      name: r.labName,
    },
    variableMeasured: [
      r.totalThc != null && { '@type': 'PropertyValue', name: 'Total THC', value: r.totalThc, unitText: 'percent' },
      r.totalCbd != null && { '@type': 'PropertyValue', name: 'Total CBD', value: r.totalCbd, unitText: 'percent' },
      ...terps.map((t) => ({ '@type': 'PropertyValue', name: t.name, value: t.percentage, unitText: 'percent' })),
    ].filter(Boolean),
  };
}
