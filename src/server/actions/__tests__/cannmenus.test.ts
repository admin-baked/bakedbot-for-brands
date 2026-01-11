
import { searchCannMenusRetailers } from '../cannmenus';

// Mock the config
jest.mock('@/lib/config', () => ({
    CANNMENUS_CONFIG: {
        API_BASE: 'https://api.cannmenus.com',
        API_KEY: 'mock-key'
    }
}));

describe('searchCannMenusRetailers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('should return empty array for short queries', async () => {
        const results = await searchCannMenusRetailers('a');
        expect(results).toEqual([]);
    });

    it('should return mock results when "demo" is in query', async () => {
        const results = await searchCannMenusRetailers('demo dispensary');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].type).toBeDefined();
    });

    it('should return valid results from API', async () => {
        const mockBrandsResponse = {
            data: [
                { brand_name: 'Test Brand', id: 123 }
            ]
        };
        const mockRetailersResponse = {
            data: [
                { dispensary_name: 'Test Dispensary', id: 456 }
            ]
        };

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockBrandsResponse
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => mockRetailersResponse
            });

        const results = await searchCannMenusRetailers('Example');
        
        expect(results).toHaveLength(2);
        expect(results.find(r => r.type === 'brand')?.name).toBe('Test Brand');
        expect(results.find(r => r.type === 'dispensary')?.name).toBe('Test Dispensary');
    });

    it('should handle API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
        const results = await searchCannMenusRetailers('Example');
        expect(results).toEqual([]);
    });
});
