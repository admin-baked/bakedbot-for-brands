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

const mockPaymentWebhookAdd = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockOrderGet = jest.fn();
const mockOrderUpdate = jest.fn();
const mockForensicsAdd = jest.fn();

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
    process.env = {
      ...originalEnv,
      AEROPAY_WEBHOOK_SECRET: 'aero-secret',
    };

    mockPaymentWebhookAdd.mockResolvedValue(undefined);
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
            return { add: mockPaymentWebhookAdd };
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
});
