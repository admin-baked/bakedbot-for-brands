/**
 * Unit tests for admin user invitation actions
 */

// Mocks must be defined before imports
jest.mock('@/firebase/admin', () => ({
    getAdminAuth: jest.fn(),
    getAdminFirestore: jest.fn(),
}));
jest.mock('@/lib/notifications/email-service', () => ({
    emailService: {
        sendInvitationEmail: jest.fn().mockResolvedValue(true),
    },
}));
jest.mock('server-only', () => ({}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-org-uuid'),
}));

import { inviteUser, resendInvitation, getPendingInvitations } from '../users';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import { emailService } from '@/lib/notifications/email-service';

describe('Admin User Actions', () => {
    let mockAuth: any;
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Auth mocks
        mockAuth = {
            getUserByEmail: jest.fn(),
            createUser: jest.fn(),
            setCustomUserClaims: jest.fn(),
            generatePasswordResetLink: jest.fn().mockResolvedValue('https://example.com/reset?token=abc123'),
        };

        // Setup Firestore mocks
        mockDoc = {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn(),
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        (getAdminAuth as jest.Mock).mockReturnValue(mockAuth);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('inviteUser', () => {
        it('should create a new brand admin user with organization', async () => {
            // User doesn't exist
            mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
            mockAuth.createUser.mockResolvedValue({ uid: 'new-user-123' });

            const result = await inviteUser({
                email: 'newbrand@example.com',
                role: 'brand_admin',
                businessName: 'Test Brand Co',
                firstName: 'John',
                sendEmail: true,
            });

            expect(result.success).toBe(true);
            expect(result.link).toBe('https://example.com/reset?token=abc123');

            // Should create user
            expect(mockAuth.createUser).toHaveBeenCalledWith({
                email: 'newbrand@example.com',
                emailVerified: true,
                displayName: 'John',
                disabled: false,
            });

            // Should create brand record
            expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
            expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Brand Co',
                ownerId: 'new-user-123',
                status: 'pending_onboarding',
            }));

            // Should create user profile
            expect(mockFirestore.collection).toHaveBeenCalledWith('users');

            // Should set custom claims
            expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('new-user-123', expect.objectContaining({
                role: 'brand_admin',
                brandId: 'mock-org-uuid',
            }));

            // Should send email
            expect(emailService.sendInvitationEmail).toHaveBeenCalledWith(
                'newbrand@example.com',
                'https://example.com/reset?token=abc123',
                'brand_admin',
                'Test Brand Co'
            );
        });

        it('should create a new dispensary admin user with retailer', async () => {
            mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
            mockAuth.createUser.mockResolvedValue({ uid: 'new-disp-user' });

            const result = await inviteUser({
                email: 'dispensary@example.com',
                role: 'dispensary_admin',
                businessName: 'Green Leaf Dispensary',
                sendEmail: true,
            });

            expect(result.success).toBe(true);

            // Should create retailer record
            expect(mockFirestore.collection).toHaveBeenCalledWith('retailers');
            expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Green Leaf Dispensary',
                ownerId: 'new-disp-user',
                status: 'active',
                claimStatus: 'claimed',
            }));

            // Should set dispensary claims
            expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('new-disp-user', expect.objectContaining({
                role: 'dispensary_admin',
                dispensaryId: 'mock-org-uuid',
                locationId: 'mock-org-uuid',
            }));
        });

        it('should create a customer user without organization', async () => {
            mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
            mockAuth.createUser.mockResolvedValue({ uid: 'customer-123' });

            const result = await inviteUser({
                email: 'customer@example.com',
                role: 'customer',
                sendEmail: true,
            });

            expect(result.success).toBe(true);

            // Should NOT create brand or retailer
            expect(mockFirestore.collection).not.toHaveBeenCalledWith('brands');
            expect(mockFirestore.collection).not.toHaveBeenCalledWith('retailers');

            // Should set simple claims
            expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('customer-123', {
                role: 'customer',
            });
        });

        it('should skip email when sendEmail is false', async () => {
            mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
            mockAuth.createUser.mockResolvedValue({ uid: 'no-email-user' });

            const result = await inviteUser({
                email: 'noemail@example.com',
                role: 'brand_admin',
                businessName: 'No Email Brand',
                sendEmail: false,
            });

            expect(result.success).toBe(true);
            expect(emailService.sendInvitationEmail).not.toHaveBeenCalled();
        });

        it('should reject if user already exists with same role', async () => {
            mockAuth.getUserByEmail.mockResolvedValue({
                uid: 'existing-user',
                customClaims: { role: 'brand_admin' },
            });

            const result = await inviteUser({
                email: 'existing@example.com',
                role: 'brand_admin',
                businessName: 'Existing Brand',
                sendEmail: true,
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists with role');
        });

        it('should handle invalid email', async () => {
            const result = await inviteUser({
                email: 'not-an-email',
                role: 'brand_admin',
                businessName: 'Test',
                sendEmail: true,
            });

            expect(result.success).toBe(false);
        });

        it('should support all role types', async () => {
            const roles = ['brand_admin', 'brand_member', 'dispensary_admin', 'dispensary_staff', 'budtender', 'customer', 'super_user'] as const;

            for (const role of roles) {
                jest.clearAllMocks();
                mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
                mockAuth.createUser.mockResolvedValue({ uid: `user-${role}` });

                const result = await inviteUser({
                    email: `${role}@example.com`,
                    role,
                    businessName: role.includes('brand') || role.includes('dispensary') || role === 'budtender' ? 'Test Biz' : undefined,
                    sendEmail: false,
                });

                expect(result.success).toBe(true);
                expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(
                    `user-${role}`,
                    expect.objectContaining({ role })
                );
            }
        });
    });

    describe('resendInvitation', () => {
        it('should resend invitation email to existing user', async () => {
            mockAuth.getUserByEmail.mockResolvedValue({ uid: 'user-to-resend' });
            mockDoc.get.mockResolvedValue({
                data: () => ({ role: 'brand_admin', businessName: 'Resend Brand' }),
            });

            const result = await resendInvitation('resend@example.com');

            expect(result.success).toBe(true);
            expect(mockAuth.generatePasswordResetLink).toHaveBeenCalledWith('resend@example.com');
            expect(emailService.sendInvitationEmail).toHaveBeenCalled();
        });

        it('should fail for non-existent user', async () => {
            mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });

            const result = await resendInvitation('noone@example.com');

            expect(result.success).toBe(false);
        });
    });

    describe('getPendingInvitations', () => {
        it('should return list of pending invitations', async () => {
            mockCollection.get.mockResolvedValue({
                docs: [
                    { id: 'inv-1', data: () => ({ email: 'a@test.com', role: 'brand_admin' }) },
                    { id: 'inv-2', data: () => ({ email: 'b@test.com', role: 'dispensary_admin' }) },
                ],
            });

            const result = await getPendingInvitations();

            expect(result.success).toBe(true);
            expect(result.invitations).toHaveLength(2);
            expect(mockCollection.where).toHaveBeenCalledWith('isNewUser', '==', true);
        });
    });
});
