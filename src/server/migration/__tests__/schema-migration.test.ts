import {
    transformLegacyBrand,
    transformLegacyDispensary,
    transformLegacyProduct,
    createBrandEntityView,
    createDispensaryEntityView,
    createSlug,
    validateDirectoryBrand,
    validateDirectoryDispensary,
    validateCatalogProduct,
    LegacyBrand,
    LegacyDispensary,
    LegacyProduct
} from '../schema-migration';

describe('Schema Migration', () => {
    describe('transformLegacyBrand', () => {
        it('transforms legacy brand to directory brand', () => {
            const legacy: LegacyBrand = {
                name: 'Test Brand',
                description: 'A great brand',
                website: 'https://testbrand.com',
                logo: 'https://cdn.com/logo.png',
                verified: true
            };

            const result = transformLegacyBrand(legacy, 'brand-123');

            expect(result.id).toBe('brand-123');
            expect(result.name).toBe('Test Brand');
            expect(result.slug).toBe('test-brand');
            expect(result.description).toBe('A great brand');
            expect(result.website).toBe('https://testbrand.com');
            expect(result.logoUrl).toBe('https://cdn.com/logo.png');
            expect(result.status).toBe('claimed'); // verified = claimed
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        it('creates slug from name when not provided', () => {
            const legacy: LegacyBrand = { name: 'My Awesome Brand!' };
            const result = transformLegacyBrand(legacy, 'brand-456');

            expect(result.slug).toBe('my-awesome-brand');
        });

        it('calculates confidence based on completeness', () => {
            const completeBrand: LegacyBrand = {
                name: 'Complete',
                description: 'Full description',
                website: 'https://example.com',
                logo: 'https://cdn.com/logo.png',
                verified: true
            };

            const minimalBrand: LegacyBrand = {
                name: 'Minimal'
            };

            const complete = transformLegacyBrand(completeBrand, 'b1');
            const minimal = transformLegacyBrand(minimalBrand, 'b2');

            expect(complete.confidence).toBeGreaterThan(minimal.confidence);
        });
    });

    describe('transformLegacyDispensary', () => {
        it('transforms legacy dispensary to directory dispensary', () => {
            const legacy: LegacyDispensary = {
                name: 'Green Leaf Dispensary',
                address: '123 Main St',
                city: 'Chicago',
                state: 'IL',
                zip: '60601',
                lat: 41.8781,
                lng: -87.6298,
                phone: '312-555-1234'
            };

            const result = transformLegacyDispensary(legacy, 'disp-123');

            expect(result.id).toBe('disp-123');
            expect(result.name).toBe('Green Leaf Dispensary');
            expect(result.address.city).toBe('Chicago');
            expect(result.address.state).toBe('IL');
            expect(result.geo.lat).toBe(41.8781);
            expect(result.geo.lng).toBe(-87.6298);
        });

        it('handles lat_lng object format', () => {
            const legacy: LegacyDispensary = {
                name: 'Test Dispensary',
                city: 'Denver',
                state: 'CO',
                lat_lng: { lat: 39.7392, lng: -104.9903 }
            };

            const result = transformLegacyDispensary(legacy, 'disp-456');

            expect(result.geo.lat).toBe(39.7392);
            expect(result.geo.lng).toBe(-104.9903);
        });

        it('calculates confidence based on data completeness', () => {
            const complete: LegacyDispensary = {
                name: 'Complete',
                address: '123 Main',
                city: 'Chicago',
                state: 'IL',
                lat: 41.8,
                lng: -87.6,
                phone: '555-1234',
                hours: { monday: '9-5' }
            };

            const minimal: LegacyDispensary = {
                name: 'Minimal'
            };

            const completeResult = transformLegacyDispensary(complete, 'd1');
            const minimalResult = transformLegacyDispensary(minimal, 'd2');

            expect(completeResult.confidence).toBeGreaterThan(minimalResult.confidence);
        });
    });

    describe('transformLegacyProduct', () => {
        it('transforms legacy product to catalog product', () => {
            const legacy: LegacyProduct = {
                name: 'Blue Dream',
                brandName: 'Test Brand',
                category: 'Flower',
                thc: 22.5,
                cbd: 0.5,
                image: 'https://cdn.com/product.jpg'
            };

            const result = transformLegacyProduct(legacy, 'prod-123', 'tenant-456');

            expect(result.id).toBe('prod-123');
            expect(result.tenantId).toBe('tenant-456');
            expect(result.name).toBe('Blue Dream');
            expect(result.brandName).toBe('Test Brand');
            expect(result.category).toBe('flower');
            expect(result.potency?.thc?.value).toBe(22.5);
        });

        it('normalizes category strings', () => {
            const product1 = transformLegacyProduct({ name: 'P1', category: 'pre-roll' }, 'p1', 't1');
            const product2 = transformLegacyProduct({ name: 'P2', category: 'Edibles' }, 'p2', 't1');
            const product3 = transformLegacyProduct({ name: 'P3', category: 'VAPE' }, 'p3', 't1');

            expect(product1.category).toBe('prerolls');
            expect(product2.category).toBe('edibles');
            expect(product3.category).toBe('vapes');
        });

        it('creates external ref for legacy ID', () => {
            const result = transformLegacyProduct({ name: 'Test' }, 'prod-123', 'tenant-1');

            expect(result.externalRefs['legacy:prod-123']).toBe(true);
        });

        it('builds images array from legacy format', () => {
            const legacy: LegacyProduct = {
                name: 'Test',
                image: 'https://cdn.com/main.jpg',
                images: ['https://cdn.com/main.jpg', 'https://cdn.com/alt1.jpg', 'https://cdn.com/alt2.jpg']
            };

            const result = transformLegacyProduct(legacy, 'p1', 't1');

            expect(result.images).toHaveLength(3);
            expect(result.images?.[0].isPrimary).toBe(true);
        });
    });

    describe('createBrandEntityView', () => {
        it('creates entity view from directory brand', () => {
            const brand = transformLegacyBrand({ name: 'Test Brand', verified: true }, 'b1');
            const view = createBrandEntityView(brand);

            expect(view.id).toBe('b1');
            expect(view.entityType).toBe('brand');
            expect(view.name).toBe('Test Brand');
            expect(view.isClaimed).toBe(true);
            expect(view.pageTitle).toContain('Test Brand');
        });
    });

    describe('createDispensaryEntityView', () => {
        it('creates entity view from directory dispensary', () => {
            const dispensary = transformLegacyDispensary(
                { name: 'Test Dispensary', city: 'Chicago', state: 'IL' },
                'd1'
            );
            const view = createDispensaryEntityView(dispensary);

            expect(view.id).toBe('d1');
            expect(view.entityType).toBe('dispensary');
            expect(view.pageTitle).toContain('Chicago');
        });
    });

    describe('createSlug', () => {
        it('creates URL-safe slugs', () => {
            expect(createSlug('Hello World')).toBe('hello-world');
            expect(createSlug('Test & More!')).toBe('test-more');
            expect(createSlug('  Spaces  ')).toBe('spaces');
            expect(createSlug('UPPERCASE')).toBe('uppercase');
        });
    });

    describe('Validation Functions', () => {
        it('validates directory brand', () => {
            const valid = transformLegacyBrand({ name: 'Test' }, 'b1');
            const errors = validateDirectoryBrand(valid);
            expect(errors).toHaveLength(0);
        });

        it('catches missing brand fields', () => {
            const errors = validateDirectoryBrand({});
            expect(errors).toContain('Missing id');
            expect(errors).toContain('Missing name');
        });

        it('validates directory dispensary', () => {
            const valid = transformLegacyDispensary({ name: 'Test', city: 'C', state: 'S' }, 'd1');
            const errors = validateDirectoryDispensary(valid);
            expect(errors).toHaveLength(0);
        });

        it('validates catalog product', () => {
            const valid = transformLegacyProduct({ name: 'Test' }, 'p1', 't1');
            const errors = validateCatalogProduct(valid);
            expect(errors).toHaveLength(0);
        });

        it('catches missing product fields', () => {
            const errors = validateCatalogProduct({});
            expect(errors).toContain('Missing id');
            expect(errors).toContain('Missing tenantId');
        });
    });
});
