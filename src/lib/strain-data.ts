/**
 * Strain Data — Server-side data fetching for the public strain encyclopedia.
 *
 * Reads from Supabase `cannabis_strains` table (8,000+ strains).
 * Used by /strains index and /strains/[name] pages (ISR cached).
 */

import { getSupabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrainSummary {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  thc_pct: number | null;
  cbd_pct: number | null;
  top_effect: string | null;
  flavors: string | null;
  average_rating: number | null;
  review_count: number | null;
}

export interface StrainDetail extends StrainSummary {
  description: string | null;
  cbg_pct: number | null;
  thcv_pct: number | null;
  // Effects (0-1 normalized scores)
  effect_relaxed: number | null;
  effect_sleepy: number | null;
  effect_happy: number | null;
  effect_euphoric: number | null;
  effect_creative: number | null;
  effect_energetic: number | null;
  effect_focused: number | null;
  effect_hungry: number | null;
  effect_uplifted: number | null;
  effect_talkative: number | null;
  effect_giggly: number | null;
  effect_tingly: number | null;
  effect_aroused: number | null;
  // Terpenes
  terp_myrcene: number | null;
  terp_limonene: number | null;
  terp_pinene: number | null;
  terp_caryophyllene: number | null;
  terp_linalool: number | null;
  terp_humulene: number | null;
  terp_terpinolene: number | null;
  terp_ocimene: number | null;
  // Medical conditions
  condition_pain: number | null;
  condition_stress: number | null;
  condition_anxiety: number | null;
  condition_insomnia: number | null;
  condition_depression: number | null;
  // Negatives
  negative_dry_mouth: number | null;
  negative_dry_eyes: number | null;
  negative_paranoid: number | null;
  // Cultivation
  grow_difficulty: string | null;
  flowering_days: number | null;
  yield_indoor: string | null;
  yield_outdoor: string | null;
  environment: string | null;
  // Metadata
  source: string | null;
  parent_strains: string | null;
}

// Columns for the index page (lightweight)
const SUMMARY_COLS = 'id, name, slug, category, thc_pct, cbd_pct, top_effect, flavors, average_rating, review_count';

// Columns for the detail page (everything except embedding)
const DETAIL_COLS = [
  SUMMARY_COLS,
  'description, cbg_pct, thcv_pct',
  'effect_relaxed, effect_sleepy, effect_happy, effect_euphoric, effect_creative, effect_energetic, effect_focused, effect_hungry, effect_uplifted, effect_talkative, effect_giggly, effect_tingly, effect_aroused',
  'terp_myrcene, terp_limonene, terp_pinene, terp_caryophyllene, terp_linalool, terp_humulene, terp_terpinolene, terp_ocimene',
  'condition_pain, condition_stress, condition_anxiety, condition_insomnia, condition_depression',
  'negative_dry_mouth, negative_dry_eyes, negative_paranoid',
  'grow_difficulty, flowering_days, yield_indoor, yield_outdoor, environment',
  'source, parent_strains',
].join(', ');

// ---------------------------------------------------------------------------
// Index queries
// ---------------------------------------------------------------------------

export interface StrainFilters {
  category?: 'indica' | 'sativa' | 'hybrid';
  minThc?: number;
  maxThc?: number;
  effect?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;

export async function fetchStrains(filters: StrainFilters = {}): Promise<{
  strains: StrainSummary[];
  total: number;
}> {
  const pageSize = Math.min(filters.pageSize || DEFAULT_PAGE_SIZE, 100);
  const page = Math.max(filters.page || 1, 1);
  const offset = (page - 1) * pageSize;

  try {
    let query = getSupabase()
      .from('cannabis_strains')
      .select(SUMMARY_COLS, { count: 'exact' });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.minThc != null) {
      query = query.gte('thc_pct', filters.minThc);
    }
    if (filters.maxThc != null) {
      query = query.lte('thc_pct', filters.maxThc);
    }
    if (filters.effect) {
      query = query.ilike('top_effect', `%${filters.effect}%`);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    query = query
      .order('review_count', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { strains: (data || []) as StrainSummary[], total: count || 0 };
  } catch {
    return { strains: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Detail query
// ---------------------------------------------------------------------------

export async function fetchStrainBySlug(slug: string): Promise<StrainDetail | null> {
  try {
    const { data, error } = await getSupabase()
      .from('cannabis_strains')
      .select(DETAIL_COLS)
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as unknown as StrainDetail;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sitemap: fetch all slugs (lightweight, for sitemap.ts)
// ---------------------------------------------------------------------------

export async function fetchAllStrainSlugs(): Promise<Array<{ slug: string; name: string }>> {
  try {
    const { data, error } = await getSupabase()
      .from('cannabis_strains')
      .select('slug, name')
      .not('slug', 'is', null)
      .order('review_count', { ascending: false, nullsFirst: false })
      .limit(5000);

    if (error) return [];
    return (data || []) as Array<{ slug: string; name: string }>;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Aggregations for the index page hero stats
// ---------------------------------------------------------------------------

export async function fetchStrainStats(): Promise<{
  total: number;
  indica: number;
  sativa: number;
  hybrid: number;
}> {
  try {
    const sb = getSupabase();
    const [total, indica, sativa, hybrid] = await Promise.all([
      sb.from('cannabis_strains').select('id', { count: 'exact', head: true }),
      sb.from('cannabis_strains').select('id', { count: 'exact', head: true }).eq('category', 'indica'),
      sb.from('cannabis_strains').select('id', { count: 'exact', head: true }).eq('category', 'sativa'),
      sb.from('cannabis_strains').select('id', { count: 'exact', head: true }).eq('category', 'hybrid'),
    ]);
    return {
      total: total.count || 0,
      indica: indica.count || 0,
      sativa: sativa.count || 0,
      hybrid: hybrid.count || 0,
    };
  } catch {
    return { total: 0, indica: 0, sativa: 0, hybrid: 0 };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert effect scores to sorted array for display */
export function getTopEffects(strain: StrainDetail, limit = 5): Array<{ name: string; score: number }> {
  const effects: Array<{ name: string; score: number }> = [];
  const effectFields: Array<[string, keyof StrainDetail]> = [
    ['Relaxed', 'effect_relaxed'], ['Sleepy', 'effect_sleepy'], ['Happy', 'effect_happy'],
    ['Euphoric', 'effect_euphoric'], ['Creative', 'effect_creative'], ['Energetic', 'effect_energetic'],
    ['Focused', 'effect_focused'], ['Hungry', 'effect_hungry'], ['Uplifted', 'effect_uplifted'],
    ['Talkative', 'effect_talkative'], ['Giggly', 'effect_giggly'], ['Tingly', 'effect_tingly'],
  ];
  for (const [name, key] of effectFields) {
    const val = strain[key];
    if (typeof val === 'number' && val > 0) effects.push({ name, score: val });
  }
  return effects.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Convert terpene scores to sorted array */
export function getTopTerpenes(strain: StrainDetail, limit = 5): Array<{ name: string; score: number }> {
  const terps: Array<{ name: string; score: number }> = [];
  const terpFields: Array<[string, keyof StrainDetail]> = [
    ['Myrcene', 'terp_myrcene'], ['Limonene', 'terp_limonene'], ['Pinene', 'terp_pinene'],
    ['Caryophyllene', 'terp_caryophyllene'], ['Linalool', 'terp_linalool'], ['Humulene', 'terp_humulene'],
    ['Terpinolene', 'terp_terpinolene'], ['Ocimene', 'terp_ocimene'],
  ];
  for (const [name, key] of terpFields) {
    const val = strain[key];
    if (typeof val === 'number' && val > 0) terps.push({ name, score: val });
  }
  return terps.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Convert medical condition scores to sorted array */
export function getTopConditions(strain: StrainDetail, limit = 5): Array<{ name: string; score: number }> {
  const conditions: Array<{ name: string; score: number }> = [];
  const conditionFields: Array<[string, keyof StrainDetail]> = [
    ['Pain', 'condition_pain'], ['Stress', 'condition_stress'], ['Anxiety', 'condition_anxiety'],
    ['Insomnia', 'condition_insomnia'], ['Depression', 'condition_depression'],
  ];
  for (const [name, key] of conditionFields) {
    const val = strain[key];
    if (typeof val === 'number' && val > 0) conditions.push({ name, score: val });
  }
  return conditions.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Build Schema.org JSON-LD for a strain detail page */
export function buildStrainJsonLd(strain: StrainDetail): object {
  const terpenes = getTopTerpenes(strain);
  const effects = getTopEffects(strain);

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `${strain.name} Cannabis Strain Data`,
    description: strain.description || `${strain.name} is a ${strain.category || 'cannabis'} strain${strain.thc_pct ? ` with ${strain.thc_pct}% THC` : ''}.`,
    url: `https://bakedbot.ai/strains/${strain.slug}`,
    keywords: [
      strain.category,
      strain.top_effect,
      ...(strain.flavors?.split(',').map(f => f.trim()) || []),
      ...terpenes.map(t => t.name),
    ].filter(Boolean),
    variableMeasured: [
      strain.thc_pct != null && { '@type': 'PropertyValue', name: 'THC', value: strain.thc_pct, unitText: 'percent' },
      strain.cbd_pct != null && { '@type': 'PropertyValue', name: 'CBD', value: strain.cbd_pct, unitText: 'percent' },
      ...terpenes.map(t => ({ '@type': 'PropertyValue', name: t.name, value: Math.round(t.score * 100), unitText: 'relative score' })),
    ].filter(Boolean),
    about: {
      '@type': 'Thing',
      name: strain.name,
      description: `${strain.category || 'Cannabis'} strain. ${effects.map(e => e.name).join(', ')}.`,
    },
  };
}
