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
  const originalFetch = global.fetch;

  function setupDb({
    withOrder = true,
    orderTotal = 10,
    duplicateOrderMatch = false,
    fallbackOrderByInvoice = false,
    duplicateWebhookByCreate = false,
  }: {
    withOrder?: boolean;
    orderTotal?: number;
    duplicateOrderMatch?: boolean;
    fallbackOrderByInvoice?: boolean;
    duplicateWebhookByCreate?: boolean;
  } = {}) {
    let webhookCreateCalls = 0;
    const webhookLogRef = {
      create: jest.fn().mockImplementation(async () => {
        webhookCreateCalls += 1;
        if (duplicateWebhookByCreate && webhookCreateCalls > 1) {
          const err = new Error('already exists') as Error & { code?: string };
          err.code = 'already-exists';
          throw err;
        }
        return undefined;
      }),
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
    const fallbackOrderDoc = {
      id: 'order-1',
      exists: fallbackOrderByInvoice,
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
    const duplicateOrderDoc = {
      id: 'order-dup',
      ref: {
        path: 'organizations/org_demo/orders/order-dup',
        set: mockOrderSet,
      },
      data: () => ({
        totals: { total: orderTotal },
        brandId: 'org_demo',
        paymentStatus: 'pending',
      }),
    };
    const groupOrdersSnapshot = {
      docs: duplicateOrderMatch ? [duplicateOrderDoc] : [],
      empty: !duplicateOrderMatch,
    };

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
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(fallbackOrderDoc),
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
    global.fetch = originalFetch;
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

  it('attempts void for unmapped successful authcapture events', async () => {
    setupDb({ withOrder: false });
    process.env.AUTHNET_API_LOGIN_ID = 'login-id';
    process.env.AUTHNET_TRANSACTION_KEY = 'txn-key';
    process.env.AUTHNET_ENV = 'sandbox';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: { resultCode: 'Ok', message: [] },
        transactionResponse: { responseCode: '1', transId: 'txn_void_1' },
      }),
    } as never);

    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-missing-order-void',
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_missing_capture',
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
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      source: 'authnet_webhook',
      reason: 'missing_order_mapping',
      transactionId: 'txn_missing_capture',
      voidAttempted: true,
      voidSucceeded: true,
    }));
  });

  it('recovers missing transaction mapping via payload invoiceNumber fallback', async () => {
    setupDb({ withOrder: false, orderTotal: 4.1, fallbackOrderByInvoice: true });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-invoice-fallback',
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_invoice_fallback',
        responseCode: '1',
        authAmount: '4.10',
        order: {
          invoiceNumber: 'order-1',
        },
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
    expect(data.processedOrders).toBe(1);
    expect(mockOrderSet).toHaveBeenCalledWith(expect.objectContaining({
      paymentStatus: 'paid',
      transactionId: 'txn_invoice_fallback',
    }), { merge: true });
    expect(mockForensicsAdd).not.toHaveBeenCalledWith(expect.objectContaining({
      reason: 'missing_order_mapping',
      transactionId: 'txn_invoice_fallback',
    }));
  });

  it('records forensics and skips paid transition when provider amount is missing', async () => {
    setupDb({ withOrder: true, orderTotal: 10 });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-missing-amount',
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_missing_amount',
        responseCode: '1',
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
      reason: 'missing_amount',
      orderId: 'order-1',
      transactionId: 'txn_missing_amount',
      expectedAmountCents: 1000,
      providerAmountCents: null,
    }));
  });

  it('records forensics and skips transitions when a transaction maps to multiple orders', async () => {
    setupDb({ withOrder: true, orderTotal: 10, duplicateOrderMatch: true });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-duplicate-map',
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_duplicate',
        responseCode: '1',
        authAmount: '10.00',
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
    expect(data.warning).toContain('duplicate_transaction_mapping');
    expect(data.processedOrders).toBe(0);
    expect(mockOrderSet).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'authorize_net',
      source: 'authnet_webhook',
      reason: 'duplicate_transaction_mapping',
      transactionId: 'txn_duplicate',
      orderCount: 2,
    }));
  });

  it('deduplicates repeated payloads without notificationId using body hash', async () => {
    setupDb({ withOrder: false, duplicateWebhookByCreate: true });
    const { POST } = await import('../route');

    const body = JSON.stringify({
      eventType: 'net.authorize.payment.authcapture.created',
      payload: {
        id: 'txn_no_notification',
        responseCode: '1',
        authAmount: '2.00',
      },
    });

    const req1 = new NextRequest('http://localhost/api/webhooks/authnet', {
      method: 'POST',
      body,
      headers: {
        'x-anet-signature': 'sha512=fake',
      },
    });

    const req2 = new NextRequest('http://localhost/api/webhooks/authnet', {
      method: 'POST',
      body,
      headers: {
        'x-anet-signature': 'sha512=fake',
      },
    });

    const first = await POST(req1);
    const firstBody = await first.json();
    const second = await POST(req2);
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(firstBody.duplicate).toBeUndefined();
    expect(second.status).toBe(200);
    expect(secondBody.duplicate).toBe(true);
  });
});
