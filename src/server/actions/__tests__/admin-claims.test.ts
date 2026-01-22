/**
 * Unit tests for admin-claims.ts security fixes
 * Q1 2026 Security Audit - CRITICAL finding remediation
 *
 * Tests verify that verifyClaimAction and rejectClaimAction
 * require Super User authentication before execution.
 */

// Mocks must be defined before imports
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn()
}));
jest.mock('../delete-account', () => ({
    isSuperUser: jest.fn()
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));
jest.mock('server-only', () => ({}));

import { verifyClaimAction, rejectClaimAction } from '../admin-claims';
import { getServerSessionUser } from '@/server/auth/session';
import { isSuperUser } from '@/server/actions/delete-account';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';

describe('Admin Claims Security', () => {
    let mockFirestore: any;
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore mocks
        mockDoc = {
            update: jest.fn().mockResolvedValue(undefined),
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('verifyClaimAction', () => {
        it('should throw error when user is not authenticated', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            await expect(verifyClaimAction('claim-123', 'entity-456'))
                .rejects.toThrow('Unauthorized: Super User access required');

            // Firestore should NOT be called
            expect(createServerClient).not.toHaveBeenCalled();
        });

        it('should throw error when user is not a Super User', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({
                uid: 'user-123',
                email: 'regular@example.com'
            });
            (isSuperUser as jest.Mock).mockResolvedValue(false);

            await expect(verifyClaimAction('claim-123', 'entity-456'))
                .rejects.toThrow('Unauthorized: Super User access required');

            // Firestore should NOT be called
            expect(mockFirestore.collection).not.toHaveBeenCalled();
        });

        it('should verify claim when user is a Super User', async () => {
            const mockUser = {
                uid: 'super-user-123',
                email: 'admin@bakedbot.ai'
            };
            (getServerSessionUser as jest.Mock).mockResolvedValue(mockUser);
            (isSuperUser as jest.Mock).mockResolvedValue(true);

            await verifyClaimAction('claim-123', 'entity-456');

            // Verify auth was checked
            expect(getServerSessionUser).toHaveBeenCalled();
            expect(isSuperUser).toHaveBeenCalledWith('super-user-123', 'admin@bakedbot.ai');

            // Verify Firestore was called correctly
            expect(mockFirestore.collection).toHaveBeenCalledWith('brandClaims');
            expect(mockCollection.doc).toHaveBeenCalledWith('claim-123');
            expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'verified',
                verifiedBy: 'super-user-123' // Should use actual user ID, not hardcoded 'admin'
            }));

            // Verify brand was updated
            expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
            expect(mockCollection.doc).toHaveBeenCalledWith('entity-456');

            // Verify cache revalidation
            expect(revalidatePath).toHaveBeenCalledWith('/admin/claims');
        });

        it('should record the actual admin UID, not hardcoded value', async () => {
            const mockUser = {
                uid: 'specific-admin-uid-xyz',
                email: 'specific@bakedbot.ai'
            };
            (getServerSessionUser as jest.Mock).mockResolvedValue(mockUser);
            (isSuperUser as jest.Mock).mockResolvedValue(true);

            await verifyClaimAction('claim-123', 'entity-456');

            // Get the first update call (brandClaims)
            const updateCall = mockDoc.update.mock.calls[0][0];
            expect(updateCall.verifiedBy).toBe('specific-admin-uid-xyz');
            expect(updateCall.verifiedBy).not.toBe('admin'); // OLD vulnerable code had hardcoded 'admin'
        });
    });

    describe('rejectClaimAction', () => {
        it('should throw error when user is not authenticated', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            await expect(rejectClaimAction('claim-123'))
                .rejects.toThrow('Unauthorized: Super User access required');

            expect(createServerClient).not.toHaveBeenCalled();
        });

        it('should throw error when user is not a Super User', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({
                uid: 'user-123',
                email: 'hacker@evil.com'
            });
            (isSuperUser as jest.Mock).mockResolvedValue(false);

            await expect(rejectClaimAction('claim-123'))
                .rejects.toThrow('Unauthorized: Super User access required');

            expect(mockFirestore.collection).not.toHaveBeenCalled();
        });

        it('should reject claim when user is a Super User', async () => {
            const mockUser = {
                uid: 'super-user-456',
                email: 'admin@bakedbot.ai'
            };
            (getServerSessionUser as jest.Mock).mockResolvedValue(mockUser);
            (isSuperUser as jest.Mock).mockResolvedValue(true);

            await rejectClaimAction('claim-789');

            // Verify auth was checked
            expect(getServerSessionUser).toHaveBeenCalled();
            expect(isSuperUser).toHaveBeenCalledWith('super-user-456', 'admin@bakedbot.ai');

            // Verify Firestore was called correctly
            expect(mockFirestore.collection).toHaveBeenCalledWith('brandClaims');
            expect(mockCollection.doc).toHaveBeenCalledWith('claim-789');
            expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'rejected',
                verifiedBy: 'super-user-456'
            }));

            expect(revalidatePath).toHaveBeenCalledWith('/admin/claims');
        });

        it('should record the actual admin UID for rejections too', async () => {
            const mockUser = {
                uid: 'rejector-admin-uid',
                email: 'rejector@bakedbot.ai'
            };
            (getServerSessionUser as jest.Mock).mockResolvedValue(mockUser);
            (isSuperUser as jest.Mock).mockResolvedValue(true);

            await rejectClaimAction('claim-123');

            const updateCall = mockDoc.update.mock.calls[0][0];
            expect(updateCall.verifiedBy).toBe('rejector-admin-uid');
            expect(updateCall.verifiedBy).not.toBe('admin');
        });
    });

    describe('Security: Privilege Escalation Prevention', () => {
        it('should prevent any authenticated user from verifying claims', async () => {
            // Simulate a regular authenticated user trying to verify a claim
            (getServerSessionUser as jest.Mock).mockResolvedValue({
                uid: 'regular-user',
                email: 'user@example.com',
                role: 'brand' // Has some role, but not super user
            });
            (isSuperUser as jest.Mock).mockResolvedValue(false);

            await expect(verifyClaimAction('claim-123', 'competitor-brand'))
                .rejects.toThrow('Unauthorized');
        });

        it('should prevent competitors from claiming brands they do not own', async () => {
            // Even if someone has auth, they can't claim unless super user
            (getServerSessionUser as jest.Mock).mockResolvedValue({
                uid: 'competitor-user',
                email: 'competitor@rival.com'
            });
            (isSuperUser as jest.Mock).mockResolvedValue(false);

            await expect(verifyClaimAction('my-claim', 'target-brand'))
                .rejects.toThrow('Unauthorized');

            // Ensure no database changes occurred
            expect(mockDoc.update).not.toHaveBeenCalled();
        });
    });
});
