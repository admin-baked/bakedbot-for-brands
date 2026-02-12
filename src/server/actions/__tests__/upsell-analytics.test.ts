/**
 * Unit Tests for Upsell Analytics
 *
 * Tests calculation logic for placement metrics, strategy distribution,
 * daily trends, top pairings, and quick stats.
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import type { UpsellPlacement, UpsellStrategy } from '@/types/upsell';

// Mock Firestore
const mockGet = vi.fn();
const mockWhere = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet }));
const mockOrderBy = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet }));
const mockLimit = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet }));
const mockCollection = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet }));

vi.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => ({
        collection: mockCollection,
    }),
}));

// Import after mocks are set up
import { getUpsellAnalytics } from '../upsell-analytics';

// Test data
const mockEvents = [
    // Product Detail - Terpene Pairing
    {
        id: '1',
        orgId: 'test-org',
        placement: 'product_detail' as UpsellPlacement,
        eventType: 'impression',
        anchorProductId: 'prod-1',
        anchorProductName: 'Blue Dream Flower',
        anchorCategory: 'Flower',
        suggestedProductId: 'prod-2',
        suggestedProductName: 'Lemon Haze Pre-Roll',
        suggestedCategory: 'Pre-roll',
        strategy: 'terpene_pairing' as UpsellStrategy,
        reason: 'Similar limonene profile',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    },
    {
        id: '2',
        orgId: 'test-org',
        placement: 'product_detail' as UpsellPlacement,
        eventType: 'click',
        anchorProductId: 'prod-1',
        anchorProductName: 'Blue Dream Flower',
        anchorCategory: 'Flower',
        suggestedProductId: 'prod-2',
        suggestedProductName: 'Lemon Haze Pre-Roll',
        suggestedCategory: 'Pre-roll',
        strategy: 'terpene_pairing' as UpsellStrategy,
        reason: 'Similar limonene profile',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
        id: '3',
        orgId: 'test-org',
        placement: 'product_detail' as UpsellPlacement,
        eventType: 'conversion',
        anchorProductId: 'prod-1',
        anchorProductName: 'Blue Dream Flower',
        anchorCategory: 'Flower',
        suggestedProductId: 'prod-2',
        suggestedProductName: 'Lemon Haze Pre-Roll',
        suggestedCategory: 'Pre-roll',
        strategy: 'terpene_pairing' as UpsellStrategy,
        reason: 'Similar limonene profile',
        price: 15.99,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    // Cart - Category Complement
    {
        id: '4',
        orgId: 'test-org',
        placement: 'cart' as UpsellPlacement,
        eventType: 'impression',
        anchorProductId: 'prod-3',
        anchorProductName: 'Wedding Cake Flower',
        anchorCategory: 'Flower',
        suggestedProductId: 'prod-4',
        suggestedProductName: 'Premium Grinder',
        suggestedCategory: 'Accessories',
        strategy: 'category_complement' as UpsellStrategy,
        reason: 'Essential accessory',
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
    },
    {
        id: '5',
        orgId: 'test-org',
        placement: 'cart' as UpsellPlacement,
        eventType: 'click',
        anchorProductId: 'prod-3',
        anchorProductName: 'Wedding Cake Flower',
        anchorCategory: 'Flower',
        suggestedProductId: 'prod-4',
        suggestedProductName: 'Premium Grinder',
        suggestedCategory: 'Accessories',
        strategy: 'category_complement' as UpsellStrategy,
        reason: 'Essential accessory',
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    },
    // Checkout - Margin Boost (no conversion)
    {
        id: '6',
        orgId: 'test-org',
        placement: 'checkout' as UpsellPlacement,
        eventType: 'impression',
        anchorProductId: 'prod-5',
        anchorProductName: 'Indica Gummies',
        anchorCategory: 'Edibles',
        suggestedProductId: 'prod-6',
        suggestedProductName: 'CBD Tincture',
        suggestedCategory: 'Tinctures',
        strategy: 'margin_boost' as UpsellStrategy,
        reason: 'High-margin product',
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    },
    {
        id: '7',
        orgId: 'test-org',
        placement: 'checkout' as UpsellPlacement,
        eventType: 'click',
        anchorProductId: 'prod-5',
        anchorProductName: 'Indica Gummies',
        anchorCategory: 'Edibles',
        suggestedProductId: 'prod-6',
        suggestedProductName: 'CBD Tincture',
        suggestedCategory: 'Tinctures',
        strategy: 'margin_boost' as UpsellStrategy,
        reason: 'High-margin product',
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    },
    // Chatbot - Effect Stacking
    {
        id: '8',
        orgId: 'test-org',
        placement: 'chatbot' as UpsellPlacement,
        eventType: 'impression',
        suggestedProductId: 'prod-7',
        suggestedProductName: 'Sleep Bundle',
        suggestedCategory: 'Bundles',
        strategy: 'effect_stacking' as UpsellStrategy,
        reason: 'Enhanced relaxation',
        timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000, // 4 days ago
    },
];

describe('Upsell Analytics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockResolvedValue({
            docs: mockEvents.map((event) => ({
                id: event.id,
                data: () => event,
            })),
        });
    });

    describe('getUpsellAnalytics', () => {
        it('should query Firestore with correct filters', async () => {
            const orgId = 'test-org';
            await getUpsellAnalytics(orgId);

            expect(mockCollection).toHaveBeenCalledWith('upsell_events');
            expect(mockWhere).toHaveBeenCalledWith('orgId', '==', orgId);
            expect(mockWhere).toHaveBeenCalledWith('timestamp', '>=', expect.any(Number));
            expect(mockOrderBy).toHaveBeenCalledWith('timestamp', 'desc');
            expect(mockLimit).toHaveBeenCalledWith(5000);
        });

        it('should return analytics data structure', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result).toHaveProperty('placements');
            expect(result).toHaveProperty('strategies');
            expect(result).toHaveProperty('dailyTrend');
            expect(result).toHaveProperty('topPairings');
            expect(result).toHaveProperty('quickStats');
        });

        it('should handle Firestore errors gracefully', async () => {
            mockGet.mockRejectedValueOnce(new Error('Firestore error'));

            const result = await getUpsellAnalytics('test-org');

            expect(result.placements).toEqual([]);
            expect(result.strategies).toEqual([]);
            expect(result.dailyTrend).toEqual([]);
            expect(result.topPairings).toEqual([]);
            expect(result.quickStats.upsellRate).toBe(0);
        });
    });

    describe('Placement Metrics', () => {
        it('should calculate metrics for all placements', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.placements).toHaveLength(4);
            expect(result.placements.map(p => p.placement)).toEqual([
                'product_detail',
                'cart',
                'checkout',
                'chatbot',
            ]);
        });

        it('should calculate conversion rates correctly', async () => {
            const result = await getUpsellAnalytics('test-org');

            // Product Detail: 1 impression, 1 click, 1 conversion = 100% conversion rate
            const productDetail = result.placements.find(p => p.placement === 'product_detail');
            expect(productDetail?.impressions).toBe(1);
            expect(productDetail?.clicks).toBe(1);
            expect(productDetail?.conversions).toBe(1);
            expect(productDetail?.rate).toBe(100);

            // Cart: 1 impression, 1 click, 0 conversions = 0% conversion rate
            const cart = result.placements.find(p => p.placement === 'cart');
            expect(cart?.impressions).toBe(1);
            expect(cart?.clicks).toBe(1);
            expect(cart?.conversions).toBe(0);
            expect(cart?.rate).toBe(0);
        });

        it('should handle placements with no events', async () => {
            mockGet.mockResolvedValueOnce({ docs: [] });

            const result = await getUpsellAnalytics('test-org');

            result.placements.forEach(placement => {
                expect(placement.impressions).toBe(0);
                expect(placement.clicks).toBe(0);
                expect(placement.conversions).toBe(0);
                expect(placement.rate).toBe(0);
            });
        });
    });

    describe('Strategy Distribution', () => {
        it('should calculate strategy percentages', async () => {
            const result = await getUpsellAnalytics('test-org');

            // 4 total impressions: 1 terpene, 1 category, 1 margin, 1 effect
            expect(result.strategies).toHaveLength(4);

            const terpene = result.strategies.find(s => s.name === 'terpene_pairing');
            expect(terpene?.value).toBe(25); // 1/4 = 25%

            const category = result.strategies.find(s => s.name === 'category_complement');
            expect(category?.value).toBe(25);
        });

        it('should include color for each strategy', async () => {
            const result = await getUpsellAnalytics('test-org');

            result.strategies.forEach(strategy => {
                expect(strategy.color).toMatch(/^#[0-9a-f]{6}$/i);
            });
        });

        it('should filter out strategies with 0%', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [mockEvents[0]].map((event) => ({
                    id: event.id,
                    data: () => event,
                })),
            });

            const result = await getUpsellAnalytics('test-org');

            // Only terpene_pairing should be present
            expect(result.strategies).toHaveLength(1);
            expect(result.strategies[0].name).toBe('terpene_pairing');
            expect(result.strategies[0].value).toBe(100);
        });

        it('should sort strategies by value descending', async () => {
            const result = await getUpsellAnalytics('test-org');

            for (let i = 0; i < result.strategies.length - 1; i++) {
                expect(result.strategies[i].value).toBeGreaterThanOrEqual(
                    result.strategies[i + 1].value
                );
            }
        });
    });

    describe('Daily Trend', () => {
        it('should group events by date', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.dailyTrend.length).toBeGreaterThan(0);
            result.dailyTrend.forEach(day => {
                expect(day).toHaveProperty('date');
                expect(day).toHaveProperty('impressions');
                expect(day).toHaveProperty('conversions');
            });
        });

        it('should count impressions and conversions separately', async () => {
            const result = await getUpsellAnalytics('test-org');

            const totalImpressions = result.dailyTrend.reduce((sum, day) => sum + day.impressions, 0);
            const totalConversions = result.dailyTrend.reduce((sum, day) => sum + day.conversions, 0);

            expect(totalImpressions).toBe(4); // 4 impression events
            expect(totalConversions).toBe(1); // 1 conversion event
        });

        it('should limit to last 7 days', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.dailyTrend.length).toBeLessThanOrEqual(7);
        });

        it('should sort dates chronologically', async () => {
            const result = await getUpsellAnalytics('test-org');

            for (let i = 0; i < result.dailyTrend.length - 1; i++) {
                const [month1, day1] = result.dailyTrend[i].date.split('/').map(Number);
                const [month2, day2] = result.dailyTrend[i + 1].date.split('/').map(Number);

                const date1 = new Date(2026, month1 - 1, day1);
                const date2 = new Date(2026, month2 - 1, day2);

                expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
            }
        });
    });

    describe('Top Pairings', () => {
        it('should identify unique product pairings', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.topPairings.length).toBeGreaterThan(0);
            result.topPairings.forEach(pairing => {
                expect(pairing).toHaveProperty('anchorProduct');
                expect(pairing).toHaveProperty('suggestedProduct');
                expect(pairing).toHaveProperty('strategy');
                expect(pairing).toHaveProperty('reason');
            });
        });

        it('should calculate conversion rates for pairings', async () => {
            const result = await getUpsellAnalytics('test-org');

            const blueDreamPairing = result.topPairings.find(
                p => p.anchorProduct === 'Blue Dream Flower'
            );

            expect(blueDreamPairing).toBeDefined();
            expect(blueDreamPairing?.impressions).toBe(1);
            expect(blueDreamPairing?.conversions).toBe(1);
            expect(blueDreamPairing?.conversionRate).toBe(100); // 1/1 click = 100%
        });

        it('should calculate total revenue for pairings', async () => {
            const result = await getUpsellAnalytics('test-org');

            const blueDreamPairing = result.topPairings.find(
                p => p.anchorProduct === 'Blue Dream Flower'
            );

            expect(blueDreamPairing?.revenue).toBe(15.99);
        });

        it('should sort pairings by conversion rate', async () => {
            const result = await getUpsellAnalytics('test-org');

            for (let i = 0; i < result.topPairings.length - 1; i++) {
                expect(result.topPairings[i].conversionRate).toBeGreaterThanOrEqual(
                    result.topPairings[i + 1].conversionRate
                );
            }
        });

        it('should limit to top 10 pairings', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.topPairings.length).toBeLessThanOrEqual(10);
        });
    });

    describe('Quick Stats', () => {
        it('should calculate overall upsell rate', async () => {
            const result = await getUpsellAnalytics('test-org');

            // 3 clicks total, 1 conversion = 33.3%
            expect(result.quickStats.upsellRate).toBeCloseTo(33.3, 1);
        });

        it('should calculate average upsell value', async () => {
            const result = await getUpsellAnalytics('test-org');

            // 1 conversion at $15.99 = $15.99 average
            expect(result.quickStats.avgUpsellValue).toBe(15.99);
        });

        it('should handle zero conversions gracefully', async () => {
            mockGet.mockResolvedValueOnce({
                docs: mockEvents.filter(e => e.eventType !== 'conversion').map((event) => ({
                    id: event.id,
                    data: () => event,
                })),
            });

            const result = await getUpsellAnalytics('test-org');

            expect(result.quickStats.upsellRate).toBe(0);
            expect(result.quickStats.avgUpsellValue).toBe(0);
        });

        it('should count unique active pairings', async () => {
            const result = await getUpsellAnalytics('test-org');

            // 4 unique pairings in test data
            expect(result.quickStats.activePairings).toBe(4);
        });

        it('should include margin boost metric', async () => {
            const result = await getUpsellAnalytics('test-org');

            expect(result.quickStats.marginBoost).toBeDefined();
            expect(typeof result.quickStats.marginBoost).toBe('number');
        });
    });
});
