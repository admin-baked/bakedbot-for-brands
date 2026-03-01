import crypto from 'crypto';

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
import { POST } from '../route';

const mockCreateServerClient = jest.fn();
const mockEmitEvent = jest.fn();

const mockPaymentWebhookCreate = jest.fn();
const mockPaymentWebhookSet = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockForensicsAdd = jest.fn();
let paymentWebhookDocIds: string[] = [];

jest.mock('@/firebase/server-client', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

jest.mock('@/lib/payments/aeropay', () => ({
  AEROPAY_TRANSACTION_FEE_CENTS: 50,
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
    arrayUnion: jest.fn((value: any) => value),
  },
  Timestamp: {
    now: jest.fn(() => 'MOCK_NOW'),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('POST /api/webhooks/aeropay amount guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentWebhookDocIds = [];
    process.env = {
      ...originalEnv,
      AEROPAY_WEBHOOK_SECRET: 'aero-secret',
    };

    mockPaymentWebhookCreate.mockResolvedValue(undefined);
    mockPaymentWebhookSet.mockResolvedValue(undefined);
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({ orderId: 'order-1' }),
    });
    mockTransactionUpdate.mockResolvedValue(undefined);

    mockOrderGet.mockResolvedValue({
      exists: true,
      data: () => ({
        totals: { total: 50 },
        brandId: 'org_demo',
      }),
    });
    mockOrderUpdate.mockResolvedValue(undefined);
    mockForensicsAdd.mockResolvedValue(undefined);

    mockCreateServerClient.mockResolvedValue({
      firestore: {
        collection: jest.fn((name: string) => {
          if (name === 'payment_webhooks') {
            return {
              doc: jest.fn((docId: string) => {
                paymentWebhookDocIds.push(String(docId));
                return {
                  create: mockPaymentWebhookCreate,
                  set: mockPaymentWebhookSet,
                };
              }),
            };
          }

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

          if (name === 'payment_forensics') {
            return {
              add: mockForensicsAdd,
            };
          }

          return {};
        }),
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('records forensic evidence and blocks transitions when amount mismatches expected total+fee', async () => {
    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_123',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '300', // expected is 5050 cents with fee
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();

    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'amount_mismatch',
      orderId: 'order-1',
      transactionId: 'tx_123',
      expectedAmountCents: 5050,
      providerAmountCents: 300,
    }));
  });

  it('records forensic evidence and blocks transitions when paid event amount is missing', async () => {
    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_missing_amount',
        userId: 'user_1',
        merchantId: 'merchant_1',
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();

    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'missing_amount',
      orderId: 'order-1',
      transactionId: 'tx_missing_amount',
      expectedAmountCents: 5050,
      providerAmountCents: null,
    }));
  });

  it('deduplicates replayed webhook payloads', async () => {
    mockPaymentWebhookCreate.mockRejectedValueOnce({ code: 'already-exists' });

    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_duplicate',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '5050',
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.duplicate).toBe(true);
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('blocks transitions when merchantOrderId mismatches transaction-linked order', async () => {
    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_merchant_mismatch',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '5050',
        status: 'completed',
        merchantOrderId: 'order-2',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'order_mismatch',
      orderId: 'order-1',
      transactionId: 'tx_merchant_mismatch',
      merchantOrderId: 'order-2',
    }));
  });

  it('blocks transitions when order transactionId does not match webhook transactionId', async () => {
    mockOrderGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        totals: { total: 50 },
        brandId: 'org_demo',
        transactionId: 'tx_expected',
      }),
    });

    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_unexpected',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '5050',
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'transaction_mismatch',
      orderId: 'order-1',
      transactionId: 'tx_unexpected',
      expectedTransactionId: 'tx_expected',
    }));
  });

  it('rejects ambiguous integer amount payloads that underpay order total+fee', async () => {
    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_ambiguous_amount',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: 50, // ambiguous integer dollars; should not pass as 5050 cents
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'amount_mismatch',
      orderId: 'order-1',
      transactionId: 'tx_ambiguous_amount',
      expectedAmountCents: 5050,
      providerAmountCents: 50,
    }));
  });

  it('does not downgrade paid orders on out-of-order pending callbacks', async () => {
    mockTransactionGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ orderId: 'order-1', status: 'completed' }),
    });
    mockOrderGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        totals: { total: 50 },
        brandId: 'org_demo',
        paymentStatus: 'paid',
        aeropay: { status: 'completed' },
      }),
    });

    const webhookBody = JSON.stringify({
      topic: 'transaction_declined',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_paid_regression',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '5050',
        status: 'pending',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const signature = crypto
      .createHmac('sha256', 'aero-secret')
      .update(webhookBody)
      .digest('hex')
      .toLowerCase();

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': signature,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockOrderUpdate).toHaveBeenCalledWith(expect.objectContaining({
      paymentStatus: 'paid',
      'aeropay.status': 'completed',
    }));
    expect(mockTransactionUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
    }));
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'status_regression_blocked',
      orderId: 'order-1',
      transactionId: 'tx_paid_regression',
      currentPaymentStatus: 'paid',
      desiredPaymentStatus: 'pending',
      appliedPaymentStatus: 'paid',
    }));
    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'transaction_status_regression_blocked',
      orderId: 'order-1',
      transactionId: 'tx_paid_regression',
      currentTransactionStatus: 'completed',
      desiredTransactionStatus: 'pending',
      appliedTransactionStatus: 'completed',
    }));
  });

  it('persists forensic evidence for invalid webhook signatures', async () => {
    const webhookBody = JSON.stringify({
      topic: 'transaction_completed',
      date: '2026-02-28T12:00:00.000Z',
      data: {
        transactionId: 'tx_invalid_sig',
        userId: 'user_1',
        merchantId: 'merchant_1',
        amount: '5050',
        status: 'completed',
        merchantOrderId: 'order-1',
        createdAt: '2026-02-28T12:00:00.000Z',
      },
    });

    const request = new NextRequest('http://localhost/api/webhooks/aeropay', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'x-aeropay-signature': 'invalid-signature',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Invalid signature');
    expect(mockPaymentWebhookSet).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'aeropay',
      status: 'rejected_invalid_signature',
      rejectionReason: 'invalid_signature',
      signaturePresent: true,
    }), { merge: true });
    expect(paymentWebhookDocIds.some((docId) => docId.startsWith('aeropay_reject_'))).toBe(true);
    expect(mockPaymentWebhookCreate).not.toHaveBeenCalled();
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();
  });
});
