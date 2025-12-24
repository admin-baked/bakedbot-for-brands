
import { createKnowledgeBaseAction, updateKnowledgeBaseAction } from '../knowledge-base';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';

// Mocks must be likely hoisted, but definition matters
jest.mock('server-only', () => {});
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(),
        delete: jest.fn(),
    },
}));
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn(),
}));
jest.mock('@/ai/genkit', () => ({
    ai: { embed: jest.fn() }
}));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

describe('Knowledge Base Actions - System Instructions', () => {
    const mockDb = {
        collection: jest.fn(),
    };
    const mockDoc = {
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
    };
    
    // Support chaining where().where().get()
    const mockQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true }), // No duplicates by default
    };
    
    const mockCollection = {
        add: jest.fn(),
        doc: jest.fn(),
        where: jest.fn().mockReturnValue(mockQuery),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
        mockDb.collection.mockReturnValue(mockCollection);
        mockCollection.doc.mockReturnValue(mockDoc);
        
        // Fix: add returns a DocumentReference which has update()
        const mockDocRef = {
            id: 'new-kb-id',
            update: jest.fn().mockResolvedValue(true),
        };
        mockCollection.add.mockResolvedValue(mockDocRef);
        
        // Default auth mocks (Super User)
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user', email: 'test@example.com', brandId: 'brand-1' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
    });

    describe('createKnowledgeBaseAction', () => {
        it('should save systemInstructions when creating a KB', async () => {
             const input = {
                ownerId: 'system',
                ownerType: 'system' as const,
                name: 'Test KB',
                description: 'Description',
                systemInstructions: 'Act as a test bot.',
            };

            const result = await createKnowledgeBaseAction(input);

            expect(result.success).toBe(true);
            expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test KB',
                systemInstructions: 'Act as a test bot.',
                ownerType: 'system',
            }));
        });

        it('should default systemInstructions to empty string if not provided', async () => {
            const input = {
                ownerId: 'system',
                ownerType: 'system' as const,
                name: 'Test KB No Instructions',
            };

            const result = await createKnowledgeBaseAction(input);

            expect(result.success).toBe(true);
            expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test KB No Instructions',
                systemInstructions: '',
            }));
        });
    });

    describe('updateKnowledgeBaseAction', () => {
        it('should update systemInstructions', async () => {
            // Mock existing KB
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    id: 'kb-1',
                    ownerType: 'system',
                    ownerId: 'system',
                    name: 'Existing KB',
                    systemInstructions: 'Old instructions',
                }),
            });

            const input = {
                knowledgeBaseId: 'kb-1',
                systemInstructions: 'New instructions',
            };

            const result = await updateKnowledgeBaseAction(input);

            expect(result.success).toBe(true);
            expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
                systemInstructions: 'New instructions',
                updatedAt: expect.any(Date),
            }));
        });

        it('should fail if non-super-user tries to update system KB', async () => {
             (isSuperUser as jest.Mock).mockResolvedValue(false);

             mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    id: 'kb-1',
                    ownerType: 'system', // System KB
                    ownerId: 'system',
                }),
            });

            const input = {
                knowledgeBaseId: 'kb-1',
                systemInstructions: 'Hacked instructions',
            };

            const result = await updateKnowledgeBaseAction(input);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Unauthorized');
            expect(mockDoc.update).not.toHaveBeenCalled();
        });
    });
});
