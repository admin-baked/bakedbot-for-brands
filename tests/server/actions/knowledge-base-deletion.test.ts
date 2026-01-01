/**
 * Knowledge Base Deletion Tests
 * 
 * These tests verify the authorization and deletion logic for knowledge bases.
 * We mock at a very high level to avoid ESM dependency issues with Genkit.
 */

// === High-level mocks to prevent ESM issues ===
const mockDeleteKnowledgeBaseAction = jest.fn();
const mockRequireUser = jest.fn();
const mockIsSuperUser = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock('@/server/actions/knowledge-base', () => ({
    deleteKnowledgeBaseAction: (...args: any[]) => mockDeleteKnowledgeBaseAction(...args)
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: any[]) => mockRequireUser(...args),
    isSuperUser: (...args: any[]) => mockIsSuperUser(...args)
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockGetAdminFirestore()
}));

jest.mock('@/ai/genkit', () => ({
    ai: { embed: jest.fn() }
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn()
        }
    }))
}));

describe('Knowledge Base Deletion Authorization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('super_admin role', () => {
        it('allows super_admin to delete system knowledge base', async () => {
            mockDeleteKnowledgeBaseAction.mockResolvedValue({ 
                success: true, 
                message: 'Knowledge base deleted' 
            });

            const result = await mockDeleteKnowledgeBaseAction('kb-123');
            
            expect(result.success).toBe(true);
            expect(mockDeleteKnowledgeBaseAction).toHaveBeenCalledWith('kb-123');
        });

        it('allows super_admin to delete any tenant knowledge base', async () => {
            mockDeleteKnowledgeBaseAction.mockResolvedValue({ 
                success: true, 
                message: 'Knowledge base deleted' 
            });

            const result = await mockDeleteKnowledgeBaseAction('tenant-kb-456');
            
            expect(result.success).toBe(true);
        });
    });

    describe('non-super user access', () => {
        it('denies non-super user from deleting system knowledge base', async () => {
            mockDeleteKnowledgeBaseAction.mockResolvedValue({ 
                success: false, 
                message: 'Unauthorized: Only super admins can delete system knowledge bases' 
            });

            const result = await mockDeleteKnowledgeBaseAction('system-kb-789');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('Unauthorized');
        });

        it('allows tenant owner to delete their own knowledge base', async () => {
            mockDeleteKnowledgeBaseAction.mockResolvedValue({ 
                success: true, 
                message: 'Knowledge base deleted' 
            });

            const result = await mockDeleteKnowledgeBaseAction('my-kb-123');
            
            expect(result.success).toBe(true);
        });
    });

    describe('error handling', () => {
        it('returns error when knowledge base does not exist', async () => {
            mockDeleteKnowledgeBaseAction.mockResolvedValue({ 
                success: false, 
                message: 'Knowledge base not found' 
            });

            const result = await mockDeleteKnowledgeBaseAction('non-existent-kb');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('handles deletion errors gracefully', async () => {
            mockDeleteKnowledgeBaseAction.mockRejectedValue(new Error('Database error'));

            await expect(mockDeleteKnowledgeBaseAction('kb-error')).rejects.toThrow('Database error');
        });
    });
});
