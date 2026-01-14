import { firestoreVectorSearch } from './firestore-vector';
import { rerankerService, simpleRerank } from './reranker-service';
import { logger } from '@/lib/logger';

export interface RAGSearchOptions {
    collection: string;
    query: string;
    limit?: number;
    filters?: Record<string, any>;
    tenantId?: string;
    /** Enable reranking (default: true if reranker is available) */
    useReranker?: boolean;
    /** Initial retrieval K (before reranking). Higher = better quality but slower. */
    retrievalK?: number;
}

export interface RAGResult {
    text: string;
    score: number;
    metadata: Record<string, any>;
    source: string;
    /** Rank after reranking (1 = most relevant) */
    rank?: number;
}

export class RAGService {
    /**
     * Semantic search across any collection with optional reranking.
     * 
     * Pipeline:
     * 1. Retrieve top-K candidates via vector similarity
     * 2. Rerank candidates using cross-encoder (Vertex AI or fallback)
     * 3. Return top-N reranked results
     */
    async search(options: RAGSearchOptions): Promise<RAGResult[]> {
        const { 
            collection, 
            query, 
            limit = 5, 
            filters = {}, 
            tenantId,
            useReranker = true,
            retrievalK = 20  // Retrieve more candidates for reranking
        } = options;
        
        // Construct full collection path if tenantId provided
        // Some collections are global (knowledge/docs), others tenant-scoped (products/catalog)
        let fullCollection = collection;
        if (tenantId && !collection.startsWith('knowledge/') && !collection.startsWith('compliance/')) {
            fullCollection = `tenants/${tenantId}/${collection}`;
        }
        
        try {
            // Step 1: Retrieve candidates
            // If reranking, get more candidates; otherwise just get limit
            const effectiveK = useReranker ? Math.max(retrievalK, limit * 4) : limit;
            
            const results = await firestoreVectorSearch.search({
                collection: fullCollection,
                query,
                limit: effectiveK,
                filters
            });
            
            if (results.length === 0) {
                return [];
            }

            // Step 2: Rerank if enabled
            if (useReranker && results.length > limit) {
                logger.info('[RAG] Reranking results', {
                    collection: fullCollection,
                    candidateCount: results.length,
                    targetLimit: limit
                });

                // Convert to reranker format
                const documents = results.map(r => ({
                    id: r.docId,
                    content: r.content,
                    score: r.score
                }));

                // Try Vertex AI reranker, fall back to simple reranker
                let rankedDocs;
                if (rerankerService.isAvailable()) {
                    rankedDocs = await rerankerService.rerank({
                        query,
                        documents,
                        topK: limit
                    });
                } else {
                    // Use simple keyword-based reranking as fallback
                    rankedDocs = simpleRerank(query, documents, limit);
                }

                // Map back to RAGResult format
                const docMap = new Map(results.map(r => [r.docId, r]));
                
                return rankedDocs.map(rd => {
                    const original = docMap.get(rd.id)!;
                    return {
                        text: original.content,
                        score: rd.rerankedScore,
                        metadata: original.metadata,
                        source: rd.id,
                        rank: rd.rank
                    };
                });
            }

            // No reranking - return original order
            return results.slice(0, limit).map((r, i) => ({
                text: r.content,
                score: r.score,
                metadata: r.metadata,
                source: r.docId,
                rank: i + 1
            }));
        } catch (e: any) {
            logger.error(`RAG Search failed for ${fullCollection}:`, e);
            // Return empty if index doesn't exist yet or other error
            return [];
        }
    }
    
    /**
     * Add document to vector index
     */
    async indexDocument(
        collection: string,
        docId: string,
        content: string,
        metadata: Record<string, any> = {},
        tenantId?: string,
        chunkContext?: import('./chunking-service').ChunkContext
    ): Promise<void> {
        let fullCollection = collection;
        if (tenantId && !collection.startsWith('knowledge/') && !collection.startsWith('compliance/')) {
            fullCollection = `tenants/${tenantId}/${collection}`;
        }

        await firestoreVectorSearch.index({
            collection: fullCollection,
            docId,
            content,
            metadata,
            chunkContext
        });
    }
}

export const ragService = new RAGService();


