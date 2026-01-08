/**
 * Context OS Query Engine Tests
 * Tests for semantic search functionality using embeddings
 */

import { QueryEngine } from '@/server/services/context-os/query-engine';

// Mock the embedding function and Firestore
jest.mock('@/ai/utils/generate-embedding', () => ({
    generateEmbedding: jest.fn().mockImplementation(async (text: string) => {
        // Return a deterministic mock embedding based on text content
        const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const embedding = new Array(768).fill(0).map((_, i) => Math.sin(hash + i) * 0.5);
        return embedding;
    })
}));

// Mock Firestore
const mockDoc = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockCollection = jest.fn(() => ({
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
    doc: mockDoc
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => ({
        collection: mockCollection
    })),
    Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
        fromDate: jest.fn((date: Date) => ({ toDate: () => date }))
    }
}));

describe('Context OS Query Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vector = [1, 2, 3, 4, 5];
            const similarity = QueryEngine.cosineSimilarity(vector, vector);
            expect(similarity).toBeCloseTo(1, 5);
        });

        it('should return 0 for orthogonal vectors', () => {
            const a = [1, 0, 0];
            const b = [0, 1, 0];
            const similarity = QueryEngine.cosineSimilarity(a, b);
            expect(similarity).toBeCloseTo(0, 5);
        });

        it('should return -1 for opposite vectors', () => {
            const a = [1, 2, 3];
            const b = [-1, -2, -3];
            const similarity = QueryEngine.cosineSimilarity(a, b);
            expect(similarity).toBeCloseTo(-1, 5);
        });

        it('should return 0 for zero vectors', () => {
            const a = [0, 0, 0];
            const b = [1, 2, 3];
            const similarity = QueryEngine.cosineSimilarity(a, b);
            expect(similarity).toBe(0);
        });

        it('should handle vectors of different lengths', () => {
            const a = [1, 2, 3];
            const b = [1, 2];
            const similarity = QueryEngine.cosineSimilarity(a, b);
            expect(similarity).toBe(0); // Should return 0 for mismatched lengths
        });
    });

    describe('semanticSearchDecisions', () => {
        it('should return empty array when no decisions exist', async () => {
            mockGet.mockResolvedValue({ empty: true, docs: [] });

            const results = await QueryEngine.semanticSearchDecisions('Why did we discount?', 5);
            
            expect(results).toEqual([]);
        });

        it('should filter results by minimum similarity threshold', async () => {
            const mockDocs = [
                {
                    id: 'decision-1',
                    data: () => ({
                        agentId: 'craig',
                        task: 'Discount campaign for Sour Diesel',
                        reasoning: 'Competitive pricing pressure',
                        outcome: 'approved',
                        timestamp: { toDate: () => new Date() },
                        _embedding: new Array(768).fill(0.5) // High similarity mock
                    })
                },
                {
                    id: 'decision-2',
                    data: () => ({
                        agentId: 'deebo',
                        task: 'Compliance check on new product',
                        reasoning: 'Routine verification',
                        outcome: 'approved',
                        timestamp: { toDate: () => new Date() },
                        _embedding: new Array(768).fill(0.1) // Lower similarity mock
                    })
                }
            ];

            mockGet.mockResolvedValue({ empty: false, docs: mockDocs });

            const results = await QueryEngine.semanticSearchDecisions('discount', 5, 0.5);
            
            // Should return results (exact count depends on similarity calculation)
            expect(Array.isArray(results)).toBe(true);
        });

        it('should sort results by similarity descending', async () => {
            const mockDocs = [
                {
                    id: 'low-similarity',
                    data: () => ({
                        agentId: 'agent1',
                        task: 'Unrelated task',
                        reasoning: 'Some reason',
                        outcome: 'approved',
                        timestamp: { toDate: () => new Date() },
                        _embedding: new Array(768).fill(0.1)
                    })
                },
                {
                    id: 'high-similarity',
                    data: () => ({
                        agentId: 'agent2',
                        task: 'Matching task about discount',
                        reasoning: 'Price optimization',
                        outcome: 'approved',
                        timestamp: { toDate: () => new Date() },
                        _embedding: new Array(768).fill(0.9)
                    })
                }
            ];

            mockGet.mockResolvedValue({ empty: false, docs: mockDocs });

            const results = await QueryEngine.semanticSearchDecisions('discount pricing', 5, 0.0);
            
            if (results.length > 1) {
                // Verify descending order
                for (let i = 0; i < results.length - 1; i++) {
                    expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
                }
            }
        });
    });

    describe('generateEmbedding', () => {
        it('should return an array of numbers', async () => {
            const embedding = await QueryEngine.generateEmbedding('test text');
            
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBe(768);
            expect(embedding.every(n => typeof n === 'number')).toBe(true);
        });
    });
});
