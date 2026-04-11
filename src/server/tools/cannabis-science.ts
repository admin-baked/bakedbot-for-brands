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

// ============================================================================
// SALES CONVERSATIONS — 3,412 multi-turn sales dialogues for agent behavior
// ============================================================================

interface SalesConversationResult {
  conversation: string;
  turn_count: number;
  summary: string;
  similarity: number;
}

export const salesConversationsToolDef = {
  name: 'searchSalesConversations',
  description:
    'Search 3,400+ multi-turn sales dialogues for behavioral examples. Find conversations demonstrating upsell patterns, objection handling, closing techniques, product recommendations, and rapport building. Use this to learn from real sales scenarios before engaging a customer.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'Natural language description of the sales scenario, e.g. "customer hesitant about price" or "upselling premium product" or "closing a reluctant buyer"'
      ),
    limit: z
      .number()
      .optional()
      .describe('Number of example conversations to return (default 3, max 5)'),
  }),
};

export async function searchSalesConversations(
  query: string,
  limit: number = 3
): Promise<SalesConversationResult[]> {
  const maxResults = Math.min(limit, 5);

  try {
    const embedding = await embedQuery(query);

    const { data, error } = await getSupabase().rpc('search_sales_conversations', {
      query_embedding: JSON.stringify(embedding),
      match_count: maxResults,
      match_threshold: 0.4,
    });

    if (error) {
      logger.error('[SalesConversations] Search failed:', { error: error.message });
      return [];
    }

    return ((data || []) as SalesConversationResult[]).map((r) => ({
      conversation: r.conversation,
      turn_count: r.turn_count,
      summary: r.summary,
      similarity: Math.round(r.similarity * 100) / 100,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[SalesConversations] Search error:', { error: msg });
    return [];
  }
}

export function formatSalesConversations(results: SalesConversationResult[]): string {
  if (results.length === 0) return 'No matching sales conversations found.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] (${r.turn_count} turns, ${Math.round(r.similarity * 100)}% match)\n${r.summary}\n---\n${r.conversation}`
    )
    .join('\n\n');
}

// ============================================================================
// B2B SALES CONVERSATIONS — 50K+ SaaS sales dialogues with conversion labels
// ============================================================================

export interface B2BSalesConversationResult {
  conversation_id: string | null;
  company_name: string | null;
  product_name: string | null;
  product_type: string | null;
  scenario: string | null;
  conversation: string;
  outcome: number; // 0 = no conversion, 1 = converted
  conversation_length: number | null;
  customer_engagement: number | null;
  sales_effectiveness: number | null;
  conversation_style: string | null;
  conversation_flow: string | null;
  communication_channel: string | null;
  similarity: number;
}

export const b2bSalesToolDef = {
  name: 'searchB2BSalesConversations',
  description:
    'Search 50K+ real B2B SaaS sales conversations with conversion outcomes. Find examples of successful outreach, objection handling, follow-up cadence, lead qualification, and closing techniques. Use this when planning outreach strategy, drafting sales emails, or analyzing what works in B2B cannabis brand partnerships.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'Natural language query about sales patterns, e.g. "handling price objections in enterprise deals" or "successful cold outreach for SaaS products" or "follow-up sequence that converted"'
      ),
    outcome: z
      .number()
      .optional()
      .describe('Filter by outcome: 1 = converted deals only, 0 = lost deals only'),
    limit: z
      .number()
      .optional()
      .describe('Number of results to return (default 3, max 5)'),
  }),
};

