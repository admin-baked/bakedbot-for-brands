/**
 * Upstash Vector Service
 *
 * Native vector similarity search via Upstash Vector (REST API).
 * Replaces the fetch-all-then-rank pattern in firestore-vector.ts
 * with server-side similarity search (sub-millisecond).
 *
 * Architecture:
 *   - Upstash Vector: search index (fast similarity queries)
 *   - Firestore: source of truth (full document content + metadata)
 *   - Dual-write on index: write to both Firestore and Upstash Vector
 *   - Search: query Upstash Vector → get doc IDs → fetch content from Firestore
 *
 * Namespaces separate different data types:
 *   - "kb:{collection}" — knowledge base documents
 *   - "cannmenus"       — CannMenus product embeddings
 *   - "products:{orgId}" — product catalog per org
 *
 * Fallback: If Upstash Vector is not configured, falls back to
 * the existing Firestore fetch-and-rank approach.
 */

import { Index } from '@upstash/vector';
import { logger } from '@/lib/logger';

// --- Types ---

export interface VectorDoc {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
    content?: string;
}

export interface VectorUpsertOptions {
    namespace: string;
    id: string;
    vector: number[];
    metadata?: Record<string, unknown>;
    /** Store content directly in Upstash Vector for small docs (avoids Firestore fetch on search) */
    content?: string;
}

export interface VectorSearchOptions {
    namespace: string;
    vector: number[];
    topK?: number;
    filter?: string;
    includeMetadata?: boolean;
}

// --- Client ---

let vectorIndex: Index | null = null;
let initAttempted = false;

function getVectorIndex(): Index | null {
    if (vectorIndex) return vectorIndex;
    if (initAttempted) return null;

    initAttempted = true;

    const url = process.env.UPSTASH_VECTOR_REST_URL?.trim();
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN?.trim();

    if (!url || !token) {
        logger.warn('[Vector] UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN not configured — vector search disabled');
        return null;
    }

    vectorIndex = new Index({ url, token });
    logger.info('[Vector] Initialized Upstash Vector client');
    return vectorIndex;
}

/**
 * Check if Upstash Vector is available
 */
export function isVectorAvailable(): boolean {
    return getVectorIndex() !== null;
}

/**
 * Upsert a vector into the index
 */
export async function vectorUpsert(options: VectorUpsertOptions): Promise<void> {
    const index = getVectorIndex();
    if (!index) return;

    try {
        const ns = index.namespace(options.namespace);
        await ns.upsert({
            id: options.id,
            vector: options.vector,
            metadata: {
                ...options.metadata,
                ...(options.content ? { _content: options.content } : {}),
            },
        });
        logger.debug('[Vector] Upserted', { namespace: options.namespace, id: options.id });
    } catch (error) {
        logger.error('[Vector] Upsert failed', {
            namespace: options.namespace,
            id: options.id,
            error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw — Firestore is the source of truth, vector index is best-effort
    }
}

/**
 * Batch upsert vectors
 */
export async function vectorUpsertBatch(
    namespace: string,
    items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown>; content?: string }>
): Promise<void> {
    const index = getVectorIndex();
    if (!index) return;

    try {
        const ns = index.namespace(namespace);
        await ns.upsert(
            items.map(item => ({
                id: item.id,
                vector: item.vector,
                metadata: {
                    ...item.metadata,
                    ...(item.content ? { _content: item.content } : {}),
                },
            }))
        );
        logger.debug('[Vector] Batch upserted', { namespace, count: items.length });
    } catch (error) {
        logger.error('[Vector] Batch upsert failed', {
            namespace,
            count: items.length,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Search for similar vectors
 *
 * Returns top-K results sorted by similarity score (1.0 = perfect match).
 * Sub-millisecond latency — no Firestore reads, no client-side cosine loop.
 */
export async function vectorSearch(options: VectorSearchOptions): Promise<VectorDoc[]> {
    const index = getVectorIndex();
    if (!index) return [];

    try {
        const ns = index.namespace(options.namespace);
        const results = await ns.query<Record<string, unknown>>({
            vector: options.vector,
            topK: options.topK ?? 5,
            includeMetadata: options.includeMetadata ?? true,
            includeVectors: false,
            ...(options.filter ? { filter: options.filter } : {}),
        });

        return results.map(r => ({
            id: String(r.id),
            score: r.score,
            metadata: r.metadata as Record<string, unknown> | undefined,
            content: r.metadata?._content as string | undefined,
        }));
    } catch (error) {
        logger.error('[Vector] Search failed', {
            namespace: options.namespace,
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

/**
 * Delete vectors by ID
 */
export async function vectorDelete(namespace: string, ids: string[]): Promise<void> {
    const index = getVectorIndex();
    if (!index) return;

    try {
        const ns = index.namespace(namespace);
        await ns.delete(ids);
        logger.debug('[Vector] Deleted', { namespace, count: ids.length });
    } catch (error) {
        logger.error('[Vector] Delete failed', {
            namespace,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Get index info/stats
 */
export async function vectorInfo(): Promise<{ vectorCount: number; dimension: number } | null> {
    const index = getVectorIndex();
    if (!index) return null;

    try {
        const info = await index.info();
        return {
            vectorCount: info.vectorCount,
            dimension: info.dimension,
        };
    } catch (error) {
        logger.error('[Vector] Info failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Build a namespace key for KB collections
 */
export function kbNamespace(collection: string): string {
    return `kb:${collection.replace(/\//g, ':')}`;
}
