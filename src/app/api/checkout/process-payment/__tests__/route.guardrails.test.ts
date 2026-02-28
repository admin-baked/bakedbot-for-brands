import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateTransaction = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockUserGet = jest.fn();
const mockUserSet = jest.fn();
const mockRecordProductSale = jest.fn();
const mockCannPayTransactionDetails = jest.fn();
const mockAeropayTransactionDetails = jest.fn();

jest.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: {
        json: (body: any, init?: any) => ({
            status: init?.status || 200,
            json: async () => body,
        }),
    },
}));

jest.mock('@/server/middleware/with-protection', () => ({
    withProtection: (handler: any) => handler,
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/authorize-net', () => ({
    createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
}));

jest.mock('@/lib/payments/cannpay', () => ({
    getTransactionDetails: (...args: unknown[]) => mockCannPayTransactionDetails(...args),
}));

jest.mock('@/lib/payments/aeropay', () => ({
    getTransactionDetails: (...args: unknown[]) => mockAeropayTransactionDetails(...args),
    AEROPAY_TRANSACTION_FEE_CENTS: 50,
}));

jest.mock('@/server/agents/deebo', () => ({
    deeboCheckCheckout: jest.fn().mockResolvedValue({
        allowed: true,
        errors: [],
        warnings: [],
    }),
}));

