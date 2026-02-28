jest.mock('next/server', () => {
  class MockNextRequest {
    private readonly rawBody: string;
    readonly headers: { get: (name: string) => string | null };

    constructor(_url: string, init?: { body?: unknown; headers?: Record<string, string>; method?: string }) {
      this.rawBody = typeof init?.body === 'string'
        ? init.body
        : init?.body
          ? JSON.stringify(init.body)
          : '';

      const normalized = new Map<string, string>();
      Object.entries(init?.headers || {}).forEach(([key, value]) => {
        normalized.set(String(key).toLowerCase(), String(value));
      });

      this.headers = {
        get: (name: string) => normalized.get(name.toLowerCase()) || null,
      };
    }

    async text() {
      return this.rawBody;
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: any, init?: any) => ({
        status: init?.status || 200,
        json: async () => body,
      }),
    },
  };
});

import { NextRequest } from 'next/server';

const mockCreateServerClient = jest.fn();
const mockEmitEvent = jest.fn();
const mockVerifyAuthorizeNetSignature = jest.fn();
const mockAssignTierPlaybooks = jest.fn();
const mockForensicsAdd = jest.fn();
const mockOrderSet = jest.fn();

jest.mock('@/firebase/server-client', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

jest.mock('@/lib/payments/webhook-validation', () => ({
  verifyAuthorizeNetSignature: (...args: unknown[]) => mockVerifyAuthorizeNetSignature(...args),
}));

jest.mock('@/server/actions/playbooks', () => ({
  assignTierPlaybooks: (...args: unknown[]) => mockAssignTierPlaybooks(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('POST /api/webhooks/authnet payment amount guard', () => {
  const originalEnv = process.env;

  function setupDb({
    withOrder = true,
    orderTotal = 10,
  }: {
    withOrder?: boolean;
    orderTotal?: number;
  } = {}) {
    const webhookLogRef = {
      create: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const orderDoc = {
      id: 'order-1',
      ref: {
        path: 'orders/order-1',
        set: mockOrderSet,
      },
      data: () => ({
        totals: { total: orderTotal },
        brandId: 'org_demo',
        paymentStatus: 'pending',
      }),
    };

    const rootOrdersSnapshot = { docs: withOrder ? [orderDoc] : [], empty: !withOrder };
    const groupOrdersSnapshot = { docs: [], empty: true };

    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'payment_webhooks') {
          return {
            doc: jest.fn(() => webhookLogRef),
          };
        }

        if (name === 'orders') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(rootOrdersSnapshot),
              })),
            })),
          };
        }

        if (name === 'payment_forensics') {
          return {
            add: mockForensicsAdd,
          };
        }

        if (name === 'subscriptions') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
              })),
            })),
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false }),
          })),
        };
      }),
      collectionGroup: jest.fn((name: string) => {
        if (name === 'orders') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(groupOrdersSnapshot),
              })),
            })),
          };
        }

        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
            })),
          })),
        };
      }),
    };

    mockCreateServerClient.mockResolvedValue({ firestore: db });
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv, AUTHNET_SIGNATURE_KEY: 'sig-key' };

    mockVerifyAuthorizeNetSignature.mockReturnValue({ valid: true });
    mockAssignTierPlaybooks.mockResolvedValue(undefined);
    mockForensicsAdd.mockResolvedValue(undefined);
    mockOrderSet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('records forensics and skips order transition on amount mismatch', async () => {
    setupDb({ withOrder: true, orderTotal: 10 });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-amount-mismatch',
      eventType: 'net.authorize.payment.authcapture.created',
      eventDate: '2026-02-28T20:00:00.000Z',
      payload: {
        id: 'txn_123',
        responseCode: '1',
        authAmount: '3.00',
      },
    });

    const req = new NextRequest('http://localhost/api/webhooks/authnet', {
      method: 'POST',
      body,
      headers: {
        'x-anet-signature': 'sha512=fake',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processedOrders).toBe(0);
    expect(mockOrderSet).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      source: 'authnet_webhook',
      reason: 'amount_mismatch',
      orderId: 'order-1',
      transactionId: 'txn_123',
      expectedAmountCents: 1000,
      providerAmountCents: 300,
    }));
  });

  it('records forensics when payment webhook has no matching order', async () => {
    setupDb({ withOrder: false });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-missing-order',
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_missing',
        responseCode: '1',
        authAmount: '4.10',
      },
    });

    const req = new NextRequest('http://localhost/api/webhooks/authnet', {
      method: 'POST',
      body,
      headers: {
        'x-anet-signature': 'sha512=fake',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processedOrders).toBe(0);
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      source: 'authnet_webhook',
      reason: 'missing_order_mapping',
      transactionId: 'txn_missing',
      providerAmountCents: 410,
    }));
  });
});
