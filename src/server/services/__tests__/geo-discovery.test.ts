
import { discoverNearbyProducts } from '../geo-discovery';
import { searchNearbyRetailers, getRetailerProducts } from '@/lib/cannmenus-api';

// Mock dependencies
jest.mock('@/lib/cannmenus-api', () => ({
    searchNearbyRetailers: jest.fn(),
    getRetailerProducts: jest.fn(),
    geocodeZipCode: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(),
        },
    })),
}));

describe('geo-discovery service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('discoverNearbyProducts', () => {
        it('should filter products by search query', async () => {
            // Mock retailers
            (searchNearbyRetailers as jest.Mock).mockResolvedValue([
                { id: 'r1', name: 'Disp 1', distance: 1, state: 'CA', city: 'Los Angeles' }
            ]);

            // Mock products
            (getRetailerProducts as jest.Mock).mockResolvedValue([
                {
                    cann_sku_id: 'p1',
                    product_name: 'Blue Dream Vape',
                    brand_name: 'Stiiizy',
                    description: 'Sativa vape pod',
                    latest_price: 30,
                    original_price: 35,
                    display_weight: '1g',
                    percentage_thc: 85,
                },
                {
                    cann_sku_id: 'p2',
                    product_name: 'OG Kush Flower',
                    brand_name: 'Cookies',
                    description: 'Indica flower',
                    latest_price: 50,
                    original_price: 50,
                    display_weight: '3.5g',
                    percentage_thc: 25,
                }
            ]);

            // Test 1: Search by name
            const result1 = await discoverNearbyProducts({
                lat: 34.05, lng: -118.25,
                searchQuery: 'Blue Dream'
            });
            expect(result1.products).toHaveLength(1);
            expect(result1.products[0].name).toBe('Blue Dream Vape');

            // Test 2: Search by brand
            const result2 = await discoverNearbyProducts({
                lat: 34.05, lng: -118.25,
                searchQuery: 'cookies'
            });
            expect(result2.products).toHaveLength(1);
            expect(result2.products[0].brandName).toBe('Cookies');

            // Test 3: Search by description (if mapped or checked)
            const result3 = await discoverNearbyProducts({
                lat: 34.05, lng: -118.25,
                searchQuery: 'indica'
            });
            expect(result3.products).toHaveLength(1);
            expect(result3.products[0].name).toBe('OG Kush Flower');
        });

        it('should map standard fields correctly including size', async () => {
            // Mock retailers
            (searchNearbyRetailers as jest.Mock).mockResolvedValue([
                { id: 'r1', name: 'Disp 1', distance: 1 }
            ]);

            // Mock products
            (getRetailerProducts as jest.Mock).mockResolvedValue([
                {
                    cann_sku_id: 'p1',
                    product_name: 'Test Product',
                    original_price: 40,
                    latest_price: 40,
                    display_weight: '1/8oz',
                }
            ]);

            const result = await discoverNearbyProducts({
                lat: 34.05, lng: -118.25
            });

            expect(result.products).toHaveLength(1);
            const p = result.products[0];
            expect(p.size).toBe('1/8oz'); // P2.1 Requirement
            expect(p.price).toBe(40);
        });
    });
});
