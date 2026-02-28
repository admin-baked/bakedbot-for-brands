import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockGetOrCreateOrgWallet = jest.fn();
const mockToDataURL = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockIntentSet = jest.fn();
const mockIntentGet = jest.fn();

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
  getOrCreateOrgWallet: (...args: unknown[]) => mockGetOrCreateOrgWallet(...args),
}));

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: (...args: unknown[]) => mockToDataURL(...args),
  },
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

describe('POST /api/checkout/usdc/intent security', () => {
  let POST: typeof import('../route').POST;

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
        totals: { total: 12.34 },
        customer: { email: 'owner@example.com' },
      }),
    });
    mockOrderUpdate.mockResolvedValue(undefined);
    mockIntentSet.mockResolvedValue(undefined);
    mockIntentGet.mockResolvedValue({ exists: false, data: () => ({}) });
    mockGetOrCreateOrgWallet.mockResolvedValue({
      walletAddress: '0xabc123',
      usdcBalanceUsd: 50,
    });
    mockToDataURL.mockResolvedValue('data:image/png;base64,abc');

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
              set: mockIntentSet,
              get: mockIntentGet,
            })),
          };
        }
        return { doc: jest.fn() };
      }),
    };
    mockGetAdminFirestore.mockReturnValue(firestore);

    ({ POST } = await import('../route'));
  });

  it('requires authentication', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org_1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Unauthorized');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('forbids non-owners from creating payment intents', async () => {
    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'different-user',
        orgId: 'org-1',
        totals: { total: 12.34 },
        customer: { email: 'someone@example.com' },
      }),
    });

    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org_1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Forbidden');
    expect(mockGetOrCreateOrgWallet).not.toHaveBeenCalled();
  });

  it('rejects organization mismatches against the order record', async () => {
    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org_2' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Organization mismatch');
    expect(mockGetOrCreateOrgWallet).not.toHaveBeenCalled();
  });

  it('blocks creating a new USDC intent for paid/closed orders', async () => {
    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        orgId: 'org-1',
        paymentStatus: 'paid',
        totals: { total: 12.34 },
        customer: { email: 'owner@example.com' },
      }),
    });

    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org-1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('already been paid');
    expect(mockGetOrCreateOrgWallet).not.toHaveBeenCalled();
    expect(mockIntentSet).not.toHaveBeenCalled();
  });

  it('reuses active pending intent instead of creating a new one', async () => {
    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user-1',
        orgId: 'org-1',
        paymentStatus: 'pending',
        totals: { total: 12.34 },
        customer: { email: 'owner@example.com' },
        usdc: {
          intentId: 'intent-existing',
          paymentAddress: '0xabc123',
          amountUsdc: 12.34,
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        },
      }),
    });

    mockIntentGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orderId: 'order_1',
        orgId: 'org-1',
        walletAddress: '0xabc123',
        status: 'pending',
      }),
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
        if (name === 'x402_deposits') {
          return {
            doc: jest.fn(() => ({
              id: 'intent-existing',
              set: mockIntentSet,
              get: mockIntentGet,
            })),
          };
        }
        return { doc: jest.fn() };
      }),
    };
    mockGetAdminFirestore.mockReturnValue(firestore);

    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org-1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.intentId).toBe('intent-existing');
    expect(body.reused).toBe(true);
    expect(mockGetOrCreateOrgWallet).not.toHaveBeenCalled();
    expect(mockIntentSet).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('stores baseline balance from intent creation for safe confirmation checks', async () => {
    const response = await POST({
      json: async () => ({ orderId: 'order_1', orgId: 'org-1' }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.intentId).toBe('intent-1');
    expect(mockIntentSet).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order_1',
      orgId: 'org-1',
      balanceAtIntentUsdc: 50,
    }));
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: 'usdc',
      paymentStatus: 'pending',
      usdc: expect.objectContaining({
        balanceAtIntentUsdc: 50,
        intentId: 'intent-1',
      }),
    }));
  });
});
