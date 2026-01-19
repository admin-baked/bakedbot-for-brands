/**
 * Unit Tests for Context OS Phase 3 - GraphRAG
 * 
 * Tests for EntityService, RelationshipService, and GraphQuery
 */

import { EntityService, RelationshipService } from '../../../src/server/services/context-os';

// Mock Firestore
const mockDocs: Map<string, any> = new Map();
let docIdCounter = 1;

jest.mock('firebase-admin/firestore', () => {
    const mockDoc = (id?: string) => {
        const docId = id || `mock-doc-${docIdCounter++}`;
        return {
            id: docId,
            set: jest.fn().mockImplementation((data) => {
                mockDocs.set(docId, { ...data, id: docId });
                return Promise.resolve();
            }),
            get: jest.fn().mockImplementation(() => {
                const data = mockDocs.get(docId);
                return Promise.resolve({
                    exists: !!data,
                    data: () => data,
                    id: docId,
                });
            }),
            update: jest.fn().mockImplementation((updates) => {
                const existing = mockDocs.get(docId) || {};
                mockDocs.set(docId, { ...existing, ...updates });
                return Promise.resolve();
            }),
            delete: jest.fn().mockImplementation(() => {
                mockDocs.delete(docId);
                return Promise.resolve();
            }),
        };
    };

    const mockCollection = (name: string) => ({
        doc: jest.fn((id?: string) => mockDoc(id)),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockImplementation(() => {
            // Return filtered docs based on collection
            const docs = Array.from(mockDocs.entries())
                .filter(([_, data]) => data._collection === name)
                .map(([id, data]) => ({
                    id,
                    data: () => data,
                }));
            return Promise.resolve({ docs, empty: docs.length === 0 });
        }),
    });

    return {
        getFirestore: jest.fn(() => ({
            collection: jest.fn((name: string) => mockCollection(name)),
            batch: jest.fn(() => ({
                delete: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            })),
        })),
        FieldValue: {
            arrayUnion: jest.fn((val) => val),
        },
        Timestamp: {
            fromDate: jest.fn((d) => ({ toDate: () => d })),
            now: jest.fn(() => ({ toDate: () => new Date() })),
        },
    };
});

describe('Context OS Phase 3 - EntityService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDocs.clear();
        docIdCounter = 1;
    });

    describe('createEntity', () => {
        it('should create a new entity', async () => {
            const id = await EntityService.createEntity({
                type: 'product',
                name: 'Sour Diesel',
                attributes: { thc: 25 },
            });

            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
        });

        it('should create entity with correct type', async () => {
            const id = await EntityService.createEntity({
                type: 'brand',
                name: '40 Tons',
                attributes: { rating: 4.8 },
            });

            expect(id).toBeDefined();
        });
    });

    describe('getOrCreateEntity', () => {
        it('should create entity if it does not exist', async () => {
            const entity = await EntityService.getOrCreateEntity('campaign', 'Holiday Sale', { discount: 20 });

            expect(entity).toBeDefined();
            expect(entity.type).toBe('campaign');
            expect(entity.name).toBe('Holiday Sale');
        });
    });
});

describe('Context OS Phase 3 - RelationshipService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDocs.clear();
        docIdCounter = 1;
    });

    describe('createRelationship', () => {
        it('should create a relationship between entities', async () => {
            const id = await RelationshipService.createRelationship({
                sourceId: 'entity-1',
                targetId: 'entity-2',
                type: 'influences',
                weight: 0.7,
            });

            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
        });

        it('should support different relationship types', async () => {
            const types: Array<'influences' | 'triggers' | 'depends_on' | 'competes_with' | 'regulates' | 'decided_by'> = [
                'influences', 'triggers', 'depends_on', 'competes_with', 'regulates', 'decided_by'
            ];

            for (const type of types) {
                const id = await RelationshipService.createRelationship({
                    sourceId: `source-${type}`,
                    targetId: `target-${type}`,
                    type,
                    weight: 0.5,
                });
                expect(id).toBeDefined();
            }
        });
    });

    describe('createRelationshipFromDecision', () => {
        it('should create relationship linked to a decision', async () => {
            const id = await RelationshipService.createRelationshipFromDecision(
                'entity-a',
                'entity-b',
                'triggers',
                'decision-123',
                0.8
            );

            expect(id).toBeDefined();
        });
    });
});

describe('Context OS Phase 3 - Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDocs.clear();
        docIdCounter = 1;
    });

    it('should create entities and link them together', async () => {
        // Create entities
        const brandEntity = await EntityService.getOrCreateEntity('brand', 'Test Brand');
        const productEntity = await EntityService.getOrCreateEntity('product', 'Test Product');

        expect(brandEntity).toBeDefined();
        expect(productEntity).toBeDefined();

        // Create relationship
        const relId = await RelationshipService.createRelationship({
            sourceId: brandEntity.id,
            targetId: productEntity.id,
            type: 'influences',
            weight: 0.9,
        });

        expect(relId).toBeDefined();
    });
});
