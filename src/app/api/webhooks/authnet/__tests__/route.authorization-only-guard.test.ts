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

describe('POST /api/webhooks/authnet authorization-only hardening', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  function setupDb({
    withOrder = true,
    orderPaymentStatus = 'pending',
  }: {
    withOrder?: boolean;
    orderPaymentStatus?: string;
  } = {}) {
    const webhookLogRef = {
      create: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const orderDoc = {
      id: 'order-auth-1',
      ref: {
        path: 'orders/order-auth-1',
        set: mockOrderSet,
      },
      data: () => ({
        totals: { total: 2.0 },
        brandId: 'org_demo',
        paymentStatus: orderPaymentStatus,
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
    process.env = {
      ...originalEnv,
      AUTHNET_SIGNATURE_KEY: 'sig-key',
      AUTHNET_API_LOGIN_ID: 'login-id',
      AUTHNET_TRANSACTION_KEY: 'txn-key',
      AUTHNET_ENV: 'sandbox',
    };

    mockVerifyAuthorizeNetSignature.mockReturnValue({ valid: true });
    mockAssignTierPlaybooks.mockResolvedValue(undefined);
    mockForensicsAdd.mockResolvedValue(undefined);
    mockOrderSet.mockResolvedValue(undefined);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('keeps authorization-only events as authorized (not paid)', async () => {
    setupDb({ withOrder: true });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-auth-only-1',
      eventType: 'net.authorize.payment.authorization.created',
      payload: {
        id: 'txn_auth_1',
        responseCode: '1',
        authAmount: '2.00',
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.processedOrders).toBe(1);
    expect(mockOrderSet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'authorized',
      }),
      { merge: true },
    );
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('attempts to void unmatched authorization-only transactions', async () => {
    setupDb({ withOrder: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: { resultCode: 'Ok', message: [] },
        transactionResponse: {
          responseCode: '1',
          transId: 'txn_voided_1',
        },
      }),
    });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-auth-only-void',
      eventType: 'net.authorize.payment.authorization.created',
      payload: {
        id: 'txn_unknown_auth',
        responseCode: '1',
        authAmount: '2.00',
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.processedOrders).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://apitest.authorize.net/xml/v1/request.api');

    const sentBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body as string);
    expect(sentBody.createTransactionRequest.transactionRequest.transactionType).toBe('voidTransaction');
    expect(sentBody.createTransactionRequest.transactionRequest.refTransId).toBe('txn_unknown_auth');

    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      reason: 'missing_order_mapping',
      transactionId: 'txn_unknown_auth',
      voidAttempted: true,
      voidSucceeded: true,
    }));
  });

  it('attempts to void unmatched authorization events when responseCode is missing', async () => {
    setupDb({ withOrder: false });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: { resultCode: 'Ok', message: [] },
        transactionResponse: {
          responseCode: '1',
          transId: 'txn_voided_missing_rc',
        },
      }),
    });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-auth-only-missing-rc',
      eventType: 'net.authorize.payment.authorization.created',
      payload: {
        id: 'txn_unknown_missing_rc',
        authAmount: '2.00',
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.processedOrders).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      reason: 'missing_order_mapping',
      transactionId: 'txn_unknown_missing_rc',
      voidAttempted: true,
      voidSucceeded: true,
    }));
  });

  it('does not mark unknown responseCode=1 events as paid', async () => {
    setupDb({ withOrder: true });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-unknown-1',
      eventType: 'net.authorize.payment.review.created',
      payload: {
        id: 'txn_review_1',
        responseCode: '1',
        authAmount: '2.00',
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.processedOrders).toBe(1);
    expect(mockOrderSet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'pending',
      }),
      { merge: true },
    );
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('does not downgrade paid orders on late authorization-only events', async () => {
    setupDb({ withOrder: true, orderPaymentStatus: 'paid' });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-auth-only-paid-order',
      eventType: 'net.authorize.payment.authorization.created',
      payload: {
        id: 'txn_auth_paid',
        responseCode: '1',
        authAmount: '2.00',
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
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.processedOrders).toBe(1);
    expect(mockOrderSet).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'paid',
      }),
      { merge: true },
    );
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      reason: 'status_regression_blocked',
      transactionId: 'txn_auth_paid',
      currentPaymentStatus: 'paid',
      desiredPaymentStatus: 'authorized',
      appliedPaymentStatus: 'paid',
    }));
  });
});
