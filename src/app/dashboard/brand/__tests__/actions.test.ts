import { getBrandDashboardData } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import * as leafly from '@/server/services/leafly-connector';
import * as productRepo from '@/server/repos/productRepo';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'user1' })
}));
jest.mock('@/server/services/leafly-connector', () => ({
    getLocalCompetition: jest.fn()
}));
jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn()
}));

const mockFirestore = {
    collection: jest.fn(),
};

describe('getBrandDashboardData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('returns formatted dashboard data with live inputs', async () => {
        // Mock Brands Call
        const mockBrandGet = jest.fn().mockResolvedValue({
            data: () => ({ state: 'IL', city: 'Chicago' })
        });
        mockFirestore.collection.mockReturnValueOnce({
            doc: jest.fn().mockReturnValue({ get: mockBrandGet })
        });

        // Mock Campaign Call (2nd collection usage)
        const mockCampaignGet = jest.fn().mockResolvedValue({ size: 5 });
        mockFirestore.collection.mockReturnValueOnce({
            where: jest.fn().mockReturnThis(),
            get: mockCampaignGet
        });

        // Mock Leafly
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({
            competitors: [1, 2, 3],
            pricingByCategory: [{ avg: 50 }],
            activeDeals: 12,
            dataFreshness: new Date(),
        });

        // Mock Products
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([
                { price: 60, retailerIds: ['r1', 'r2'] },
                { price: 40, retailerIds: ['r1'] }
            ])
        });

        const result = await getBrandDashboardData('brand1');

        expect(result).not.toBeNull();
        // Coverage: r1, r2 -> 2
        expect(result?.coverage.value).toBe(2);

        // Competitors: 3
        expect(result?.competitiveIntel.competitorsTracked).toBe(3);

        // Price Index calculation:
        // Avg Price = 50. Market Avg = 50. Delta = 0%.
        expect(result?.priceIndex.value).toContain('0%');
    });

    it('handles missing data gracefully', async () => {
        // Mock empty brand
        mockFirestore.collection.mockReturnValue({
            doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => null }) }),
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ size: 0 })
        });

        // Mock empty leafly
        (leafly.getLocalCompetition as jest.Mock).mockResolvedValue({
            competitors: [],
            pricingByCategory: [],
            activeDeals: 0,
            dataFreshness: null,
        });

        // Mock empty products
        (productRepo.makeProductRepo as jest.Mock).mockReturnValue({
            getAllByBrand: jest.fn().mockResolvedValue([])
        });

        const result = await getBrandDashboardData('brand1');

        expect(result?.coverage.value).toBe(0);
        expect(result?.competitiveIntel.competitorsTracked).toBe(0);
        expect(result?.priceIndex.value).toBe('0%');
    });
});
