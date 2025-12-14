
import { getRetailerProducts, geocodeZipCode, searchNearbyRetailers } from '../cannmenus-api';

// Mock global fetch
global.fetch = jest.fn();

describe('CannMenus API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CANNMENUS_API_BASE = 'https://api.cannmenus.com';
        process.env.CANNMENUS_API_KEY = 'test-key';
    });

    describe('getRetailerProducts', () => {
        it('should call v1/products with retailer_ids and states', async () => {
            const mockResponse = {
                data: [
                    {
                        id: 'product-1',
                        name: 'Test Product',
                        brand: { name: 'Test Brand' },
                        price: 20
                    }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const retailerId = '123';
            const state = 'California';

            await getRetailerProducts(retailerId, { state });

            // Verify search params
            expect(global.fetch).toHaveBeenCalledTimes(1);
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const urlStr = callArgs[0] as string;
            const url = new URL(urlStr);

            expect(url.pathname).toContain('/v1/products');
            expect(url.searchParams.get('retailer_ids')).toBe(retailerId);
            expect(url.searchParams.get('states')).toBe(state);
            expect(url.searchParams.get('limit')).toBe('50');

            expect(callArgs[1]).toEqual(expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Token': expect.any(String)
                })
            }));
        });


        it('should default state to California if not provided', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] })
            });

            await getRetailerProducts('123');

            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            const url = new URL(callArgs[0]);
            expect(url.searchParams.get('states')).toBe('California');
        });

        it('should transform v1 response correctly', async () => {
            const mockResponse = {
                data: [
                    {
                        products: [
                            {
                                id: 101,
                                cann_sku_id: '101',
                                product_name: 'Blue Dream',
                                brand_name: 'Stiiizy',
                                latest_price: 45,
                                category: 'Flower',
                                image_url: 'http://img.com/1.jpg'
                            }

                        ]
                    }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const products = await getRetailerProducts('123', { state: 'NV' });

            expect(products).toHaveLength(1);
            expect(products[0]).toEqual(expect.objectContaining({
                cann_sku_id: '101',
                product_name: 'Blue Dream',
                brand_name: 'Stiiizy',
                latest_price: 45,
                category: 'Flower',
                image_url: 'http://img.com/1.jpg',
                medical: true,
                recreational: true
            }));
        });
    });

    describe('geocodeZipCode', () => {
        it('should call Nominatim API', async () => {
            const mockResponse = [
                {
                    lat: '34.05',
                    lon: '-118.25',
                    address: {
                        city: 'Los Angeles',
                        state: 'California'
                    }
                }
            ];

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await geocodeZipCode('90001');

            expect(result).toEqual({
                lat: 34.05,
                lng: -118.25,
                city: 'Los Angeles',
                state: 'California'
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('nominatim.openstreetmap.org') && expect.stringContaining('90001'),
                expect.anything()
            );
        });
    });
});
