import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockGetOrgWallet = jest.fn();
const mockRefreshWalletBalance = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockIntentGet = jest.fn();
const mockIntentSet = jest.fn();
const mockConfirmedIntentsGet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();

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

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

jest.mock('@/lib/x402/cdp-wallets', () => ({
  getOrgWallet: (...args: unknown[]) => mockGetOrgWallet(...args),
  refreshWalletBalance: (...args: unknown[]) => mockRefreshWalletBalance(...args),
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

describe('GET /api/checkout/usdc/status security', () => {
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        orgId: 'org-1',
        paymentStatus: 'pending',
        customer: { email: 'owner@example.com' },
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        usdc: {
          paymentAddress: '0xabc',
          amountUsdc: 10,
          balanceAtIntentUsdc: 100,
          intentId: 'intent-1',
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        },
      }),
    });
    mockOrderUpdate.mockResolvedValue(undefined);

    mockIntentGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orderId: 'order_1',
        orgId: 'org-1',
        walletAddress: '0xabc',
        amountUsdc: 10,
        balanceAtIntentUsdc: 100,
        status: 'pending',
        createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });
    mockIntentSet.mockResolvedValue(undefined);
    mockConfirmedIntentsGet.mockResolvedValue({ docs: [] });

    mockGetOrgWallet.mockResolvedValue({ usdcBalanceUsd: 80 });
    mockRefreshWalletBalance.mockResolvedValue(90);
    mockBatchCommit.mockResolvedValue(undefined);

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

        if (name === 'x402_deposits') {
          return {
            doc: jest.fn(() => ({
              id: 'intent-1',
              get: mockIntentGet,
              set: mockIntentSet,
            })),
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                where: jest.fn(() => ({
                  get: mockConfirmedIntentsGet,
                })),
              })),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            get: jest.fn(),
          })),
        };
      }),
      batch: jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      })),
    };
    mockGetAdminFirestore.mockReturnValue(firestore);

    ({ GET } = await import('../route'));
  });

  it('requires authentication', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Unauthorized');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('forbids non-owners from checking payment status', async () => {
    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'other-user',
        orgId: 'org-1',
        paymentStatus: 'pending',
        customer: { email: 'other@example.com' },
        usdc: { paymentAddress: '0xabc', amountUsdc: 10 },
      }),
    });

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(mockRefreshWalletBalance).not.toHaveBeenCalled();
  });

  it('rejects intent metadata mismatches against the order', async () => {
    mockIntentGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orderId: 'different-order',
        orgId: 'org-1',
        walletAddress: '0xabc',
        amountUsdc: 10,
        balanceAtIntentUsdc: 100,
        status: 'pending',
      }),
    });

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('mismatch');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('uses intent baseline rather than previous poll balance', async () => {
    mockGetOrgWallet.mockResolvedValue({ usdcBalanceUsd: 80 });
    mockRefreshWalletBalance.mockResolvedValue(90);

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('pending');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('does not confirm when wallet delta is already consumed by other confirmed intents', async () => {
    mockRefreshWalletBalance.mockResolvedValue(111);
    mockConfirmedIntentsGet.mockResolvedValue({
      docs: [
        {
          id: 'intent-other',
          data: () => ({
            status: 'confirmed',
            confirmedAmountUsdc: 10,
            confirmedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('pending');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('confirms payment when on-chain delta from baseline meets expected amount', async () => {
    mockRefreshWalletBalance.mockResolvedValue(111);

    const response = await GET({
      url: 'https://example.com/api/checkout/usdc/status?orderId=order_1',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('confirmed');
    expect(mockBatchUpdate).toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    const intentUpdateCall = mockBatchUpdate.mock.calls.find(([, payload]) => payload?.confirmedAmountUsdc === 10);
    expect(intentUpdateCall).toBeDefined();
  });
});