jest.mock('@/server/services/order-analytics', () => ({
    recordProductSale: (...args: unknown[]) => mockRecordProductSale(...args),
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('POST /api/checkout/process-payment guardrails', () => {
    let POST: typeof import('../route').POST;
    const originalSetImmediate = global.setImmediate;

    beforeEach(async () => {
        jest.clearAllMocks();

        global.setImmediate = ((fn: any, ...args: any[]) => {
            fn(...args);
            return 0 as any;
        }) as any;

        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'orders') {
                    return {
                        doc: jest.fn(() => ({
                            get: mockOrderGet,
                        })),
                    };
                }

                if (name === 'users') {
                    return {
                        doc: jest.fn(() => ({
                            get: mockUserGet,
                            set: mockUserSet,
                        })),
                    };
                }

                return {
                    doc: jest.fn(() => ({})),
                };
            }),
        };

        mockCreateServerClient.mockResolvedValue({ firestore });
        mockUserGet.mockResolvedValue({ data: () => ({}) });
        mockCreateTransaction.mockResolvedValue({
            success: true,
            transactionId: 'txn_123',
            message: 'Approved',
        });
        mockCannPayTransactionDetails.mockResolvedValue({
            intentId: 'intent-1',
            canpayTransactionNumber: 'cp_tx_1',
            status: 'Success',
            amount: 4999,
            merchantOrderId: 'order-1',
        });
        mockAeropayTransactionDetails.mockResolvedValue({
            transactionId: 'aero_tx_1',
            status: 'completed',
            amount: 5049,
            merchantOrderId: 'order-1',
        });
        mockRecordProductSale.mockResolvedValue(undefined);

        ({ POST } = await import('../route'));
    });

    afterEach(() => {
        global.setImmediate = originalSetImmediate;
    });

    it('rejects credit card payment when order is not owned by current user', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'different-user',
                customer: { email: 'different@example.com' },
                totals: { total: 40 },
            }),
            ref: { update: mockOrderUpdate },
        });

        const response = await POST({} as any, {
            amount: 40,
            paymentMethod: 'credit_card',
            orderId: 'order-1',
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.error).toContain('Forbidden');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('rejects paid payment methods when authenticated email is unverified', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
            email_verified: false,
        });

        const response = await POST({} as any, {
            amount: 40,
            paymentMethod: 'credit_card',
            orderId: 'order-1',
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.error).toContain('Email verification is required');
        expect(mockCreateServerClient).not.toHaveBeenCalled();
    });

    it('uses server-side order total instead of client amount for card charge', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'user-1',
                customer: { name: 'Owner Example', email: 'owner@example.com' },
                totals: { total: 49.99 },
                shippingAddress: {
                    street: '123 Main St',
                    city: 'Syracuse',
                    state: 'NY',
                    zip: '13224',
                    country: 'US',
                },
                paymentStatus: 'pending',
            }),
            ref: { update: mockOrderUpdate },
        });

        const response = await POST({} as any, {
            amount: 4.10,
            paymentMethod: 'credit_card',
            orderId: 'order-1',
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockCreateTransaction).toHaveBeenCalledTimes(1);
        expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            amount: 49.99,
            orderId: 'order-1',
        }));
        expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
            transactionId: 'txn_123',
            paymentStatus: 'paid',
            paymentMethod: 'credit_card',
        }));
    });

    it('requires a resolvable billing address for card payments', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'user-1',
                customer: { name: 'Owner Example', email: 'owner@example.com' },
                totals: { total: 49.99 },
                paymentStatus: 'pending',
            }),
            ref: { update: mockOrderUpdate },
        });
        mockUserGet.mockResolvedValue({ data: () => ({}) });

        const response = await POST({} as any, {
            amount: 49.99,
            paymentMethod: 'credit_card',
            orderId: 'order-1',
            paymentData: {
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(400);
        expect(body.error).toContain('Billing address is required');
        expect(mockCreateTransaction).not.toHaveBeenCalled();
    });

    it('does not mark CannPay order as paid when provider reports pending despite spoofed client success', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'user-1',
                customer: { email: 'owner@example.com' },
                totals: { total: 40 },
                canpay: { intentId: 'intent-1' },
                paymentStatus: 'pending',
            }),
            ref: { update: mockOrderUpdate },
        });
        mockCannPayTransactionDetails.mockResolvedValue({
            intentId: 'intent-1',
            canpayTransactionNumber: 'cp_tx_real',
            status: 'Pending',
            amount: 4000,
            merchantOrderId: 'order-1',
        });

        const response = await POST({} as any, {
            amount: 40,
            paymentMethod: 'cannpay',
            orderId: 'order-1',
            paymentData: {
                intentId: 'intent-1',
                transactionNumber: 'cp_tx_fake',
                status: 'Success',
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body.success).toBe(false);
        expect(body.providerStatus).toBe('Pending');
        expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
            paymentStatus: 'pending',
            'canpay.status': 'Pending',
            'canpay.transactionNumber': 'cp_tx_real',
        }));
        expect(mockRecordProductSale).not.toHaveBeenCalled();
    });

    it('rejects CannPay intent mismatch between request and order', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'user-1',
                customer: { email: 'owner@example.com' },
                totals: { total: 40 },
                canpay: { intentId: 'intent-real' },
                paymentStatus: 'pending',
            }),
            ref: { update: mockOrderUpdate },
        });

        const response = await POST({} as any, {
            amount: 40,
            paymentMethod: 'cannpay',
            orderId: 'order-1',
            paymentData: {
                intentId: 'intent-spoofed',
                transactionNumber: 'cp_tx_fake',
                status: 'Success',
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.error).toContain('intent does not match');
        expect(mockCannPayTransactionDetails).not.toHaveBeenCalled();
    });

    it('rejects Aeropay finalization when provider amount does not match order total', async () => {
        mockOrderGet.mockResolvedValue({
            exists: true,
            data: () => ({
                userId: 'user-1',
                customer: { email: 'owner@example.com' },
                totals: { total: 50 },
                aeropay: { transactionId: 'aero_tx_1' },
                paymentStatus: 'pending',
            }),
            ref: { update: mockOrderUpdate },
        });
        mockAeropayTransactionDetails.mockResolvedValue({
            transactionId: 'aero_tx_1',
            status: 'completed',
            amount: 100, // should be 5050 with fee
            merchantOrderId: 'order-1',
        });

        const response = await POST({} as any, {
            amount: 50,
            paymentMethod: 'aeropay',
            orderId: 'order-1',
            paymentData: {
                transactionId: 'aero_tx_1',
                status: 'completed',
            },
        } as any);

        const body = await response.json();
        expect(response.status).toBe(409);
        expect(body.error).toContain('amount mismatch');
        expect(mockOrderUpdate).not.toHaveBeenCalled();
    });
});
