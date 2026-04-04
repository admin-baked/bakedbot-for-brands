/**
 * Vector Search Service
 *
 * Primary: Upstash Vector (native similarity search, sub-millisecond)
 * Fallback: Firestore fetch-and-rank (client-side cosine similarity)
 *
 * On index: dual-write to Firestore (source of truth) + Upstash Vector (search index)
 * On search: Upstash Vector first → Firestore fallback if not configured
 */

import { createServerClient } from "@/firebase/server-client";
import { generateEmbedding } from "@/ai/utils/generate-embedding";
import { FieldValue } from "firebase-admin/firestore";
import { buildChunkWithHeader, ChunkContext } from "./chunking-service";
import { getCached, setCached, CachePrefix, CacheTTL } from '@/lib/cache';
import { cosineSimilarity } from '@/lib/math/cosine-similarity';
import {
    isVectorAvailable,
    vectorUpsert,
    vectorSearch as upstashVectorSearch,
    kbNamespace,
} from '@/lib/vector';
import { logger } from '@/lib/logger';

export interface VectorSearchResult {
    docId: string;
    content: string;
    metadata: Record<string, unknown>;
    score: number;
}

export interface VectorSearchOptions {
    collection: string;
    query: string;
    limit?: number;
    filters?: Record<string, unknown>;
}

export interface IndexOptions {
    collection: string;
    docId: string;
    content: string;
    metadata?: Record<string, unknown>;
    /** Contextual information to prepend as header (State, City, Category, etc.) */
    chunkContext?: ChunkContext;
}

export const firestoreVectorSearch = {
    /**
     * Index a document: dual-write to Firestore + Upstash Vector
     */
    async index(options: IndexOptions) {
        const contentWithHeader = options.chunkContext
            ? buildChunkWithHeader(options.content, options.chunkContext)
            : options.content;

        const embedding = await generateEmbedding(contentWithHeader);

        // Write 1: Firestore (source of truth)
        const { firestore } = await createServerClient();
        await firestore.collection(options.collection).doc(options.docId).set({
            content: options.content,
            contentWithHeader,
            metadata: {
                ...options.metadata,
                ...options.chunkContext
            },
            embedding: FieldValue.vector(embedding),
            embedding_array: embedding,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // Write 2: Upstash Vector (search index) — best-effort, non-blocking
        vectorUpsert({
            namespace: kbNamespace(options.collection),
            id: options.docId,
            vector: embedding,
            metadata: {
                ...options.metadata,
                ...options.chunkContext,
                collection: options.collection,
            },
            content: options.content.substring(0, 2000), // Store truncated content for direct retrieval
        }).catch(() => {
            // Error already logged in vectorUpsert
        });
    },

    /**
     * Search: Upstash Vector (fast) → Firestore fallback (fetch-and-rank)
     */
    async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
        // Check result cache first
        const searchCacheKey = `${options.collection}:${options.query.substring(0, 60).replace(/[^a-zA-Z0-9]/g, '_')}:${options.limit || 5}`;
        const cachedResults = await getCached<VectorSearchResult[]>(CachePrefix.SEMANTIC_SEARCH, searchCacheKey);
        if (cachedResults) return cachedResults;

        const queryEmbedding = await generateEmbedding(options.query);

        // Try Upstash Vector first (sub-millisecond native similarity search)
        if (isVectorAvailable()) {
            try {
                const vectorResults = await upstashVectorSearch({
                    namespace: kbNamespace(options.collection),
                    vector: queryEmbedding,
                    topK: options.limit ?? 5,
                    includeMetadata: true,
                });

                if (vectorResults.length > 0) {
                    const results: VectorSearchResult[] = vectorResults.map(r => ({
                        docId: r.id,
                        content: r.content ?? (r.metadata?._content as string) ?? '',
                        metadata: r.metadata ?? {},
                        score: r.score,
                    }));

                    // If content was stored in vector, we're done. Otherwise fetch from Firestore.
                    const needsContent = results.some(r => !r.content);
                    if (needsContent) {
                        const { firestore } = await createServerClient();
                        await Promise.all(results.map(async (r) => {
                            if (!r.content) {
                                const doc = await firestore.collection(options.collection).doc(r.docId).get();
                                if (doc.exists) {
                                    r.content = doc.data()?.content ?? '';
                                    r.metadata = doc.data()?.metadata ?? {};
                                }
                            }
                        }));
                    }

                    // Cache results
                    setCached(CachePrefix.SEMANTIC_SEARCH, searchCacheKey, results, CacheTTL.SEMANTIC_SEARCH).catch(() => {});

                    logger.debug('[VectorSearch] Upstash Vector hit', {
                        collection: options.collection,
                        resultCount: results.length,
                    });

                    return results;
                }

                // Empty results from Upstash Vector — namespace might not be populated yet
                // Fall through to Firestore
                logger.debug('[VectorSearch] Upstash Vector empty, falling back to Firestore', {
                    collection: options.collection,
                });
            } catch (error) {
                logger.warn('[VectorSearch] Upstash Vector failed, falling back to Firestore', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        // Fallback: Firestore fetch-and-rank (original approach)
        const { firestore } = await createServerClient();
        let query = firestore.collection(options.collection) as FirebaseFirestore.Query;

        if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                query = query.where(`metadata.${key}`, '==', value);
            });
        }

        const snapshot = await query.limit(100).get();

        const results = snapshot.docs.map(doc => {
            const data = doc.data();
            const embedding = data.embedding_array || data.embedding;

            if (!embedding || !Array.isArray(embedding)) return null;

            const score = cosineSimilarity(queryEmbedding, embedding);

            return {
                docId: doc.id,
                content: data.content,
                metadata: data.metadata || {},
                score
            };
        }).filter((r): r is VectorSearchResult => r !== null);

        const topResults = results
            .sort((a, b) => b.score - a.score)
            .slice(0, options.limit || 5);

        // Cache results
        setCached(CachePrefix.SEMANTIC_SEARCH, searchCacheKey, topResults, CacheTTL.SEMANTIC_SEARCH).catch(() => {});

        return topResults;
    }
};
