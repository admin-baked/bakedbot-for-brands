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
import crypto from 'crypto';

const mockCreateServerClient = jest.fn();
const mockEmitEvent = jest.fn();
const mockVerifyAuthorizeNetSignature = jest.fn();
const mockAssignTierPlaybooks = jest.fn();

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

describe('POST /api/webhooks/authnet subscription event coverage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv, AUTHNET_SIGNATURE_KEY: 'sig-key' };

    mockVerifyAuthorizeNetSignature.mockReturnValue({ valid: true });
    mockAssignTierPlaybooks.mockResolvedValue(undefined);

    const subscriptionRefSet = jest.fn().mockResolvedValue(undefined);
    const subscriptionDoc = {
      id: 'current',
      ref: {
        path: 'organizations/org_demo/subscription/current',
        set: subscriptionRefSet,
      },
      data: () => ({ status: 'active' }),
    };

    const webhookLogRef = {
      create: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const emptyQueryGet = jest.fn().mockResolvedValue({ docs: [], empty: true });

    const db = {
      collectionGroup: jest.fn((name: string) => {
        if (name === 'subscription') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs: [subscriptionDoc], empty: false }),
              })),
            })),
          };
        }

        return {
          where: jest.fn(() => ({
            limit: jest.fn(() => ({ get: emptyQueryGet })),
          })),
        };
      }),
      collection: jest.fn((name: string) => {
        if (name === 'payment_webhooks') {
          return {
            doc: jest.fn(() => webhookLogRef),
          };
        }

        if (name === 'subscriptions') {
          return {
            where: jest.fn(() => ({
              limit: jest.fn(() => ({ get: emptyQueryGet })),
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
    };

    mockCreateServerClient.mockResolvedValue({ firestore: db });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('processes net.authorize.subscription.suspended events (non-customer prefix)', async () => {
    const { POST } = await import('../route');

    const body = JSON.stringify({
      notificationId: 'notif-123',
      eventType: 'net.authorize.subscription.suspended',
      payload: {
        id: 'sub_abc123',
      },
    });

    const req = new NextRequest('http://localhost/api/webhooks/authnet', {
      method: 'POST',
      body,
      headers: {
        'x-anet-signature': `sha512=${crypto.createHash('sha256').update(body).digest('hex')}`,
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processedSubscriptions).toBeGreaterThanOrEqual(1);

    expect(mockEmitEvent).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org_demo',
      type: 'subscription.failed',
      data: expect.objectContaining({
        providerSubscriptionId: 'sub_abc123',
        status: 'past_due',
        eventType: 'net.authorize.subscription.suspended',
      }),
    }));
  });
});
