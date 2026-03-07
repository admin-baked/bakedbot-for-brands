jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    method: string;
    headers: Headers;

    constructor(url: string, init?: { method?: string; headers?: HeadersInit }) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      headers: new Headers(),
      json: async () => data,
    }),
  },
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

jest.mock('@/lib/domain-routing', () => ({
  getDomainMapping: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { getDomainMapping } from '@/lib/domain-routing';

describe('WordPress proxy route', () => {
  const originalTarget = process.env.ANDREWS_WP_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANDREWS_WP_URL = 'https://andrews-wp.example.com';
    global.fetch = jest.fn();
    (getDomainMapping as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    process.env.ANDREWS_WP_URL = originalTarget;
    global.fetch = originalFetch;
  });

  it('returns 500 when no configured WordPress target exists', async () => {
    delete process.env.ANDREWS_WP_URL;

    const request = new NextRequest('http://localhost/api/wordpress/proxy?path=wp-json');
    const response = await GET(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'WordPress proxy is not configured.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects wpUrl overrides from a different origin', async () => {
    const request = new NextRequest(
      'http://localhost/api/wordpress/proxy?path=wp-json&wpUrl=https://evil.example.com'
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid WordPress target.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proxies to the configured origin and strips nextjs headers', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('ok', {
        status: 200,
        headers: {
          'content-type': 'text/html',
          'x-nextjs-cache': 'hit',
        },
      })
    );

    const request = new NextRequest('http://localhost/api/wordpress/proxy?path=wp-json/posts');
    const response = await GET(request);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://andrews-wp.example.com/wp-json/posts',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Host: 'andrews-wp.example.com',
          Accept: '*/*',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(response.headers.get('x-nextjs-cache')).toBeNull();
    await expect(response.text()).resolves.toBe('ok');
  });

  it('uses the mapped wordpress upstream for verified wordpress domains', async () => {
    (getDomainMapping as jest.Mock).mockResolvedValue({
      tenantId: 'org_andrews',
      targetType: 'wordpress_site',
      targetConfig: {
        upstreamUrl: 'https://mapped-wordpress.example.com',
      },
    });

    global.fetch = jest.fn().mockResolvedValue(
      new Response('mapped', {
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      })
    );

    const request = new NextRequest('http://localhost/api/wordpress/proxy?path=wp-json/posts', {
      headers: {
        host: 'www.andrews.com',
        'x-forwarded-proto': 'https',
      },
    });
    const response = await GET(request);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mapped-wordpress.example.com/wp-json/posts',
      expect.objectContaining({
        headers: expect.objectContaining({
          Host: 'mapped-wordpress.example.com',
          'X-Forwarded-Host': 'www.andrews.com',
          'X-Forwarded-Proto': 'https',
        }),
      })
    );
    await expect(response.text()).resolves.toBe('mapped');
  });
});
