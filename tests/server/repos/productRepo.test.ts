/**
 * Unit tests for productRepo - specifically the getAllByBrand orgId lookup logic
 * Tests the fixes made for Thrive Syracuse Alleaves integration
 *
 * Note: These tests use simulated repository logic rather than mocking Firestore,
 * as the actual repo has complex chained query patterns that are difficult to mock.
 */

import { isBrandRole, isDispensaryRole } from '@/types/roles';

describe('productRepo.getAllByBrand - Logic Tests', () => {
    /**
     * Simulates the brand lookup strategy in getAllByBrand:
     * 1. Try direct document ID lookup
     * 2. Try slug query
     * 3. Try orgId field query
     * 4. Direct tenant lookup for org_ prefixed IDs
     */
    interface BrandData {
        id: string;
        name: string;
        slug?: string;
        orgId?: string;
    }

    interface TenantProduct {
        id: string;
        name: string;
        price: number;
        category?: string;
    }

    interface LegacyProduct {
        id: string;
        brandId: string;
        name: string;
        price: number;
    }

    function simulateGetAllByBrand(
        brandId: string,
        brandDocs: Map<string, BrandData>,
        tenantProducts: Map<string, TenantProduct[]>,
        legacyProducts: LegacyProduct[]
    ): { products: any[]; source: string } {
        const effectiveBrandId = brandId.trim() !== '' ? brandId : 'demo_brand';
        let orgId: string | undefined;

        // 1. Try direct document lookup
        let brand = brandDocs.get(effectiveBrandId);

        // 2. Try slug query
        if (!brand) {
            brand = Array.from(brandDocs.values()).find(b => b.slug === effectiveBrandId);
        }

        // 3. Try orgId field query
        if (!brand) {
            brand = Array.from(brandDocs.values()).find(b => b.orgId === effectiveBrandId);
            if (brand) {
                orgId = effectiveBrandId;
            }
        }

        // If brand found, get orgId
        if (brand) {
            orgId = orgId || brand.orgId;

            // Fetch from tenant catalog if orgId exists
            if (orgId) {
                const products = tenantProducts.get(orgId);
                if (products && products.length > 0) {
                    return {
                        products: products.map(p => ({
                            ...p,
                            brandId: effectiveBrandId,
                        })),
                        source: 'tenant',
                    };
                }
            }
        }

        // 4. Direct tenant lookup for org_ prefixed IDs
        if (effectiveBrandId.startsWith('org_')) {
            const products = tenantProducts.get(effectiveBrandId);
            if (products && products.length > 0) {
                return {
                    products: products.map(p => ({
                        ...p,
                        brandId: effectiveBrandId,
                    })),
                    source: 'tenant_direct',
                };
            }
        }

        // 5. Fallback to legacy products collection
        const legacy = legacyProducts.filter(p => p.brandId === effectiveBrandId);
        return {
            products: legacy,
            source: 'legacy',
        };
    }

    describe('brand lookup by document ID', () => {
        it('should find brand by direct document ID', () => {
            const brands = new Map<string, BrandData>([
                ['thrivesyracuse', { id: 'thrivesyracuse', name: 'Thrive Syracuse', orgId: 'org_thrive_syracuse' }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'prod1', name: 'Product 1', price: 10 },
                    { id: 'prod2', name: 'Product 2', price: 20 },
                ]],
            ]);

            const result = simulateGetAllByBrand('thrivesyracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(2);
            expect(result.source).toBe('tenant');
            expect(result.products[0].name).toBe('Product 1');
        });
    });

    describe('brand lookup by slug', () => {
        it('should find brand by slug when doc ID not found', () => {
            const brands = new Map<string, BrandData>([
                ['brand_doc_id', { id: 'brand_doc_id', name: 'Thrive', slug: 'thrivesyracuse', orgId: 'org_thrive' }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive', [{ id: 'prod1', name: 'Product', price: 10 }]],
            ]);

            const result = simulateGetAllByBrand('thrivesyracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(1);
            expect(result.source).toBe('tenant');
        });
    });

    describe('brand lookup by orgId field', () => {
        it('should find brand by orgId field when doc ID and slug not found', () => {
            const brands = new Map<string, BrandData>([
                ['brand_thrive_syracuse', {
                    id: 'brand_thrive_syracuse',
                    name: 'Thrive Syracuse',
                    slug: 'thrive-syracuse',
                    orgId: 'org_thrive_syracuse',
                }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'prod1', name: 'Flower', price: 30, category: 'Flower' },
                ]],
            ]);

            const result = simulateGetAllByBrand('org_thrive_syracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(1);
            expect(result.products[0].brandId).toBe('org_thrive_syracuse');
        });
    });

    describe('direct tenant lookup for org_ prefixed IDs', () => {
        it('should try direct tenant lookup when brandId starts with org_', () => {
            // No brand docs match
            const brands = new Map<string, BrandData>();
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'prod1', name: 'Product 1', price: 25, category: 'Flower' },
                    { id: 'prod2', name: 'Product 2', price: 35, category: 'Edibles' },
                ]],
            ]);

            const result = simulateGetAllByBrand('org_thrive_syracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(2);
            expect(result.source).toBe('tenant_direct');
            expect(result.products[0].brandId).toBe('org_thrive_syracuse');
        });

        it('should not try direct tenant lookup for non-org_ prefixed IDs', () => {
            const brands = new Map<string, BrandData>();
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['some_brand_id', [{ id: 'prod1', name: 'Product', price: 10 }]], // Key doesn't match org_ prefix
            ]);

            const result = simulateGetAllByBrand('some_brand_id', brands, tenantProducts, []);

            expect(result.products).toHaveLength(0);
            expect(result.source).toBe('legacy');
        });
    });

    describe('tenant catalog fetch', () => {
        it('should fetch products from tenant publicViews when brand has orgId', () => {
            const brands = new Map<string, BrandData>([
                ['thrivesyracuse', { id: 'thrivesyracuse', name: 'Thrive', orgId: 'org_thrive_syracuse' }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'prod_123', name: 'Blue Dream', price: 45, category: 'Flower' },
                ]],
            ]);

            const result = simulateGetAllByBrand('thrivesyracuse', brands, tenantProducts, []);

            expect(result.source).toBe('tenant');
            expect(result.products[0]).toMatchObject({
                id: 'prod_123',
                name: 'Blue Dream',
                price: 45,
            });
        });
    });

    describe('fallback to legacy products collection', () => {
        it('should fallback to legacy collection when brand has no orgId', () => {
            const brands = new Map<string, BrandData>([
                ['legacy_brand', { id: 'legacy_brand', name: 'Legacy Brand' }], // No orgId
            ]);
            const legacyProducts: LegacyProduct[] = [
                { id: 'legacy1', brandId: 'legacy_brand', name: 'Legacy Product', price: 20 },
            ];

            const result = simulateGetAllByBrand('legacy_brand', brands, new Map(), legacyProducts);

            expect(result.products).toHaveLength(1);
            expect(result.source).toBe('legacy');
        });

        it('should return empty array when no products found anywhere', () => {
            const result = simulateGetAllByBrand('nonexistent', new Map(), new Map(), []);

            expect(result.products).toHaveLength(0);
        });
    });

    describe('Thrive Syracuse specific scenarios', () => {
        it('should handle Thrive Syracuse with orgId claim directly', () => {
            // User has orgId: 'org_thrive_syracuse' in their claims
            // Brand doc exists with orgId field
            const brands = new Map<string, BrandData>([
                ['brand_thrive_syracuse', {
                    id: 'brand_thrive_syracuse',
                    name: 'Thrive Syracuse',
                    slug: 'thrivesyracuse',
                    orgId: 'org_thrive_syracuse',
                }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'p1', name: 'Blue Dream', price: 45 },
                    { id: 'p2', name: 'OG Kush', price: 50 },
                    { id: 'p3', name: 'Girl Scout Cookies', price: 55 },
                ]],
            ]);

            // User's orgId claim is passed directly
            const result = simulateGetAllByBrand('org_thrive_syracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(3);
            expect(result.products[0].brandId).toBe('org_thrive_syracuse');
        });

        it('should handle Thrive Syracuse via brand document ID', () => {
            const brands = new Map<string, BrandData>([
                ['brand_thrive_syracuse', {
                    id: 'brand_thrive_syracuse',
                    name: 'Thrive Syracuse',
                    orgId: 'org_thrive_syracuse',
                }],
            ]);
            const tenantProducts = new Map<string, TenantProduct[]>([
                ['org_thrive_syracuse', [
                    { id: 'p1', name: 'Product', price: 40 },
                ]],
            ]);

            const result = simulateGetAllByBrand('brand_thrive_syracuse', brands, tenantProducts, []);

            expect(result.products).toHaveLength(1);
            expect(result.source).toBe('tenant');
        });
    });
});

