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

const mockTopGet = jest.fn();
const mockTopSet = jest.fn();
const mockOrgGet = jest.fn();
const mockOrgSet = jest.fn();
const mockForensicsAdd = jest.fn();

jest.mock('@/firebase/server-client', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
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

describe('POST /api/webhooks/cannpay amount guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CANPAY_API_SECRET: 'test-secret',
    };

    mockTopGet.mockResolvedValue({
      exists: true,
      data: () => ({
        totals: { total: 49.99 },
        brandId: 'org_demo',
      }),
    });
    mockOrgGet.mockResolvedValue({ exists: false, data: () => null });
    mockTopSet.mockResolvedValue(undefined);
    mockOrgSet.mockResolvedValue(undefined);
    mockForensicsAdd.mockResolvedValue(undefined);

    mockCreateServerClient.mockResolvedValue({
      firestore: {
        collection: jest.fn((name: string) => {
          if (name === 'orders') {
            return {
              doc: jest.fn(() => ({
                get: mockTopGet,
                set: mockTopSet,
              })),
            };
          }

          if (name === 'organizations') {
            return {
              doc: jest.fn(() => ({
                collection: jest.fn((subName: string) => {
                  if (subName === 'orders') {
                    return {
                      doc: jest.fn(() => ({
                        get: mockOrgGet,
                        set: mockOrgSet,
                      })),
                    };
                  }
                  return {};
                }),
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

  it('does not transition order when provider amount mismatches expected total', async () => {
    const responsePayload = JSON.stringify({
      intent_id: 'intent-123',
      status: 'Success',
      amount: 300, // expected 4999 cents
      merchant_order_id: 'order-1',
      passthrough_param: JSON.stringify({ orderId: 'order-1', brandId: 'org_demo' }),
    });

    const signature = crypto
      .createHmac('sha256', 'test-secret')
      .update(responsePayload)
      .digest('hex')
      .toLowerCase();

    const reqBody = JSON.stringify({
      response: responsePayload,
      signature,
    });

    const request = new NextRequest('http://localhost/api/webhooks/cannpay', {
      method: 'POST',
      body: reqBody,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.warning).toContain('Amount mismatch');

    expect(mockTopSet).not.toHaveBeenCalled();
    expect(mockOrgSet).not.toHaveBeenCalled();
    expect(mockEmitEvent).not.toHaveBeenCalled();

    expect(mockForensicsAdd).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'cannpay',
      source: 'cannpay_webhook',
      reason: 'amount_mismatch',
      orderId: 'order-1',
      expectedAmountCents: 4999,
      providerAmountCents: 300,
    }));
  });
});
