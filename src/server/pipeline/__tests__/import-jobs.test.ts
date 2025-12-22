import {
    parseProducts,
    mergeProducts,
    buildPublicViews,
    generateContentHash,
    isDuplicateImport,
    RawProductData
} from '../import-jobs';
import type { StagingProduct, ProductMapping, CatalogProduct } from '@/types/tenant';

describe('Import Pipeline Jobs', () => {
    describe('parseProducts', () => {
        const sourceId = 'src-123';
        const sourceType = 'cannmenus' as const;
        const importId = 'imp-456';

        it('parses valid products successfully', () => {
            const rawProducts: RawProductData[] = [
                {
                    externalId: 'ext-1',
                    name: 'Blue Dream',
                    category: 'Flower',
                    price: 45.00,
                    thc: '22%',
                    imageUrl: 'https://example.com/image.jpg'
                },
                {
                    externalId: 'ext-2',
                    name: 'Gummy Bears',
                    category: 'Edibles',
                    price: '25.00',
                    brandName: 'CannaBrand'
                }
            ];

            const result = parseProducts(rawProducts, sourceId, sourceType, importId);

            expect(result.success).toBe(true);
            expect(result.totalRecords).toBe(2);
            expect(result.parsedRecords).toBe(2);
            expect(result.errorRecords).toBe(0);
            expect(result.stagingDocs).toHaveLength(2);
        });

        it('normalizes categories correctly', () => {
            const rawProducts: RawProductData[] = [
                { externalId: 'ext-1', name: 'Test Flower', category: 'flowers' },
                { externalId: 'ext-2', name: 'Test Preroll', category: 'pre-roll' },
                { externalId: 'ext-3', name: 'Test Vape', category: 'cartridge' },
                { externalId: 'ext-4', name: 'Test Edible', category: 'gummies' }
            ];

            const result = parseProducts(rawProducts, sourceId, sourceType, importId);

            expect(result.stagingDocs[0].category).toBe('flower');
            expect(result.stagingDocs[1].category).toBe('prerolls');
            expect(result.stagingDocs[2].category).toBe('vapes');
            expect(result.stagingDocs[3].category).toBe('edibles');
        });

        it('parses THC/CBD values from strings', () => {
            const rawProducts: RawProductData[] = [
                { externalId: 'ext-1', name: 'Test', thc: '25.5%', cbd: '0.5%' },
                { externalId: 'ext-2', name: 'Test2', thc: 22, cbd: 1 },
                { externalId: 'ext-3', name: 'Test3', thc: '100mg', cbd: '50mg' }
            ];

            const result = parseProducts(rawProducts, sourceId, sourceType, importId);

            expect(result.stagingDocs[0].thc).toBe(25.5);
            expect(result.stagingDocs[0].thcUnit).toBe('percent');
            expect(result.stagingDocs[1].thc).toBe(22);
            expect(result.stagingDocs[2].thc).toBe(100);
            expect(result.stagingDocs[2].thcUnit).toBe('mg');
        });

        it('handles invalid products gracefully', () => {
            const rawProducts: RawProductData[] = [
                { externalId: 'ext-1', name: 'Valid Product' },
                { externalId: '', name: 'Missing ID' },
                { externalId: 'ext-3', name: '' }
            ];

            const result = parseProducts(rawProducts, sourceId, sourceType, importId);

            expect(result.success).toBe(false);
            expect(result.parsedRecords).toBe(1);
            expect(result.errorRecords).toBe(2);
            expect(result.errors).toHaveLength(2);
        });

        it('adds warnings for missing recommended fields', () => {
            const rawProducts: RawProductData[] = [
                { externalId: 'ext-1', name: 'Minimal Product' }
            ];

            const result = parseProducts(rawProducts, sourceId, sourceType, importId);

            expect(result.stagingDocs[0].parseDiagnostics?.warnings).toContain('Missing category');
            expect(result.stagingDocs[0].parseDiagnostics?.warnings).toContain('Missing price');
            expect(result.stagingDocs[0].parseDiagnostics?.warnings).toContain('Missing images');
        });

        it('calculates confidence scores based on completeness', () => {
            const completeProduct: RawProductData = {
                externalId: 'ext-1',
                name: 'Complete Product',
                category: 'flower',
                price: 50,
                imageUrl: 'https://example.com/img.jpg',
                description: 'A great product',
                thc: 20,
                brandName: 'Test Brand',
                effects: ['relaxed', 'happy']
            };

            const incompleteProduct: RawProductData = {
                externalId: 'ext-2',
                name: 'Incomplete Product'
            };

            const result = parseProducts([completeProduct, incompleteProduct], sourceId, sourceType, importId);

            expect(result.stagingDocs[0].parseDiagnostics?.confidence).toBeGreaterThan(0.8);
            expect(result.stagingDocs[1].parseDiagnostics?.confidence).toBeLessThan(0.3);
        });
    });

    describe('mergeProducts', () => {
        const tenantId = 'tenant-123';

        it('creates new products when no mapping exists', () => {
            const stagingProducts: StagingProduct[] = [
                {
                    externalId: 'ext-1',
                    sourceId: 'src-1',
                    sourceType: 'cannmenus',
                    importId: 'imp-1',
                    name: 'New Product',
                    category: 'flower',
                    mergeState: 'pending',
                    stagedAt: new Date() as any
                }
            ];

            const existingMappings = new Map<string, ProductMapping>();

            const result = mergeProducts(stagingProducts, existingMappings, tenantId);

            expect(result.newProducts).toBe(1);
            expect(result.updatedProducts).toBe(0);
            expect(result.dirtyProductIds).toHaveLength(1);
        });

        it('updates existing products when mapping exists', () => {
            const stagingProducts: StagingProduct[] = [
                {
                    externalId: 'ext-1',
                    sourceId: 'src-1',
                    sourceType: 'cannmenus',
                    importId: 'imp-1',
                    name: 'Existing Product',
                    category: 'flower',
                    mergeState: 'pending',
                    stagedAt: new Date() as any
                }
            ];

            const existingMappings = new Map<string, ProductMapping>([
                ['cannmenus:ext-1', {
                    id: 'map-1',
                    source: 'cannmenus',
                    externalId: 'ext-1',
                    productId: 'prod-existing',
                    confidence: 1.0,
                    method: 'exact',
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any
                }]
            ]);

            const result = mergeProducts(stagingProducts, existingMappings, tenantId);

            expect(result.newProducts).toBe(0);
            expect(result.updatedProducts).toBe(1);
            expect(result.dirtyProductIds).toContain('prod-existing');
        });

        it('generates deterministic product IDs', () => {
            const stagingProducts: StagingProduct[] = [
                {
                    externalId: 'ext-1',
                    sourceId: 'src-1',
                    sourceType: 'cannmenus',
                    importId: 'imp-1',
                    name: 'Test Product',
                    mergeState: 'pending',
                    stagedAt: new Date() as any
                }
            ];

            const result1 = mergeProducts(stagingProducts, new Map(), tenantId);
            const result2 = mergeProducts(stagingProducts, new Map(), tenantId);

            // Same input should produce same product ID
            expect(result1.dirtyProductIds[0]).toBe(result2.dirtyProductIds[0]);
        });
    });

    describe('buildPublicViews', () => {
        it('builds public views from catalog products', () => {
            const catalogProducts: CatalogProduct[] = [
                {
                    id: 'prod-1',
                    tenantId: 'tenant-1',
                    name: 'Test Product',
                    category: 'flower',
                    strainType: 'hybrid',
                    potency: { thc: { value: 22, unit: 'percent' } },
                    images: [{ url: 'https://example.com/img.jpg', isPrimary: true }],
                    externalRefs: { 'cannmenus:ext-1': true },
                    isActive: true,
                    isPublished: true,
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any
                }
            ];

            const result = buildPublicViews(catalogProducts);

            expect(result.success).toBe(true);
            expect(result.viewsBuilt).toBe(1);
        });

        it('handles products without optional fields', () => {
            const catalogProducts: CatalogProduct[] = [
                {
                    id: 'prod-minimal',
                    tenantId: 'tenant-1',
                    name: 'Minimal Product',
                    category: 'flower',
                    externalRefs: {},
                    isActive: true,
                    isPublished: false,
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any
                }
            ];

            const result = buildPublicViews(catalogProducts);

            expect(result.success).toBe(true);
            expect(result.viewsBuilt).toBe(1);
        });
    });

    describe('Content Hash Utilities', () => {
        it('generates consistent hashes for same data', () => {
            const data = { name: 'Test', price: 50 };
            const hash1 = generateContentHash(data);
            const hash2 = generateContentHash(data);

            expect(hash1).toBe(hash2);
        });

        it('generates different hashes for different data', () => {
            const data1 = { name: 'Test1', price: 50 };
            const data2 = { name: 'Test2', price: 50 };

            const hash1 = generateContentHash(data1);
            const hash2 = generateContentHash(data2);

            expect(hash1).not.toBe(hash2);
        });

        it('detects duplicate imports', () => {
            const existingHashes = new Set(['abc123', 'def456']);

            expect(isDuplicateImport('abc123', existingHashes)).toBe(true);
            expect(isDuplicateImport('xyz789', existingHashes)).toBe(false);
        });
    });
});
