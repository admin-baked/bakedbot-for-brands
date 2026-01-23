/**
 * Unit tests for ALLeaves POS adapter
 */

import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('ALLeavesClient', () => {
    let client: ALLeavesClient;
    const mockConfig: ALLeavesConfig = {
        apiKey: 'test-api-key-123',
        storeId: 'store-456',
        locationId: 'loc-789',
        partnerId: 'partner-abc',
        environment: 'production',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        client = new ALLeavesClient(mockConfig);
    });

    describe('constructor', () => {
        it('should create client with config', () => {
            expect(client).toBeDefined();
        });

        it('should use storeId as locationId if locationId not provided', () => {
            const configWithoutLocation: ALLeavesConfig = {
                apiKey: 'test-key',
                storeId: 'my-store',
                locationId: '',
            };
            const clientWithoutLocation = new ALLeavesClient(configWithoutLocation);
            const info = clientWithoutLocation.getConfigInfo();
            expect(info.storeId).toBe('my-store');
        });
    });

    describe('getConfigInfo', () => {
        it('should return config info without exposing API key', () => {
            const info = client.getConfigInfo();

            expect(info.locationId).toBe('loc-789');
            expect(info.storeId).toBe('store-456');
            expect(info.hasApiKey).toBe(true);
            expect(info.hasPartnerId).toBe(true);
            expect(info.environment).toBe('production');
            // Should NOT expose actual API key
            expect(info).not.toHaveProperty('apiKey');
        });
    });

    describe('validateConnection', () => {
        it('should return true when location info is valid', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    location: { id: 'loc-789', name: 'Test Location' },
                }),
            });

            const result = await client.validateConnection();

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/locations/loc-789'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key-123',
                        'X-Location-ID': 'loc-789',
                    }),
                })
            );
        });

        it('should return false when API returns error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            });

            const result = await client.validateConnection();

            expect(result).toBe(false);
        });

        it('should return false when location not found in response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ location: null }),
            });

            const result = await client.validateConnection();

            expect(result).toBe(false);
        });
    });

    describe('fetchMenu', () => {
        const mockProducts = [
            {
                id: 'prod-1',
                sku: 'SKU001',
                name: 'Blue Dream',
                brand: 'Test Brand',
                category: 'Flower',
                price: 45,
                quantity: 100,
                unit: 'g',
                thc_percentage: 22,
                cbd_percentage: 0.5,
                image_url: 'https://example.com/image.jpg',
                is_active: true,
                created_at: '2026-01-01',
                updated_at: '2026-01-22',
            },
            {
                id: 'prod-2',
                sku: 'SKU002',
                name: 'Gummy Bears',
                brand: 'Edible Co',
                category: 'Edibles',
                price: 30,
                quantity: 50,
                unit: 'pack',
                is_active: true,
                created_at: '2026-01-01',
                updated_at: '2026-01-22',
            },
        ];

        it('should fetch and map products correctly', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ products: mockProducts, total: 2 }),
            });

            const result = await client.fetchMenu();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                externalId: 'prod-1',
                name: 'Blue Dream',
                brand: 'Test Brand',
                category: 'Flower',
                price: 45,
                stock: 100,
                thcPercent: 22,
                cbdPercent: 0.5,
                imageUrl: 'https://example.com/image.jpg',
                rawData: mockProducts[0],
            });
        });

        it('should handle empty product list', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ products: [], total: 0 }),
            });

            const result = await client.fetchMenu();

            expect(result).toHaveLength(0);
        });

        it('should throw error on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });

            await expect(client.fetchMenu()).rejects.toThrow('ALLeaves menu fetch failed');
        });

        it('should handle missing brand gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    products: [{ ...mockProducts[0], brand: undefined }],
                    total: 1,
                }),
            });

            const result = await client.fetchMenu();

            expect(result[0].brand).toBe('Unknown');
        });
    });

    describe('getInventory', () => {
        it('should fetch inventory for specific products', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    inventory: [
                        { product_id: 'prod-1', quantity: 50 },
                        { product_id: 'prod-2', quantity: 25 },
                    ],
                }),
            });

            const result = await client.getInventory(['prod-1', 'prod-2']);

            expect(result).toEqual({
                'prod-1': 50,
                'prod-2': 25,
            });
        });

        it('should fallback to menu fetch when inventory endpoint fails', async () => {
            // First call (inventory) fails
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not Found',
            });

            // Second call (menu) succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    products: [
                        { id: 'prod-1', name: 'Test', brand: 'B', category: 'C', price: 10, quantity: 30, is_active: true, created_at: '', updated_at: '' },
                    ],
                    total: 1,
                }),
            });

            const result = await client.getInventory(['prod-1']);

            expect(result).toEqual({ 'prod-1': 30 });
        });
    });

    describe('createCustomer', () => {
        it('should create customer successfully', async () => {
            const mockCustomer = {
                id: 'cust-123',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                created_at: '2026-01-22',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ customer: mockCustomer }),
            });

            const result = await client.createCustomer({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
            });

            expect(result.id).toBe('cust-123');
            expect(result.email).toBe('john@example.com');
        });
    });

    describe('findCustomerByEmail', () => {
        it('should find customer by email', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    customers: [{
                        id: 'cust-456',
                        first_name: 'Jane',
                        last_name: 'Smith',
                        email: 'jane@example.com',
                        created_at: '2026-01-20',
                    }],
                }),
            });

            const result = await client.findCustomerByEmail('jane@example.com');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('jane@example.com');
        });

        it('should return null when customer not found', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ customers: [] }),
            });

            const result = await client.findCustomerByEmail('notfound@example.com');

            expect(result).toBeNull();
        });

        it('should return null on API error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await client.findCustomerByEmail('test@example.com');

            expect(result).toBeNull();
        });
    });

    describe('syncCustomer', () => {
        it('should return existing customer if found', async () => {
            const existingCustomer = {
                id: 'existing-123',
                first_name: 'Existing',
                last_name: 'User',
                email: 'existing@example.com',
                created_at: '2026-01-15',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ customers: [existingCustomer] }),
            });

            const result = await client.syncCustomer({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@example.com',
            });

            expect(result.id).toBe('existing-123');
            expect(mockFetch).toHaveBeenCalledTimes(1); // Only lookup, no create
        });

        it('should create new customer if not found', async () => {
            // First call - customer lookup returns empty
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ customers: [] }),
            });

            // Second call - create customer
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    customer: {
                        id: 'new-456',
                        first_name: 'New',
                        last_name: 'User',
                        email: 'new@example.com',
                        created_at: '2026-01-22',
                    },
                }),
            });

            const result = await client.syncCustomer({
                firstName: 'New',
                lastName: 'User',
                email: 'new@example.com',
            });

            expect(result.id).toBe('new-456');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('createOrder', () => {
        it('should create order successfully', async () => {
            const mockOrder = {
                id: 'order-789',
                customer: { id: 'cust-123', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
                items: [
                    { product_id: 'prod-1', product_name: 'Blue Dream', quantity: 1, unit_price: 45, total: 45 },
                ],
                subtotal: 45,
                tax: 3.60,
                discount: 0,
                total: 48.60,
                status: 'pending',
                payment_method: 'debit',
                created_at: '2026-01-22',
                updated_at: '2026-01-22',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ order: mockOrder }),
            });

            const result = await client.createOrder({
                customerId: 'cust-123',
                items: [{ productId: 'prod-1', quantity: 1, unitPrice: 45 }],
                notes: 'Test order',
            });

            expect(result.id).toBe('order-789');
            expect(result.total).toBe(48.60);
        });
    });

    describe('getCustomerOrders', () => {
        it('should fetch customer orders', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    orders: [
                        { id: 'order-1', total: 50, status: 'completed', created_at: '2026-01-20', updated_at: '2026-01-20' },
                        { id: 'order-2', total: 75, status: 'completed', created_at: '2026-01-22', updated_at: '2026-01-22' },
                    ],
                }),
            });

            const result = await client.getCustomerOrders('cust-123');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('order-1');
        });
    });

    describe('authorization headers', () => {
        it('should include partner ID when configured', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ location: { id: 'loc-789', name: 'Test' } }),
            });

            await client.validateConnection();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Partner-ID': 'partner-abc',
                    }),
                })
            );
        });

        it('should not include partner ID when not configured', async () => {
            const clientWithoutPartner = new ALLeavesClient({
                apiKey: 'test-key',
                storeId: 'store',
                locationId: 'loc',
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ location: { id: 'loc', name: 'Test' } }),
            });

            await clientWithoutPartner.validateConnection();

            const callHeaders = mockFetch.mock.calls[0][1].headers;
            expect(callHeaders).not.toHaveProperty('X-Partner-ID');
        });
    });
});
