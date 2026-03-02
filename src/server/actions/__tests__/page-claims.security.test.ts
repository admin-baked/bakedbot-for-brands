jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/claim-exclusivity', () => ({
    createClaimRequest: jest.fn(),
    approveClaim: jest.fn(),
    activateClaim: jest.fn(),
    revokeClaim: jest.fn(),
    isPageClaimable: jest.fn(),
    getEntityClaims: jest.fn(),
    canEntityClaimMore: jest.fn(),
    generateInviteCode: jest.fn(),
    getClaimStatus: jest.fn(),
    getPageOwner: jest.fn(),
}));

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import {
    approveClaim,
    revokeClaim,
    generateInviteCode,
} from '@/lib/claim-exclusivity';
import {
    adminApproveClaim,
    adminRevokeClaim,
    adminGenerateInvite,
    getPendingClaims,
    getActiveClaims,
} from '../page-claims';

describe('page-claims admin security hardening', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('blocks adminApproveClaim when unauthenticated', async () => {
        (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

        const result = await adminApproveClaim('claim-1', 'admin-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
        expect(approveClaim).not.toHaveBeenCalled();
    });

    it('blocks adminApproveClaim for non-admin roles', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-1',
            role: 'brand',
        });

        const result = await adminApproveClaim('claim-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
        expect(approveClaim).not.toHaveBeenCalled();
    });

    it('blocks adminApproveClaim when adminUserId is spoofed', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'real-admin',
            role: 'super_user',
        });

        const result = await adminApproveClaim('claim-1', 'spoofed-admin');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
        expect(approveClaim).not.toHaveBeenCalled();
    });

    it('uses authenticated admin uid for adminApproveClaim', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'real-admin',
            role: 'super_admin',
        });
        (approveClaim as jest.Mock).mockResolvedValueOnce({ success: true });

        const result = await adminApproveClaim('claim-1', 'real-admin');

        expect(result.success).toBe(true);
        expect(approveClaim).toHaveBeenCalledWith('claim-1', 'real-admin');
    });

    it('uses authenticated admin uid for adminRevokeClaim and adminGenerateInvite', async () => {
        (requireUser as jest.Mock)
            .mockResolvedValueOnce({ uid: 'admin-7', role: 'admin' })
            .mockResolvedValueOnce({ uid: 'admin-7', role: 'admin' });

        (revokeClaim as jest.Mock).mockResolvedValueOnce({ success: true });
        (generateInviteCode as jest.Mock).mockResolvedValueOnce({
            success: true,
            code: 'INVITE-123',
        });

        const revokeResult = await adminRevokeClaim('claim-2', 'admin-7', 'fraud');
        const inviteResult = await adminGenerateInvite(
            'a@bakedbot.ai',
            'brand',
            ['zip-13210'],
            'admin-7',
            7
        );

        expect(revokeResult.success).toBe(true);
        expect(inviteResult.success).toBe(true);
        expect(revokeClaim).toHaveBeenCalledWith('claim-2', 'admin-7', 'fraud');
        expect(generateInviteCode).toHaveBeenCalledWith(
            'a@bakedbot.ai',
            'brand',
            ['zip-13210'],
            'admin-7',
            7
        );
    });

    it('returns [] for getPendingClaims when user is not admin', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-1',
            role: 'dispensary',
        });

        const result = await getPendingClaims();

        expect(result).toEqual([]);
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('returns pending/active claims only for admin users', async () => {
        const query = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest
                .fn()
                .mockResolvedValueOnce({
                    docs: [
                        { id: 'pending-1', data: () => ({ status: 'pending' }) },
                    ],
                })
                .mockResolvedValueOnce({
                    docs: [
                        { id: 'active-1', data: () => ({ status: 'active' }) },
                    ],
                }),
        };

        const firestore = {
            collection: jest.fn().mockReturnValue(query),
        };

        (requireUser as jest.Mock)
            .mockResolvedValueOnce({ uid: 'admin-1', role: 'super_user' })
            .mockResolvedValueOnce({ uid: 'admin-1', role: 'super_user' });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const pending = await getPendingClaims();
        const active = await getActiveClaims(10);

        expect(pending).toEqual([{ id: 'pending-1', status: 'pending' }]);
        expect(active).toEqual([{ id: 'active-1', status: 'active' }]);
        expect(createServerClient).toHaveBeenCalledTimes(2);
    });
});
