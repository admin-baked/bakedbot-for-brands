
import { createKnowledgeBaseAction, updateKnowledgeBaseAction } from '../knowledge-base';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/admin');
jest.mock('@/server/auth/auth');
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
    const mockCollection = {
        add: jest.fn(),
        doc: jest.fn(),
    };
    const mockDoc = {
        get: jest.fn(),
        update: jest.fn(),
        set: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
        mockDb.collection.mockReturnValue(mockCollection);
        mockCollection.doc.mockReturnValue(mockDoc);
        mockCollection.add.mockResolvedValue({ id: 'new-kb-id' });
        
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
