import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockEmitEvent = jest.fn();
const mockAuthorizePayment = jest.fn();
const mockOrderSet = jest.fn();
const mockOrderUpdate = jest.fn();

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
});

