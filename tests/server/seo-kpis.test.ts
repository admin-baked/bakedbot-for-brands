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

// Mock Search Console service
jest.mock('@/server/services/growth/search-console', () => ({
    searchConsoleService: {
        getSiteSummary: jest.fn().mockResolvedValue({
            clicks: 0, impressions: 0, ctr: 0, avgPosition: 0,
            dateRange: { start: '2026-01-01', end: '2026-01-28' }
        }),
        getTopQueries: jest.fn().mockResolvedValue({
            queries: [], totalClicks: 0, totalImpressions: 0, avgPosition: 0,
            dateRange: { start: '2026-01-01', end: '2026-01-28' }
        }),
    },
    SearchConsoleService: jest.fn(),
}));

const emptySnapshot = { docs: [], forEach: jest.fn() };

describe('SEO KPIs Data Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchSeoKpis', () => {
        it('should count pages by type', async () => {
            // Mock counts (7 total: zip, configDisp, topLevelDisp, configBrand, topLevelBrand, city, state)
            mockCount
                .mockResolvedValueOnce({ data: () => ({ count: 100 }) }) // zip
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) })  // configDisp
                .mockResolvedValueOnce({ data: () => ({ count: 50 }) })  // topLevelDisp
                .mockResolvedValueOnce({ data: () => ({ count: 25 }) })  // configBrand
                .mockResolvedValueOnce({ data: () => ({ count: 25 }) })  // topLevelBrand
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })  // city
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) });  // state

            // Mock page data for claim/health calculations
            // 4 claim queries + 1 zipDocs query = 5 get() calls
            mockGet.mockResolvedValue(emptySnapshot);

            const kpis = await fetchSeoKpis();

            expect(kpis.indexedPages.zip).toBe(100);
            expect(kpis.indexedPages.dispensary).toBe(50);
            expect(kpis.indexedPages.brand).toBe(25);
            expect(kpis.indexedPages.city).toBe(10);
            expect(kpis.indexedPages.state).toBe(5);
            expect(kpis.indexedPages.total).toBe(190);
        });

        it('should calculate claim metrics', async () => {
            // Mock counts (7 total)
            mockCount
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })  // zip
                .mockResolvedValueOnce({ data: () => ({ count: 20 }) })  // configDisp
                .mockResolvedValueOnce({ data: () => ({ count: 20 }) })  // topLevelDisp
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })  // configBrand
                .mockResolvedValueOnce({ data: () => ({ count: 10 }) })  // topLevelBrand
                .mockResolvedValueOnce({ data: () => ({ count: 5 }) })   // city
                .mockResolvedValueOnce({ data: () => ({ count: 2 }) });  // state

            // Mock 4 claim doc queries + 1 zipDocs query
            const configDispDocs = [
                { id: 'disp1', data: () => ({ claimedBy: 'user1' }) },
                { id: 'disp2', data: () => ({ claimedBy: null }) },
                { id: 'disp3', data: () => ({}) }
            ];
            const topLevelDispDocs: any[] = [];
            const configBrandDocs = [
                { id: 'brand1', data: () => ({ claimedBy: 'brand1' }) },
                { id: 'brand2', data: () => ({}) }
            ];
            const topLevelBrandDocs: any[] = [];

            mockGet
                .mockResolvedValueOnce({
                    docs: configDispDocs,
                    forEach: (cb: any) => configDispDocs.forEach(cb)
                })
                .mockResolvedValueOnce({
                    docs: topLevelDispDocs,
                    forEach: (cb: any) => topLevelDispDocs.forEach(cb)
                })
                .mockResolvedValueOnce({
                    docs: configBrandDocs,
                    forEach: (cb: any) => configBrandDocs.forEach(cb)
                })
                .mockResolvedValueOnce({
                    docs: topLevelBrandDocs,
                    forEach: (cb: any) => topLevelBrandDocs.forEach(cb)
                })
                .mockResolvedValueOnce(emptySnapshot); // zipDocs for freshness

            const kpis = await fetchSeoKpis();

            expect(kpis.claimMetrics.totalClaimed).toBe(2); // 1 disp + 1 brand
            expect(kpis.claimMetrics.totalUnclaimed).toBe(28); // (20 + 10) - 2
        });

        it('should return Search Console placeholder when not configured', async () => {
            mockCount.mockResolvedValue({ data: () => ({ count: 0 }) });
            mockGet.mockResolvedValue(emptySnapshot);

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
