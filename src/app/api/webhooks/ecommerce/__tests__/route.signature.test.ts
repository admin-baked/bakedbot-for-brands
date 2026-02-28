import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import crypto from 'crypto';

const mockDispatchPlaybookEvent = jest.fn();
const mockResolveEcommerceCustomer = jest.fn();

jest.mock('next/server', () => {
  class MockNextRequest {
    readonly url: string;
    private readonly rawBody: string;
    readonly headers: { get: (name: string) => string | null };

    constructor(url: string, init?: { body?: unknown; headers?: Record<string, string>; method?: string }) {
      this.url = url;
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

jest.mock('@/server/services/playbook-event-dispatcher', () => ({
  dispatchPlaybookEvent: (...args: unknown[]) => mockDispatchPlaybookEvent(...args),
}));

jest.mock('@/server/services/ecommerce-customer-mapper', () => ({
  resolveEcommerceCustomer: (...args: unknown[]) => mockResolveEcommerceCustomer(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('POST /api/webhooks/ecommerce signature validation', () => {
  const originalEnv = process.env;
  let POST: typeof import('../route').POST;
  let NextRequestCtor: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ECOMMERCE_WEBHOOK_SECRET: 'webhook-secret',
    };

    mockResolveEcommerceCustomer.mockResolvedValue({ bakedBotCustomerId: 'customer_1' });
    mockDispatchPlaybookEvent.mockResolvedValue(undefined);

    ({ POST } = await import('../route'));
    ({ NextRequest: NextRequestCtor } = await import('next/server'));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects malformed custom signatures with 401 (no server error)', async () => {
    const body = JSON.stringify({
      platform: 'custom',
      event: 'order.created',
      customerEmail: 'customer@example.com',
    });

    const req = new NextRequestCtor('https://example.com/api/webhooks/ecommerce?orgId=org_1', {
      method: 'POST',
      body,
      headers: {
        'x-bakedbot-signature': 'bad',
      },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error).toContain('Invalid signature');
    expect(mockResolveEcommerceCustomer).not.toHaveBeenCalled();
  });

  it('accepts valid custom signatures and dispatches event', async () => {
    const body = JSON.stringify({
      platform: 'custom',
      event: 'order.created',
      customerEmail: 'customer@example.com',
      orderId: 'order_1',
    });

    const signature = crypto
      .createHmac('sha256', 'webhook-secret')
      .update(body, 'utf8')
      .digest('hex');

    const req = new NextRequestCtor('https://example.com/api/webhooks/ecommerce?orgId=org_1', {
      method: 'POST',
      body,
      headers: {
        'x-bakedbot-signature': signature,
      },
    });

    const response = await POST(req);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockResolveEcommerceCustomer).toHaveBeenCalledWith(
      'org_1',
      'customer@example.com',
      undefined
    );
    expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_1',
      'order.created',
      expect.objectContaining({
        customerId: 'customer_1',
      })
    );
  });
});
