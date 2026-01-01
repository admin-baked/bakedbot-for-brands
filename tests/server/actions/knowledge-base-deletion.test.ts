
// Mocks must be at the top
jest.mock('@/ai/genkit', () => ({
    ai: {
        embed: jest.fn()
    }
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

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn()
}));

import { deleteKnowledgeBaseAction } from '@/server/actions/knowledge-base';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

describe('Knowledge Base Deletion Action', () => {
    let mockFirestore: any;
    let mockBatch: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockBatch = {
            delete: jest.fn(),
            commit: jest.fn().mockResolvedValue(true)
        };
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn(),
            delete: jest.fn(),
            batch: jest.fn(() => mockBatch)
        };
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('allows super_admin to delete system knowledge base', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-1', role: 'super_admin' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
        
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({ ownerType: 'system', ownerId: 'system', name: 'Global KB' })
        });
        
        // Mocking document subcollection for recursive delete
        mockFirestore.collection.mockImplementation((path: string) => {
            if (path === 'knowledge_bases') return mockFirestore;
            if (path === 'documents') return {
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ empty: true }) 
            };
            return mockFirestore;
        });

        const result = await deleteKnowledgeBaseAction('kb-123');
        expect(result.success).toBe(true);
        expect(mockFirestore.delete).toHaveBeenCalled();
    });

    it('denies non-super user from deleting system knowledge base', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'brand-1', role: 'brand', brandId: 'org-1' });
        (isSuperUser as jest.Mock).mockResolvedValue(false);
        
        mockFirestore.get.mockResolvedValueOnce({
            exists: true,
            data: () => ({ ownerType: 'system', ownerId: 'system', name: 'Global KB' })
        });

        const result = await deleteKnowledgeBaseAction('kb-123');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Unauthorized');
    });
});
