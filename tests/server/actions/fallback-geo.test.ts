
import { getLandingGeoData } from '@/server/actions/landing-geo';
import * as api from '@/lib/cannmenus-api';
import * as webSearch from '@/server/tools/web-search';

// Mock the modules
jest.mock('@/lib/cannmenus-api', () => ({
    searchNearbyRetailers: jest.fn(),
    getRetailerProducts: jest.fn(),
    reverseGeocode: jest.fn()
}));

jest.mock('@/server/tools/web-search', () => ({
    searchPlaces: jest.fn()
}));

describe('getLandingGeoData Fallback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fallback to Serper for non-legal states (e.g. TX)', async () => {
        // 1. Mock standard search returning empty (or filtered out)
        // Even if it returns something, if it's filtered out, we hit fallback logic?
        // Actually code says: rawRetailers -> filtered. If filtered.length > 0 used.
        // If filtered.length === 0, then we verify non-legal state.
        
        (api.searchNearbyRetailers as jest.Mock).mockResolvedValue([]); 
        
        // 2. Mock reverse geocode returning Texas (Non-Legal)
        (api.reverseGeocode as jest.Mock).mockResolvedValue({
            city: 'Austin',
            state: 'Texas',
            stateCode: 'TX'
        });

        // 3. Mock Serper search returning smoke shops
        (webSearch.searchPlaces as jest.Mock).mockResolvedValue({
            success: true,
            results: [
                { title: 'Austin Smoke Shop', snippet: 'Best vapes' },
                { title: 'Hemp World', snippet: 'CBD and more' }
            ]
        });

        const result = await getLandingGeoData(30.2672, -97.7431);

        expect(api.searchNearbyRetailers).toHaveBeenCalled();
        expect(api.reverseGeocode).toHaveBeenCalled();
        expect(webSearch.searchPlaces).toHaveBeenCalledWith(expect.stringContaining('Smoke shops in Austin'));

        expect(result.retailers).toHaveLength(2);
        expect(result.retailers[0].name).toBe('Austin Smoke Shop');
        expect(result.location?.city).toBe('Austin');
    });

    it('should NOT fallback for legal states (e.g. CA) even if no retailers found', async () => {
        (api.searchNearbyRetailers as jest.Mock).mockResolvedValue([]); 
        
        (api.reverseGeocode as jest.Mock).mockResolvedValue({
            city: 'Los Angeles',
            state: 'California',
            stateCode: 'CA'
        });

        const result = await getLandingGeoData(34.05, -118.25);

        expect(api.reverseGeocode).toHaveBeenCalled();
        // Since CA is legal, we do NOT search for smoke shops (logic is strict for now)
        // Logic: if (!isLegal) { searchPlaces... }
        expect(webSearch.searchPlaces).not.toHaveBeenCalled();
        expect(result.retailers).toHaveLength(0);
    });
});
