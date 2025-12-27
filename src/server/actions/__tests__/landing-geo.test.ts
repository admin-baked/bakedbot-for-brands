
import { getLandingGeoData } from '../landing-geo';
import { searchNearbyRetailers, getRetailerProducts } from '@/lib/cannmenus-api';

// Mock dependencies
jest.mock('@/lib/cannmenus-api', () => ({
    searchNearbyRetailers: jest.fn(),
    getRetailerProducts: jest.fn(),
}));

describe('landing-geo action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLandingGeoData', () => {
        it('should return empty data when no retailers found', async () => {
            (searchNearbyRetailers as jest.Mock).mockResolvedValue([]);

            const result = await getLandingGeoData(34.05, -118.25);

            expect(result.retailers).toHaveLength(0);
            expect(result.brands).toHaveLength(0);
            expect(result.location).toBeNull();
        });

        it('should return retailers and derived brands', async () => {
             // Mock retailers
             (searchNearbyRetailers as jest.Mock).mockResolvedValue([
                { id: 'r1', name: 'Disp A', distance: 1.5, city: 'Los Angeles', state: 'CA' },
                { id: 'r2', name: 'Disp B', distance: 2.0, city: 'Los Angeles', state: 'CA' }
            ]);

            // Mock products for r1
            (getRetailerProducts as jest.Mock).mockResolvedValueOnce([
                { brand_id: 'b1', brand_name: 'Stiiizy', product_name: 'Pod' },
                { brand_id: 'b1', brand_name: 'Stiiizy', product_name: 'Edible' },
                { brand_id: 'b2', brand_name: 'Jeeter', product_name: 'Pre-roll' }
            ]);

            // Mock products for r2
            (getRetailerProducts as jest.Mock).mockResolvedValueOnce([
                { brand_id: 'b1', brand_name: 'Stiiizy', product_name: 'Flower' },
                { brand_id: 'b3', brand_name: 'Kiva', product_name: 'Gummies' }
            ]);

            const result = await getLandingGeoData(34.05, -118.25);

            // Verify Retailers
            expect(result.retailers).toHaveLength(2);
            expect(result.retailers[0].name).toBe('Disp A');
            expect(result.location).toEqual({ city: 'Los Angeles', state: 'CA' });

            // Verify Derived Brands (Stiiizy should be top)
            expect(result.brands.length).toBeGreaterThan(0);
            expect(result.brands[0].name).toBe('Stiiizy');
            // Stiiizy count: 2 from r1 + 1 from r2 = 3
            expect(result.brands[0].productCount).toBe(3); 
            
            // Verify other brands
            const brandNames = result.brands.map(b => b.name);
            expect(brandNames).toContain('Jeeter');
            expect(brandNames).toContain('Kiva');
        });

        it('should handle API errors gracefully', async () => {
            (searchNearbyRetailers as jest.Mock).mockRejectedValue(new Error('API Error'));

            const result = await getLandingGeoData(34.05, -118.25);

            expect(result.retailers).toHaveLength(0);
            expect(result.brands).toHaveLength(0);
            expect(result.location).toBeNull();
        });
    });
});
