/**
 * Unit Tests for Coverage Packs
 * 
 * Tests:
 * - Tier definitions
 * - Brand coverage calculation
 * - Upsell recommendations
 * - Upgrade value calculations
 */

import {
    COVERAGE_PACK_TIERS,
    getCoveragePackTier,
    getBrandCoverage,
    shouldOfferCoveragePack,
    calculateUpgradeValue
} from '@/lib/coverage-packs';

// Mock Firestore
const mockGet = jest.fn();
const mockCollection: any = jest.fn(() => ({ doc: mockDoc, get: mockGet }));
const mockDoc: any = jest.fn(() => ({ collection: mockCollection, get: mockGet, exists: true, data: mockGet }));
const mockFirestore = { collection: mockCollection };

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => Promise.resolve({ firestore: mockFirestore }))
}));

describe('Coverage Packs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('COVERAGE_PACK_TIERS', () => {
        it('should have 4 tier levels', () => {
            expect(COVERAGE_PACK_TIERS).toHaveLength(4);
        });

        it('should have increasing ZIP limits', () => {
            const limits = COVERAGE_PACK_TIERS.map(t => t.zipLimit);
            expect(limits[0]).toBeLessThan(limits[1]);
            expect(limits[1]).toBeLessThan(limits[2]);
            expect(limits[3]).toBe(-1); // Unlimited
        });

        it('should have increasing prices', () => {
            const prices = COVERAGE_PACK_TIERS.map(t => t.pricePerMonth);
            for (let i = 1; i < prices.length; i++) {
                expect(prices[i]).toBeGreaterThan(prices[i - 1]);
            }
        });
    });

    describe('getCoveragePackTier', () => {
        it('should return tier by ID', () => {
            const tier = getCoveragePackTier('growth');
            expect(tier).toBeDefined();
            expect(tier?.name).toBe('Growth Pack');
            expect(tier?.zipLimit).toBe(100);
        });

        it('should return undefined for invalid ID', () => {
            const tier = getCoveragePackTier('nonexistent');
            expect(tier).toBeUndefined();
        });
    });

    describe('getBrandCoverage', () => {
        it('should calculate brand coverage from ZIP pages', async () => {
            // Mock brand doc
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    name: 'Test Brand',
                    coveredZips: ['10001'],
                    coverageTier: 'starter'
                })
            });

            // Mock ZIP pages
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'zip_1', data: () => ({ zipCode: '10001', state: 'NY', brands: [{ slug: 'test-brand' }] }) },
                    { id: 'zip_2', data: () => ({ zipCode: '10002', state: 'NY', brands: [{ slug: 'test-brand' }] }) },
                    { id: 'zip_3', data: () => ({ zipCode: '60601', state: 'IL', brands: [{ slug: 'test-brand' }] }) }
                ]
            });

            const coverage = await getBrandCoverage('test-brand');

            expect(coverage).not.toBeNull();
            expect(coverage?.totalPresence).toBe(3);
            expect(coverage?.coveredZips).toHaveLength(1);
            expect(coverage?.uncoveredZips).toHaveLength(2);
            expect(coverage?.stateBreakdown).toHaveLength(2);
        });

        it('should return null for non-existent brand', async () => {
            mockGet.mockResolvedValueOnce({ exists: false });

            const coverage = await getBrandCoverage('fake-brand');

            expect(coverage).toBeNull();
        });
    });

    describe('shouldOfferCoveragePack', () => {
        it('should offer when there are uncovered ZIPs', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    name: 'Expanding Brand',
                    coveredZips: ['10001'],
                    coverageTier: 'starter'
                })
            });

            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'z1', data: () => ({ zipCode: '10001', state: 'NY', brands: [{ slug: 'expanding-brand' }] }) },
                    { id: 'z2', data: () => ({ zipCode: '10002', state: 'NY', brands: [{ slug: 'expanding-brand' }] }) }
                ]
            });

            const result = await shouldOfferCoveragePack('expanding-brand');

            expect(result.shouldOffer).toBe(true);
            expect(result.reason).toContain('not covered');
        });

        it('should not offer to unlimited tier users', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    name: 'Big Brand',
                    coveredZips: [],
                    coverageTier: 'unlimited'
                })
            });

            mockGet.mockResolvedValueOnce({ docs: [] });

            const result = await shouldOfferCoveragePack('big-brand');

            expect(result.shouldOffer).toBe(false);
            expect(result.reason).toContain('unlimited');
        });
    });

    describe('calculateUpgradeValue', () => {
        it('should calculate upgrade value from starter to growth', () => {
            const value = calculateUpgradeValue('starter', 'growth', 50);

            expect(value.additionalZips).toBe(50);
            expect(value.priceIncrease).toBe(150); // 249 - 99
            expect(value.estimatedMonthlyValue).toBe(100); // 50 * $2
            expect(value.roi).toBeGreaterThan(0);
        });

        it('should cap additional ZIPs at tier limit', () => {
            const value = calculateUpgradeValue('starter', 'growth', 200);

            // Growth = 100 ZIPs, Starter = 25, so max additional = 75
            expect(value.additionalZips).toBe(75);
        });

        it('should handle upgrade to unlimited', () => {
            const value = calculateUpgradeValue('enterprise', 'unlimited', 1000);

            expect(value.additionalZips).toBe(1000); // All uncovered
            expect(value.priceIncrease).toBe(400); // 999 - 599
        });

        it('should handle no current tier (new customer)', () => {
            const value = calculateUpgradeValue(undefined, 'starter', 20);

            expect(value.additionalZips).toBe(20);
            expect(value.priceIncrease).toBe(99);
        });
    });
});
