/**
 * Unit Tests for Dataset Index Services
 * 
 * Tests the data fetching and calculation logic for:
 * - Cannabis Desert Index
 * - Market Freshness Index
 * - Brand Availability Index
 */

import { fetchDesertIndexSummary, fetchDesertIndexByState } from '@/lib/desert-index-data';
import { fetchFreshnessIndexSummary, fetchFreshnessIndexByState } from '@/lib/freshness-index-data';
import { fetchBrandAvailabilitySummary, fetchBrandAvailabilityIndex } from '@/lib/brand-availability-data';

// Mock Firestore
const mockGet = jest.fn();
const mockCollection: any = jest.fn(() => ({ doc: mockDoc, get: mockGet }));
const mockDoc: any = jest.fn(() => ({ collection: mockCollection, get: mockGet }));
const mockFirestore = { collection: mockCollection };

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => Promise.resolve({ firestore: mockFirestore }))
}));

describe('Dataset Index Services', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Cannabis Desert Index', () => {
        it('should calculate access score correctly for well-served ZIP', async () => {
            // Mock ZIP pages with good coverage
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'zip_48201',
                    data: () => ({
                        zipCode: '48201',
                        city: 'Detroit',
                        state: 'MI',
                        dispensaryCount: 5
                    })
                }]
            });

            const result = await fetchDesertIndexByState('MI');

            expect(result).toHaveLength(1);
            expect(result[0].zipCode).toBe('48201');
            expect(result[0].accessScore).toBeGreaterThan(50); // Good access
            expect(result[0].classification).not.toBe('desert');
        });

        it('should classify ZIP with no dispensaries as desert', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'zip_00000',
                    data: () => ({
                        zipCode: '00000',
                        city: 'Nowhere',
                        state: 'XX',
                        dispensaryCount: 0
                    })
                }]
            });

            const result = await fetchDesertIndexByState('XX');

            expect(result[0].accessScore).toBe(0);
            expect(result[0].classification).toBe('desert');
        });

        it('should return summary with counts by classification', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'zip_1', data: () => ({ zipCode: '11111', city: 'A', state: 'MI', dispensaryCount: 10 }) },
                    { id: 'zip_2', data: () => ({ zipCode: '22222', city: 'B', state: 'MI', dispensaryCount: 0 }) },
                    { id: 'zip_3', data: () => ({ zipCode: '33333', city: 'C', state: 'MI', dispensaryCount: 2 }) }
                ]
            });

            const summary = await fetchDesertIndexSummary();

            expect(summary.totalZipsAnalyzed).toBe(3);
            expect(summary.desertCount).toBeGreaterThanOrEqual(1); // At least one desert
            expect(summary.topDeserts).toBeDefined();
            expect(summary.topSaturated).toBeDefined();
        });
    });

    describe('Market Freshness Index', () => {
        it('should calculate freshness score based on update recency', async () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'disp_1',
                    data: () => ({
                        city: 'Detroit',
                        state: 'MI',
                        updatedAt: { toDate: () => twoDaysAgo }
                    })
                }]
            });

            const result = await fetchFreshnessIndexByState('MI');

            expect(result).toHaveLength(1);
            expect(result[0].city).toBe('Detroit');
            expect(result[0].freshnessScore).toBeGreaterThan(80); // Very fresh (2 days)
            expect(result[0].classification).toBe('fresh');
        });

        it('should classify old data as stale', async () => {
            const now = new Date();
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'disp_old',
                    data: () => ({
                        city: 'OldTown',
                        state: 'XX',
                        updatedAt: { toDate: () => sixtyDaysAgo }
                    })
                }]
            });

            const result = await fetchFreshnessIndexByState('XX');

            expect(result[0].freshnessScore).toBeLessThan(20);
            expect(result[0].classification).toBe('stale');
        });

        it('should return summary with market counts', async () => {
            const now = new Date();

            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'd1', data: () => ({ city: 'Fresh City', state: 'MI', updatedAt: { toDate: () => now } }) },
                    { id: 'd2', data: () => ({ city: 'Stale City', state: 'MI', updatedAt: { toDate: () => new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } }) }
                ]
            });

            const summary = await fetchFreshnessIndexSummary();

            expect(summary.topFreshMarkets).toBeDefined();
            expect(summary.topStaleMarkets).toBeDefined();
            expect(summary.lastUpdated).toBeInstanceOf(Date);
        });
    });

    describe('Brand Availability Index', () => {
        it('should calculate availability score based on retailer count and states', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'brand_test',
                    data: () => ({
                        name: 'Test Brand',
                        slug: 'test-brand',
                        cities: ['Detroit, MI', 'Chicago, IL', 'Los Angeles, CA'],
                        retailerCount: 50
                    })
                }]
            });

            const result = await fetchBrandAvailabilityIndex();

            expect(result).toHaveLength(1);
            expect(result[0].brandName).toBe('Test Brand');
            expect(result[0].statesCovered.length).toBe(3);
            expect(result[0].classification).toBe('multi-state');
        });

        it('should classify small brand as local', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'local_brand',
                    data: () => ({
                        name: 'Local Grower',
                        slug: 'local-grower',
                        cities: ['Detroit, MI'],
                        retailerCount: 3
                    })
                }]
            });

            const result = await fetchBrandAvailabilityIndex();

            expect(result[0].classification).toBe('local');
        });

        it('should classify widespread brand as national', async () => {
            const manyCities = Array.from({ length: 15 }, (_, i) => `City${i}, S${i % 12}`);

            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'national_brand',
                    data: () => ({
                        name: 'National Brand',
                        slug: 'national-brand',
                        cities: manyCities,
                        retailerCount: 150
                    })
                }]
            });

            const result = await fetchBrandAvailabilityIndex();

            expect(result[0].classification).toBe('national');
        });

        it('should return summary with brand distribution counts', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    { id: 'b1', data: () => ({ name: 'Big Brand', slug: 'big', cities: Array(20).fill('City, ST'), retailerCount: 100 }) },
                    { id: 'b2', data: () => ({ name: 'Small Brand', slug: 'small', cities: ['One, XX'], retailerCount: 2 }) }
                ]
            });

            const summary = await fetchBrandAvailabilitySummary();

            expect(summary.totalBrandsTracked).toBe(2);
            expect(summary.topBrands.length).toBeGreaterThan(0);
        });
    });
});
