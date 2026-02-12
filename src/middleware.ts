/**
 * Next.js Middleware - Custom Domain Routing
 *
 * Intercepts requests from custom domains and rewrites them
 * to the appropriate content (menu, Vibe site, or hybrid).
 *
 * Runs on Edge Runtime - cannot use Node.js Firestore directly.
 * Delegates domain resolution to /api/domain/resolve.
 */

import { NextRequest, NextResponse } from 'next/server';

/** Domains owned by BakedBot that should NOT be intercepted */
const BAKEDBOT_DOMAINS = [
  'bakedbot.ai',
  'www.bakedbot.ai',
  'bakedbot.site',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
];

/** In-memory edge cache for domain resolutions */
const domainResolveCache = new Map<string, { data: DomainResolveResult; expiry: number }>();
const EDGE_CACHE_TTL = 60_000; // 1 minute

interface DomainResolveResult {
  success: boolean;
  tenantId?: string;
  targetType?: 'menu' | 'vibe_site' | 'hybrid';
  targetId?: string;
  path?: string;
}

function getCachedResolve(domain: string): DomainResolveResult | null {
  const entry = domainResolveCache.get(domain);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    domainResolveCache.delete(domain);
    return null;
  }
  return entry.data;
}

function setCachedResolve(domain: string, data: DomainResolveResult): void {
  // Prune if too large
  if (domainResolveCache.size > 500) {
    const keys = Array.from(domainResolveCache.keys()).slice(0, 100);
    keys.forEach(k => domainResolveCache.delete(k));
  }
  domainResolveCache.set(domain, { data, expiry: Date.now() + EDGE_CACHE_TTL });
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.replace(/:\d+$/, '') || '';

  // Skip BakedBot-owned domains and subdomains
  if (isBakedBotDomain(hostname)) {
    return NextResponse.next();
  }

  // Skip internal paths that should never be intercepted
  const pathname = request.nextUrl.pathname;
  if (shouldSkipPath(pathname)) {
    return NextResponse.next();
  }

  // This is a custom domain request - resolve it
  try {
    // Check edge cache first
    const cacheKey = `${hostname}:${pathname}`;
    let resolveResult = getCachedResolve(cacheKey);

    if (!resolveResult) {
      // Call the domain resolve API
      const resolveUrl = new URL('/api/domain/resolve', request.url);
      const resolveResponse = await fetch(resolveUrl.toString(), {
        headers: {
          'x-resolve-hostname': hostname,
          'x-resolve-path': pathname,
        },
      });

      if (!resolveResponse.ok) {
        return new NextResponse('Domain not configured', { status: 404 });
      }

      resolveResult = await resolveResponse.json() as DomainResolveResult;
      setCachedResolve(cacheKey, resolveResult);
    }

    if (!resolveResult.success || !resolveResult.path) {
      return new NextResponse('Domain not configured', { status: 404 });
    }

    // Rewrite the request to the resolved path
    const rewriteUrl = new URL(resolveResult.path, request.url);

    // Preserve query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      rewriteUrl.searchParams.set(key, value);
    });

    const response = NextResponse.rewrite(rewriteUrl);

    // Set headers for downstream use
    response.headers.set('x-custom-domain', hostname);
    if (resolveResult.tenantId) {
      response.headers.set('x-tenant-id', resolveResult.tenantId);
    }
    if (resolveResult.targetType) {
      response.headers.set('x-domain-target', resolveResult.targetType);
    }

    return response;
  } catch {
    // On error, let the request through (fail open)
    return NextResponse.next();
  }
}

function isBakedBotDomain(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  // Exact match
  if (BAKEDBOT_DOMAINS.includes(normalized)) return true;

  // Subdomain of bakedbot.ai (e.g. staging.bakedbot.ai)
  if (normalized.endsWith('.bakedbot.ai')) return true;

  // Subdomain of bakedbot.site (published vibe sites)
  if (normalized.endsWith('.bakedbot.site')) return true;

  // Firebase/GCP hosting domains
  if (normalized.includes('.web.app') || normalized.includes('.firebaseapp.com')) return true;
  if (normalized.includes('.hosted.app')) return true;

  return false;
}

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/__') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
