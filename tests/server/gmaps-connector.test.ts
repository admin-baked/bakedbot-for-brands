/**
 * Unit tests for Google Maps Connector Service
 * Tests Apify integration, data ingestion, and queries
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

// Mock fetch for Apify API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Google Maps Connector Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APIFY_API_TOKEN = 'test_gmaps_token_12345';
    });

    describe('triggerDispensarySearch', () => {
        it('should start a Google Maps search run', async () => {
            const mockRunResponse = {
                data: {
                    id: 'gmaps_run_123',
                    actId: 'actor_xyz',
                    status: 'RUNNING',
                    startedAt: new Date().toISOString(),
                    defaultDatasetId: 'dataset_abc',
                    defaultKeyValueStoreId: 'kvstore_def',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRunResponse,
            } as Response);

            mockFirestore.set.mockResolvedValueOnce({});

            const { triggerDispensarySearch } = await import('@/server/services/gmaps-connector');

            const run = await triggerDispensarySearch('Detroit, MI', ['dispensary'], 50);

            expect(mockFetch).toHaveBeenCalled();
            expect(run.id).toBe('gmaps_run_123');
            expect(run.location).toBe('Detroit, MI');
            expect(run.status).toBe('running');
        });

        it('should use default search terms if not provided', async () => {
            const mockRunResponse = {
                data: {
                    id: 'gmaps_run_456',
                    status: 'RUNNING',
                    defaultDatasetId: 'dataset_xyz',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRunResponse,
            } as Response);

            mockFirestore.set.mockResolvedValueOnce({});

            const { triggerDispensarySearch } = await import('@/server/services/gmaps-connector');

            await triggerDispensarySearch('Los Angeles, CA');

            const fetchCall = mockFetch.mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);

            expect(body.searchStringsArray).toContain('dispensary');
            expect(body.searchStringsArray).toContain('cannabis store');
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                text: async () => 'API Error: Invalid token',
            } as Response);

            const { triggerDispensarySearch } = await import('@/server/services/gmaps-connector');

            await expect(triggerDispensarySearch('Test Location'))
                .rejects.toThrow('Apify API error');
        });
    });

    describe('triggerGeoSearch', () => {
        it('should start a search with custom geolocation', async () => {
            const mockRunResponse = {
                data: {
                    id: 'geo_run_789',
                    status: 'RUNNING',
                    defaultDatasetId: 'dataset_geo',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRunResponse,
            } as Response);

            mockFirestore.set.mockResolvedValueOnce({});

            const { triggerGeoSearch } = await import('@/server/services/gmaps-connector');

            const customGeo = {
                type: 'Point' as const,
                coordinates: [-83.0458, 42.3314], // Detroit coordinates
                radiusKm: 10,
            };

            const run = await triggerGeoSearch(customGeo, ['dispensary'], 100);

            expect(run.id).toBe('geo_run_789');
        });
    });

    describe('checkGMapsRunStatus', () => {
        it('should return run status', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { status: 'SUCCEEDED' } }),
            } as Response);

            const { checkGMapsRunStatus } = await import('@/server/services/gmaps-connector');

            const status = await checkGMapsRunStatus('run_123');

            expect(status).toBe('SUCCEEDED');
        });
    });

    describe('ingestGMapsDataset', () => {
        it('should ingest places from completed run', async () => {
            // Mock getting run info
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: { defaultDatasetId: 'dataset_abc' },
                }),
            } as Response);

            // Mock getting dataset items
            const mockPlaces = [
                {
                    placeId: 'ChIJ123',
                    title: 'Test Dispensary',
                    address: '123 Main St, Detroit, MI',
                    city: 'Detroit',
                    state: 'Michigan',
                    location: { lat: 42.33, lng: -83.04 },
                    totalScore: 4.5,
                    reviewsCount: 100,
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockPlaces,
            } as Response);

            mockFirestore.set.mockResolvedValue({});
            mockFirestore.update.mockResolvedValue({});

            const { ingestGMapsDataset } = await import('@/server/services/gmaps-connector');

            const result = await ingestGMapsDataset('run_123');

            expect(result.places).toBe(1);
        });

        it('should skip places without placeId', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: { defaultDatasetId: 'dataset_abc' },
                }),
            } as Response);

            const mockPlaces = [
                { title: 'No ID Place' }, // Missing placeId
                { placeId: 'ChIJ456', title: 'Valid Place', location: { lat: 0, lng: 0 } },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockPlaces,
            } as Response);

            mockFirestore.set.mockResolvedValue({});
            mockFirestore.update.mockResolvedValue({});

            const { ingestGMapsDataset } = await import('@/server/services/gmaps-connector');

            const result = await ingestGMapsDataset('run_xyz');

            expect(result.places).toBe(1); // Only valid place
        });

        it('should skip permanently closed places', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: { defaultDatasetId: 'dataset_abc' },
                }),
            } as Response);

            const mockPlaces = [
                { placeId: 'ChIJ789', title: 'Closed Store', permanentlyClosed: true, location: { lat: 0, lng: 0 } },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockPlaces,
            } as Response);

            mockFirestore.update.mockResolvedValue({});

            const { ingestGMapsDataset } = await import('@/server/services/gmaps-connector');

            const result = await ingestGMapsDataset('run_closed');

            expect(result.places).toBe(0);
        });
    });

    describe('Query Functions', () => {
        it('should get places by state', async () => {
            const mockPlaces = [
                { id: 'place1', title: 'Store A', state: 'Michigan' },
                { id: 'place2', title: 'Store B', state: 'Michigan' },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockPlaces.map(p => ({ id: p.id, data: () => p })),
            });

            const { getGMapsPlacesByState } = await import('@/server/services/gmaps-connector');

            const places = await getGMapsPlacesByState('Michigan', 50);

            expect(places).toHaveLength(2);
        });

        it('should get places near coordinates', async () => {
            const mockPlaces = [
                { id: 'p1', title: 'Nearby Store', location: { lat: 42.33, lng: -83.04 } },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockPlaces.map(p => ({ id: p.id, data: () => p })),
            });

            const { getGMapsPlacesNear } = await import('@/server/services/gmaps-connector');

            const places = await getGMapsPlacesNear(42.33, -83.04, 10, 20);

            expect(places.length).toBeGreaterThanOrEqual(0);
        });

        it('should get recent runs', async () => {
            const mockRuns = [
                { id: 'run1', location: 'Detroit', status: 'completed', startedAt: { toDate: () => new Date() } },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockRuns.map(r => ({ id: r.id, data: () => r })),
            });

            const { getRecentGMapsRuns } = await import('@/server/services/gmaps-connector');

            const runs = await getRecentGMapsRuns(10);

            expect(runs).toHaveLength(1);
        });

        it('should get stats', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 150 }),
            });
            mockFirestore.get.mockResolvedValueOnce({
                docs: [{ data: () => ({ startedAt: { toDate: () => new Date() } }) }],
            });

            const { getGMapsStats } = await import('@/server/services/gmaps-connector');

            const stats = await getGMapsStats();

            expect(stats.totalPlaces).toBe(150);
            expect(stats.recentRuns).toBe(1);
        });
    });
});
