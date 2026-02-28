import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockAuthorizePayment = jest.fn();
const mockDispGet = jest.fn();
const mockIntentAdd = jest.fn();
const mockEventAdd = jest.fn();

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

jest.mock('@/lib/payments/cannpay', () => ({
    authorizePayment: (...args: unknown[]) => mockAuthorizePayment(...args),
    CANNPAY_TRANSACTION_FEE_CENTS: 50,
}));

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('POST /api/checkout/cannpay security', () => {
    let POST: typeof import('../route').POST;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });

        mockDispGet.mockResolvedValue({
            data: () => ({
                cannpayEnabled: true,
                cannpayMerchantId: 'merchant-1',
            }),
        });
        mockAuthorizePayment.mockResolvedValue({
            intent_id: 'intent-1',
            widget_url: 'https://widget.canpayapp.com/intent-1',
            expires_at: '2026-03-01T00:00:00.000Z',
        });
        mockIntentAdd.mockResolvedValue(undefined);
        mockEventAdd.mockResolvedValue(undefined);

        mockGetAdminFirestore.mockReturnValue({
            collection: jest.fn((name: string) => {
                if (name === 'dispensaries') {
                    return {
                        doc: jest.fn(() => ({
                            get: mockDispGet,
                        })),
                    };
                }
                if (name === 'cannpayIntents') {
                    return { add: mockIntentAdd };
                }
                if (name === 'events') {
                    return { add: mockEventAdd };
                }
                return { add: jest.fn(), doc: jest.fn() };
            }),
        });

        ({ POST } = await import('../route'));
    });

    it('requires authenticated user', async () => {
        mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

        const response = await POST({
            json: async () => ({
                dispId: 'disp_1',
                amount: 410,
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toContain('Authentication required');
        expect(mockAuthorizePayment).not.toHaveBeenCalled();
    });

    it('rejects invalid dispensary id format', async () => {
        const response = await POST({
            json: async () => ({
                dispId: 'bad/id',
                amount: 410,
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain('Invalid dispensary id');
        expect(mockAuthorizePayment).not.toHaveBeenCalled();
    });

    it('creates intent for authenticated user and stores session uid', async () => {
        const response = await POST({
            json: async () => ({
                dispId: 'disp_1',
                amount: 410,
                items: [{ id: 'item-1', qty: 1 }],
                draftCartId: 'cart_1',
            }),
        } as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockAuthorizePayment).toHaveBeenCalledWith(expect.objectContaining({
            amount: 410,
            merchantOrderId: 'cart_1',
        }));
        expect(mockIntentAdd).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            dispId: 'disp_1',
            amount: 410,
        }));
    });
});

