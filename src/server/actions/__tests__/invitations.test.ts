jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/rbac', () => ({
    requireBrandAccess: jest.fn(),
    requireDispensaryAccess: jest.fn(),
    requirePermission: jest.fn(),
    isBrandRole: (role: string) => ['brand', 'brand_admin', 'brand_member'].includes(role),
    isDispensaryRole: (role: string) => ['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender'].includes(role),
    normalizeRole: (role: string) => {
        if (role === 'brand') return 'brand_admin';
        if (role === 'dispensary') return 'dispensary_admin';
        if (role === 'super_admin') return 'super_user';
        return role;
    },
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('../platform-signup', () => ({
    handlePlatformSignup: jest.fn(),
}));

jest.mock('server-only', () => ({}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        arrayUnion: jest.fn((value: unknown) => ({ __arrayUnion: value })),
    },
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mockuuid'),
}));

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { handlePlatformSignup } from '../platform-signup';
import { createInvitationAction, acceptInvitationAction } from '../invitations';

function makeSnapshot(data?: Record<string, unknown>) {
    return {
        exists: Boolean(data),
        data: () => data,
    };
}

describe('Invitation Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NEXT_PUBLIC_CANONICAL_URL = 'https://bakedbot.ai';
        delete process.env.NEXT_PUBLIC_BASE_URL;
        (isSuperUser as jest.Mock).mockResolvedValue(false);
        (createServerClient as jest.Mock).mockResolvedValue({
            auth: { setCustomUserClaims: jest.fn().mockResolvedValue(undefined) },
        });
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });
        (handlePlatformSignup as jest.Mock).mockResolvedValue(undefined);
    });

    it('creates canonical 7-day invitation links with organization-specific copy', async () => {
        const invitationDoc = {
            id: 'new-invitation',
            set: jest.fn().mockResolvedValue(undefined),
        };

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'organizations') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot()),
                        })),
                    };
                }

                if (name === 'retailers') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot({ name: 'Thrive Syracuse' })),
                        })),
                    };
                }

                if (name === 'invitations') {
                    return {
                        doc: jest.fn(() => invitationDoc),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(firestore);
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'admin-1',
            email: 'admin@bakedbot.ai',
            currentOrgId: 'dispensary-123',
        });

        const result = await createInvitationAction({
            email: 'invitee@example.com',
            role: 'dispensary_admin',
            targetOrgId: 'dispensary-123',
            sendEmail: true,
        });

        expect(result.success).toBe(true);
        expect(result.link).toBe('https://bakedbot.ai/invite/mockuuidmockuuid');
        expect(invitationDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            email: 'invitee@example.com',
            role: 'dispensary_admin',
            targetOrgId: 'dispensary-123',
            organizationName: 'Thrive Syracuse',
            status: 'pending',
        }));

        const createdInvitation = invitationDoc.set.mock.calls[0][0];
        expect(createdInvitation.expiresAt).toBeInstanceOf(Date);
        expect(createdInvitation.expiresAt.getTime() - createdInvitation.createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

        expect(sendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'invitee@example.com',
            subject: 'Invitation to join Thrive Syracuse',
            htmlBody: expect.stringContaining('https://bakedbot.ai/invite/mockuuidmockuuid'),
            textBody: expect.stringContaining('This link expires in 7 days'),
        }));
    });

    it('accepts dispensary invitations into the modern org membership model', async () => {
        const invitationData = {
            id: 'invite-123',
            email: 'invitee@example.com',
            role: 'dispensary_admin',
            targetOrgId: 'dispensary-123',
            organizationName: 'Thrive Syracuse',
            organizationType: 'dispensary',
            invitedBy: 'admin-1',
            status: 'pending',
            token: 'valid-token',
            createdAt: { toDate: () => new Date('2026-03-10T00:00:00.000Z') },
            expiresAt: { toDate: () => new Date('2026-03-20T00:00:00.000Z') },
        };

        const inviteQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [{ data: () => invitationData }],
            }),
        };

        const invitationRecordRef = { id: 'invite-123' };
        const userRef = { id: 'new-user-1' };
        const transaction = {
            get: jest.fn().mockResolvedValue({ exists: false, data: () => undefined }),
            update: jest.fn(),
            set: jest.fn(),
        };

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'invitations') {
                    return {
                        where: jest.fn(() => inviteQuery),
                        doc: jest.fn(() => invitationRecordRef),
                    };
                }

                if (name === 'users') {
                    return {
                        doc: jest.fn(() => userRef),
                    };
                }

                if (name === 'organizations') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot()),
                        })),
                    };
                }

                if (name === 'retailers') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot({ name: 'Thrive Syracuse' })),
                        })),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
            runTransaction: jest.fn(async (callback: (txn: typeof transaction) => Promise<void>) => callback(transaction)),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(firestore);
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'new-user-1',
            email: 'invitee@example.com',
        });

        const result = await acceptInvitationAction('valid-token');

        expect(result.success).toBe(true);
        expect(transaction.update).toHaveBeenCalledWith(invitationRecordRef, expect.objectContaining({
            status: 'accepted',
            acceptedBy: 'new-user-1',
        }));
        expect(transaction.set).toHaveBeenCalledWith(
            userRef,
            expect.objectContaining({
                uid: 'new-user-1',
                email: 'invitee@example.com',
                role: 'dispensary_admin',
                orgId: 'dispensary-123',
                currentOrgId: 'dispensary-123',
                dispensaryId: 'dispensary-123',
                locationId: 'dispensary-123',
            }),
            { merge: true }
        );
        const { auth } = await (createServerClient as jest.Mock).mock.results[0].value;
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith('new-user-1', expect.objectContaining({
            role: 'dispensary_admin',
            orgId: 'dispensary-123',
            currentOrgId: 'dispensary-123',
            dispensaryId: 'dispensary-123',
            locationId: 'dispensary-123',
        }));
        expect(handlePlatformSignup).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'new-user-1',
            role: 'dispensary_admin',
            orgId: 'dispensary-123',
            dispensaryId: 'dispensary-123',
        }));
    });
});
