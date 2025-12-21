
import { searchCannMenusProducts, importProducts } from '../actions';
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

// Mock Auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        role: 'brand',
        brandId: 'brand1',
        uid: 'user1'
    })
}));

const mockFirestore = {
    batch: jest.fn().mockReturnValue({
        set: jest.fn(),
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

        it('falls back to mock/scrape data when CannMenus returns empty', async () => {
            (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
                searchProducts: jest.fn().mockResolvedValue({ products: [] })
            }));

            const results = await searchCannMenusProducts('Jeeter', 'CA');
            // Should return mock data for Jeeter
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].brand).toBe('Jeeter');
            // Our mock data has 'scrape' as source (or we added it to mock data in implementation)
            expect(results[0].source).toBe('scrape');
        });
    });

    describe('importProducts', () => {
        it('imports products with the correct source', async () => {
            const productsToImport = [
                { name: 'P1', category: 'Vape', source: 'cannmenus' },
                { name: 'P2', category: 'Edible', source: 'scrape' }
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
            expect(secondCall.source).toBe('scrape');
        });

        it('defaults source to cannmenus if missing', async () => {
            const productsToImport = [
                { name: 'P1', category: 'Vape' } // No source
            ];
            await importProducts(productsToImport);
            const batchSet = mockFirestore.batch().set;
            expect(batchSet.mock.calls[0][1].source).toBe('cannmenus');
            expect(batchSet.mock.calls[0][1].sourceTimestamp).toBeDefined();
        });
    });
});
