/**
 * @jest-environment node
 */
import { getLandingGeoData } from '@/server/actions/landing-geo';
import { searchNearbyRetailers } from '@/lib/cannmenus-api';

// Mock CannMenus API
jest.mock('@/lib/cannmenus-api', () => ({
    searchNearbyRetailers: jest.fn(),
    getRetailerProducts: jest.fn().mockResolvedValue([])
}));

describe('getLandingGeoData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return data for retailers in legal states within distance', async () => {
        // Mock a Chicago retailer (Legal: IL, Distance: ~0)
        (searchNearbyRetailers as jest.Mock).mockResolvedValue([
            { id: '1', name: 'Chicago Bud', city: 'Chicago', state: 'IL', distance: 2.5 }
        ]);

        const result = await getLandingGeoData(41.8781, -87.6298);

        expect(result.retailers).toHaveLength(1);
        expect(result.retailers[0].name).toBe('Chicago Bud');
        expect(result.location?.city).toBe('Chicago');
    });

    it('should filter out retailers in non-legal states', async () => {
        // Mock a Wisconsin retailer (Illegal: WI)
        (searchNearbyRetailers as jest.Mock).mockResolvedValue([
            { id: '2', name: 'MKE Hemp', city: 'Milwaukee', state: 'WI', distance: 1.0 }
        ]);

        const result = await getLandingGeoData(43.0389, -87.9065);

        // Should return empty because WI is not in LEGAL_US_STATES
        expect(result.retailers).toHaveLength(0);
        expect(result.location).toBeNull();
    });

    it('should filter out retailers too far away (>50 miles)', async () => {
        // Mock a retailer that is legal but far (e.g. user in WI, closest is IL but 60 miles away)
        (searchNearbyRetailers as jest.Mock).mockResolvedValue([
            { id: '3', name: 'Border Weed', city: 'Antioch', state: 'IL', distance: 55.0 }
        ]);

        const result = await getLandingGeoData(43.0389, -87.9065);

        // Should return empty because distance > 50
        expect(result.retailers).toHaveLength(0);
        expect(result.location).toBeNull();
    });

    it('should handle mixed results (keep valid, drop invalid)', async () => {
        (searchNearbyRetailers as jest.Mock).mockResolvedValue([
            { id: '4', name: 'Hemp Shop', state: 'WI', distance: 5.0 }, // Drop (Illegal)
            { id: '5', name: 'Far Dispensary', state: 'IL', distance: 60.0 }, // Drop (Too far)
            { id: '6', name: 'Good Dispensary', state: 'IL', city: 'Zion', distance: 45.0 } // Keep
        ]);

        const result = await getLandingGeoData(42.0, -87.0);

        expect(result.retailers).toHaveLength(1);
        expect(result.retailers[0].name).toBe('Good Dispensary');
    });
});
