import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateTransaction = jest.fn();
const mockSendOrderConfirmationEmail = jest.fn();
const mockApplyCoupon = jest.fn();
const mockCreateDelivery = jest.fn();
const mockAutoAssignDriver = jest.fn();
const mockOrderAdd = jest.fn();
const mockOrderUpdate = jest.fn();
const mockUserSet = jest.fn();
const mockRetailerGet = jest.fn();
const mockProductGet = jest.fn();

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

jest.mock('../applyCoupon', () => ({
    applyCoupon: (...args: unknown[]) => mockApplyCoupon(...args),
}));

jest.mock('@/server/actions/delivery', () => ({
    createDelivery: (...args: unknown[]) => mockCreateDelivery(...args),
    autoAssignDriver: (...args: unknown[]) => mockAutoAssignDriver(...args),
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

function baseInput() {
    return {
        items: [{ id: 'prod-1', name: 'Item A', price: 1, quantity: 1 }],
        customer: {
            name: 'Owner Example',
            email: 'owner@example.com',
            phone: '555-111-2222',
        },
        retailerId: 'retailer-1',
        brandId: 'brand-1',
        paymentMethod: 'cash' as const,
        total: 23,
    };
}

describe('createOrder auth + address hardening', () => {
    let createOrder: typeof import('../createOrder').createOrder;

    beforeEach(async () => {
        jest.clearAllMocks();

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'orders') {
                    return {
                        add: mockOrderAdd.mockResolvedValue({
                            id: 'order-1',
                            update: mockOrderUpdate,
                        }),
                    };
                }

                if (name === 'users') {
                    return {
                        doc: jest.fn(() => ({
                            set: mockUserSet,
                        })),
                    };
                }

                if (name === 'dispensaries') {
                    return {
                        doc: jest.fn(() => ({
                            get: mockRetailerGet,
                        })),
                    };
                }

                if (name === 'coupons') {
                    return {
                        doc: jest.fn(() => ({
                            update: jest.fn().mockResolvedValue(undefined),
                        })),
                    };
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

        mockCreateServerClient.mockResolvedValue({ firestore });
        mockRetailerGet.mockResolvedValue({ exists: false, data: () => ({}) });
        mockCreateTransaction.mockResolvedValue({
            success: true,
            transactionId: 'txn-123',
            message: 'Approved',
        });
        mockSendOrderConfirmationEmail.mockResolvedValue(undefined);
        mockApplyCoupon.mockResolvedValue({
            success: true,
            couponId: 'coupon-1',
            code: 'SAVE10',
            discountAmount: 10,
            message: 'ok',
        });
        mockCreateDelivery.mockResolvedValue({ success: true, delivery: { id: 'delivery-1' } });
        mockAutoAssignDriver.mockResolvedValue(undefined);
        mockProductGet.mockResolvedValue({
            exists: true,
            data: () => ({
                id: 'prod-1',
                name: 'Item A',
                price: 20,
                category: 'Flower',
                brandId: 'brand-1',
                retailerIds: ['retailer-1'],
            }),
        });

        ({ createOrder } = await import('../createOrder'));
    });

    it('rejects unauthenticated checkout attempts', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const result = await createOrder(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('signed in');
    });

    it('rejects customer email mismatch with signed-in account', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = baseInput();
        input.customer.email = 'other@example.com';
        const result = await createOrder(input as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('must match');
        expect(mockOrderAdd).not.toHaveBeenCalled();
    });

    it('requires billing address for credit card checkout', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = {
            ...baseInput(),
            paymentMethod: 'authorize_net' as const,
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
        };

        const result = await createOrder(input as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('billing address');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('charges server-calculated total and binds transaction to order id', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = {
            ...baseInput(),
            paymentMethod: 'authorize_net' as const,
            total: 1,
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
            billingAddress: {
                street: '1 Main St',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                country: 'US',
            },
        };

        const result = await createOrder(input as any);

        expect(result.success).toBe(true);
        expect(result.orderId).toBe('order-1');
        expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
        expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            amount: 23,
            orderId: 'order-1',
            customer: expect.objectContaining({
                email: 'owner@example.com',
                zip: '13224',
            }),
        }));

        expect(mockOrderAdd).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            customer: expect.objectContaining({ email: 'owner@example.com' }),
            items: [expect.objectContaining({ productId: 'prod-1', qty: 1, price: 20 })],
        }));
    });

    it('rejects products outside checkout context', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });
        mockProductGet.mockResolvedValue({
            exists: true,
            data: () => ({
                id: 'prod-1',
                name: 'Foreign Item',
                price: 20,
                brandId: 'other-brand',
                retailerIds: ['other-retailer'],
            }),
        });

        const result = await createOrder(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('do not belong');
        expect(mockOrderAdd).not.toHaveBeenCalled();
    });
});
