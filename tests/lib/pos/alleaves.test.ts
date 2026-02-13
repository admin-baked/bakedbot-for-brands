/**
 * Unit tests for ALLeaves POS adapter (JWT auth)
 */

import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('@/lib/product-images', () => ({
    getPlaceholderImageForCategory: jest.fn((category: string) => `placeholder:${category}`),
}));

function makeJwtToken(payload: Record<string, unknown> = { exp: 9999999999 }) {
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `header.${b64}.sig`;
}

function makeAuthOk(token = makeJwtToken()) {
    return {
        ok: true,
        json: async () => ({
            id_user: 1,
            name_first: 'Test',
            name_last: 'User',
            username: 'test@example.com',
            id_company: 123,
            company: 'TestCo',
            token,
        }),
    };
}

function makeJsonOk(data: any) {
    return {
        ok: true,
        json: async () => data,
    };
}

function makeTextError(status: number, text: string) {
    return {
        ok: false,
        status,
        text: async () => text,
    };
}

describe('ALLeavesClient', () => {
    let client: ALLeavesClient;

    const mockConfig: ALLeavesConfig = {
        storeId: 'store-456',
        locationId: '789',
        username: 'user@example.com',
        password: 'secret',
        pin: '1234',
        partnerId: 'partner-abc',
        environment: 'production',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        client = new ALLeavesClient(mockConfig);
    });

    describe('constructor', () => {
        it('should create client with config', () => {
            expect(client).toBeDefined();
        });

        it('should use storeId as locationId if locationId not provided', () => {
            const configWithoutLocation: ALLeavesConfig = {
                storeId: 'my-store',
                locationId: '',
                username: 'user@example.com',
                password: 'secret',
            };

            const clientWithoutLocation = new ALLeavesClient(configWithoutLocation);
            const info = clientWithoutLocation.getConfigInfo();

            expect(info.storeId).toBe('my-store');
            expect(info.locationId).toBe('my-store');
        });
    });

    describe('getConfigInfo', () => {
        it('should return config info without exposing credentials', () => {
            const info = client.getConfigInfo();

            expect(info).toMatchObject({
                locationId: '789',
                storeId: 'store-456',
                authMethod: 'jwt',
                hasUsername: true,
                hasPassword: true,
                hasPin: true,
                hasPartnerId: true,
                environment: 'production',
            });

            // Should not expose raw credentials
            expect(info).not.toHaveProperty('username');
            expect(info).not.toHaveProperty('password');
            expect(info).not.toHaveProperty('pin');
        });
    });

    describe('validateConnection', () => {
        it('should return true when location exists in /location', async () => {
            const token = makeJwtToken({ exp: 9999999999 });

            mockFetch
                .mockResolvedValueOnce(makeAuthOk(token))
                .mockResolvedValueOnce(makeJsonOk([
                    { id_location: 789, reference: 'Test Location', active: true },
                    { id_location: 111, reference: 'Other Location', active: true },
                ]));

            const result = await client.validateConnection();

            expect(result).toBe(true);

            expect(mockFetch).toHaveBeenNthCalledWith(
                1,
                'https://app.alleaves.com/api/auth',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'user@example.com',
                        password: 'secret',
                        pin: '1234',
                    }),
                })
            );

            expect(mockFetch).toHaveBeenNthCalledWith(
                2,
                'https://app.alleaves.com/api/location',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Partner-ID': 'partner-abc',
                    }),
                })
            );
        });

        it('should return false when requested location is not found', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk([
                    { id_location: 111, reference: 'Other Location', active: true },
                ]));

            const result = await client.validateConnection();

            expect(result).toBe(false);
        });

        it('should return false when /location call fails', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeTextError(403, 'Forbidden'));

            const result = await client.validateConnection();

            expect(result).toBe(false);
        });
    });

    describe('fetchMenu', () => {
        it('should fetch and map inventory items correctly', async () => {
            const token = makeJwtToken({ exp: 9999999999 });

            const items = [
                {
                    id_item: 1,
                    id_batch: 11,
                    id_item_group: 0,
                    id_location: 789,
                    item: 'Blue Dream',
                    sku: 'SKU001',
                    brand: 'Test Brand',
                    category: 'Category > Flower',
                    price_retail: 45,
                    price_otd: 0,
                    on_hand: 100,
                    available: 80,
                    thc: 22,
                    cbd: 0.5,
                    strain: 'Blue Dream',
                    uom: 'g',
                    is_adult_use: true,
                    is_cannabis: true,
                },
            ];

            mockFetch
                .mockResolvedValueOnce(makeAuthOk(token))
                .mockResolvedValueOnce(makeJsonOk(items));

            const result = await client.fetchMenu();

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                externalId: '1',
                name: 'Blue Dream',
                brand: 'Test Brand',
                category: 'Flower',
                price: 45,
                stock: 80,
                thcPercent: 22,
                cbdPercent: 0.5,
                imageUrl: 'placeholder:Flower',
                rawData: items[0],
            });

            expect(mockFetch).toHaveBeenNthCalledWith(
                2,
                'https://app.alleaves.com/api/inventory/search',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ query: '' }),
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Partner-ID': 'partner-abc',
                    }),
                })
            );
        });

        it('should handle empty inventory list', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk([]));

            const result = await client.fetchMenu();

            expect(result).toHaveLength(0);
        });

        it('should handle missing brand gracefully', async () => {
            const items = [
                {
                    id_item: 1,
                    id_batch: 11,
                    id_item_group: 0,
                    id_location: 789,
                    item: 'Mystery Product',
                    sku: 'SKU001',
                    brand: undefined,
                    category: 'Category > Edibles',
                    price_retail: 30,
                    price_otd: 0,
                    on_hand: 10,
                    available: 10,
                    thc: 0,
                    cbd: 0,
                    strain: '',
                    uom: 'pack',
                    is_adult_use: true,
                    is_cannabis: true,
                },
            ];

            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk(items));

            const result = await client.fetchMenu();

            expect(result[0]?.brand).toBe('Unknown');
        });

        it('should throw a wrapped error on API failure', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeTextError(500, 'Internal Server Error'));

            await expect(client.fetchMenu()).rejects.toThrow('ALLeaves menu fetch failed');
        });
    });

    describe('getInventory', () => {
        it('should fetch inventory for specific products', async () => {
            const token = makeJwtToken({ exp: 9999999999 });

            mockFetch
                .mockResolvedValueOnce(makeAuthOk(token))
                .mockResolvedValueOnce(makeJsonOk({
                    inventory: [
                        { product_id: '1', quantity: 50 },
                        { product_id: '2', quantity: 25 },
                    ],
                }));

            const result = await client.getInventory(['1', '2']);

            expect(result).toEqual({ '1': 50, '2': 25 });

            expect(mockFetch).toHaveBeenNthCalledWith(
                2,
                'https://app.alleaves.com/api/locations/789/inventory',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ product_ids: ['1', '2'] }),
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'X-Partner-ID': 'partner-abc',
                    }),
                })
            );
        });

        it('should fallback to menu fetch when inventory endpoint fails', async () => {
            const token = makeJwtToken({ exp: 9999999999 });

            const items = [
                {
                    id_item: 1,
                    id_batch: 11,
                    id_item_group: 0,
                    id_location: 789,
                    item: 'Fallback Item',
                    sku: 'SKU001',
                    brand: 'B',
                    category: 'Category > Flower',
                    price_retail: 10,
                    price_otd: 0,
                    on_hand: 30,
                    available: 30,
                    thc: 0,
                    cbd: 0,
                    strain: '',
                    uom: 'g',
                    is_adult_use: true,
                    is_cannabis: true,
                },
            ];

            mockFetch
                .mockResolvedValueOnce(makeAuthOk(token))
                .mockResolvedValueOnce(makeTextError(404, 'Not Found'))
                .mockResolvedValueOnce(makeJsonOk(items));

            const result = await client.getInventory(['1']);

            expect(result).toEqual({ '1': 30 });

            // auth, inventory endpoint, then inventory/search (no second /auth due to cached token)
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(mockFetch.mock.calls[2]?.[0]).toBe('https://app.alleaves.com/api/inventory/search');
        });
    });

    describe('createCustomer', () => {
        it('should create customer successfully', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({
                    customer: {
                        id: 'cust-123',
                        first_name: 'John',
                        last_name: 'Doe',
                        email: 'john@example.com',
                        created_at: '2026-01-22',
                    },
                }));

            const result = await client.createCustomer({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
            });

            expect(result.id).toBe('cust-123');
            expect(result.email).toBe('john@example.com');

            expect(mockFetch).toHaveBeenNthCalledWith(
                2,
                'https://app.alleaves.com/api/locations/789/customers',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        first_name: 'John',
                        last_name: 'Doe',
                        email: 'john@example.com',
                        phone: undefined,
                        date_of_birth: undefined,
                    }),
                })
            );
        });
    });

    describe('findCustomerByEmail', () => {
        it('should find customer by email', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({
                    customers: [
                        {
                            id: 'cust-456',
                            first_name: 'Jane',
                            last_name: 'Smith',
                            email: 'jane@example.com',
                            created_at: '2026-01-20',
                        },
                    ],
                }));

            const result = await client.findCustomerByEmail('jane@example.com');

            expect(result).not.toBeNull();
            expect(result?.email).toBe('jane@example.com');

            expect(mockFetch.mock.calls[1]?.[0]).toBe(
                'https://app.alleaves.com/api/locations/789/customers?email=jane%40example.com'
            );
        });

        it('should return null when customer not found', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({ customers: [] }));

            const result = await client.findCustomerByEmail('notfound@example.com');

            expect(result).toBeNull();
        });

        it('should return null on API error', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeTextError(500, 'Boom'));

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

            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({ customers: [existingCustomer] }));

            const result = await client.syncCustomer({
                firstName: 'Existing',
                lastName: 'User',
                email: 'existing@example.com',
            });

            expect(result.id).toBe('existing-123');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('should create new customer if not found', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({ customers: [] }))
                .mockResolvedValueOnce(makeJsonOk({
                    customer: {
                        id: 'new-456',
                        first_name: 'New',
                        last_name: 'User',
                        email: 'new@example.com',
                        created_at: '2026-01-22',
                    },
                }));

            const result = await client.syncCustomer({
                firstName: 'New',
                lastName: 'User',
                email: 'new@example.com',
            });

            expect(result.id).toBe('new-456');
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(mockFetch.mock.calls[2]?.[0]).toBe('https://app.alleaves.com/api/locations/789/customers');
            expect((mockFetch.mock.calls[2]?.[1] as any)?.method).toBe('POST');
        });
    });

    describe('createOrder', () => {
        it('should create order successfully', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({
                    order: {
                        id: 'order-789',
                        customer: { id: 'cust-123', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
                        items: [
                            { product_id: '1', product_name: 'Blue Dream', quantity: 1, unit_price: 45, total: 45 },
                        ],
                        subtotal: 45,
                        tax: 3.6,
                        discount: 0,
                        total: 48.6,
                        status: 'pending',
                        payment_method: 'debit',
                        created_at: '2026-01-22',
                        updated_at: '2026-01-22',
                    },
                }));

            const result = await client.createOrder({
                customerId: 'cust-123',
                items: [{ productId: '1', quantity: 1, unitPrice: 45 }],
                notes: 'Test order',
            });

            expect(result.id).toBe('order-789');
            expect(result.total).toBe(48.6);

            expect(mockFetch.mock.calls[1]?.[0]).toBe('https://app.alleaves.com/api/locations/789/orders');
        });
    });

    describe('getCustomerOrders', () => {
        it('should fetch customer orders', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk({
                    orders: [
                        { id: 'order-1', total: 50, status: 'completed', created_at: '2026-01-20', updated_at: '2026-01-20' },
                        { id: 'order-2', total: 75, status: 'completed', created_at: '2026-01-22', updated_at: '2026-01-22' },
                    ],
                }));

            const result = await client.getCustomerOrders('cust-123');

            expect(result).toHaveLength(2);
            expect(result[0]?.id).toBe('order-1');
            expect(mockFetch.mock.calls[1]?.[0]).toBe(
                'https://app.alleaves.com/api/locations/789/customers/cust-123/orders'
            );
        });
    });

    describe('authorization headers', () => {
        it('should include partner ID on authenticated requests when configured', async () => {
            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk([
                    { id_location: 789, reference: 'Test Location', active: true },
                ]));

            await client.validateConnection();

            const authCallHeaders = (mockFetch.mock.calls[0]?.[1] as any)?.headers;
            expect(authCallHeaders).toEqual({ 'Content-Type': 'application/json' });

            const locationCallHeaders = (mockFetch.mock.calls[1]?.[1] as any)?.headers;
            expect(locationCallHeaders).toEqual(expect.objectContaining({
                'X-Partner-ID': 'partner-abc',
            }));
        });

        it('should not include partner ID when not configured', async () => {
            const clientWithoutPartner = new ALLeavesClient({
                storeId: 'store',
                locationId: '789',
                username: 'user@example.com',
                password: 'secret',
            });

            mockFetch
                .mockResolvedValueOnce(makeAuthOk())
                .mockResolvedValueOnce(makeJsonOk([
                    { id_location: 789, reference: 'Test Location', active: true },
                ]));

            await clientWithoutPartner.validateConnection();

            const locationCallHeaders = (mockFetch.mock.calls[1]?.[1] as any)?.headers;
            expect(locationCallHeaders).not.toHaveProperty('X-Partner-ID');
        });
    });
});

