import { getCategoryBenchmarks, getBrandRetailers } from '../benchmarks';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { CannMenusService } from '@/server/services/cannmenus';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/services/leafly-connector', () => ({
    getLocalCompetition: jest.fn().mockResolvedValue({
        pricingByCategory: [
            { category: 'Edibles', avg: 20 },
            { category: 'Flower', avg: 45 }
        ],
        competitors: []
    })
}));
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn()
}));
jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn()
}));

const mockFirestore = {
    collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ data: () => ({ state: 'IL', city: 'Chicago' }) })
        })
    }),
    getAll: jest.fn()
};

describe('Intelligence Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });

        // Mock CannMenusService.searchProducts
        (CannMenusService as unknown as jest.Mock).mockImplementation(() => ({
            searchProducts: jest.fn().mockResolvedValue({
                products: [
                    { latest_price: 24 }, // Avg 24
                    { latest_price: 24 }
                ]
            })
        }));
    });

    it('calculates price benchmarks correctly using blended data', async () => {
        // Mock Repo returning products
        const mockRepo = {
            getAllByBrand: jest.fn().mockResolvedValue([
                { category: 'Edibles', price: 22, brandId: 'brand1' },
                { category: 'Edibles', price: 22, brandId: 'brand1' },
                { category: 'Flower', price: 40, brandId: 'brand1' }
            ])
        };
        (makeProductRepo as jest.Mock).mockReturnValue(mockRepo);

        const result = await getCategoryBenchmarks('brand1');

        // Edibles: 
        // Your Avg: 22
        // Leafly Market: 20
        // CannMenus Market: 24 (mocked above)
        // Blended Market: (20+24)/2 = 22
        // Diff: 0%
        const edibles = result.find(b => b.category === 'Edibles');
        expect(edibles).toBeDefined();
        expect(edibles?.difference).toBe(0);
        expect(edibles?.avgMarketPrice).toBe(22);

        // Flower:
        // Your: 40
        // Leafly: 45
        // CannMenus: 24 (default mock)
        // Blended: (45+24)/2 = 34.5
        // Diff: (40 - 34.5)/34.5 = 15.9%
        const flower = result.find(b => b.category === 'Flower');
        expect(flower).toBeDefined();
        expect(flower?.avgMarketPrice).toBe(34.5);
    });

    it('aggregates retailers correctly', async () => {
        const mockRepo = {
            getAllByBrand: jest.fn().mockResolvedValue([
                { retailerIds: ['r1', 'r2'], name: 'p1' },
                { retailerIds: ['r1'], name: 'p2' }
            ])
        };
        (makeProductRepo as jest.Mock).mockReturnValue(mockRepo);

        // Mock Firestore getAll for retailers
        mockFirestore.getAll.mockResolvedValue([
            { exists: true, id: 'r1', data: () => ({ name: 'Disp 1', address: { city: 'Chi' } }) },
            { exists: true, id: 'r2', data: () => ({ name: 'Disp 2', address: { city: 'Chi' } }) }
        ]);

        const result = await getBrandRetailers('brand1');

        expect(mockRepo.getAllByBrand).toHaveBeenCalledWith('brand1');
        // Check r1 count = 2 skus
        const r1 = result.find(r => r.name === 'Disp 1');
        expect(r1?.stockCount).toBe(2);

        // Check r2 count = 1 sku
        const r2 = result.find(r => r.name === 'Disp 2');
        expect(r2?.stockCount).toBe(1);
    });
});
