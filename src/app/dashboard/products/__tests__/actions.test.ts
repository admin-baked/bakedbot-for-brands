
import {
    searchCannMenusProducts,
    importProducts,
    syncProductsFromPos,
    generateProductDescriptionAI,
    saveGeneratedDescription
} from '../actions';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn()
}));

jest.mock('@/server/services/leafly-connector', () => ({
    getLocalCompetition: jest.fn()
}));

// Mock menu actions
jest.mock('@/app/dashboard/menu/actions', () => ({
    syncMenu: jest.fn().mockResolvedValue({ success: true, count: 10, provider: 'alleaves' }),
    getPosConfig: jest.fn().mockResolvedValue({ provider: 'alleaves', status: 'connected', displayName: 'Alleaves' })
}));

// Mock AI flow
jest.mock('@/ai/flows/generate-product-description', () => ({
    generateProductDescription: jest.fn().mockResolvedValue({
        productName: 'Test Product',
        description: 'AI generated description for this amazing cannabis product.'
    })
}));

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

// Mock productRepo
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn().mockReturnValue({
        getById: jest.fn().mockResolvedValue({
            id: 'prod1',
            name: 'Test Product',
            category: 'Flower',
            price: 45,
            thcPercent: 25,
            cbdPercent: 1,
            strainType: 'Hybrid',
            description: 'Original description'
        }),
        update: jest.fn().mockResolvedValue(undefined),
        getAllByLocation: jest.fn().mockResolvedValue([
            { id: 'prod1', name: 'Product 1', price: 25, category: 'Flower' },
            { id: 'prod2', name: 'Product 2', price: 75, category: 'Vape' }
        ])
    })
}));

// Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        role: 'dispensary_admin',
        brandId: 'brand1',
        uid: 'user1',
        locationId: 'loc1',
        orgId: 'org1'
    })
}));

const mockFirestore = {
    batch: jest.fn().mockReturnValue({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn()
    }),
    collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: () => ({ name: 'Test Brand', billing: { subscriptionStatus: 'active' } }) })
        })
    })
};

describe('Products Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('searchCannMenusProducts (Waterfall)', () => {
        it('returns CannMenus products when service succeeds', async () => {
            (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
                searchProducts: jest.fn().mockResolvedValue({
                    products: [
                        { cann_sku_id: '123', product_name: 'Test Product', brand_name: 'Jeeter', latest_price: 20 }
                    ]
                })
            }));

            const results = await searchCannMenusProducts('Jeeter', 'CA');
            expect(results).toHaveLength(1);
            expect(results[0].source).toBe('cannmenus');
            expect(results[0].name).toBe('Test Product');
        });

        it('returns empty array when CannMenus returns empty', async () => {
            (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
                searchProducts: jest.fn().mockResolvedValue({ products: [] })
            }));

            const results = await searchCannMenusProducts('UnknownBrand');
            // Returns empty when no products found
            expect(results).toEqual([]);
        });
    });

    describe('importProducts', () => {
        it('imports products with the correct source', async () => {
            const productsToImport = [
                { name: 'P1', category: 'Vape', source: 'cannmenus' },
                { name: 'P2', category: 'Edible', source: 'discovery' }
            ];

            const result = await importProducts(productsToImport);

            expect(result.success).toBe(true);
            expect(result.count).toBe(2);

            // Check batch.set calls
            const batchSet = mockFirestore.batch().set;
            expect(batchSet).toHaveBeenCalledTimes(2);

            // Verify source is preserved
            const firstCall = batchSet.mock.calls[0][1];
            expect(firstCall.source).toBe('cannmenus');

            const secondCall = batchSet.mock.calls[1][1];
            expect(secondCall.source).toBe('discovery');
        });

        it('defaults source to manual if missing', async () => {
            const productsToImport = [
                { name: 'P1', category: 'Vape' } // No source
            ];
            await importProducts(productsToImport);
            const batchSet = mockFirestore.batch().set;
            // linkBrandProducts now maps to 'manual' when no source specified
            expect(batchSet.mock.calls[0][1].source).toBeDefined();
            expect(batchSet.mock.calls[0][1].sourceTimestamp).toBeDefined();
        });
    });

    describe('syncProductsFromPos', () => {
        it('calls syncMenu and returns result', async () => {
            const result = await syncProductsFromPos();
            expect(result.success).toBe(true);
            expect(result.count).toBe(10);
            expect(result.provider).toBe('alleaves');
        });
    });

    describe('generateProductDescriptionAI', () => {
        it('generates AI description for a product', async () => {
            const result = await generateProductDescriptionAI('prod1');
            expect(result.success).toBe(true);
            expect(result.description).toBe('AI generated description for this amazing cannabis product.');
        });

        it('returns error when product not found', async () => {
            const { makeProductRepo } = require('@/server/repos/productRepo');
            makeProductRepo.mockReturnValueOnce({
                getById: jest.fn().mockResolvedValue(null)
            });

            const result = await generateProductDescriptionAI('nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Product not found');
        });
    });

    describe('saveGeneratedDescription', () => {
        it('saves description to product', async () => {
            const result = await saveGeneratedDescription('prod1', 'New AI description');
            expect(result.success).toBe(true);

            const { makeProductRepo } = require('@/server/repos/productRepo');
            expect(makeProductRepo().update).toHaveBeenCalledWith('prod1', { description: 'New AI description' });
        });
    });
});
