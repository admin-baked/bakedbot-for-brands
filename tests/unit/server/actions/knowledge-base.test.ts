/**
 * @jest-environment node
 */

import {
    createKnowledgeBaseAction,
    addDocumentAction,
    searchKnowledgeBaseAction,
    getKnowledgeBasesAction,
    checkUsageLimitsAction,
    scrapeUrlAction,
    getSystemKnowledgeBasesAction,
    deleteKnowledgeBaseAction
} from '@/server/actions/knowledge-base';
import { KNOWLEDGE_LIMITS } from '@/types/knowledge-base';

// --- MOCKS ---

// 1. Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn()
}));

// 2. Mock Genkit - Importable mock to configure
jest.mock('@/ai/genkit', () => ({
    ai: {
        embed: jest.fn()
    }
}));

// 3. Mock Firebase - Jest mock factory must be self-contained or use strictly hoisted vars
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

// 4. Mock global fetch for scrapeUrlAction
global.fetch = jest.fn();

import { requireUser, isSuperUser } from '@/server/auth/auth';
import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';

describe('Knowledge Base Actions', () => {
    // Define spies/mocks here to be accessible in tests
    const mockEmbed = ai.embed as jest.Mock;
    const mockRequireUser = requireUser as jest.Mock;
    const mockIsSuperUser = isSuperUser as jest.Mock;
    const mockGetAdminFirestore = getAdminFirestore as jest.Mock;
    const mockCreateServerClient = createServerClient as jest.Mock;
    const mockFetch = global.fetch as jest.Mock;

    // Firestore Spies
    const mockAdd = jest.fn();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    const mockGet = jest.fn();
    const mockWhere = jest.fn();
    const mockOrderBy = jest.fn();

    // Helper to create a structured Firestore mock
    const createFirestoreMock = (overrides: any = {}) => {
        const mockDocReturn: any = {
            id: 'doc_123',
            exists: true,
            data: jest.fn(() => ({
                documentCount: 5,
                totalBytes: 1024,
                ownerId: 'brand_123',
                ownerType: 'brand',
                embedding: [0.1, 0.2, 0.3],
                title: 'Relevant',
                content: 'A',
                byteSize: 100,
                ...overrides
            })),
            set: mockSet,
            update: mockUpdate,
            delete: mockDelete,
            get: jest.fn() // Add get method for DocumentReference
        };
        // Self-referential get for simple mocking (Ref.get() -> Snapshot)
        mockDocReturn.get.mockResolvedValue(mockDocReturn);

        const mockCollectionReturn: any = {
            add: mockAdd,
            doc: jest.fn(() => mockDocReturn),
            where: mockWhere,
            orderBy: mockOrderBy,
            get: mockGet,
            limit: jest.fn().mockReturnThis()
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
            })),
            batch: jest.fn(() => ({
                set: mockSet,
                update: mockUpdate,
                delete: mockDelete,
                commit: jest.fn().mockResolvedValue(true)
            }))
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReset();
        mockEmbed.mockReset();

        // Setup default Auth
        mockRequireUser.mockResolvedValue({
            uid: 'user_123',
            email: 'test@example.com',
            role: 'brand',
            brandId: 'brand_123'
        });
        mockIsSuperUser.mockResolvedValue(false);

        // Setup default Genkit
        mockEmbed.mockResolvedValue([{ embedding: [0.1, 0.2, 0.3] }]);

        // Setup default Firestore
        const firestoreMock = createFirestoreMock();
        mockGetAdminFirestore.mockReturnValue(firestoreMock);
        mockCreateServerClient.mockResolvedValue({ firestore: firestoreMock });

        // Default collection get (empty by default unless specified)
        mockGet.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });
    });

    describe('createKnowledgeBaseAction', () => {
        it('should create a new knowledge base for brand', async () => {
            mockGet.mockResolvedValueOnce({ empty: true });
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
                ownerId: 'brand_123',
                totalBytes: 0
            }));
        });

        it('should block duplicates', async () => {
            mockGet.mockResolvedValueOnce({ empty: false });

            const result = await createKnowledgeBaseAction({
                ownerId: 'brand_123',
                ownerType: 'brand',
                name: 'My SOPs'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('already exists');
        });

        it('should allow super admin to create system KB', async () => {
            mockIsSuperUser.mockResolvedValue(true);
            mockGet.mockResolvedValueOnce({ empty: true });
            mockAdd.mockResolvedValueOnce({ id: 'kb_system', update: jest.fn() });

            const result = await createKnowledgeBaseAction({
                ownerId: 'system',
                ownerType: 'system',
                name: 'Global Compliance Rules'
            });

            expect(result.success).toBe(true);
        });

        it('should block non-super admin from creating system KB', async () => {
            mockIsSuperUser.mockResolvedValue(false);

            const result = await createKnowledgeBaseAction({
                ownerId: 'system',
                ownerType: 'system',
                name: 'Hacker KB'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('Only super admins');
        });
    });

    describe('deleteKnowledgeBaseAction', () => {
        it('should delete KB and its documents recursively', async () => {
            mockRequireUser.mockResolvedValue({ brandId: 'brand_123' });
            mockIsSuperUser.mockResolvedValue(false);

            mockRequireUser.mockResolvedValue({ brandId: 'brand_123' });
            mockIsSuperUser.mockResolvedValue(false);

            // Mock KB check
            const kbSnapshot = { exists: true, data: () => ({ ownerId: 'brand_123', ownerType: 'brand' }), ref: { collection: jest.fn() } };
            
            // Mock Documents Batch 1
            const batch1 = { empty: false, docs: [{ ref: 'doc1' }, { ref: 'doc2' }] };
            
            // Mock Documents Batch 2 (Empty)
            const batch2 = { empty: true };

            // Sequence: 1. Get Batch 1, 2. Get Batch 2 (Empty)
            mockGet
                .mockImplementationOnce(() => Promise.resolve(batch1))
                .mockImplementationOnce(() => Promise.resolve(batch2));

            const result = await deleteKnowledgeBaseAction('kb_123');

            expect(result).toEqual({ success: true, message: 'Knowledge Base deleted.' });
            expect(mockGet).toHaveBeenCalledTimes(2); // 2 batches checked
            expect(mockDelete).toHaveBeenCalledTimes(3); // 2 docs + 1 KB
        });

        it('should block unauthorized deletion', async () => {
             mockRequireUser.mockResolvedValue({ brandId: 'hacker_123' });
             mockGet.mockResolvedValueOnce({ 
                 exists: true, 
                 data: () => ({ ownerId: 'brand_123', ownerType: 'brand' }) 
             });

             const result = await deleteKnowledgeBaseAction('kb_123');
             
             expect(result.success).toBe(false);
             expect(result.message).toContain('Unauthorized');
        });
    });

    describe('addDocumentAction', () => {
        it('should require source field in input', async () => {
            // Validates that the AddDocumentSchema requires source
            const schema = await import('@/types/knowledge-base');
            const result = schema.AddDocumentSchema.safeParse({
                knowledgeBaseId: 'kb_123',
                title: 'Test',
                content: 'Content here to meet minimum',
                type: 'text'
                // missing source
            });
            expect(result.success).toBe(false);
        });

        it('should accept valid source values', async () => {
            const schema = await import('@/types/knowledge-base');
            const result = schema.AddDocumentSchema.safeParse({
                knowledgeBaseId: 'kb_123',
                title: 'Test',
                content: 'Content here to meet minimum',
                type: 'text',
                source: 'paste'
            });
            expect(result.success).toBe(true);
        });

        it('should validate KNOWLEDGE_LIMITS for free tier blocks upload', () => {
            expect(KNOWLEDGE_LIMITS.free.allowUpload).toBe(false);
        });
    });

    describe('checkUsageLimitsAction', () => {
        it('should return unlimited for system tier', async () => {
            mockIsSuperUser.mockResolvedValue(true);

            const result = await checkUsageLimitsAction('system', 'system');

            expect(result.isAtLimit).toBe(false);
            expect(result.limits.maxDocuments).toBe(Infinity);
        });
    });

    describe('searchKnowledgeBaseAction', () => {
        it('should search using cosine similarity fallback', async () => {
            mockEmbed.mockReset();
            mockEmbed.mockResolvedValue([{ embedding: [1, 0, 0] }]);

            // Mock stored documents with embeddings
            mockGet.mockResolvedValueOnce({
                forEach: (cb: any) => {
                    cb({
                        id: 'doc1',
                        data: () => ({ title: 'Relevant', content: 'A', source: 'paste', embedding: [1, 0, 0] })
                    });
                    cb({
                        id: 'doc2',
                        data: () => ({ title: 'Irrelevant', content: 'B', source: 'paste', embedding: [0, 1, 0] })
                    });
                }
            });

            const results = await searchKnowledgeBaseAction('kb_123', 'query', 5);

            expect(results).toHaveLength(1); // Only doc1 > 0.6 threshold
            expect(results[0].title).toBe('Relevant');
            expect(results[0].similarity).toBeCloseTo(1.0);
        });

        it('should return empty for short queries', async () => {
            const results = await searchKnowledgeBaseAction('kb_123', 'ab', 5);
            expect(results).toEqual([]);
        });
    });

    describe('scrapeUrlAction', () => {
        it('should fail for invalid URLs', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await scrapeUrlAction({
                knowledgeBaseId: 'kb_123',
                url: 'https://example.com/notfound'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('404');
        });

        it('should validate ScrapeUrlSchema', async () => {
            const schema = await import('@/types/knowledge-base');
            const result = schema.ScrapeUrlSchema.safeParse({
                knowledgeBaseId: 'kb_123',
                url: 'https://example.com/article'
            });
            expect(result.success).toBe(true);
        });
    });

    describe('getKnowledgeBasesAction', () => {
        it('should return KBs sorted by createdAt descending (in-memory sort)', async () => {
            const dateOld = new Date('2023-01-01');
            const dateNew = new Date('2023-12-31');
            const dateMid = new Date('2023-06-15');

            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'kb1',
                        data: () => ({ name: 'Old', createdAt: dateOld, updatedAt: dateOld })
                    },
                    {
                        id: 'kb2',
                        data: () => ({ name: 'New', createdAt: dateNew, updatedAt: dateNew })
                    },
                    {
                        id: 'kb3',
                        data: () => ({ name: 'Mid', createdAt: dateMid, updatedAt: dateMid })
                    }
                ]
            });

            const results = await getKnowledgeBasesAction('brand_123');

            expect(results).toHaveLength(3);
            expect(results[0].name).toBe('New'); // Dec 31
            expect(results[1].name).toBe('Mid'); // Jun 15
            expect(results[2].name).toBe('Old'); // Jan 01
        });
    });

    describe('KNOWLEDGE_LIMITS', () => {
        it('should have correct limits for free tier', () => {
            expect(KNOWLEDGE_LIMITS.free.maxDocuments).toBe(5);
            expect(KNOWLEDGE_LIMITS.free.allowUpload).toBe(false);
            expect(KNOWLEDGE_LIMITS.free.allowDrive).toBe(false);
        });

        it('should have correct limits for claim_pro tier', () => {
            expect(KNOWLEDGE_LIMITS.claim_pro.maxDocuments).toBe(50);
            expect(KNOWLEDGE_LIMITS.claim_pro.allowUpload).toBe(true);
            expect(KNOWLEDGE_LIMITS.claim_pro.allowDrive).toBe(false);
        });

        it('should have correct limits for starter tier', () => {
            expect(KNOWLEDGE_LIMITS.starter.maxDocuments).toBe(500);
            expect(KNOWLEDGE_LIMITS.starter.allowDrive).toBe(true);
        });

        it('should have unlimited for system tier', () => {
            expect(KNOWLEDGE_LIMITS.system.maxDocuments).toBe(Infinity);
        });
    });
});
