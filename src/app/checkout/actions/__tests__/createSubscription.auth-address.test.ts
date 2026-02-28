import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateCustomerProfile = jest.fn();
const mockCreateSubscriptionFromProfile = jest.fn();
const mockSubscriptionSet = jest.fn();
const mockUserSet = jest.fn();

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: (...args: unknown[]) => mockCreateCustomerProfile(...args),
    createSubscriptionFromProfile: (...args: unknown[]) => mockCreateSubscriptionFromProfile(...args),
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
        planId: 'pro',
        customer: {
            name: 'Owner Example',
            email: 'owner@example.com',
            phone: '555-111-2222',
        },
        paymentData: {
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'opaque-token',
            },
        },
    };
}

describe('createSubscription auth + address hardening', () => {
    let createSubscription: typeof import('../createSubscription').createSubscription;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.LOCAL_CHECKOUT_USE_FIREBASE = 'true';
        process.env.AUTHNET_FORCE_MOCK = 'true';

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'subscriptions') {
                    return {
                        doc: jest.fn(() => ({
                            id: 'sub-1',
                            set: mockSubscriptionSet,
                        })),
                    };
                }

                if (name === 'users') {
                    return {
                        doc: jest.fn(() => ({
                            set: mockUserSet,
                        })),
                    };
                }

                return {
                    doc: jest.fn(() => ({
                        id: 'doc-1',
                        set: jest.fn().mockResolvedValue(undefined),
                    })),
                };
            }),
        };

        mockCreateServerClient.mockResolvedValue({ firestore });
        mockSubscriptionSet.mockResolvedValue(undefined);
        mockUserSet.mockResolvedValue(undefined);
        mockCreateCustomerProfile.mockResolvedValue({
            customerProfileId: 'cp_1',
            customerPaymentProfileId: 'cpp_1',
        });
        mockCreateSubscriptionFromProfile.mockResolvedValue({
            subscriptionId: 'arb_1',
        });

        ({ createSubscription } = await import('../createSubscription'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('rejects unauthenticated subscription checkout', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const result = await createSubscription(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('signed in');
    });

    it('blocks company plan checkout when feature flag is disabled', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'false';

        const result = await createSubscription(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('disabled');
    });

    it('rejects customer email mismatch with signed-in account', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = baseInput();
        input.customer.email = 'other@example.com';
        const result = await createSubscription(input as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('must match');
    });

    it('requires billing address for paid plans', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const result = await createSubscription(baseInput() as any);

        expect(result.success).toBe(false);
        expect(result.error).toContain('billing address');
    });

    it('persists userId and billing address when paid plan checkout succeeds', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = {
            ...baseInput(),
            billingAddress: {
                street: '1 Main St',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                country: 'US',
            },
        };

        const result = await createSubscription(input as any);

        expect(result.success).toBe(true);
        expect(result.subscriptionId).toBe('sub-1');
        expect(mockSubscriptionSet).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            billingAddress: expect.objectContaining({
                street: '1 Main St',
                zip: '13224',
            }),
        }));
        expect(mockUserSet).toHaveBeenCalledWith(expect.objectContaining({
            billingAddress: expect.objectContaining({
                state: 'NY',
            }),
        }), { merge: true });
    });

    it('ignores AUTHNET_FORCE_MOCK in production and uses real recurring setup path', async () => {
        process.env.NODE_ENV = 'production';
        process.env.AUTHNET_FORCE_MOCK = 'true';
        process.env.AUTHNET_API_LOGIN_ID = 'login-id';
        process.env.AUTHNET_TRANSACTION_KEY = 'txn-key';
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';
        process.env.ENABLE_COMPANY_PLAN_CHECKOUT = 'true';

        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const input = {
            ...baseInput(),
            billingAddress: {
                street: '1 Main St',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                country: 'US',
            },
        };

        const result = await createSubscription(input as any);

        expect(result.success).toBe(true);
        expect(mockCreateCustomerProfile).toHaveBeenCalledTimes(1);
        expect(mockCreateSubscriptionFromProfile).toHaveBeenCalledTimes(1);
        expect(mockSubscriptionSet).toHaveBeenCalledWith(expect.objectContaining({
            providerSubscriptionId: 'arb_1',
            transactionId: 'arb_1',
        }));
    });
});
