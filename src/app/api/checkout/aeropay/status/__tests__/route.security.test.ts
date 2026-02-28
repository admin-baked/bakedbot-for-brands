import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockGetTransactionDetails = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
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

jest.mock('@/lib/payments/aeropay', () => ({
  getTransactionDetails: (...args: unknown[]) => mockGetTransactionDetails(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('POST /api/checkout/aeropay/status security', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        orderId: 'order-1',
      }),
    });
    mockTransactionUpdate.mockResolvedValue(undefined);

    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({}),
    });
    mockOrderUpdate.mockResolvedValue(undefined);

    mockGetTransactionDetails.mockResolvedValue({
      transactionId: 'tx_1',
      status: 'pending',
      amount: 1234,
      updatedAt: '2026-02-28T20:00:00.000Z',
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'aeropay_transactions') {
          return {
            doc: jest.fn(() => ({
              get: mockTransactionGet,
              update: mockTransactionUpdate,
            })),
          };
        }

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

  it('requires authentication', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await POST({
      json: async () => ({ transactionId: 'tx_1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Unauthorized');
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it('validates transaction id format', async () => {
    const response = await POST({
      json: async () => ({ transactionId: 'bad/id' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid transactionId');
    expect(mockGetTransactionDetails).not.toHaveBeenCalled();
  });

  it('forbids access when transaction belongs to another user', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'other-user',
        orderId: 'order-1',
      }),
    });

    const response = await POST({
      json: async () => ({ transactionId: 'tx_1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('do not have permission');
    expect(mockGetTransactionDetails).not.toHaveBeenCalled();
  });

  it('returns transaction status for owning user', async () => {
    const response = await POST({
      json: async () => ({ transactionId: 'tx_1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('pending');
    expect(mockGetTransactionDetails).toHaveBeenCalledWith('tx_1');
    expect(mockTransactionUpdate).toHaveBeenCalled();
  });
});

