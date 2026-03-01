import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockEmitEvent = jest.fn();
const mockAuthorizePayment = jest.fn();
const mockOrderSet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockProductGet = jest.fn();
const mockDispensaryGet = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/server/auth/auth-helpers', () => ({
  getUserFromRequest: (...args: unknown[]) => mockGetUserFromRequest(...args),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

jest.mock('@/lib/payments/cannpay', () => ({
  authorizePayment: (...args: unknown[]) => mockAuthorizePayment(...args),
  CANNPAY_TRANSACTION_FEE_CENTS: 50,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: 'org_1',
    dispensaryId: 'disp_1',
    pickupLocationId: 'loc_1',
    customer: {
      email: 'owner@example.com',
      name: 'Owner Example',
      phone: '555-111-2222',
      uid: 'user-1',
    },
    items: [
      {
        productId: 'prod-1',
        name: 'Item',
        quantity: 1,
        unitPrice: 20,
      },
    ],
    subtotal: 20,
    tax: 3,
    fees: 0,
    total: 23,
    ...overrides,
  };
}

describe('POST /api/checkout/smokey-pay auth hardening', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'orders') {
          return {
            doc: jest.fn(() => ({
              id: 'order-1',
              set: mockOrderSet,
              update: mockOrderUpdate,
            })),
          };
        }
        if (name === 'products') {
          return {
            doc: jest.fn(() => ({
              get: mockProductGet,
            })),
          };
        }
        if (name === 'dispensaries') {
          return {
            doc: jest.fn(() => ({
              get: mockDispensaryGet,
            })),
          };
        }
        if (name === 'coupons') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                limit: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue({ empty: true }),
                })),
              })),
            })),
          };
        }
        return {
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true }),
              })),
            })),
          })),
        };
      }),
    };

    mockCreateServerClient.mockResolvedValue({ firestore });
    mockDispensaryGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org_1',
        cannpayEnabled: true,
        cannpayMerchantId: 'merchant_1',
      }),
    });
    mockProductGet.mockResolvedValue({
      exists: true,
      data: () => ({
        name: 'Server Product',
        price: 20,
        brandId: 'org_1',
        dispensaryId: 'disp_1',
      }),
    });
    mockOrderSet.mockResolvedValue(undefined);
    mockOrderUpdate.mockResolvedValue(undefined);
    mockEmitEvent.mockResolvedValue(undefined);
    mockAuthorizePayment.mockResolvedValue({
      intent_id: 'intent-1',
      widget_url: 'https://widget.canpayapp.com/intent-1',
      expires_at: '2026-03-01T00:00:00.000Z',
    });

    ({ POST } = await import('../route'));
  });

  it('requires authenticated user', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await POST({
      json: async () => validBody(),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Authentication required');
  });

  it('requires verified email for paid checkout', async () => {
    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
      email_verified: false,
    });

    const response = await POST({
      json: async () => validBody(),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Email verification is required');
    expect(mockOrderSet).not.toHaveBeenCalled();
    expect(mockAuthorizePayment).not.toHaveBeenCalled();
  });

  it('rejects customer email mismatch', async () => {
    const response = await POST({
      json: async () => validBody({
        customer: {
          email: 'other@example.com',
          name: 'Owner Example',
          phone: '555-111-2222',
          uid: 'user-1',
        },
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('must match');
    expect(mockOrderSet).not.toHaveBeenCalled();
  });

  it('rejects customer uid mismatch', async () => {
    const response = await POST({
      json: async () => validBody({
        customer: {
          email: 'owner@example.com',
          name: 'Owner Example',
          phone: '555-111-2222',
          uid: 'user-2',
        },
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('mismatch');
    expect(mockOrderSet).not.toHaveBeenCalled();
  });

  it('stores authenticated user on created order', async () => {
    const response = await POST({
      json: async () => validBody({
        customer: {
          email: 'owner@example.com',
          name: 'Owner Example',
          phone: '555-111-2222',
          uid: null,
        },
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockOrderSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      customer: expect.objectContaining({
        email: 'owner@example.com',
      }),
    }));
  });

  it('uses server product pricing instead of client-provided unitPrice', async () => {
    const response = await POST({
      json: async () => validBody({
        items: [{
          productId: 'prod-1',
          name: 'Client Name',
          quantity: 1,
          unitPrice: 1,
        }],
        subtotal: 1,
        tax: 0.15,
        total: 1.15,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockOrderSet).toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({
          productId: 'prod-1',
          name: 'Server Product',
          price: 20,
        }),
      ]),
      totals: expect.objectContaining({
        subtotal: 20,
        tax: 3,
        total: 23,
      }),
    }));
  });

  it('rejects products outside organization/dispensary checkout context', async () => {
    mockProductGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        name: 'Foreign Product',
        price: 20,
        brandId: 'org_other',
        dispensaryId: 'disp_other',
      }),
    });

    const response = await POST({
      json: async () => validBody(),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('outside this checkout context');
    expect(mockOrderSet).not.toHaveBeenCalled();
  });

  it('rejects checkout when CannPay is not enabled on dispensary', async () => {
    mockDispensaryGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        orgId: 'org_1',
        cannpayEnabled: false,
        cannpayMerchantId: null,
      }),
    });

    const response = await POST({
      json: async () => validBody(),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('not enabled');
    expect(mockOrderSet).not.toHaveBeenCalled();
  });
});
