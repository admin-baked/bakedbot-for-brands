/**
 * Cannabis Science Knowledge Base — Search Tool
 *
 * Provides Smokey with research-backed answers from 400+ peer-reviewed
 * cannabis science papers via Supabase pgvector semantic search.
 */

import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// --- Gemini embedding for query ---
const EMBED_MODEL = 'gemini-embedding-001';

async function embedQuery(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${key}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: text.slice(0, 2048) }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini embed error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.embedding.values;
}

// --- Search types ---
interface ScienceSearchResult {
  question: string;
  answer: string;
  category: string;
  source_pdf: string;
  similarity: number;
}

// --- Tool definition (for agent harness) ---
export const cannabisScienceToolDef = {
  name: 'searchCannabisScience',
  description:
    'Search the cannabis science knowledge base for research-backed answers about terpenes, cannabinoids, effects, extraction methods, pharmacology, cultivation, and consumption. Use this when a customer asks WHY something works, or for science-backed product explanations. Returns peer-reviewed research summaries.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'Natural language question about cannabis science, e.g. "why does myrcene help with sleep" or "difference between live resin and distillate"'
      ),
    category: z
      .enum([
        'terpenes',
        'effects',
        'cannabinoids',
        'extraction',
        'pharmacology',
        'cultivation',
        'consumption',
        'safety',
      ])
      .optional()
      .describe('Optional: filter results to a specific category'),
    limit: z
      .number()
      .optional()
      .describe('Number of results to return (default 3, max 5)'),
  }),
};

