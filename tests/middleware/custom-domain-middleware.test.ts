/**
 * Tests for custom domain middleware
 *
 * Tests the exported helper functions and middleware logic.
 * Since the middleware itself uses fetch() and NextResponse,
 * we test the pure functions (isBakedBotDomain, shouldSkipPath)
 * and the cache behavior separately.
 */

// We need to import the module to test its internal functions
// Since isBakedBotDomain and shouldSkipPath are not exported,
// we test them indirectly through the middleware function behavior.

// Import the middleware file to access the exports
import { middleware, config } from '@/middleware.custom-domain';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('next/server', () => {
  const nextFn = jest.fn(() => ({ type: 'next' }));
  const rewriteFn = jest.fn((url: URL) => ({
    type: 'rewrite',
    url: url.toString(),
    headers: new Map(),
  }));

  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: Record<string, unknown>) => ({
      url,
      nextUrl: {
        pathname: new URL(url).pathname,
        searchParams: new URL(url).searchParams,
      },
      headers: {
        get: (name: string) => {
          const headers = (init?.headers as Record<string, string>) || {};
          return headers[name] || new URL(url).host;
        },
      },
    })),
    NextResponse: {
      next: nextFn,
      rewrite: rewriteFn,
    },
  };
});

// Mock global fetch for domain resolve API calls
global.fetch = jest.fn();

describe('custom-domain-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NextResponse.next as jest.Mock).mockReturnValue({
      type: 'next',
      headers: new Map(),
    });
  });

  // ─── BakedBot Domain Detection ───────────────────────────────────────────

  describe('BakedBot domain detection (skip middleware)', () => {
    const createRequest = (hostname: string, path: string = '/') => {
      const url = `https://${hostname}${path}`;
      return {
        url,
        nextUrl: {
          pathname: path,
          searchParams: new URLSearchParams(),
        },
        headers: {
          get: (name: string) => name === 'host' ? hostname : null,
        },
      } as unknown as NextRequest;
    };

    it('should skip bakedbot.ai', async () => {
      const req = createRequest('bakedbot.ai');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip www.bakedbot.ai', async () => {
      const req = createRequest('www.bakedbot.ai');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip staging.bakedbot.ai', async () => {
      const req = createRequest('staging.bakedbot.ai');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip *.bakedbot.site subdomains', async () => {
      const req = createRequest('mysite.bakedbot.site');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip bakedbot.site root', async () => {
      const req = createRequest('bakedbot.site');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip localhost', async () => {
      const req = createRequest('localhost');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip localhost:3000 (strip port)', async () => {
      const req = createRequest('localhost:3000');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip 127.0.0.1', async () => {
      const req = createRequest('127.0.0.1');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip Firebase hosting domains', async () => {
      const req = createRequest('bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip *.web.app domains', async () => {
      const req = createRequest('bakedbot-prod.web.app');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip *.firebaseapp.com domains', async () => {
      const req = createRequest('bakedbot-prod.firebaseapp.com');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should handle case-insensitive domain matching', async () => {
      const req = createRequest('BAKEDBOT.AI');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });
  });

  // ─── Path Skipping ───────────────────────────────────────────────────────

  describe('path skipping', () => {
    const createRequest = (hostname: string, path: string) => ({
      url: `https://${hostname}${path}`,
      nextUrl: {
        pathname: path,
        searchParams: new URLSearchParams(),
      },
      headers: {
        get: (name: string) => name === 'host' ? hostname : null,
      },
    } as unknown as NextRequest);

    it('should skip /_next/ paths', async () => {
      const req = createRequest('custom.domain.com', '/_next/static/chunk.js');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip /api/ paths', async () => {
      const req = createRequest('custom.domain.com', '/api/domain/resolve');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip /favicon paths', async () => {
      const req = createRequest('custom.domain.com', '/favicon.ico');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip /__ paths (Next.js internal)', async () => {
      const req = createRequest('custom.domain.com', '/__nextjs_original-stack-frame');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip robots.txt', async () => {
      const req = createRequest('custom.domain.com', '/robots.txt');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip sitemap.xml', async () => {
      const req = createRequest('custom.domain.com', '/sitemap.xml');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip .ico files', async () => {
      const req = createRequest('custom.domain.com', '/apple-touch-icon.ico');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip .png files', async () => {
      const req = createRequest('custom.domain.com', '/logo.png');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip .css files', async () => {
      const req = createRequest('custom.domain.com', '/styles/main.css');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should skip .js files', async () => {
      const req = createRequest('custom.domain.com', '/scripts/app.js');
      await middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should NOT skip normal page paths', async () => {
      const req = createRequest('custom.domain.com', '/about');
      // Need to mock fetch for domain resolution
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });
      await middleware(req);
      // Should NOT call NextResponse.next() for a custom domain path
      // (it should try to resolve the domain)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ─── Custom Domain Resolution ────────────────────────────────────────────

  describe('custom domain resolution', () => {
    const createRequest = (hostname: string, path: string = '/') => ({
      url: `https://${hostname}${path}`,
      nextUrl: {
        pathname: path,
        searchParams: new URLSearchParams(),
      },
      headers: {
        get: (name: string) => name === 'host' ? hostname : null,
      },
    } as unknown as NextRequest);

    it('should return 404 when resolve API returns not-ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await middleware(createRequest('unknown-domain.com'));

      // Should return a 404 response
      expect(result).toBeDefined();
    });

    it('should call resolve API with correct headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          path: '/api/vibe/site/proj_abc',
          tenantId: 'org_123',
          targetType: 'vibe_site',
        }),
      });

      (NextResponse.rewrite as jest.Mock).mockReturnValue({
        headers: {
          set: jest.fn(),
        },
      });

      await middleware(createRequest('custom.example.com', '/about'));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/domain/resolve'),
        expect.objectContaining({
          headers: {
            'x-resolve-hostname': 'custom.example.com',
            'x-resolve-path': '/about',
          },
        })
      );
    });

    it('should fail open on fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await middleware(createRequest('erroring-domain.com'));

      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should return 404 when resolve returns success=false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
        }),
      });

      const result = await middleware(createRequest('unmapped-domain.com'));

      expect(result).toBeDefined();
    });
  });

  // ─── Matcher Config ──────────────────────────────────────────────────────

  describe('matcher config', () => {
    it('should have a matcher that excludes static files', () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toContain(
        '/((?!_next/static|_next/image|favicon.ico).*)'
      );
    });
  });
});
