// Mock heavy dependencies to avoid ESM/Genkit load issues
jest.mock('@/ai/flows/update-product-embeddings', () => ({
    updateProductEmbeddings: jest.fn(),
}));
jest.mock('@/server/jobs/seo-generator', () => ({
    runChicagoPilotJob: jest.fn(),
}));
jest.mock('@/server/jobs/brand-discovery-job', () => ({
    runBrandPilotJob: jest.fn(),
}));
jest.mock('@/server/services/page-generator', () => ({
    PageGeneratorService: jest.fn(),
}));
jest.mock('@/server/services/page-generator', () => ({
    PageGeneratorService: jest.fn(),
}));
jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {},
}));

// Mock Next.js Server Action dependencies
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));
jest.mock('next/headers', () => ({
    cookies: jest.fn().mockResolvedValue({
        get: jest.fn(),
        getAll: jest.fn().mockReturnValue([]),
    }),
}));

import { approveUser, rejectUser } from '@/app/dashboard/ceo/actions';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/lib/notifications/email-service', () => ({
    emailService: {
        sendAccountApprovedEmail: jest.fn().mockResolvedValue(true),
    },
}));

describe('User Approval Actions', () => {
    let mockFirestore: any;
    let mockUserDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserDoc = {
            update: jest.fn(),
            get: jest.fn().mockResolvedValue({
                data: () => ({ email: 'test@bakedbot.ai', displayName: 'Test User' }),
            }),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue(mockUserDoc),
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (requireUser as jest.Mock).mockResolvedValue({ role: 'owner', uid: 'admin-123' });
    });

    it('approveUser updates status and sends email', async () => {
        const uid = 'user-pending-123';
        const result = await approveUser(uid);

        // Verify requireUser was called with correct roles
        expect(requireUser).toHaveBeenCalledWith(['owner', 'super_user']);

        // Verify Firestore update
        expect(mockFirestore.collection).toHaveBeenCalledWith('users');
        expect(mockFirestore.collection('users').doc).toHaveBeenCalledWith(uid);
        expect(mockUserDoc.update).toHaveBeenCalledWith(expect.objectContaining({
            approvalStatus: 'approved',
            status: 'active'
        }));

        // Verify result
        expect(result.success).toBe(true);
    });

    it('rejectUser updates status to rejected', async () => {
        const uid = 'user-rejected-123';
        const result = await rejectUser(uid);

        expect(requireUser).toHaveBeenCalledWith(['owner', 'super_user']);

        expect(mockUserDoc.update).toHaveBeenCalledWith(expect.objectContaining({
            approvalStatus: 'rejected',
            status: 'disabled'
        }));

        expect(result.success).toBe(true);
    });
});
