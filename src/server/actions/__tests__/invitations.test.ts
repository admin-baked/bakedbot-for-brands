
// Mocks must be defined before imports to ensure they are available
jest.mock('@/firebase/admin', () => ({ getAdminFirestore: jest.fn() }));
jest.mock('@/server/auth/auth', () => ({ requireUser: jest.fn(), isSuperUser: jest.fn() }));
jest.mock('server-only', () => ({}));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        arrayUnion: jest.fn(),
        serverTimestamp: jest.fn(),
    }
}));
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-token')
}));

// Now Import
import { createInvitationAction, acceptInvitationAction } from '../invitations';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

describe('Invitation Server Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockTransaction: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mocks
        mockTransaction = {
            get: jest.fn(),
            update: jest.fn(),
            set: jest.fn(),
        };

        mockDoc = {
            id: 'invitation-id',
            set: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
        };

        const mockQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            where: jest.fn().mockReturnValue(mockQuery),
            add: jest.fn(),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection),
            runTransaction: jest.fn((cb) => cb(mockTransaction)),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('createInvitationAction', () => {
        it('should create an invitation for a brand role', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-1', email: 'test@example.com' });
            
            const result = await createInvitationAction({
                email: 'invitee@example.com',
                role: 'brand',
                targetOrgId: 'brand-123'
            });

            expect(result.success).toBe(true);
            expect(mockFirestore.collection).toHaveBeenCalledWith('invitations');
            expect(mockCollection.doc).toHaveBeenCalled();
            expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
                email: 'invitee@example.com',
                role: 'brand',
                targetOrgId: 'brand-123',
                status: 'pending'
            }));
        });
    });

    describe('acceptInvitationAction', () => {
        it('should accept an invitation', async () => {
            const mockInviteData = {
                id: 'invite-123',
                role: 'brand',
                targetOrgId: 'brand-123',
                status: 'pending',
                expiresAt: { toDate: () => new Date(Date.now() + 10000) }
            };
            
            mockCollection.where().limit().get.mockResolvedValue({
                empty: false,
                docs: [{ data: () => mockInviteData }]
            });

            (requireUser as jest.Mock).mockResolvedValue({ uid: 'new-user-1' });
            mockTransaction.get.mockResolvedValue({ exists: true });

            const result = await acceptInvitationAction('valid-token');

            expect(result.success).toBe(true);
            expect(mockFirestore.runTransaction).toHaveBeenCalled();
        });
    });
});
