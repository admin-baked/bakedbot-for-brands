import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCanonicalPost = jest.fn();
const mockCanonicalGet = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/app/api/webhooks/authnet/route', () => ({
  POST: (...args: unknown[]) => mockCanonicalPost(...args),
  GET: (...args: unknown[]) => mockCanonicalGet(...args),
}));

describe('POST/GET /api/webhooks/authorize-net compatibility route', () => {
  let POST: typeof import('../route').POST;
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCanonicalPost.mockResolvedValue({
      status: 200,
      json: async () => ({ received: true }),
    });
    mockCanonicalGet.mockResolvedValue({
      status: 200,
      json: async () => ({
        status: 'ready',
        endpoint: '/api/webhooks/authnet',
        provider: 'authorize_net',
      }),
    });

    ({ POST, GET } = await import('../route'));
  });

  it('delegates POST to canonical authnet webhook handler', async () => {
    const req = { headers: { get: () => null }, text: async () => '{}' } as any;

    const response = await POST(req);
    const body = await response.json();

    expect(mockCanonicalPost).toHaveBeenCalledWith(req);
    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
  });

  it('returns compatibility metadata on GET health check', async () => {
    const response = await GET();
    const body = await response.json();

    expect(mockCanonicalGet).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body.compatibilityMode).toBe(true);
    expect(body.canonicalEndpoint).toBe('/api/webhooks/authnet');
    expect(body.endpoint).toBe('/api/webhooks/authorize-net');
  });
});
