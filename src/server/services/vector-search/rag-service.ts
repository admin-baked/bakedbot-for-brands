import { firestoreVectorSearch } from './firestore-vector';

export interface RAGSearchOptions {
    collection: string;
    query: string;
    limit?: number;
    filters?: Record<string, any>;
    tenantId?: string;
}

export interface RAGResult {
    text: string;
    score: number;
    metadata: Record<string, any>;
    source: string;
}

export class RAGService {
    /**
     * Semantic search across any collection
     */
    async search(options: RAGSearchOptions): Promise<RAGResult[]> {
        const { collection, query, limit = 5, filters = {}, tenantId } = options;
        
        // Construct full collection path if tenantId provided
        // Some collections are global (knowledge/docs), others tenant-scoped (products/catalog)
        let fullCollection = collection;
        if (tenantId && !collection.startsWith('knowledge/') && !collection.startsWith('compliance/')) {
            fullCollection = `tenants/${tenantId}/${collection}`;
        }
        
        try {
            const results = await firestoreVectorSearch.search({
                collection: fullCollection,
                query,
                limit,
                filters
            });
            
            return results.map(r => ({
                text: r.content,
                score: r.score,
                metadata: r.metadata,
                source: r.docId
            }));
        } catch (e: any) {
            console.error(`RAG Search failed for ${fullCollection}:`, e);
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
        tenantId?: string
    ): Promise<void> {
        let fullCollection = collection;
        if (tenantId && !collection.startsWith('knowledge/') && !collection.startsWith('compliance/')) {
            fullCollection = `tenants/${tenantId}/${collection}`;
        }

        await firestoreVectorSearch.index({
            collection: fullCollection,
            docId,
            content,
            metadata
        });
    }
}

export const ragService = new RAGService();
