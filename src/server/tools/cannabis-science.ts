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
const EMBED_MODEL = 'text-embedding-004';

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
