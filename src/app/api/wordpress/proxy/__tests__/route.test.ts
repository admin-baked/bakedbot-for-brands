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
  NextResponse: class extends Response {
    static json(data: unknown, init?: { status?: number }) {
      return new Response(JSON.stringify(data), {
        status: init?.status || 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }
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
          'transfer-encoding': 'chunked',
        },
      })
    );

    const request = new NextRequest('http://localhost/api/wordpress/proxy?path=wp-json/posts');
    const response = await GET(request);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://andrews-wp.example.com/wp-json/posts',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        headers: expect.objectContaining({
          Host: 'andrews-wp.example.com',
          Accept: '*/*',
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(response.headers.get('x-nextjs-cache')).toBeNull();
    expect(response.headers.get('transfer-encoding')).toBeNull();
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
        redirect: 'manual',
        headers: expect.objectContaining({
          Host: 'mapped-wordpress.example.com',
          'X-Forwarded-Host': 'www.andrews.com',
          'X-Forwarded-Proto': 'https',
        }),
      })
    );
    await expect(response.text()).resolves.toBe('mapped');
  });

  it('prefers the public host over an internal forwarded host', async () => {
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

    const request = new NextRequest('https://andrewsdevelopments.bakedbot.ai/api/wordpress/proxy', {
      headers: {
        host: 'andrewsdevelopments.bakedbot.ai',
        'x-forwarded-host': 't-3016106336---bakedbot-prod-lo74oftdza-uc.a.run.app',
        'x-forwarded-proto': 'https',
      },
    });
    await GET(request);

    expect(getDomainMapping).toHaveBeenCalledWith('andrewsdevelopments.bakedbot.ai');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mapped-wordpress.example.com/',
      expect.objectContaining({
        redirect: 'manual',
        headers: expect.objectContaining({
          'X-Forwarded-Host': 'andrewsdevelopments.bakedbot.ai',
          'X-Forwarded-Proto': 'https',
        }),
      })
    );
  });

  it('rewrites upstream absolute redirects back onto the public host', async () => {
    (getDomainMapping as jest.Mock).mockResolvedValue({
      tenantId: 'org_andrews',
      targetType: 'wordpress_site',
      targetConfig: {
        upstreamUrl: 'https://mapped-wordpress.example.com',
      },
    });

    global.fetch = jest.fn().mockResolvedValue(
      new Response(null, {
        status: 301,
        headers: {
          location: 'https://t-3016106336---bakedbot-prod-lo74oftdza-uc.a.run.app/wp-admin',
        },
      })
    );

    const request = new NextRequest('https://andrewsdevelopments.bakedbot.ai/api/wordpress/proxy', {
      headers: {
        host: 'andrewsdevelopments.bakedbot.ai',
        'x-forwarded-host': 't-3016106336---bakedbot-prod-lo74oftdza-uc.a.run.app',
        'x-forwarded-proto': 'https',
      },
    });
    const response = await GET(request);

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://andrewsdevelopments.bakedbot.ai/wp-admin');
  });
});
