/**
 * Jina AI Tools — Shared definitions for any agent that needs web search/read
 *
 * Three capabilities:
 *   search_web  → Jina Search (s.jina.ai) — find pages for a query
 *   read_url    → Jina Reader (r.jina.ai) — read a URL as clean markdown
 *   rerank_docs → Jina Reranker (api.jina.ai/v1/rerank) — rank by relevance
 *
 * Usage in an agent:
 *   import { jinaToolDefs, makeJinaToolsImpl } from '@/server/tools/jina-tools';
 *   const toolsDef = [...agentTools, ...jinaToolDefs, ...contextOsToolDefs];
 *   const result = await runMultiStepTask({ toolsDef, tools: { ...tools, ...makeJinaToolsImpl() } });
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';

export interface JinaSearchResult {
    title: string;
    url: string;
    snippet: string;
}

// =============================================================================
// SERPER FALLBACK (Google Search via Serper.dev — activated when Jina is empty)
// =============================================================================

/**
 * Fallback search using Serper.dev (Google). Called automatically by search_web
 * when Jina Search returns zero results. Converts to JinaSearchResult shape.
 */
async function serperSearchFallback(query: string): Promise<JinaSearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, num: 5 }),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return [];
        const data = await res.json() as { organic?: Array<{ title: string; link: string; snippet: string }> };
        return (data.organic ?? []).slice(0, 5).map(r => ({
            title: r.title || '',
            url: r.link || '',
            snippet: (r.snippet || '').substring(0, 300),
        })).filter(r => r.url);
    } catch {
        return [];
    }
}

// =============================================================================
// HELPERS (shared with competitor-discovery.ts)
// =============================================================================

/**
 * Jina Search — returns top web results for a query.
 * Falls back to empty array on error (non-fatal for agents).
 */
export async function jinaSearch(query: string): Promise<JinaSearchResult[]> {
    const jinaKey = process.env.JINA_API_KEY;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (jinaKey) headers['Authorization'] = `Bearer ${jinaKey}`;

    try {
        const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
            headers,
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            logger.warn('[JinaTools] Search non-OK', { status: res.status, query });
            return [];
        }

        const data = await res.json() as { code?: number; data?: unknown[] };
        if (!Array.isArray(data.data)) return [];

        return (data.data as Array<Record<string, unknown>>).map(r => ({
            title: (r.title as string) || '',
            url: (r.url as string) || '',
            snippet: ((r.description as string) || (r.content as string) || '')
                .substring(0, 300)
                .replace(/\n/g, ' '),
        })).filter(r => r.url);

    } catch (e) {
        logger.warn('[JinaTools] Search failed', { query, error: (e as Error).message });
        return [];
    }
}

/**
 * Jina Reader — fetches a URL and returns clean markdown.
 * Falls back to empty string on error.
 */
export async function jinaReadUrl(url: string): Promise<string> {
    const jinaKey = process.env.JINA_API_KEY;
    const headers: Record<string, string> = {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
    };
    if (jinaKey) headers['Authorization'] = `Bearer ${jinaKey}`;

    try {
        const res = await fetch(`https://r.jina.ai/${url}`, {
            headers,
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            logger.warn('[JinaTools] Reader non-OK', { status: res.status, url });
            return '';
        }

        const text = await res.text();
        // Cap at 8k chars to avoid blowing agent context window
        return text.length > 8000 ? text.substring(0, 8000) + '\n\n[...content truncated at 8000 chars]' : text;

    } catch (e) {
        logger.warn('[JinaTools] Reader failed', { url, error: (e as Error).message });
        return '';
    }
}

/**
 * Jina Reranker — reorder documents by relevance to a query.
 * Falls back to original order when API key missing or call fails.
 */
export async function jinaRerank(
    documents: Array<{ id: string; text: string }>,
    query: string,
    topN: number
): Promise<Array<{ id: string; score: number }>> {
    const jinaKey = process.env.JINA_API_KEY;
    if (!jinaKey) {
        return documents.slice(0, topN).map((d, i) => ({ id: d.id, score: 1 - i * 0.01 }));
    }

    try {
        const res = await fetch('https://api.jina.ai/v1/rerank', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jinaKey}`,
            },
            body: JSON.stringify({
                model: 'jina-reranker-v2-base-multilingual',
                query,
                documents,
                top_n: topN,
                return_documents: false,
            }),
            signal: AbortSignal.timeout(15000),
        });

        const data = await res.json() as { results?: Array<{ document?: { id: string }; index: number; relevance_score: number }> };
        if (!data.results) {
            return documents.slice(0, topN).map((d, i) => ({ id: d.id, score: 1 - i * 0.01 }));
        }

        return data.results.map(r => ({
            id: r.document?.id ?? String(r.index),
            score: r.relevance_score,
        }));

    } catch (e) {
        logger.warn('[JinaTools] Reranker failed', { error: (e as Error).message });
        return documents.slice(0, topN).map((d, i) => ({ id: d.id, score: 1 - i * 0.01 }));
    }
}

// =============================================================================
// TOOL DEFINITIONS (Zod schemas for agent harness)
// =============================================================================

export const jinaToolDefs = [
    {
        name: 'search_web',
        description: 'Search the web for current information, news, or research on any topic. Returns titles, URLs, and snippets from the top results. Use this when you need up-to-date information beyond your training data.',
        schema: z.object({
            query: z.string().describe('The search query — be specific for best results'),
        }),
    },
    {
        name: 'read_url',
        description: 'Read the full content of a specific URL as clean markdown. Use this after search_web to get the full text of a promising page. Good for reading competitor pages, brand guides, news articles, or market research.',
        schema: z.object({
            url: z.string().describe('The full URL to read (must start with http:// or https://)'),
        }),
    },
] as const;

// =============================================================================
// IMPLEMENTATIONS (pass into runMultiStepTask tools object via spread)
// =============================================================================

export function makeJinaToolsImpl() {
    return {
        search_web: async ({ query }: { query: string }) => {
            // Try Jina first; fall back to Serper (Google) if Jina returns nothing
            let results = await jinaSearch(query);
            if (results.length === 0) {
                logger.info('[JinaTools] Jina empty — trying Serper fallback', { query });
                results = await serperSearchFallback(query);
            }
            if (results.length === 0) {
                // Return neutral — don't say "failed"; let the LLM use training knowledge
                return `No current web results available for this query.`;
            }
            return results
                .map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`)
                .join('\n\n');
        },

        read_url: async ({ url }: { url: string }) => {
            const content = await jinaReadUrl(url);
            if (!content) return `Could not read ${url}. The page may be blocked or unavailable.`;
            return content;
        },
    };
}