export async function searchB2BSalesConversations(
  query: string,
  outcome?: number,
  limit: number = 3
): Promise<B2BSalesConversationResult[]> {
  const maxResults = Math.min(limit, 5);

  try {
    const embedding = await embedQuery(query);

    const { data, error } = await getSupabase().rpc('search_b2b_sales_conversations', {
      query_embedding: JSON.stringify(embedding),
      match_count: outcome != null ? maxResults * 2 : maxResults,
      match_threshold: 0.4,
    });

    if (error) {
      logger.error('[B2BSales] Search failed:', { error: error.message });
      return [];
    }

    let results = (data || []) as B2BSalesConversationResult[];

    // Apply outcome filter if specified
    if (outcome != null) {
      results = results.filter((r) => r.outcome === outcome);
    }

    return results.slice(0, maxResults).map((r) => ({
      conversation_id: r.conversation_id,
      company_name: r.company_name,
      product_name: r.product_name,
      product_type: r.product_type,
      scenario: r.scenario,
      conversation: r.conversation,
      outcome: r.outcome,
      conversation_length: r.conversation_length,
      customer_engagement: r.customer_engagement,
      sales_effectiveness: r.sales_effectiveness,
      conversation_style: r.conversation_style,
      conversation_flow: r.conversation_flow,
      communication_channel: r.communication_channel,
      similarity: Math.round(r.similarity * 100) / 100,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[B2BSales] Search error:', { error: msg });
    return [];
  }
}

export function formatB2BSalesConversations(results: B2BSalesConversationResult[]): string {
  if (results.length === 0) return 'No matching B2B sales conversations found.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.outcome === 1 ? 'CONVERTED' : 'LOST'} (${Math.round(r.similarity * 100)}% match)\n` +
        `  Company: ${r.company_name || 'Unknown'} | Product: ${r.product_name || r.product_type || 'Unknown'}\n` +
        `  Style: ${r.conversation_style || '?'} | Channel: ${r.communication_channel || '?'} | Turns: ${r.conversation_length || '?'}\n` +
        `  Engagement: ${r.customer_engagement?.toFixed(2) ?? '?'} | Effectiveness: ${r.sales_effectiveness?.toFixed(2) ?? '?'}\n` +
        `  Scenario: ${r.scenario || 'N/A'}\n` +
        `  Conversation:\n${(r.conversation || '').slice(0, 500)}${(r.conversation || '').length > 500 ? '...' : ''}`
    )
    .join('\n\n');
}

// ============================================================================
// BUDTENDER CONVERSATIONS — Few-shot conversation style examples (3,600 Q&A)
// ============================================================================

interface BudtenderConversationResult {
  prompt: string;
  completion: string;
  similarity: number;
}

export const budtenderConversationsToolDef = {
  name: 'searchBudtenderConversations',
  description:
    'Search 3,600 budtender training conversations for few-shot examples of how an expert budtender responds to customers. Use this to match conversation style, tone, and approach when answering customer questions about strains, effects, appearance, flavors, medical uses, terpenes, and cannabis knowledge. Returns similar Q&A pairs to guide your response.',
  schema: z.object({
    query: z
      .string()
      .describe(
        'The customer question or topic to find similar budtender conversations for, e.g. "what strain helps with anxiety" or "describe the flavor of Blue Dream"'
      ),
    limit: z
      .number()
      .optional()
      .describe('Number of conversation examples to return (default 3, max 5)'),
  }),
};

export async function searchBudtenderConversations(
  query: string,
  limit: number = 3
): Promise<BudtenderConversationResult[]> {
  const maxResults = Math.min(limit, 5);

  try {
    const embedding = await embedQuery(query);

    const { data, error } = await getSupabase().rpc('search_budtender_conversations', {
      query_embedding: JSON.stringify(embedding),
      match_count: maxResults,
      match_threshold: 0.45,
    });

    if (error) {
      logger.error('[BudtenderConversations] Search failed:', { error: error.message });
      return [];
    }

    return ((data || []) as BudtenderConversationResult[]).map((r) => ({
      prompt: r.prompt,
      completion: r.completion,
      similarity: Math.round(r.similarity * 100) / 100,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[BudtenderConversations] Search error:', { error: msg });
    return [];
  }
}

export function formatBudtenderConversations(results: BudtenderConversationResult[]): string {
  if (results.length === 0) return 'No similar budtender conversations found.';

  return results
    .map(
      (r, i) =>
        `[${i + 1}] (${Math.round(r.similarity * 100)}% match)\nCustomer: ${r.prompt}\nBudtender: ${r.completion}`
    )
    .join('\n\n');
}
