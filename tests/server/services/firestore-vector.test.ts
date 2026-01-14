/**
 * Unit Tests for Firestore Vector Search Service
 */

import { firestoreVectorSearch, IndexOptions, VectorSearchOptions } from '@/server/services/vector-search/firestore-vector';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            set: jest.fn().mockResolvedValue(undefined),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: [
                    {
                        id: 'doc-1',
                        data: () => ({
                            content: 'Cannabis delivery rules in Michigan',
                            metadata: { state: 'MI', category: 'Delivery' },
                            embedding_array: [0.1, 0.2, 0.3, 0.4, 0.5]
                        })
                    },
                    {
                        id: 'doc-2',
                        data: () => ({
                            content: 'Storage requirements for cannabis',
                            metadata: { state: 'MI', category: 'Storage' },
                            embedding_array: [0.2, 0.3, 0.4, 0.5, 0.6]
                        })
                    },
                    {
                        id: 'doc-3',
                        data: () => ({
                            content: 'Age verification requirements',
                            metadata: { state: 'CA', category: 'Compliance' },
                            embedding_array: [0.5, 0.4, 0.3, 0.2, 0.1]
                        })
                    }
                ]
            })
        }
    })
}));

jest.mock('@/ai/utils/generate-embedding', () => ({
    generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5])
}));

jest.mock('@/server/services/vector-search/chunking-service', () => ({
    buildChunkWithHeader: jest.fn((content: string, context: any) => {
        const parts = Object.entries(context)
            .filter(([_, v]) => v)
            .map(([k, v]) => `${k}: ${v}`);
        return parts.length ? `[${parts.join(' | ')}]\n${content}` : content;
    })
}));

describe('FirestoreVectorSearch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('index', () => {
        it('indexes content with embedding', async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockSet = jest.fn().mockResolvedValue(undefined);
            createServerClient.mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            set: mockSet
                        })
                    })
                }
            });

            await firestoreVectorSearch.index({
                collection: 'test-collection',
                docId: 'doc-123',
                content: 'Test content',
                metadata: { type: 'test' }
            });

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: 'Test content',
                    contentWithHeader: 'Test content',
                    metadata: expect.objectContaining({ type: 'test' }),
                    embedding_array: expect.any(Array)
                }),
                { merge: true }
            );
        });

        it('prepends chunk context header when provided', async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const { buildChunkWithHeader } = require('@/server/services/vector-search/chunking-service');
            const mockSet = jest.fn().mockResolvedValue(undefined);
            createServerClient.mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            set: mockSet
                        })
                    })
                }
            });

            await firestoreVectorSearch.index({
                collection: 'compliance',
                docId: 'rule-123',
                content: 'Delivery hours are 9am to 9pm',
                metadata: { docType: 'regulation' },
                chunkContext: { state: 'Michigan', city: 'Detroit' }
            });

            expect(buildChunkWithHeader).toHaveBeenCalledWith(
                'Delivery hours are 9am to 9pm',
                { state: 'Michigan', city: 'Detroit' }
            );

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: 'Delivery hours are 9am to 9pm',
                    contentWithHeader: expect.stringContaining('Michigan'),
                    metadata: expect.objectContaining({
                        docType: 'regulation',
                        state: 'Michigan',
                        city: 'Detroit'
                    })
                }),
                { merge: true }
            );
        });

        it('stores context in metadata for filtering', async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockSet = jest.fn().mockResolvedValue(undefined);
            createServerClient.mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            set: mockSet
                        })
                    })
                }
            });

            await firestoreVectorSearch.index({
                collection: 'docs',
                docId: 'doc-1',
                content: 'Test',
                chunkContext: { state: 'CA', category: 'Compliance' }
            });

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        state: 'CA',
                        category: 'Compliance'
                    })
                }),
                { merge: true }
            );
        });
    });

    describe('search', () => {
        beforeEach(() => {
            // Set up proper mock chain for search tests
            const { createServerClient } = require('@/firebase/server-client');
            createServerClient.mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                docs: [
                                    {
                                        id: 'doc-1',
                                        data: () => ({
                                            content: 'Cannabis delivery rules in Michigan',
                                            metadata: { state: 'MI', category: 'Delivery' },
                                            embedding_array: [0.1, 0.2, 0.3, 0.4, 0.5]
                                        })
                                    },
                                    {
                                        id: 'doc-2',
                                        data: () => ({
                                            content: 'Storage requirements for cannabis',
                                            metadata: { state: 'MI', category: 'Storage' },
                                            embedding_array: [0.2, 0.3, 0.4, 0.5, 0.6]
                                        })
                                    },
                                    {
                                        id: 'doc-3',
                                        data: () => ({
                                            content: 'Age verification requirements',
                                            metadata: { state: 'CA', category: 'Compliance' },
                                            embedding_array: [0.5, 0.4, 0.3, 0.2, 0.1]
                                        })
                                    }
                                ]
                            })
                        })
                    })
                }
            });
        });

        it('returns results sorted by cosine similarity', async () => {
            const results = await firestoreVectorSearch.search({
                collection: 'test-collection',
                query: 'delivery rules',
                limit: 3
            });

            expect(results).toHaveLength(3);
            // Results should be sorted by score (descending)
            for (let i = 0; i < results.length - 1; i++) {
                expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
            }
        });

        it('respects limit parameter', async () => {
            const results = await firestoreVectorSearch.search({
                collection: 'test-collection',
                query: 'test query',
                limit: 2
            });

            expect(results.length).toBeLessThanOrEqual(2);
        });

        it('includes metadata in results', async () => {
            const results = await firestoreVectorSearch.search({
                collection: 'test-collection',
                query: 'test query'
            });

            expect(results[0].metadata).toBeDefined();
            expect(results[0].content).toBeDefined();
            expect(results[0].docId).toBeDefined();
            expect(results[0].score).toBeDefined();
        });

        it('filters out documents without embeddings', async () => {
            const { createServerClient } = require('@/firebase/server-client');
            createServerClient.mockResolvedValue({
                firestore: {
                    collection: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                docs: [
                                    {
                                        id: 'valid',
                                        data: () => ({
                                            content: 'Valid doc',
                                            embedding_array: [0.1, 0.2, 0.3, 0.4, 0.5]
                                        })
                                    },
                                    {
                                        id: 'invalid',
                                        data: () => ({
                                            content: 'No embedding'
                                            // Missing embedding_array
                                        })
                                    }
                                ]
                            })
                        })
                    })
                }
            });

            const results = await firestoreVectorSearch.search({
                collection: 'mixed',
                query: 'test'
            });

            // Should only include the document with embedding
            expect(results.every(r => r.docId !== 'invalid')).toBe(true);
        });
    });
});

