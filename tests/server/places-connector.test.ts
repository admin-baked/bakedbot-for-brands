/**
 * Unit Tests for Places Connector Service
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
                set: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
                collection: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                        })),
                    })),
                    doc: jest.fn(() => ({
                        set: jest.fn().mockResolvedValue({}),
                    })),
                })),
            })),
        })),
    })),
}));

// Mock logger
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('Places Connector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
    });

    describe('isPlacesConfigured', () => {
        it('should return true when API key is set', async () => {
            const { isPlacesConfigured } = await import('@/server/services/places-connector');
            const result = await isPlacesConfigured();
            expect(result).toBe(true);
        });

        it('should return false when API key is not set', async () => {
            delete process.env.GOOGLE_PLACES_API_KEY;
            delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

            // Re-import to get fresh module
            jest.resetModules();
            const { isPlacesConfigured } = await import('@/server/services/places-connector');
            const result = await isPlacesConfigured();
            expect(result).toBe(false);
        });
    });

    describe('resolvePlaceId', () => {
        beforeEach(() => {
            process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
        });

        it('should resolve placeId from dispensary name and address', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    places: [{
                        id: 'ChIJ123456789',
                        displayName: { text: 'Green Leaf Dispensary' },
                        formattedAddress: '123 Main St, Detroit, MI',
                    }],
                }),
            });

            jest.resetModules();
            const { resolvePlaceId } = await import('@/server/services/places-connector');

            const result = await resolvePlaceId(
                'Green Leaf Dispensary',
                '123 Main St, Detroit, MI',
                42.3314,
                -83.0458
            );

            expect(result).not.toBeNull();
            expect(result?.placeId).toBe('ChIJ123456789');
            expect(result?.confidence).toBeGreaterThan(0);
        });

        it('should return null when no places found', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ places: [] }),
            });

            jest.resetModules();
            const { resolvePlaceId } = await import('@/server/services/places-connector');

            const result = await resolvePlaceId('Unknown Store', '999 Fake St');
            expect(result).toBeNull();
        });

        it('should handle API errors gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            jest.resetModules();
            const { resolvePlaceId } = await import('@/server/services/places-connector');

            const result = await resolvePlaceId('Test Store', '123 Test St');
            expect(result).toBeNull();
        });
    });

    describe('fetchPlaceSnapshot', () => {
        beforeEach(() => {
            process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
        });

        it('should fetch and format place snapshot', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'ChIJ123',
                    displayName: { text: 'Green Leaf' },
                    formattedAddress: '123 Main St',
                    rating: 4.5,
                    userRatingCount: 200,
                    nationalPhoneNumber: '(313) 555-1234',
                    websiteUri: 'https://greenleaf.com',
                    regularOpeningHours: { openNow: true },
                    reviews: [
                        {
                            authorAttribution: { displayName: 'John Doe' },
                            rating: 5,
                            text: { text: 'Great service!' },
                            relativePublishTimeDescription: '2 weeks ago',
                            flagContentUri: 'https://maps.google.com/report',
                        },
                    ],
                }),
            });

            jest.resetModules();
            const { fetchPlaceSnapshot } = await import('@/server/services/places-connector');

            const result = await fetchPlaceSnapshot('ChIJ123');

            expect(result).not.toBeNull();
            expect(result?.displayName).toBe('Green Leaf');
            expect(result?.rating).toBe(4.5);
            expect(result?.userRatingCount).toBe(200);
            expect(result?.reviews).toHaveLength(1);
            expect(result?.reviews?.[0].authorName).toBe('John Doe');
            expect(result?.reviews?.[0].flagContentUri).toBeDefined();
        });

        it('should limit reviews to max 5', async () => {
            const manyReviews = Array(10).fill(null).map((_, i) => ({
                authorAttribution: { displayName: `User ${i}` },
                rating: 4,
                relativePublishTimeDescription: '1 week ago',
            }));

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'ChIJ123',
                    displayName: { text: 'Test Store' },
                    reviews: manyReviews,
                }),
            });

            jest.resetModules();
            const { fetchPlaceSnapshot } = await import('@/server/services/places-connector');

            const result = await fetchPlaceSnapshot('ChIJ123');

            expect(result?.reviews).toHaveLength(5);
        });

        it('should set proper TTL expiry', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'ChIJ123',
                    displayName: { text: 'Test Store' },
                }),
            });

            jest.resetModules();
            const { fetchPlaceSnapshot } = await import('@/server/services/places-connector');

            const result = await fetchPlaceSnapshot('ChIJ123');

            expect(result?.expiresAt).toBeDefined();
            const daysDiff = Math.round(
                (result!.expiresAt.getTime() - result!.fetchedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            expect(daysDiff).toBe(28); // 28 day TTL
        });
    });
});
