/**
 * Unit tests for Page Claims Server Actions
 * Tests the claim workflow and admin operations
 */

import {
    claimPage,
    checkPageAvailability,
    getClaimCapacity
} from '@/server/actions/page-claims';

// Mock the claim exclusivity module
jest.mock('@/lib/claim-exclusivity', () => ({
    createClaimRequest: jest.fn(() => Promise.resolve({ success: true, claimId: 'claim_test_123' })),
    isPageClaimable: jest.fn(() => Promise.resolve({ claimable: true })),
    canEntityClaimMore: jest.fn(() => Promise.resolve({
        canClaim: true,
        currentCount: 5,
        limit: 25,
        remaining: 20
    })),
    getEntityClaims: jest.fn(() => Promise.resolve([])),
    approveClaim: jest.fn(() => Promise.resolve({ success: true })),
    activateClaim: jest.fn(() => Promise.resolve({ success: true })),
    revokeClaim: jest.fn(() => Promise.resolve({ success: true })),
    generateInviteCode: jest.fn(() => Promise.resolve({ success: true, code: 'BKD-TEST123' })),
    getClaimStatus: jest.fn(() => Promise.resolve(null)),
    getPageOwner: jest.fn(() => Promise.resolve(null))
}));

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn(() => Promise.resolve({
                    empty: true,
                    docs: []
                }))
            }))
        }
    }))
}));

describe('Page Claims Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('claimPage', () => {
        it('should successfully claim an available page', async () => {
            const result = await claimPage(
                'zip_60601',
                'zip',
                'brand_123',
                'brand',
                'Cresco Labs',
                'starter'
            );

            expect(result.success).toBe(true);
            expect(result.claimId).toBeDefined();
        });

        it('should accept invite code when claiming', async () => {
            const result = await claimPage(
                'zip_60601',
                'zip',
                'brand_123',
                'brand',
                'Cresco Labs',
                'starter',
                'BKD-INVITE'
            );

            expect(result.success).toBe(true);
        });
    });

    describe('checkPageAvailability', () => {
        it('should return available when page is not claimed', async () => {
            const result = await checkPageAvailability('zip_60601', 'zip', 'brand');

            expect(result.available).toBe(true);
            expect(result.currentOwner).toBeUndefined();
        });
    });

    describe('getClaimCapacity', () => {
        it('should return capacity for Starter tier', async () => {
            const result = await getClaimCapacity('brand_123', 'brand', 'starter');

            expect(result.canClaim).toBe(true);
            expect(result.limit).toBe(25);
            expect(result.remaining).toBe(20);
            expect(result.used).toBe(5);
        });
    });

    describe('Claim Types', () => {
        it('should support brand entity type', async () => {
            const result = await claimPage(
                'city_chicago',
                'city',
                'brand_abc',
                'brand',
                'Brand Name',
                'growth'
            );
            expect(result.success).toBe(true);
        });

        it('should support dispensary entity type', async () => {
            const result = await claimPage(
                'zip_60602',
                'zip',
                'disp_xyz',
                'dispensary',
                'Dispensary Name',
                'scale'
            );
            expect(result.success).toBe(true);
        });
    });
});
