import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockCreateServerClient = jest.fn();
const mockApplyCoupon = jest.fn();
const mockCookies = jest.fn();

const originalFetch = global.fetch;

jest.mock('@/server/auth/auth', () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('../applyCoupon', () => ({
  applyCoupon: (...args: unknown[]) => mockApplyCoupon(...args),
}));

jest.mock('next/headers', () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

function validPayload() {
  return {
    items: [{ id: 'prod-1', name: 'Item', quantity: 1, price: 20 }],
    customer: { name: 'Owner Example', email: 'owner@example.com', phone: '555-111-2222' },
    retailerId: 'disp_1',
    organizationId: 'org_1',
  };
}

describe('submitOrder auth hardening', () => {
  let submitOrder: typeof import('../submitOrder').submitOrder;

  beforeEach(async () => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();

    mockCookies.mockResolvedValue({
      toString: () => '__session=test-cookie',
    });

    mockCreateServerClient.mockResolvedValue({
      firestore: {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: jest.fn().mockResolvedValue(undefined),
          })),
        })),
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        orderId: 'order-1',
        checkoutUrl: '/order-confirmation/order-1',
      }),
    });

    ({ submitOrder } = await import('../submitOrder'));
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('requires authenticated user', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const result = await submitOrder(validPayload() as any);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('signed in');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects customer email mismatch with signed-in account', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    const input = validPayload();
    input.customer.email = 'other@example.com';

    const result = await submitOrder(input as any);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('must match');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid org context values', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    const result = await submitOrder({
      ...validPayload(),
      organizationId: '../bad',
    } as any);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid organization');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('binds user identity to authenticated session', async () => {
    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    const result = await submitOrder(validPayload() as any);

    expect(result.ok).toBe(true);
    expect(result.userId).toBe('user-1');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchArgs[1].body);
    expect(body.customer.uid).toBe('user-1');
    expect(body.customer.email).toBe('owner@example.com');
  });
});

