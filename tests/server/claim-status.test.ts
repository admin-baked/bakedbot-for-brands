/**
 * Unit tests for Claim Status Actions
 * Tests the claim + subscription verification logic
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockClaimDoc = {
    id: 'claim_123',
    data: () => ({
        userId: 'user_123',
        status: 'verified',
        brandId: 'brand_123',
    }),
};

const mockSubscriptionDoc = {
    id: 'sub_123',
    data: () => ({
        userId: 'user_123',
        status: 'active',
    }),
};

const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({ firestore: mockFirestore }),
}));

describe('Claim Status Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isEntityClaimed', () => {
        it('should return true when entity is claimed AND has active subscription', async () => {
            // Mock claim query returns result
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockClaimDoc],
            });

            // Mock subscription query returns result
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockSubscriptionDoc],
            });

            const { isEntityClaimed } = await import('@/server/actions/claim-status');
            const result = await isEntityClaimed('brand_123', 'brand');

            expect(result).toBe(true);
        });

        it('should return false when entity is claimed but NO subscription', async () => {
            // Mock claim query returns result
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockClaimDoc],
            });

            // Mock subscription query is empty
            mockFirestore.get.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const { isEntityClaimed } = await import('@/server/actions/claim-status');
            const result = await isEntityClaimed('brand_123', 'brand');

            expect(result).toBe(false);
        });

        it('should return false when entity is NOT claimed', async () => {
            // Mock claim query is empty
            mockFirestore.get.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const { isEntityClaimed } = await import('@/server/actions/claim-status');
            const result = await isEntityClaimed('unclaimed_brand', 'brand');

            expect(result).toBe(false);
        });

        it('should work for dispensaries', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'claim_456',
                    data: () => ({
                        userId: 'user_456',
                        status: 'verified',
                        dispensaryId: 'disp_123',
                    }),
                }],
            });

            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockSubscriptionDoc],
            });

            const { isEntityClaimed } = await import('@/server/actions/claim-status');
            const result = await isEntityClaimed('disp_123', 'dispensary');

            expect(result).toBe(true);
        });
    });

    describe('getClaimDetails', () => {
        it('should return claimed=true and paid=true with active subscription', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [{
                    id: 'claim_789',
                    data: () => ({
                        userId: 'user_789',
                        status: 'verified',
                        verifiedAt: { toDate: () => new Date('2024-01-15') },
                    }),
                }],
            });

            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockSubscriptionDoc],
            });

            const { getClaimDetails } = await import('@/server/actions/claim-status');
            const result = await getClaimDetails('brand_123', 'brand');

            expect(result.isClaimed).toBe(true);
            expect(result.isPaid).toBe(true);
            expect(result.claimId).toBe('claim_789');
        });

        it('should return claimed=true and paid=false without subscription', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                empty: false,
                docs: [mockClaimDoc],
            });

            mockFirestore.get.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const { getClaimDetails } = await import('@/server/actions/claim-status');
            const result = await getClaimDetails('brand_123', 'brand');

            expect(result.isClaimed).toBe(true);
            expect(result.isPaid).toBe(false);
        });

        it('should return claimed=false for unclaimed entity', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                empty: true,
                docs: [],
            });

            const { getClaimDetails } = await import('@/server/actions/claim-status');
            const result = await getClaimDetails('new_brand', 'brand');

            expect(result.isClaimed).toBe(false);
            expect(result.isPaid).toBe(false);
        });
    });
});

describe('Claim Status Business Rules', () => {
    it('requires BOTH claim AND subscription for checkout', () => {
        // This is a documentation test to clarify the business logic
        const scenarios = [
            { claimed: false, subscription: false, canCheckout: false },
            { claimed: true, subscription: false, canCheckout: false },
            { claimed: false, subscription: true, canCheckout: false },
            { claimed: true, subscription: true, canCheckout: true },
        ];

        scenarios.forEach(({ claimed, subscription, canCheckout }) => {
            // Checkout enabled only when both conditions are met
            expect(claimed && subscription).toBe(canCheckout);
        });
    });
});
