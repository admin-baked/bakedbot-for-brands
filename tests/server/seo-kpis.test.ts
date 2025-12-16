/**
 * Unit Tests for SEO KPIs Data Service
 * 
 * Tests:
 * - Page count calculations
 * - Claim metrics
 * - Page health scoring
 * - MRR ladder progression
 */

import { fetchSeoKpis, calculateMrrLadder } from '@/lib/seo-kpis';

// Mock Firestore
const mockCount = jest.fn();
const mockGet = jest.fn();
const mockCollection: any = jest.fn(() => ({
    doc: mockDoc,
    get: mockGet,
    count: () => ({ get: mockCount }),
    limit: () => ({ get: mockGet })
}));
const mockDoc: any = jest.fn(() => ({ collection: mockCollection }));
const mockFirestore = { collection: mockCollection };

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => Promise.resolve({ firestore: mockFirestore }))
}));

describe('SEO KPIs Data Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchSeoKpis', () => {
        it('should count pages by type', async () => {
            // Mock counts
            mockCount
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) }) // zip
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) })  // dispensary
                .mockResolvedValueOnce({ data: () => ({ count: 25 }) })  // brand
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) }) // city
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) });  // state

            // Mock page data for claim/health calculations
            mockGet
                .mockResolvedValueOnce({ docs: [], forEach: jest.fn() }) // dispensary pages
                .mockResolvedValueOnce({ docs: [], forEach: jest.fn() }); // brand pages

            const kpis = await fetchSeoKpis();

            expect(kpis.indexedPages.zip).toBe(100);
            expect(kpis.indexedPages.dispensary).toBe(50);
            expect(kpis.indexedPages.brand).toBe(25);
            expect(kpis.indexedPages.city).toBe(10);
            expect(kpis.indexedPages.state).toBe(5);
            expect(kpis.indexedPages.total).toBe(190);
        });

        it('should calculate claim metrics', async () => {
            // Mock counts
            mockCount
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 20 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
                .mockResolvedValueOnce({ data: () => ({ count: 2 }) });

            // Mock dispensary pages with some claimed
            const dispDocs = [
                { data: () => ({ claimedBy: 'user1' }) },
                { data: () => ({ claimedBy: null }) },
                { data: () => ({}) }
            ];

            // Mock brand pages with some claimed
            const brandDocs = [
                { data: () => ({ claimedBy: 'brand1' }) },
                { data: () => ({}) }
            ];

            mockGet
                .mockResolvedValueOnce({
                    docs: dispDocs,
                    forEach: (cb: any) => dispDocs.forEach(cb)
                })
                .mockResolvedValueOnce({
                    docs: brandDocs,
                    forEach: (cb: any) => brandDocs.forEach(cb)
                });

            const kpis = await fetchSeoKpis();

            expect(kpis.claimMetrics.totalClaimed).toBe(2); // 1 disp + 1 brand
            expect(kpis.claimMetrics.totalUnclaimed).toBe(28); // (20 + 10) - 2
        });

        it('should return Search Console placeholder when not configured', async () => {
            mockCount.mockResolvedValue({ data: () => ({ count: 0 }) });
            mockGet.mockResolvedValue({ docs: [], forEach: jest.fn() });

            const kpis = await fetchSeoKpis();

            expect(kpis.searchConsole.dataAvailable).toBe(false);
            expect(kpis.searchConsole.impressions).toBeNull();
            expect(kpis.searchConsole.clicks).toBeNull();
        });
    });

    describe('calculateMrrLadder', () => {
        it('should return Pre-Launch for $0 MRR', () => {
            const ladder = calculateMrrLadder(0);

            expect(ladder.currentTier).toBe('Pre-Launch');
            expect(ladder.nextMilestone).toBe(10000);
            expect(ladder.progress).toBe(0);
            expect(ladder.claimsNeeded).toBeGreaterThan(0);
        });

        it('should calculate progress toward $10K milestone', () => {
            const ladder = calculateMrrLadder(2500);

            expect(ladder.currentTier).toBe('Pre-Launch');
            expect(ladder.progress).toBe(25);
            expect(ladder.nextMilestone).toBe(10000);
        });

        it('should move to $10K tier when threshold reached', () => {
            const ladder = calculateMrrLadder(10000);

            expect(ladder.currentTier).toBe('$10K MRR');
            expect(ladder.nextMilestone).toBe(25000);
        });

        it('should move to $25K tier', () => {
            const ladder = calculateMrrLadder(25000);

            expect(ladder.currentTier).toBe('$25K MRR');
            expect(ladder.nextMilestone).toBe(50000);
        });

        it('should reach $50K tier', () => {
            const ladder = calculateMrrLadder(50000);

            expect(ladder.currentTier).toBe('$50K MRR');
            expect(ladder.nextMilestone).toBe(100000);
            expect(ladder.claimsNeeded).toBe(0);
        });

        it('should calculate claims needed based on $99 Claim Pro', () => {
            const ladder = calculateMrrLadder(5000);

            // At $5k MRR, need ~$5k more to hit $10k
            // At $99/claim, that's ~50 more claims
            expect(ladder.claimsNeeded).toBeLessThanOrEqual(100);
            expect(ladder.claimsNeeded).toBeGreaterThan(0);
        });
    });
});
