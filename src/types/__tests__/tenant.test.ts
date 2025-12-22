import {
    isTenant,
    isCatalogProduct,
    isTenantImport,
    isProductMapping,
    Tenant,
    CatalogProduct,
    TenantImport,
    ProductMapping
} from '../tenant';

describe('Tenant Type Guards', () => {
    describe('isTenant', () => {
        it('returns true for valid Tenant objects', () => {
            const validTenant: Partial<Tenant> = {
                id: 'tenant-123',
                name: 'Test Company',
                type: 'brand',
                email: 'contact@company.com'
            };
            expect(isTenant(validTenant)).toBe(true);
        });

        it('returns false for missing type field', () => {
            const invalidTenant = {
                id: 'tenant-123',
                name: 'Test Company',
                email: 'contact@company.com'
            };
            expect(isTenant(invalidTenant)).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isTenant(null)).toBe(false);
            expect(isTenant(undefined)).toBe(false);
        });
    });

    describe('isCatalogProduct', () => {
        it('returns true for valid CatalogProduct objects', () => {
            const validProduct: Partial<CatalogProduct> = {
                id: 'prod-123',
                tenantId: 'tenant-456',
                name: 'Test Product',
                category: 'flower',
                externalRefs: { 'cannmenus:abc': true }
            };
            expect(isCatalogProduct(validProduct)).toBe(true);
        });

        it('returns false for missing externalRefs', () => {
            const invalidProduct = {
                id: 'prod-123',
                tenantId: 'tenant-456',
                name: 'Test Product',
                category: 'flower'
            };
            expect(isCatalogProduct(invalidProduct)).toBe(false);
        });

        it('returns false for missing tenantId', () => {
            const invalidProduct = {
                id: 'prod-123',
                name: 'Test Product',
                category: 'flower',
                externalRefs: {}
            };
            expect(isCatalogProduct(invalidProduct)).toBe(false);
        });
    });

    describe('isTenantImport', () => {
        it('returns true for valid TenantImport objects', () => {
            const validImport: Partial<TenantImport> = {
                id: 'import-123',
                sourceId: 'source-456',
                status: 'completed',
                contentHash: 'abc123hash'
            };
            expect(isTenantImport(validImport)).toBe(true);
        });

        it('returns false for missing contentHash', () => {
            const invalidImport = {
                id: 'import-123',
                sourceId: 'source-456',
                status: 'completed'
            };
            expect(isTenantImport(invalidImport)).toBe(false);
        });

        it('returns false for missing status', () => {
            const invalidImport = {
                id: 'import-123',
                sourceId: 'source-456',
                contentHash: 'abc123hash'
            };
            expect(isTenantImport(invalidImport)).toBe(false);
        });
    });

    describe('isProductMapping', () => {
        it('returns true for valid ProductMapping objects', () => {
            const validMapping: Partial<ProductMapping> = {
                id: 'map-123',
                source: 'cannmenus',
                externalId: 'ext-456',
                productId: 'prod-789'
            };
            expect(isProductMapping(validMapping)).toBe(true);
        });

        it('returns false for missing productId', () => {
            const invalidMapping = {
                id: 'map-123',
                source: 'cannmenus',
                externalId: 'ext-456'
            };
            expect(isProductMapping(invalidMapping)).toBe(false);
        });

        it('returns false for missing externalId', () => {
            const invalidMapping = {
                id: 'map-123',
                source: 'cannmenus',
                productId: 'prod-789'
            };
            expect(isProductMapping(invalidMapping)).toBe(false);
        });

        it('returns false for non-objects', () => {
            expect(isProductMapping('string')).toBe(false);
            expect(isProductMapping(123)).toBe(false);
            expect(isProductMapping(null)).toBe(false);
        });
    });
});
