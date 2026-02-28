import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateTransaction = jest.fn();
const mockSendOrderConfirmationEmail = jest.fn();
const mockOrderAdd = jest.fn();
const mockOrderUpdate = jest.fn();
const mockUserSet = jest.fn();
const mockProductGet = jest.fn();

jest.mock('next/server', () => {
    return {
        NextRequest: class {},
        NextResponse: {
            json: (body: any, init?: any) => ({
                status: init?.status || 200,
                json: async () => body,
            }),
        },
    };
});

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/authorize-net', () => ({
    createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendOrderConfirmationEmail: (...args: unknown[]) => mockSendOrderConfirmationEmail(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(() => 'MOCK_TS'),
        increment: jest.fn((value: number) => ({ __increment: value })),
    },
}));

describe('POST /api/checkout/shipping auth + address hardening', () => {
    let POST: typeof import('../route').POST;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };

        const orderRef = {
            id: 'order-123',
            update: mockOrderUpdate,
        };

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'orders') {
                    return {
                        add: mockOrderAdd.mockResolvedValue(orderRef),
                    };
                }

                if (name === 'users') {
                    return {
                        doc: jest.fn(() => ({
                            set: mockUserSet,
                        })),
                    };
                }

                if (name === 'brands') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: false,
                                data: () => ({}),
                            }),
                        })),
                    };
                }

                if (name === 'coupons') {
                    const chain = {
                        where: jest.fn(() => chain),
                        limit: jest.fn(() => chain),
                        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                    };
                    return chain;
                }

                if (name === 'products') {
                    return {
                        doc: jest.fn((productId: string) => ({
                            get: () => mockProductGet(productId),
                        })),
                    };
                }

                return {};
            }),
        };

        mockProductGet.mockImplementation(async (productId: string) => ({
            exists: true,
            data: () => ({
                id: productId,
                name: 'Hemp Gummies',
                price: 20,
                category: 'Edibles',
                brandId: 'brand-1',
                shippable: true,
            }),
        }));

        mockCreateServerClient.mockResolvedValue({ firestore });
        mockCreateTransaction.mockResolvedValue({
            success: true,
            transactionId: 'txn-ship-1',
            message: 'Approved',
        });
        mockSendOrderConfirmationEmail.mockResolvedValue(undefined);

        ({ POST } = await import('../route'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 503 when shipping checkout feature flag is disabled', async () => {
        process.env.NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT = 'false';

        const request = {
            json: async () => ({}),
        } as any;

        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(503);
        expect(body.error).toContain('currently disabled');
    });

    it('returns 401 when user is not authenticated', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const request = { json: async () => ({}) } as any;

        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
    });

    it('returns 403 when checkout customer email does not match signed-in account', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const request = {
            json: async () => ({
                items: [{ id: 'prod-1', name: 'Hemp Gummies', price: 20, quantity: 1 }],
                customer: { name: 'Owner Example', email: 'other@example.com' },
                shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '13224', country: 'US' },
                brandId: 'brand-1',
                paymentMethod: 'authorize_net',
                paymentData: { opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque' } },
                total: 23,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.error).toContain('email must match');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('returns 403 when authenticated user email is not verified', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
            email_verified: false,
        });

        const request = {
            json: async () => ({
                items: [{ id: 'prod-1', name: 'Hemp Gummies', price: 20, quantity: 1 }],
                customer: { name: 'Owner Example', email: 'owner@example.com' },
                shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '13224', country: 'US' },
                brandId: 'brand-1',
                paymentMethod: 'authorize_net',
                paymentData: { opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque' } },
                total: 23,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.error).toContain('verify your email');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('returns 400 when shipping address is invalid', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const request = {
            json: async () => ({
                items: [{ id: 'prod-1', name: 'Hemp Gummies', price: 20, quantity: 1 }],
                customer: { name: 'Owner Example', email: 'owner@example.com' },
                shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '' },
                brandId: 'brand-1',
                paymentMethod: 'authorize_net',
                paymentData: { opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque' } },
                total: 23,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toContain('shipping address is required');
    });

    it('rejects cart items from a different brand', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });
        mockProductGet.mockResolvedValue({
            exists: true,
            data: () => ({
                id: 'prod-1',
                name: 'Foreign Product',
                price: 20,
                brandId: 'other-brand',
                shippable: true,
            }),
        });

        const request = {
            json: async () => ({
                items: [{ id: 'prod-1', name: 'Foreign Product', price: 1, quantity: 1 }],
                customer: { name: 'Owner Example', email: 'owner@example.com' },
                shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '13224', country: 'US' },
                brandId: 'brand-1',
                paymentMethod: 'authorize_net',
                paymentData: { opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque' } },
                total: 23,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toContain('do not belong to this brand');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('uses server-calculated amount (not client total) and order-bound payment', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const request = {
            json: async () => ({
                items: [{ id: 'prod-1', name: 'Hemp Gummies', price: 1, quantity: 1 }],
                customer: { name: 'Owner Example', email: 'owner@example.com', phone: '555-111-2222' },
                shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '13224', country: 'US' },
                brandId: 'brand-1',
                paymentMethod: 'authorize_net',
                paymentData: { opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'opaque' } },
                total: 1,
            }),
        } as any;

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
        expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            amount: 23,
            orderId: 'order-123',
        }));

        expect(mockOrderAdd).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            customer: expect.objectContaining({ email: 'owner@example.com' }),
            items: [expect.objectContaining({ price: 20, qty: 1 })],
            billingAddress: expect.objectContaining({
                street: '1 Main St',
                city: 'Syracuse',
            }),
        }));
    });
});
