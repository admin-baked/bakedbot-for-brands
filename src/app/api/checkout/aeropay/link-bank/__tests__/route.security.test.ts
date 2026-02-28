import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetUserFromRequest = jest.fn();
const mockCreateServerClient = jest.fn();
const mockLinkBankAccount = jest.fn();
const mockAeropayUserGet = jest.fn();
const mockAeropayUserUpdate = jest.fn();

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
  linkBankAccount: (...args: unknown[]) => mockLinkBankAccount(...args),
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
  Timestamp: {
    now: jest.fn(() => 'MOCK_TS'),
  },
}));

describe('POST /api/checkout/aeropay/link-bank security', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGetUserFromRequest.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    mockAeropayUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        aeropayUserId: 'aero-user-1',
        bankAccounts: [],
        defaultBankAccountId: null,
      }),
    });

    mockAeropayUserUpdate.mockResolvedValue(undefined);

    mockLinkBankAccount.mockResolvedValue({
      bankAccountId: 'bank-1',
      bankAccount: {
        bankName: 'Test Bank',
        accountType: 'checking',
        last4: '1234',
        status: 'active',
      },
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'aeropay_users') {
          return {
            doc: jest.fn(() => ({
              get: mockAeropayUserGet,
              update: mockAeropayUserUpdate,
            })),
          };
        }
        return { doc: jest.fn() };
      }),
    };
    mockCreateServerClient.mockResolvedValue({ firestore });

    ({ POST } = await import('../route'));
  });

  it('requires authentication', async () => {
    mockGetUserFromRequest.mockResolvedValue(null);

    const response = await POST({
      json: async () => ({
        aeropayUserId: 'aero-user-1',
        aggregatorAccountId: 'agg-1',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Unauthorized');
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it('rejects mismatched userId when provided by client', async () => {
    const response = await POST({
      json: async () => ({
        userId: 'other-user',
        aeropayUserId: 'aero-user-1',
        aggregatorAccountId: 'agg-1',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('does not match authenticated user');
    expect(mockLinkBankAccount).not.toHaveBeenCalled();
  });

  it('binds account linking to authenticated user when userId is omitted', async () => {
    const response = await POST({
      json: async () => ({
        aeropayUserId: 'aero-user-1',
        aggregatorAccountId: 'agg-1',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockLinkBankAccount).toHaveBeenCalledWith({
      userId: 'aero-user-1',
      aggregatorAccountId: 'agg-1',
    });
    expect(mockAeropayUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      bankAccounts: expect.any(Array),
    }));
  });
});

