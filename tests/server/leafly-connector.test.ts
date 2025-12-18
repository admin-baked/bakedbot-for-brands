/**
 * Unit tests for Leafly Connector Service
 * Tests Apify integration, watchlist management, and pricing intel
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

// Mock fetch for Apify API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Leafly Connector Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APIFY_API_TOKEN = 'test_token_12345';
    });

    describe('Watchlist Management', () => {
        it('should get watchlist entries', async () => {
            const mockEntries = [
                { id: '1', name: 'Competitor A', state: 'Michigan', enabled: true },
                { id: '2', name: 'Competitor B', state: 'California', enabled: true },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockEntries.map(e => ({
                    id: e.id,
                    data: () => e,
                })),
            });

            const { getWatchlist } = await import('@/server/services/leafly-connector');
            const result = await getWatchlist();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Competitor A');
        });

        it('should add to watchlist', async () => {
            mockFirestore.set.mockResolvedValueOnce({});

            const { addToWatchlist } = await import('@/server/services/leafly-connector');

            await addToWatchlist({
                name: 'New Competitor',
                leaflyUrl: 'https://leafly.com/dispensary-info/new-competitor',
                state: 'Michigan',
                city: 'Detroit',
                scanFrequency: 'weekly',
                enabled: true,
            });

            expect(mockFirestore.set).toHaveBeenCalled();
        });

        it('should remove from watchlist', async () => {
            mockFirestore.delete.mockResolvedValueOnce({});

            const { removeFromWatchlist } = await import('@/server/services/leafly-connector');

            await removeFromWatchlist('entry_123');

            expect(mockFirestore.doc).toHaveBeenCalledWith('entry_123');
            expect(mockFirestore.delete).toHaveBeenCalled();
        });
    });

    describe('Apify Integration', () => {
        it('should trigger single store scan', async () => {
            const mockRunResponse = {
                data: {
                    id: 'run_abc123',
                    status: 'RUNNING',
                    defaultDatasetId: 'dataset_xyz',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRunResponse,
            } as Response);

            mockFirestore.set.mockResolvedValueOnce({});

            const { triggerSingleStoreScan } = await import('@/server/services/leafly-connector');

            const run = await triggerSingleStoreScan('https://leafly.com/dispensary-info/test-store');

            expect(mockFetch).toHaveBeenCalled();
            expect(run.id).toBeDefined();
        });

        it('should trigger state scan', async () => {
            const mockRunResponse = {
                data: {
                    id: 'run_state_123',
                    status: 'RUNNING',
                    defaultDatasetId: 'dataset_state',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRunResponse,
            } as Response);

            mockFirestore.set.mockResolvedValueOnce({});

            const { triggerStateScan } = await import('@/server/services/leafly-connector');

            const run = await triggerStateScan('michigan', 25);

            expect(mockFetch).toHaveBeenCalled();
            expect(run.id).toBeDefined();
        });

        it('should handle Apify API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                text: async () => 'API Error: Rate Limited',
            } as Response);

            const { triggerSingleStoreScan } = await import('@/server/services/leafly-connector');

            await expect(triggerSingleStoreScan('https://leafly.com/test'))
                .rejects.toThrow('Apify API error');
        });
    });

    describe('Pricing Intelligence', () => {
        it('should get pricing bands for state and category', async () => {
            const mockProducts = [
                { price: 30, category: 'flower' },
                { price: 45, category: 'flower' },
                { price: 60, category: 'flower' },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockProducts.map((p, i) => ({
                    id: `prod_${i}`,
                    data: () => p,
                })),
            });

            const { getPricingBands } = await import('@/server/services/leafly-connector');

            const bands = await getPricingBands('Michigan', 'flower');

            expect(bands).toBeDefined();
        });

        it('should get active promos', async () => {
            const mockOffers = [
                { id: '1', title: '20% off', dispensaryName: 'Store A' },
                { id: '2', title: 'BOGO', dispensaryName: 'Store B' },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockOffers.map(o => ({
                    id: o.id,
                    data: () => o,
                })),
            });

            const { getActivePromos } = await import('@/server/services/leafly-connector');

            const promos = await getActivePromos('Michigan');

            expect(promos).toHaveLength(2);
        });
    });

    describe('Local Competition', () => {
        it('should get local competition for state and city', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                docs: [
                    { id: 'disp_1', data: () => ({ name: 'Local Store', state: 'Michigan', city: 'Detroit' }) },
                ],
            });

            const { getLocalCompetition } = await import('@/server/services/leafly-connector');

            const result = await getLocalCompetition('Michigan', 'Detroit');

            expect(result).toBeDefined();
        });

        it('should generate agent-friendly intel summary', async () => {
            mockFirestore.get.mockResolvedValueOnce({ docs: [] });
            mockFirestore.get.mockResolvedValueOnce({ docs: [] });

            const { getCompetitiveIntelForAgent } = await import('@/server/services/leafly-connector');

            const summary = await getCompetitiveIntelForAgent('Michigan', 'Detroit');

            expect(typeof summary).toBe('string');
        });
    });
});
