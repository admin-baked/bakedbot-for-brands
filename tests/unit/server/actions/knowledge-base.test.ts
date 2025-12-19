/**
 * @jest-environment node
 */

import {
    createKnowledgeBaseAction,
    addDocumentAction,
    searchKnowledgeBaseAction,
    getKnowledgeBasesAction
} from '@/server/actions/knowledge-base';

// --- MOCKS ---

// 1. Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

// 2. Mock Genkit - Importable mock to configure
jest.mock('@/ai/genkit', () => ({
    ai: {
        embed: jest.fn()
    }
}));

// 3. Mock Firebase - Jest mock factory must be self-contained or use strictly hoisted vars
// Easier pattern: Mock the module methods to return jest.fn(), then configure them in tests
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

import { requireUser } from '@/server/auth/auth';
import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';

describe('Knowledge Base Actions', () => {
    // Define spies/mocks here to be accessible in tests
    const mockEmbed = ai.embed as jest.Mock;
    const mockRequireUser = requireUser as jest.Mock;
    const mockGetAdminFirestore = getAdminFirestore as jest.Mock;
    const mockCreateServerClient = createServerClient as jest.Mock;

    // Firestore Spies
    const mockAdd = jest.fn();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    const mockGet = jest.fn();
    const mockWhere = jest.fn();
    const mockOrderBy = jest.fn();

    // Helper to create a structured Firestore mock
    const createFirestoreMock = () => {
        // Define objects first to allow circular references
        const mockDocReturn: any = {
            id: 'doc_123',
            exists: true,
            data: jest.fn(() => ({
                documentCount: 5,
                ownerId: 'brand_123',
                embedding: [0.1, 0.2, 0.3],
                title: 'Relevant',
                content: 'A'
            })),
            set: mockSet,
            update: mockUpdate,
            delete: mockDelete
        };

        const mockCollectionReturn: any = {
            add: mockAdd,
            doc: jest.fn(() => mockDocReturn),
            where: mockWhere,
            orderBy: mockOrderBy,
            get: mockGet
        };

        // Circular reference: Doc -> Collection
        mockDocReturn.collection = jest.fn(() => mockCollectionReturn);

        // Chain support for where/orderBy
        mockWhere.mockReturnValue(mockCollectionReturn);
        mockOrderBy.mockReturnValue(mockCollectionReturn);

        return {
            collection: jest.fn(() => mockCollectionReturn),
            runTransaction: jest.fn(async (callback) => await callback({
                get: jest.fn().mockResolvedValue(mockDocReturn),
                set: mockSet,
                update: mockUpdate,
                delete: mockDelete
            }))
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default Auth
        mockRequireUser.mockResolvedValue({
            uid: 'user_123',
            email: 'test@example.com',
            role: 'brand',
            brandId: 'brand_123'
        });

        // Setup default Genkit
        mockEmbed.mockResolvedValue([{ embedding: [0.1, 0.2, 0.3] }]);

        // Setup default Firestore
        const firestoreMock = createFirestoreMock();
        mockGetAdminFirestore.mockReturnValue(firestoreMock);
        mockCreateServerClient.mockResolvedValue({ firestore: firestoreMock });

        // Default collection get (empty by default unless specified)
        mockGet.mockResolvedValue({ empty: true, forEach: jest.fn() });
    });

    describe('createKnowledgeBaseAction', () => {
        it('should create a new knowledge base', async () => {
            // Mock empty existing check
            mockGet.mockResolvedValueOnce({ empty: true });
            // Mock add return
            mockAdd.mockResolvedValueOnce({ id: 'kb_new', update: jest.fn() });

            const result = await createKnowledgeBaseAction({
                ownerId: 'brand_123',
                ownerType: 'brand',
                name: 'My SOPs',
                description: 'Test description'
            });

            expect(result.success).toBe(true);
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My SOPs',
                ownerId: 'brand_123'
            }));
        });

        it('should block duplicates', async () => {
            // Mock existing check found
            mockGet.mockResolvedValueOnce({ empty: false });

            const result = await createKnowledgeBaseAction({
                ownerId: 'brand_123',
                ownerType: 'brand',
                name: 'My SOPs'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('already exists');
        });
    });

    describe('addDocumentAction', () => {
        it('should add a document and generate embedding', async () => {
            mockEmbed.mockResolvedValueOnce([{ embedding: [0.9, 0.8, 0.7] }]); // Mock embedding

            const result = await addDocumentAction({
                knowledgeBaseId: 'kb_123',
                title: 'Test Doc',
                content: 'This is some content to embed.',
                type: 'text'
            });

            expect(result.success).toBe(true);

            // Verify embedding call
            expect(mockEmbed).toHaveBeenCalled();

            // Verify Firestore Transaction
            expect(mockSet).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    embedding: [0.9, 0.8, 0.7],
                    content: 'This is some content to embed.'
                })
            );
        });
    });

    describe('searchKnowledgeBaseAction', () => {
        it('should search using cosine similarity', async () => {
            // 1. Mock query embedding
            mockEmbed.mockReset();
            mockEmbed.mockResolvedValue([{ embedding: [1, 0, 0] }]);

            // 2. Mock stored documents with embeddings
            mockGet.mockResolvedValueOnce({
                forEach: (cb: any) => {
                    cb({
                        id: 'doc1',
                        data: () => ({ title: 'Relevant', content: 'A', embedding: [1, 0, 0] }) // Similarity 1.0
                    });
                    cb({
                        id: 'doc2',
                        data: () => ({ title: 'Irrelevant', content: 'B', embedding: [0, 1, 0] }) // Similarity 0.0
                    });
                }
            });

            const results = await searchKnowledgeBaseAction('kb_123', 'query', 5);

            expect(results).toHaveLength(1); // Only doc1 > 0.6 threshold
            expect(results[0].title).toBe('Relevant');
            expect(results[0].similarity).toBeCloseTo(1.0);
        });
    });
});
