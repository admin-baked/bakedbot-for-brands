'use server';

/**
 * Code Search Server Action
 *
 * Exposes semantic code search to dashboard users across all roles.
 * Uses the code embeddings cache (Upstash Vector) for fast, token-efficient
 * symbol lookup without reading full files.
 *
 * Available to: all authenticated users (brand, dispensary, super_user, etc.)
 */

import { requireUser } from '@/server/auth/auth';
import { searchCode, indexCodebase } from '@/server/services/code-embeddings-cache';
import { logger } from '@/lib/logger';

// All roles that can access the dashboard
const CODE_SEARCH_ROLES = [
    'super_user', 'super_admin',
    'brand', 'brand_admin', 'brand_member',
    'dispensary', 'dispensary_admin', 'dispensary_staff',
    'budtender',
] as const;

export interface CodeSearchResponse {
    success: boolean;
    results?: Array<{
        symbol: string;
        signature: string;
        filePath: string;
        line: number;
        type: string;
        score: number;
    }>;
    error?: string;
}

/**
 * Search codebase symbols by natural language query
 *
 * @param query - Natural language description (e.g., "rate limiting", "customer segments")
 * @param options - Optional filters (limit, type)
 */
export async function searchCodeSymbols(
    query: string,
    options?: { limit?: number; type?: string }
): Promise<CodeSearchResponse> {
    try {
        await requireUser([...CODE_SEARCH_ROLES]);

        if (!query || query.trim().length < 2) {
            return { success: false, error: 'Query must be at least 2 characters' };
        }

        const results = await searchCode(query.trim(), {
            limit: Math.min(options?.limit ?? 10, 25),
            type: options?.type as 'function' | 'class' | 'interface' | 'type' | undefined,
        });

        return {
            success: true,
            results: results.map(r => ({
                symbol: r.symbol,
                signature: r.signature,
                filePath: r.filePath,
                line: r.line,
                type: r.type,
                score: Math.round(r.score * 100) / 100,
            })),
        };
    } catch (error) {
        logger.error('[code-search] Search failed', {
            query,
            error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, error: 'Code search unavailable' };
    }
}

/**
 * Trigger codebase re-indexing (super_user only)
 */
export async function reindexCodebase(): Promise<{ success: boolean; filesProcessed?: number; symbolsIndexed?: number; error?: string }> {
    try {
        await requireUser(['super_user', 'super_admin']);

        const result = await indexCodebase();
        return {
            success: true,
            filesProcessed: result.filesProcessed,
            symbolsIndexed: result.symbolsIndexed,
        };
    } catch (error) {
        logger.error('[code-search] Reindex failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, error: 'Reindex failed' };
    }
}
