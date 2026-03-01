import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCreateTransaction = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockAeropayUserGet = jest.fn();
const mockTransactionSet = jest.fn();

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

jest.mock('@/lib/payments/aeropay', () => ({
  createAeropayUser: jest.fn(),
  getAggregatorCredentials: jest.fn(),
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
  AEROPAY_TRANSACTION_FEE_CENTS: 50,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('POST /api/checkout/aeropay/authorize amount guard', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner Example',
    });

    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        organizationId: 'org_server',
        paymentStatus: 'pending',
        totals: { total: 49.99 },
      }),
    });

    mockAeropayUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        aeropayUserId: 'aero-user-1',
        bankAccounts: [{ id: 'bank-1', isDefault: true }],
        defaultBankAccountId: 'bank-1',
      }),
    });

    mockCreateTransaction.mockResolvedValue({
      transactionId: 'aero-tx-1',
      status: 'pending',
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
        if (name === 'aeropay_users') {
          return {
            doc: jest.fn(() => ({
              get: mockAeropayUserGet,
              set: jest.fn(),
            })),
          };
        }
        if (name === 'aeropay_transactions') {
          return {
            doc: jest.fn(() => ({
              set: mockTransactionSet,
            })),
          };
        }
        return { doc: jest.fn(() => ({ set: jest.fn(), get: jest.fn(), update: jest.fn() })) };
      }),
    };
    mockCreateServerClient.mockResolvedValue({ firestore });

    ({ POST } = await import('../route'));
  });

  it('uses server order total (in cents) instead of client-supplied amount', async () => {
    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 100,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalAmount).toBe(5049);
    expect(mockCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5049,
      merchantOrderId: 'order-1',
    }));
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      'aeropay.amount': 5049,
    }));
    expect(mockTransactionSet).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5049,
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
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('requires verified email before paid authorization', async () => {
    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
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
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('reuses an existing pending Aeropay authorization for the same order', async () => {
    mockOrderGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'user-1',
        organizationId: 'org_server',
        paymentStatus: 'pending',
        paymentMethod: 'aeropay',
        totals: { total: 49.99 },
        aeropay: {
          transactionId: 'aero-existing',
          status: 'pending',
        },
      }),
    });

    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 4999,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reused).toBe(true);
    expect(body.transactionId).toBe('aero-existing');
    expect(mockCreateTransaction).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('rejects authorization when order is in closed status', async () => {
    mockOrderGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'user-1',
        organizationId: 'org_server',
        status: 'completed',
        paymentStatus: 'pending',
        totals: { total: 49.99 },
      }),
    });

    const response = await POST({
      json: async () => ({
        orderId: 'order-1',
        amount: 4999,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('closed');
    expect(mockCreateTransaction).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });
});
