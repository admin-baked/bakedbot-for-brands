import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateTransaction = jest.fn();
const mockSendOrderConfirmationEmail = jest.fn();
const mockOrderAdd = jest.fn();
const mockOrderUpdate = jest.fn();
const mockUserSet = jest.fn();

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
    },
}));

function baseInput() {
    return {
        items: [{ id: 'prod-1', name: 'Hemp Gummies', price: 10, quantity: 2 }],
        customer: { name: 'Owner Example', email: 'owner@example.com', phone: '555-111-2222' },
        shippingAddress: { street: '1 Main St', city: 'Syracuse', state: 'NY', zip: '13224', country: 'US' },
        brandId: 'brand-1',
        paymentMethod: 'authorize_net' as const,
        paymentData: {
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'opaque-token',
            },
        },
        total: 1,
    };
}

describe('createShippingOrder auth + address hardening', () => {
    let createShippingOrder: typeof import('../createShippingOrder').createShippingOrder;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'orders') {
                    return {
                        add: mockOrderAdd.mockResolvedValue({
                            id: 'order-ship-1',
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

                return {};
            }),
        };

        mockCreateServerClient.mockResolvedValue({ firestore });
        mockCreateTransaction.mockResolvedValue({
            success: true,
            transactionId: 'txn-ship-1',
            message: 'Approved',
        });
        mockSendOrderConfirmationEmail.mockResolvedValue(undefined);

        ({ createShippingOrder } = await import('../createShippingOrder'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('blocks shipping checkout when feature flag is disabled', async () => {
        process.env.NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT = 'false';

        const result = await createShippingOrder(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('currently disabled');
    });

    it('rejects unauthenticated checkout attempts', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));
        const result = await createShippingOrder(baseInput() as any);
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
        const result = await createShippingOrder(input as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('must match');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('uses server-calculated total and binds payment to created order id', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const result = await createShippingOrder(baseInput() as any);

        expect(result.success).toBe(true);
        expect(result.orderId).toBe('order-ship-1');
        expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            amount: 23,
            orderId: 'order-ship-1',
        }));
        expect(mockOrderAdd).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            billingAddress: expect.objectContaining({ zip: '13224' }),
        }));
        expect(mockUserSet).toHaveBeenCalledWith(expect.objectContaining({
            billingAddress: expect.objectContaining({ city: 'Syracuse' }),
        }), { merge: true });
    });
});
