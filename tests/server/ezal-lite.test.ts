/**
 * Unit tests for Ezal Lite Connector Service
 * Tests cheap competitive snapshots with proxy ladder and caching
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase Admin
const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    count: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

// Mock crypto
jest.mock('crypto', () => ({
    createHash: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('abc123def456xyz789'),
    })),
}));

// Mock fetch for Apify API calls
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Import extraction function directly for unit testing
import { extractSnapshotFromText, isSnapshotFresh } from '@/server/services/ezal-lite-connector';

describe('Ezal Lite Connector Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APIFY_API_TOKEN = 'test_ezal_token';
    });

    describe('extractSnapshotFromText', () => {
        it('should extract prices from text', () => {
            const text = 'Flower $30 Vape $45 Edible $20 Premium $80';

            const result = extractSnapshotFromText(text);

            expect(result.priceRange.min).toBe(20);
            expect(result.priceRange.max).toBe(80);
            expect(result.priceRange.count).toBe(4);
        });

        it('should extract median price correctly', () => {
            const text = 'Items: $10 $20 $30 $40 $50';

            const result = extractSnapshotFromText(text);

            expect(result.priceRange.median).toBe(30);
        });

        it('should handle prices with cents', () => {
            const text = 'Product A $29.99 Product B $49.99';

            const result = extractSnapshotFromText(text);

            expect(result.priceRange.min).toBe(29.99);
            expect(result.priceRange.max).toBe(49.99);
        });

        it('should filter out unrealistic prices', () => {
            const text = 'Normal $30 Weird $50000 Another $50';

            const result = extractSnapshotFromText(text);

            expect(result.priceRange.max).toBe(50);
            expect(result.priceRange.count).toBe(2);
        });

        it('should detect promo signals', () => {
            const text = 'SALE! 20% off all flower. BOGO on edibles. Special discount today!';

            const result = extractSnapshotFromText(text);

            expect(result.promoCount).toBeGreaterThan(0);
            expect(result.promoSignals).toContain('20% off');
            expect(result.promoSignals.some(s => s.includes('bogo'))).toBe(true);
        });

        it('should detect category signals', () => {
            const text = 'We carry flower, vapes, edibles, and concentrates. Fresh pre-rolls!';

            const result = extractSnapshotFromText(text);

            expect(result.categorySignals).toContain('flower');
            expect(result.categorySignals).toContain('vape');
            expect(result.categorySignals).toContain('edible');
            expect(result.categorySignals).toContain('concentrate');
        });

        it('should handle empty text', () => {
            const result = extractSnapshotFromText('');

            expect(result.priceRange.count).toBe(0);
            expect(result.promoCount).toBe(0);
            expect(result.categorySignals).toHaveLength(0);
        });

        it('should handle text with no prices', () => {
            const text = 'Welcome to our dispensary. We have great products!';

            const result = extractSnapshotFromText(text);

            expect(result.priceRange.min).toBe(0);
            expect(result.priceRange.max).toBe(0);
            expect(result.priceRange.median).toBe(0);
        });
    });

    describe('isSnapshotFresh', () => {
        it('should return true for fresh snapshot', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);

            const snapshot = {
                expiresAt: futureDate,
            } as any;

            expect(isSnapshotFresh(snapshot)).toBe(true);
        });

        it('should return false for stale snapshot', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const snapshot = {
                expiresAt: pastDate,
            } as any;

            expect(isSnapshotFresh(snapshot)).toBe(false);
        });

        it('should return false for null snapshot', () => {
            expect(isSnapshotFresh(null)).toBe(false);
        });
    });

    describe('getCachedSnapshot', () => {
        it('should return cached snapshot if exists', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);

            mockFirestore.get.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    competitorId: 'comp_123',
                    competitorName: 'Test Store',
                    url: 'https://example.com',
                    scrapedAt: new Date(),
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

            const { getCachedSnapshot } = await import('@/server/services/ezal-lite-connector');

            const result = await getCachedSnapshot('comp_123');

            expect(result).not.toBeNull();
            expect(result?.competitorName).toBe('Test Store');
            expect(result?.freshness).toBe('fresh');
        });

        it('should return null if snapshot does not exist', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                exists: false,
            });

            const { getCachedSnapshot } = await import('@/server/services/ezal-lite-connector');

            const result = await getCachedSnapshot('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('addEzalCompetitor', () => {
        it('should create competitor record', async () => {
            mockFirestore.set.mockResolvedValueOnce({});

            const { addEzalCompetitor } = await import('@/server/services/ezal-lite-connector');

            const competitor = await addEzalCompetitor(
                'Test Dispensary',
                'https://leafly.com/test-store',
                'Michigan',
                'Detroit',
                'user_123'
            );

            expect(mockFirestore.set).toHaveBeenCalled();
            expect(competitor.name).toBe('Test Dispensary');
            expect(competitor.state).toBe('Michigan');
            expect(competitor.tier).toBe('free');
        });

        it('should generate slug-based ID from URL', async () => {
            mockFirestore.set.mockResolvedValueOnce({});

            const { addEzalCompetitor } = await import('@/server/services/ezal-lite-connector');

            const competitor = await addEzalCompetitor(
                'Store Name',
                'https://example.com/my-store',
                'California'
            );

            expect(competitor.id).toMatch(/^example_com/);
        });
    });

    describe('getEzalCompetitors', () => {
        it('should return list of competitors', async () => {
            const mockCompetitors = [
                { id: '1', name: 'Store A', url: 'https://a.com', state: 'MI' },
                { id: '2', name: 'Store B', url: 'https://b.com', state: 'CA' },
            ];

            mockFirestore.get.mockResolvedValueOnce({
                docs: mockCompetitors.map(c => ({
                    id: c.id,
                    data: () => c,
                })),
            });

            const { getEzalCompetitors } = await import('@/server/services/ezal-lite-connector');

            const result = await getEzalCompetitors();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Store A');
        });
    });

    describe('getEzalLiteStats', () => {
        it('should return aggregated stats', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            mockFirestore.get.mockResolvedValueOnce({
                data: () => ({ count: 15 }),
            });

            mockFirestore.get.mockResolvedValueOnce({
                docs: [
                    { data: () => ({ costCents: 10, expiresAt: futureDate }) },
                    { data: () => ({ costCents: 12, expiresAt: futureDate }) },
                    { data: () => ({ costCents: 8, expiresAt: new Date('2020-01-01') }) },
                ],
            });

            const { getEzalLiteStats } = await import('@/server/services/ezal-lite-connector');

            const stats = await getEzalLiteStats();

            expect(stats.totalCompetitors).toBe(15);
            expect(stats.totalSnapshots).toBe(3);
            expect(stats.freshSnapshots).toBe(2);
            expect(stats.totalCostCents).toBe(30);
        });
    });

    describe('runLiteSnapshot', () => {
        it('should return cached snapshot if fresh', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);

            // Mock cache hit
            mockFirestore.get.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    competitorId: 'comp_123',
                    competitorName: 'Cached Store',
                    url: 'https://cached.com',
                    scrapedAt: new Date(),
                    expiresAt: futureDate,
                    priceRange: { min: 10, max: 100, median: 50, count: 20 },
                    costCents: 10,
                    status: 'success',
                }),
            });

            const { runLiteSnapshot } = await import('@/server/services/ezal-lite-connector');

            const result = await runLiteSnapshot('comp_123', 'Cached Store', 'https://cached.com');

            expect(result.competitorName).toBe('Cached Store');
            expect(mockFetch).not.toHaveBeenCalled(); // Should not make API call
        });

        it('should trigger new crawl if cache is stale', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);

            // Mock stale cache
            mockFirestore.get.mockResolvedValueOnce({
                exists: true,
                id: 'comp_123',
                data: () => ({
                    expiresAt: pastDate,
                }),
            });

            // Mock competitor lookup
            mockFirestore.get.mockResolvedValueOnce({
                exists: false,
            });

            // Mock Apify response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    url: 'https://test.com',
                    text: 'Flower $30 Vape $45 20% off SALE',
                }],
            } as Response);

            mockFirestore.set.mockResolvedValue({});

            const { runLiteSnapshot } = await import('@/server/services/ezal-lite-connector');

            const result = await runLiteSnapshot('comp_123', 'Test Store', 'https://test.com');

            expect(mockFetch).toHaveBeenCalled();
            expect(result.status).toBe('success');
        });
    });
});
