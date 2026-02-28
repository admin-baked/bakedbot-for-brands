import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockAuthorizePayment = jest.fn();
const mockOrderGet = jest.fn();
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

describe('POST /api/checkout/cannpay/authorize amount guard', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({ uid: 'user-1' });
    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        organizationId: 'org_server',
        paymentStatus: 'pending',
        totals: { total: 49.99 },
      }),
    });
    mockAuthorizePayment.mockResolvedValue({
      intent_id: 'intent-1',
      widget_url: 'https://widget.canpayapp.com/intent-1',
      expires_at: '2026-03-01T00:00:00.000Z',
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'orders') {
          return {
            doc: jest.fn(() => ({
              get: mockOrderGet,
              update: mockOrderUpdate,
            })),
          };
        }
        return { doc: jest.fn(() => ({ get: jest.fn(), update: jest.fn() })) };
      }),
    };
    mockCreateServerClient.mockResolvedValue({ firestore });

    ({ POST } = await import('../route'));
  });

  it('uses server order total (in cents) instead of client-supplied amount', async () => {
    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 410,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalAmount).toBe(5049);
    expect(mockAuthorizePayment).toHaveBeenCalledWith(expect.objectContaining({
      amount: 4999,
      merchantOrderId: 'order-1',
      passthrough: expect.stringContaining('"organizationId":"org_server"'),
    }));
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      'canpay.amount': 5049,
    }));
  });

  it('rejects client organization override mismatches', async () => {
    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 4999,
        organizationId: 'org_spoofed',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Organization mismatch');
    expect(mockAuthorizePayment).not.toHaveBeenCalled();
  });

  it('requires verified email before paid authorization', async () => {
    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      emailVerified: false,
    });

    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 4999,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Email verification is required');
    expect(mockAuthorizePayment).not.toHaveBeenCalled();
  });
});
