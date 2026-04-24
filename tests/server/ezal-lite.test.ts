/**
 * Unit tests for Ezal Lite Connector Service.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSnapshotDocGet = jest.fn();
const mockSnapshotDocSet = jest.fn();
const mockSnapshotGet = jest.fn();
const mockCompetitorDocGet = jest.fn();
const mockCompetitorDocSet = jest.fn();
const mockCompetitorGet = jest.fn();
const mockCompetitorCountGet = jest.fn();

const mockSnapshotCollection = {
    doc: jest.fn(() => ({
        get: mockSnapshotDocGet,
        set: mockSnapshotDocSet,
    })),
    get: mockSnapshotGet,
};

const mockCompetitorCollection = {
    doc: jest.fn(() => ({
        get: mockCompetitorDocGet,
        set: mockCompetitorDocSet,
    })),
    limit: jest.fn(() => ({
        get: mockCompetitorGet,
    })),
    count: jest.fn(() => ({
        get: mockCompetitorCountGet,
    })),
};

const mockFirestore = {
    collection: jest.fn((name: string) => {
        if (name === 'ezal_snapshots') return mockSnapshotCollection;
        if (name === 'ezal_competitors') return mockCompetitorCollection;
        throw new Error(`Unexpected collection: ${name}`);
    }),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('crypto', () => ({
    createHash: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123def456xyz789'),
    })),
}));

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

const {
    addEzalCompetitor,
    extractSnapshotFromText,
    getCachedSnapshot,
    getEzalCompetitors,
    getEzalLiteStats,
    isSnapshotFresh,
    runLiteSnapshot,
} = require('@/server/services/ezal-lite-connector') as typeof import('@/server/services/ezal-lite-connector');

describe('Ezal Lite Connector Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APIFY_API_TOKEN = 'test_ezal_token';
    });

    describe('extractSnapshotFromText', () => {
        it('extracts prices, promos, and categories from text', async () => {
            const text = 'Flower $30 Vape $45 Edible $20 Premium $80 SALE 20% off concentrates';

            const result = await extractSnapshotFromText(text);

            expect(result.priceRange).toEqual({
                min: 20,
                max: 80,
                median: 45,
                count: 4,
            });
            expect(result.promoCount).toBeGreaterThan(0);
            expect(result.categorySignals).toEqual(
                expect.arrayContaining(['flower', 'vape', 'edible', 'concentrate'])
            );
        });

        it('returns zeroed price data when no prices are present', async () => {
            const result = await extractSnapshotFromText('Welcome to our dispensary');

            expect(result.priceRange).toEqual({
                min: 0,
                max: 0,
                median: 0,
                count: 0,
            });
        });
    });

    describe('isSnapshotFresh', () => {
        it('returns true for fresh snapshots', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);

            await expect(
                isSnapshotFresh({ expiresAt: futureDate } as any)
            ).resolves.toBe(true);
        });

        it('returns false for stale or missing snapshots', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            await expect(isSnapshotFresh({ expiresAt: pastDate } as any)).resolves.toBe(false);
            await expect(isSnapshotFresh(null)).resolves.toBe(false);
        });
    });

    describe('getCachedSnapshot', () => {
        it('returns the cached snapshot with freshness metadata', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);

            mockSnapshotDocGet.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    competitorId: 'comp_123',
                    competitorName: 'Test Store',
                    url: 'https://example.com',
                    discoveredAt: new Date(),
                    expiresAt: futureDate,
                    priceRange: { min: 20, max: 80, median: 50, count: 10 },
                    promoCount: 2,
                    promoSignals: ['20% off'],
                    categorySignals: ['flower'],
                    costCents: 10,
                    proxyType: 'none',
                    status: 'success',
                    contentHash: 'abc123',
                }),
            });

            const result = await getCachedSnapshot('comp_123');

            expect(result).not.toBeNull();
            expect(result?.competitorName).toBe('Test Store');
            expect(result?.freshness).toBe('fresh');
        });

        it('returns null when the snapshot is missing', async () => {
            mockSnapshotDocGet.mockResolvedValueOnce({ exists: false });

            await expect(getCachedSnapshot('missing')).resolves.toBeNull();
        });
    });

    describe('addEzalCompetitor', () => {
        it('creates a competitor record with the expected defaults', async () => {
            mockCompetitorDocSet.mockResolvedValueOnce({});

            const competitor = await addEzalCompetitor(
                'Test Dispensary',
                'https://leafly.com/test-store',
                'Michigan',
                'Detroit',
                'user_123'
            );

            expect(mockCompetitorDocSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Test Dispensary',
                    state: 'Michigan',
                    city: 'Detroit',
                    tier: 'free',
                })
            );
            expect(competitor.id).toMatch(/^leafly_com/);
        });
    });

    describe('getEzalCompetitors', () => {
        it('returns mapped competitor records', async () => {
            mockCompetitorGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: '1',
                        data: () => ({ name: 'Store A', url: 'https://a.com', state: 'MI' }),
                    },
                    {
                        id: '2',
                        data: () => ({ name: 'Store B', url: 'https://b.com', state: 'CA' }),
                    },
                ],
            });

            const result = await getEzalCompetitors();

            expect(result).toHaveLength(2);
            expect(result[0]?.name).toBe('Store A');
            expect(mockCompetitorCollection.limit).toHaveBeenCalledWith(50);
        });
    });

    describe('getEzalLiteStats', () => {
        it('aggregates snapshot freshness and cost totals', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            mockCompetitorCountGet.mockResolvedValueOnce({
                data: () => ({ count: 15 }),
            });
            mockSnapshotGet.mockResolvedValueOnce({
                docs: [
                    { data: () => ({ costCents: 10, expiresAt: futureDate }) },
                    { data: () => ({ costCents: 12, expiresAt: futureDate }) },
                    { data: () => ({ costCents: 8, expiresAt: new Date('2020-01-01') }) },
                ],
            });

            const stats = await getEzalLiteStats();

            expect(stats).toEqual({
                totalCompetitors: 15,
                totalSnapshots: 3,
                freshSnapshots: 2,
                totalCostCents: 30,
            });
        });
    });

    describe('runLiteSnapshot', () => {
        it('returns the cached snapshot when it is fresh', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);

            mockSnapshotDocGet.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    competitorId: 'comp_123',
                    competitorName: 'Cached Store',
                    url: 'https://cached.com',
                    discoveredAt: new Date(),
                    expiresAt: futureDate,
                    priceRange: { min: 10, max: 100, median: 50, count: 20 },
                    promoCount: 1,
                    promoSignals: ['sale'],
                    categorySignals: ['flower'],
                    costCents: 10,
                    proxyType: 'none',
                    freshness: 'fresh',
                    status: 'success',
                    contentHash: 'abc123',
                }),
            });

            const result = await runLiteSnapshot('comp_123', 'Cached Store', 'https://cached.com');

            expect(result.competitorName).toBe('Cached Store');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('runs a new crawl when the cache is stale', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);

            mockSnapshotDocGet.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    competitorId: 'comp_123',
                    competitorName: 'Test Store',
                    url: 'https://test.com',
                    discoveredAt: new Date(),
                    expiresAt: pastDate,
                    priceRange: { min: 0, max: 0, median: 0, count: 0 },
                    promoCount: 0,
                    promoSignals: [],
                    categorySignals: [],
                    costCents: 0,
                    proxyType: 'none',
                    status: 'failed',
                    contentHash: 'old',
                }),
            });
            mockCompetitorDocGet.mockResolvedValueOnce({
                exists: false,
                data: () => undefined,
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    url: 'https://test.com',
                    text: 'Flower $30 Vape $45 Edible $20 Premium $80 SALE 20% off concentrates and pre-rolls for everyone shopping today.',
                }],
            } as Response);
            mockSnapshotDocSet.mockResolvedValueOnce({});

            const result = await runLiteSnapshot('comp_123', 'Test Store', 'https://test.com');

            expect(mockFetch).toHaveBeenCalled();
            expect(mockSnapshotDocSet).toHaveBeenCalled();
            expect(result.status).toBe('success');
            expect(result.priceRange.count).toBeGreaterThan(0);
        });
    });
});
