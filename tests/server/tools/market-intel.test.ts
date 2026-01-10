import { MarketIntelTools } from '@/server/tools/market-intel';
import { getCategoryTrends } from '@/server/services/headset';

// Mock simple wrapper service
jest.mock('@/server/services/headset', () => ({
    getCategoryTrends: jest.fn()
}));

// Mock the class based service
const mockSearchProducts = jest.fn();
jest.mock('@/server/services/cannmenus', () => {
    return {
        CannMenusService: jest.fn().mockImplementation(() => {
            return {
                searchProducts: mockSearchProducts
            };
        })
    };
});

describe('MarketIntelTools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get trends', async () => {
        (getCategoryTrends as jest.Mock).mockResolvedValue({ growth: 10, topBrand: 'A', avgPrice: 20 });
        const result = await MarketIntelTools.getTrends('Edibles');
        expect(result.growth).toBe(10);
    });

    it('should check competitor price using CannMenus', async () => {
        mockSearchProducts.mockResolvedValue({
            products: [
                { latest_price: 30, retailer_name: 'r1' },
                { latest_price: 40, retailer_name: 'r2' }
            ]
        });

        const result = await MarketIntelTools.checkCompetitorPrice('BrandA', 'ProductB');
        
        expect(mockSearchProducts).toHaveBeenCalled();
        expect(result.avgRetail).toBe(35); // (30+40)/2
        expect(result.source).toContain('CannMenus');
    });

    it('should fallback if CannMenus fails', async () => {
        mockSearchProducts.mockRejectedValue(new Error('API Fail'));
        
        const result = await MarketIntelTools.checkCompetitorPrice('BrandA', 'ProductB');
        
        expect(result.source).toContain('Fallback');
    });
});
