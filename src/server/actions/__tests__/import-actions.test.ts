/**
 * Tests for import-actions.ts
 */

import {
    fetchCannMenusProducts,
} from '../import-actions';

// Mock the firebase server client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    collection: jest.fn(() => ({
                        doc: jest.fn(() => ({
                            set: jest.fn(),
                            get: jest.fn(() => ({ exists: false }))
                        })),
                        where: jest.fn(() => ({
                            where: jest.fn(() => ({
                                limit: jest.fn(() => ({
                                    get: jest.fn(() => ({ empty: true, docs: [] }))
                                }))
                            }))
                        })),
                        orderBy: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: jest.fn(() => ({ docs: [] }))
                            }))
                        })),
                        get: jest.fn(() => ({ docs: [] }))
                    })),
                    set: jest.fn(),
                    update: jest.fn(),
                    get: jest.fn(() => ({ exists: false }))
                }))
            })),
            batch: jest.fn(() => ({
                set: jest.fn(),
                commit: jest.fn()
            }))
        }
    }))
}));

// Mock config
jest.mock('@/lib/config', () => ({
    CANNMENUS_CONFIG: {
        API_BASE: 'https://api.cannmenus.com',
        API_KEY: null // Force mock data
    }
}));

describe('Import Actions', () => {
    describe('fetchCannMenusProducts', () => {
        it('returns mock products when no API key is configured', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 5
            });

            expect(result).toHaveLength(5);
            expect(result[0]).toHaveProperty('externalId');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('price');
        });

        it('generates unique external IDs for each product', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 10
            });

            const externalIds = result.map(p => p.externalId);
            const uniqueIds = new Set(externalIds);

            expect(uniqueIds.size).toBe(externalIds.length);
        });

        it('includes required fields in mock products', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'dispensary',
                limit: 3
            });

            for (const product of result) {
                expect(product.externalId).toBeDefined();
                expect(product.name).toBeDefined();
                expect(typeof product.price).toBe('number');
                expect(product.category).toBeDefined();
            }
        });

        it('respects the limit parameter', async () => {
            const result1 = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 3
            });

            const result2 = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 10
            });

            expect(result1).toHaveLength(3);
            expect(result2).toHaveLength(10);
        });

        it('includes THC/CBD values in products', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 5
            });

            // At least some products should have THC values
            const productsWithThc = result.filter(p => p.thc !== undefined);
            expect(productsWithThc.length).toBeGreaterThan(0);
        });

        it('uses cannMenusId to generate deterministic product IDs', async () => {
            const result1 = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_brand_abc',
                entityType: 'brand',
                limit: 3
            });

            const result2 = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_brand_abc',
                entityType: 'brand',
                limit: 3
            });

            // Same cannMenusId should produce same external IDs
            expect(result1[0].externalId).toBe(result2[0].externalId);
            expect(result1[1].externalId).toBe(result2[1].externalId);
        });
    });

    describe('CannMenus Adapter', () => {
        it('handles brand entity type', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_brand_123',
                entityType: 'brand',
                limit: 5
            });

            expect(result).toHaveLength(5);
        });

        it('handles dispensary entity type', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_disp_456',
                entityType: 'dispensary',
                limit: 5
            });

            expect(result).toHaveLength(5);
        });

        it('includes effects array in mock products', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 5
            });

            // At least some products should have effects
            const productsWithEffects = result.filter(p =>
                p.effects && p.effects.length > 0
            );
            expect(productsWithEffects.length).toBeGreaterThan(0);
        });

        it('includes image URLs in mock products', async () => {
            const result = await fetchCannMenusProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                cannMenusId: 'cm_test',
                entityType: 'brand',
                limit: 5
            });

            for (const product of result) {
                expect(product.imageUrl).toBeDefined();
                expect(product.imageUrl).toContain('picsum.photos');
            }
        });
    });

    describe('Leafly Adapter', () => {
        it('generates mock Leafly products with correct structure', async () => {
            const { fetchLeaflyProducts } = await import('../import-actions');

            const result = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'test-dispensary',
                limit: 5
            });

            expect(result).toHaveLength(5);
            expect(result[0]).toHaveProperty('externalId');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('category');
        });

        it('uses dispensarySlug to generate deterministic IDs', async () => {
            const { fetchLeaflyProducts } = await import('../import-actions');

            const result1 = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'green-valley',
                limit: 3
            });

            const result2 = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'green-valley',
                limit: 3
            });

            // Same dispensarySlug should produce same external IDs
            expect(result1[0].externalId).toBe(result2[0].externalId);
        });

        it('respects limit parameter', async () => {
            const { fetchLeaflyProducts } = await import('../import-actions');

            const result = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'test-disp',
                limit: 7
            });

            expect(result).toHaveLength(7);
        });

        it('includes brand names in Leafly products', async () => {
            const { fetchLeaflyProducts } = await import('../import-actions');

            const result = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'test-disp',
                limit: 5
            });

            for (const product of result) {
                expect(product.brandName).toBeDefined();
            }
        });

        it('includes valid categories', async () => {
            const { fetchLeaflyProducts } = await import('../import-actions');

            const result = await fetchLeaflyProducts({
                tenantId: 'tenant-123',
                sourceId: 'source-456',
                dispensarySlug: 'test-disp',
                limit: 10
            });

            const validCategories = ['flower', 'vapes', 'edibles', 'concentrates', 'prerolls', 'topicals', 'tinctures', 'other'];
            for (const product of result) {
                expect(validCategories).toContain(product.category);
            }
        });
    });
});
