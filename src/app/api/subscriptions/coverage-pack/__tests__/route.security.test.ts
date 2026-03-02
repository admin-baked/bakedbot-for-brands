import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();

jest.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: {
        json: (body: any, init?: any) => ({
            status: init?.status || 200,
            json: async () => body,
        }),
    },
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('/api/subscriptions/coverage-pack security', () => {
    let POST: typeof import('../route').POST;
    let GET: typeof import('../route').GET;
    const originalEnv = process.env;

    beforeEach(async () => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'true';

        ({ POST, GET } = await import('../route'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 503 when company checkout is disabled', async () => {
        process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT = 'false';

        const response = await POST({
            json: async () => ({}),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body.error).toContain('disabled');
        expect(mockRequireUser).not.toHaveBeenCalled();
        expect(mockGetAdminFirestore).not.toHaveBeenCalled();
    });

    it('requires authentication on POST', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const response = await POST({
            json: async () => ({}),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
    });

    it('requires session email match for contact email', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const response = await POST({
            json: async () => ({
                packId: 'starter',
                billingPeriod: 'monthly',
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
                businessName: 'Test Biz',
                contactName: 'Owner Example',
                contactEmail: 'other@example.com',
                zip: '13202',
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toContain('must match');
        expect(mockGetAdminFirestore).not.toHaveBeenCalled();
    });

    it('rejects non-tokenized payment payloads', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const response = await POST({
            json: async () => ({
                packId: 'starter',
                billingPeriod: 'monthly',
                cardNumber: '4111111111111111',
                expirationDate: '12/30',
                cvv: '123',
                businessName: 'Test Biz',
                contactName: 'Owner Example',
                contactEmail: 'owner@example.com',
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBeTruthy();
        expect(mockGetAdminFirestore).not.toHaveBeenCalled();
    });

    it('requires billing ZIP for paid coverage-pack subscriptions', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const response = await POST({
            json: async () => ({
                packId: 'starter',
                billingPeriod: 'monthly',
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'opaque-token',
                },
                businessName: 'Test Biz',
                contactName: 'Owner Example',
                contactEmail: 'owner@example.com',
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBeTruthy();
        expect(mockGetAdminFirestore).not.toHaveBeenCalled();
    });

    it('reuses an existing active coverage-pack subscription and skips gateway calls', async () => {
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        const mockSubscriptionsGet = jest.fn().mockResolvedValue({
            docs: [
                {
                    id: 'sub-existing-1',
                    data: () => ({
                        userId: 'user-1',
                        packId: 'starter',
                        billingPeriod: 'monthly',
                        status: 'active',
                    }),
                },
            ],
        });

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'subscriptions') {
                    return {
                        where: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: mockSubscriptionsGet,
                            })),
                        })),
                    };
                }
                return {
                    doc: jest.fn(() => ({
                        set: jest.fn(),
                        update: jest.fn(),
                        get: jest.fn(),
                    })),
                    add: jest.fn(),
                    where: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ docs: [] }),
                        })),
                    })),
                };
            }),
        };
        mockGetAdminFirestore.mockReturnValue(firestore);

        const originalFetch = global.fetch;
        const fetchSpy = jest.fn();
        (global as any).fetch = fetchSpy;

        try {
            const response = await POST({
                json: async () => ({
                    packId: 'starter',
                    billingPeriod: 'monthly',
                    opaqueData: {
                        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                        dataValue: 'opaque-token',
                    },
                    businessName: 'Test Biz',
                    contactName: 'Owner Example',
                    contactEmail: 'owner@example.com',
                    zip: '13202',
                }),
            } as any);
            const body = await response.json();

            expect(response.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.reused).toBe(true);
            expect(body.subscriptionId).toBe('sub-existing-1');
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(mockSubscriptionsGet).toHaveBeenCalled();
        } finally {
            (global as any).fetch = originalFetch;
        }
    });

    it('requires authentication on GET', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const response = await GET({} as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
        expect(mockGetAdminFirestore).not.toHaveBeenCalled();
    });
});