// --- Tool implementation ---
export async function searchCannabisScience(
  query: string,
  category?: string,
  limit: number = 3
): Promise<ScienceSearchResult[]> {
  const maxResults = Math.min(limit, 5);

  try {
    // Generate query embedding
    const embedding = await embedQuery(query);

    // Call the Supabase RPC function
    const { data, error } = await getSupabase().rpc('search_cannabis_science', {
      query_embedding: JSON.stringify(embedding),
      match_count: category ? maxResults * 2 : maxResults, // fetch extra if filtering
      match_threshold: 0.45,
    });

    if (error) {
      logger.error('[CannabisScience] Search failed:', { error: error.message });
      return [];
    }

    let results = (data || []) as ScienceSearchResult[];

    // Apply category filter if specified
    if (category) {
      results = results.filter((r) => r.category === category);
    }

    return results.slice(0, maxResults).map((r) => ({
      question: r.question,
      answer: r.answer,
      category: r.category,
      source_pdf: r.source_pdf,
      similarity: Math.round(r.similarity * 100) / 100,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[CannabisScience] Search error:', { error: msg });
    return [];
  }
}

// --- Convenience: format results for agent context ---
export function formatScienceResults(results: ScienceSearchResult[]): string {
  if (results.length === 0) return 'No relevant cannabis science research found.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] (${r.category}, ${Math.round(r.similarity * 100)}% match)\nQ: ${r.question}\nA: ${r.answer}\nSource: ${r.source_pdf}`
    )
    .join('\n\n');
}

// ============================================================================
// STRAIN SEARCH — Leafly + Seed City (5,200 strains with effect/terpene data)
// ============================================================================

interface StrainSearchResult {
  name: string;
  category: string;
  description: string;
  thc_pct: number | null;
  cbd_pct: number | null;
  top_effect: string;
  flavors: string;
  terp_myrcene: number | null;
  terp_limonene: number | null;
  terp_caryophyllene: number | null;
  terp_linalool: number | null;
  terp_pinene: number | null;
  average_rating: number | null;
  review_count: number;
  similarity: number;
}

export const cannabisStrainsToolDef = {
  name: 'searchCannabisStrains',
  description:
    'Search the strain database (8,000+ strains from Leafly + Seed City) by effect, flavor, terpene profile, or name. Returns THC/CBD %, effects, terpenes, flavors, and ratings. Use this to recommend strains or answer "what strain is good for X?" questions.',
  schema: z.object({
    query: z
      .string()
      .describe('Natural language query, e.g. "relaxing indica for sleep" or "fruity sativa for creativity"'),
    limit: z.number().optional().describe('Results to return (default 5, max 10)'),
  }),
};

export async function searchCannabisStrains(
  query: string,
  limit: number = 5
): Promise<StrainSearchResult[]> {
  const maxResults = Math.min(limit, 10);
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await getSupabase().rpc('search_cannabis_strains', {
      query_embedding: JSON.stringify(embedding),
      match_count: maxResults,
      match_threshold: 0.35,
    });
    if (error) {
      logger.error('[StrainSearch] Failed:', { error: error.message });
      return [];
    }
    return (data || []) as StrainSearchResult[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[StrainSearch] Error:', { error: msg });
    return [];
  }
}

export function formatStrainResults(results: StrainSearchResult[]): string {
  if (results.length === 0) return 'No matching strains found.';
  return results
    .map((r, i) => {
      const terps = [
        r.terp_myrcene && `myrcene:${r.terp_myrcene.toFixed(2)}`,
        r.terp_limonene && `limonene:${r.terp_limonene.toFixed(2)}`,
        r.terp_caryophyllene && `caryophyllene:${r.terp_caryophyllene.toFixed(2)}`,
        r.terp_linalool && `linalool:${r.terp_linalool.toFixed(2)}`,
        r.terp_pinene && `pinene:${r.terp_pinene.toFixed(2)}`,
      ].filter(Boolean).join(', ');
      return `[${i + 1}] ${r.name} (${r.category}) — ${r.top_effect}\n  THC: ${r.thc_pct ?? '?'}% | CBD: ${r.cbd_pct ?? '?'}% | Rating: ${r.average_rating ?? '?'}/5 (${r.review_count} reviews)\n  Flavors: ${r.flavors || 'unknown'}\n  Terpenes: ${terps || 'unknown'}`;
    })
    .join('\n\n');
}

// ============================================================================
// LICENSE SEARCH — 5,800+ cannabis businesses across 20 states
// ============================================================================

export const cannabisLicensesToolDef = {
  name: 'searchCannabisLicenses',
  description:
    'Search licensed cannabis businesses across 20 US states. Filter by state, city, license type (retail, cultivation, manufacturing), or business name. Use for competitor mapping, prospecting, and market analysis.',
  schema: z.object({
    state: z.string().optional().describe('Two-letter state code, e.g. "NY", "CA"'),
    city: z.string().optional().describe('City name'),
    license_type: z.string().optional().describe('License type: retail, cultivation, manufacturing, etc.'),
    business_name: z.string().optional().describe('Business name search'),
    limit: z.number().optional().describe('Results to return (default 20, max 50)'),
  }),
};

interface LicenseResult {
  business_legal_name: string | null;
  business_dba_name: string | null;
  license_type: string | null;
  license_status: string | null;
  premise_city: string | null;
  premise_state: string | null;
  premise_street_address: string | null;
  business_website: string | null;
  business_phone: string | null;
}

export async function searchCannabisLicenses(
  state?: string,
  city?: string,
  licenseType?: string,
  businessName?: string,
  limit: number = 20
): Promise<LicenseResult[]> {
  const maxResults = Math.min(limit, 50);
  try {
    let query = getSupabase()
      .from('cannabis_licenses')
      .select('business_legal_name, business_dba_name, license_type, license_status, premise_city, premise_state, premise_street_address, business_website, business_phone');

    if (state) query = query.ilike('premise_state', state);
    if (city) query = query.ilike('premise_city', `%${city}%`);
    if (licenseType) query = query.ilike('license_type', `%${licenseType}%`);
    if (businessName) query = query.or(`business_legal_name.ilike.%${businessName}%,business_dba_name.ilike.%${businessName}%`);

    const { data, error } = await query.eq('license_status', 'Active').limit(maxResults);
    if (error) {
      logger.error('[LicenseSearch] Failed:', { error: error.message });
      return [];
    }
    return (data || []) as LicenseResult[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[LicenseSearch] Error:', { error: msg });
    return [];
  }
}

export function formatLicenseResults(results: LicenseResult[]): string {
  if (results.length === 0) return 'No matching cannabis licenses found.';
  return results
    .map((r, i) =>
      `[${i + 1}] ${r.business_dba_name || r.business_legal_name} (${r.license_type})\n  ${r.premise_street_address || ''}, ${r.premise_city}, ${r.premise_state}\n  ${r.business_website ? 'Web: ' + r.business_website : ''} ${r.business_phone ? '| Phone: ' + r.business_phone : ''}`
    )
    .join('\n');
}

// ============================================================================
// LAB RESULTS SEARCH — COA data across 14 states
// ============================================================================

export const cannabisLabResultsToolDef = {
  name: 'searchLabResults',
  description:
    'Search cannabis lab test results (COAs) across 14 US states. Find THC/CBD percentages, terpene content, and pass/fail status for products and strains. Use to verify product quality, compare potency, or answer "how strong is X?" questions.',
  schema: z.object({
    strain_name: z.string().optional().describe('Strain name to search, e.g. "Blue Dream"'),
    product_type: z.string().optional().describe('Product type: flower, edible, concentrate, etc.'),
    state: z.string().optional().describe('Two-letter state code'),
    min_thc: z.number().optional().describe('Minimum THC percentage'),
    limit: z.number().optional().describe('Results to return (default 10, max 25)'),
  }),
};

interface LabResult {
  product_name: string | null;
  strain_name: string | null;
  product_type: string | null;
  producer_name: string | null;
  producer_state: string;
  total_thc: number | null;
  total_cbd: number | null;
  total_terpenes: number | null;
  status: string | null;
  date_tested: string | null;
}

export async function searchLabResults(
  strainName?: string,
  productType?: string,
  state?: string,
  minThc?: number,
  limit: number = 10
): Promise<LabResult[]> {
  const maxResults = Math.min(limit, 25);
  try {
    let query = getSupabase()
      .from('cannabis_lab_results')
      .select('product_name, strain_name, product_type, producer_name, producer_state, total_thc, total_cbd, total_terpenes, status, date_tested');

    if (strainName) query = query.ilike('strain_name', `%${strainName}%`);
    if (productType) query = query.ilike('product_type', `%${productType}%`);
    if (state) query = query.eq('producer_state', state.toUpperCase());
    if (minThc) query = query.gte('total_thc', minThc);

    const { data, error } = await query.order('date_tested', { ascending: false }).limit(maxResults);
    if (error) {
      logger.error('[LabResults] Failed:', { error: error.message });
      return [];
    }
    return (data || []) as LabResult[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[LabResults] Error:', { error: msg });
    return [];
  }
}

export function formatLabResults(results: LabResult[]): string {
  if (results.length === 0) return 'No lab results found.';
  return results
    .map((r, i) =>
      `[${i + 1}] ${r.product_name || r.strain_name || 'Unknown'} (${r.product_type || '?'}) — ${r.producer_state}\n  THC: ${r.total_thc ?? '?'}% | CBD: ${r.total_cbd ?? '?'}% | Terpenes: ${r.total_terpenes ?? '?'}% | ${r.status || 'unknown'} | Tested: ${r.date_tested || '?'}`
    )
    .join('\n');
}

// ============================================================================
// PRICE INDEX — Weekly market pricing benchmarks
// ============================================================================

export const cannabisPriceIndexToolDef = {
  name: 'getCannabisMarketPricing',
  description:
    'Get weekly cannabis market pricing data across product categories (THC flower, edibles, vapes, CBD oil, etc.). Shows average prices, discount rates, and product counts from 200+ US online retailers. Use for market benchmarking and pricing strategy.',
  schema: z.object({
    subcategory: z.string().optional().describe('Product category: "THC Flower", "THC Edibles", "THC Vape", "CBD Oil", "Overall", etc.'),
    weeks: z.number().optional().describe('Number of recent weeks to return (default 4, max 15)'),
  }),
};

interface PriceIndexRow {
  snapshot_week: string;
  subcategory: string;
  avg_price: number | null;
  avg_discount_pct: number | null;
  product_count: number | null;
  index_value: number | null;
}

export async function getCannabisMarketPricing(
  subcategory?: string,
  weeks: number = 4
): Promise<PriceIndexRow[]> {
  const maxWeeks = Math.min(weeks, 15);
  try {
    let query = getSupabase()
      .from('cannabis_price_index')
      .select('snapshot_week, subcategory, avg_price, avg_discount_pct, product_count, index_value');

    if (subcategory) query = query.ilike('subcategory', `%${subcategory}%`);

    const { data, error } = await query.order('snapshot_week', { ascending: false }).limit(maxWeeks * 25);
    if (error) {
      logger.error('[PriceIndex] Failed:', { error: error.message });
      return [];
    }
    return (data || []) as PriceIndexRow[];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[PriceIndex] Error:', { error: msg });
    return [];
  }
}

export function formatPriceIndex(results: PriceIndexRow[]): string {
  if (results.length === 0) return 'No pricing data available.';
  return results
    .map(r => `${r.snapshot_week} | ${r.subcategory}: $${r.avg_price?.toFixed(2) ?? '?'} avg (${r.avg_discount_pct?.toFixed(1) ?? '0'}% disc) | ${r.product_count ?? '?'} products${r.index_value ? ` | Index: ${r.index_value}` : ''}`)
    .join('\n');
}
