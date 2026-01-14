/**
 * Unit Tests for RAG Service
 */

import { RAGService, ragService } from '@/server/services/vector-search/rag-service';

// Mock dependencies
jest.mock('@/server/services/vector-search/firestore-vector', () => ({
    firestoreVectorSearch: {
        search: jest.fn().mockResolvedValue([
            { docId: 'doc-1', content: 'Cannabis delivery in Michigan', metadata: { state: 'MI' }, score: 0.95 },
            { docId: 'doc-2', content: 'Delivery hours 9am-9pm', metadata: { state: 'MI' }, score: 0.90 },
            { docId: 'doc-3', content: 'Age verification required', metadata: { state: 'MI' }, score: 0.85 },
            { docId: 'doc-4', content: 'Storage requirements', metadata: { state: 'MI' }, score: 0.80 },
            { docId: 'doc-5', content: 'Licensing information', metadata: { state: 'MI' }, score: 0.75 },
            { docId: 'doc-6', content: 'Employee training', metadata: { state: 'MI' }, score: 0.70 },
        ]),
        index: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock('@/server/services/vector-search/reranker-service', () => ({
    rerankerService: {
        isAvailable: jest.fn().mockReturnValue(false),
        rerank: jest.fn()
    },
    simpleRerank: jest.fn((query, docs, topK) => {
        // Simple mock that just returns first topK docs with rank
        return docs.slice(0, topK).map((d: any, i: number) => ({
            id: d.id,
            content: d.content,
            originalScore: d.score,
            rerankedScore: d.score + 0.01 * (topK - i),
            rank: i + 1
        }));
    })
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('RAGService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('search', () => {
        it('returns results with text, score, metadata, and source', async () => {
            const results = await ragService.search({
                collection: 'compliance',
                query: 'delivery rules',
                limit: 3
            });

            expect(results).toHaveLength(3);
            expect(results[0]).toHaveProperty('text');
            expect(results[0]).toHaveProperty('score');
            expect(results[0]).toHaveProperty('metadata');
            expect(results[0]).toHaveProperty('source');
        });

        it('constructs tenant-scoped collection path', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');
            
            await ragService.search({
                collection: 'products',
                query: 'test',
                tenantId: 'tenant-123'
            });

            expect(firestoreVectorSearch.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'tenants/tenant-123/products'
                })
            );
        });

        it('does not add tenant prefix to global collections', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');
            
            await ragService.search({
                collection: 'knowledge/regulations',
                query: 'test',
                tenantId: 'tenant-123'
            });

            expect(firestoreVectorSearch.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'knowledge/regulations'
                })
            );
        });

        it('uses reranker when enabled and results exceed limit', async () => {
            const { simpleRerank } = require('@/server/services/vector-search/reranker-service');
            
            await ragService.search({
                collection: 'docs',
                query: 'delivery',
                limit: 3,
                useReranker: true
            });

            expect(simpleRerank).toHaveBeenCalled();
        });

        it('skips reranking when useReranker is false', async () => {
            const { simpleRerank, rerankerService } = require('@/server/services/vector-search/reranker-service');
            
            await ragService.search({
                collection: 'docs',
                query: 'delivery',
                limit: 3,
                useReranker: false
            });

            expect(rerankerService.rerank).not.toHaveBeenCalled();
            expect(simpleRerank).not.toHaveBeenCalled();
        });

        it('retrieves more candidates when reranking is enabled', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');
            
            await ragService.search({
                collection: 'docs',
                query: 'test',
                limit: 5,
                useReranker: true,
                retrievalK: 20
            });

            expect(firestoreVectorSearch.search).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 20
                })
            );
        });

        it('includes rank in results when reranking', async () => {
            const results = await ragService.search({
                collection: 'docs',
                query: 'test',
                limit: 3,
                useReranker: true
            });

            expect(results[0].rank).toBe(1);
            expect(results[1].rank).toBe(2);
            expect(results[2].rank).toBe(3);
        });

        it('returns empty array on error', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');
            firestoreVectorSearch.search.mockRejectedValueOnce(new Error('DB error'));

            const results = await ragService.search({
                collection: 'docs',
                query: 'test'
            });

            expect(results).toEqual([]);
        });
    });

    describe('indexDocument', () => {
        it('indexes document with content and metadata', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');

            await ragService.indexDocument(
                'products',
                'product-123',
                'Blue Dream Flower',
                { category: 'Flower', price: 45 }
            );

            expect(firestoreVectorSearch.index).toHaveBeenCalledWith({
                collection: 'products',
                docId: 'product-123',
                content: 'Blue Dream Flower',
                metadata: { category: 'Flower', price: 45 },
                chunkContext: undefined
            });
        });

        it('constructs tenant-scoped path for indexing', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');

            await ragService.indexDocument(
                'menu',
                'item-1',
                'OG Kush',
                {},
                'tenant-456'
            );

            expect(firestoreVectorSearch.index).toHaveBeenCalledWith(
                expect.objectContaining({
                    collection: 'tenants/tenant-456/menu'
                })
            );
        });

        it('passes chunk context through to indexing', async () => {
            const { firestoreVectorSearch } = require('@/server/services/vector-search/firestore-vector');

            await ragService.indexDocument(
                'compliance',
                'rule-1',
                'Delivery hours restriction',
                { type: 'regulation' },
                'tenant-789',
                { state: 'Michigan', city: 'Detroit' }
            );

            expect(firestoreVectorSearch.index).toHaveBeenCalledWith(
                expect.objectContaining({
                    chunkContext: { state: 'Michigan', city: 'Detroit' }
                })
            );
        });
    });
});