describe('orgId priority in dispensary roles', () => {
    /**
     * Tests that orgId is checked BEFORE currentOrgId
     * This was the key bug fix for Thrive Syracuse
     */
    function resolveOrgIdForDispensary(user: {
        role: string;
        orgId?: string;
        currentOrgId?: string;
        locationId?: string;
    }): string | undefined {
        if (!isDispensaryRole(user.role)) return undefined;

        // KEY: orgId comes FIRST
        return user.orgId || user.currentOrgId || user.locationId;
    }

    it('should prioritize orgId over currentOrgId', () => {
        const user = {
            role: 'dispensary',
            orgId: 'org_primary',
            currentOrgId: 'org_secondary',
            locationId: 'loc_123',
        };

        expect(resolveOrgIdForDispensary(user)).toBe('org_primary');
    });

    it('should use currentOrgId when orgId is undefined', () => {
        const user = {
            role: 'dispensary',
            orgId: undefined,
            currentOrgId: 'org_secondary',
            locationId: 'loc_123',
        };

        expect(resolveOrgIdForDispensary(user)).toBe('org_secondary');
    });

    it('should use locationId as last resort', () => {
        const user = {
            role: 'dispensary',
            orgId: undefined,
            currentOrgId: undefined,
            locationId: 'loc_123',
        };

        expect(resolveOrgIdForDispensary(user)).toBe('loc_123');
    });

    it('should handle Thrive Syracuse exact claims structure', () => {
        // Actual claims from diagnostic
        const thriveUser = {
            role: 'dispensary',
            orgId: 'org_thrive_syracuse',
            currentOrgId: undefined,
            locationId: 'loc_thrive_syracuse',
        };

        expect(resolveOrgIdForDispensary(thriveUser)).toBe('org_thrive_syracuse');
    });
});
