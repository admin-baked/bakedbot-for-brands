import { NextRequest, NextResponse } from 'next/server';
import { getDomainMapping } from '@/lib/domain-routing';
import { logger } from '@/lib/logger';

const INTERNAL_HOST_SUFFIXES = [
  '.run.app',
  '.hosted.app',
  '.web.app',
  '.firebaseapp.com',
  '.appspot.com',
];
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const PASSTHROUGH_RESPONSE_HEADERS = new Set([
  'content-type',
  'cache-control',
  'set-cookie',
  'link',
  'location',
]);
const PASSTHROUGH_REQUEST_HEADERS = new Set([
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
]);

function normalizeProxyPath(path: string): string {
  return path
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
    .join('/');
}

function normalizeUpstreamWordPressPath(path: string): string {
  if (path === 'wp-admin') {
    return 'wp-admin/';
  }

  return path;
}

function normalizePublicWordPressPath(pathname: string): string {
  if (pathname === '/wp-admin/') {
    return '/wp-admin';
  }

  return pathname;
}

function resolveTargetUrl(configuredTarget: string, override: string | null): { ok: true; targetUrl: string } | { ok: false; response: NextResponse } {
  if (!override) {
    return { ok: true, targetUrl: configuredTarget };
  }

  try {
    const configuredOrigin = new URL(configuredTarget).origin;
    const overrideUrl = new URL(override);

    if (overrideUrl.origin !== configuredOrigin) {
      logger.warn('[WordPress Proxy] Rejected wpUrl override', {
        requestedOrigin: overrideUrl.origin,
        allowedOrigin: configuredOrigin,
      });
      return {
        ok: false,
        response: NextResponse.json({ error: 'Invalid WordPress target.' }, { status: 400 }),
      };
    }

    return { ok: true, targetUrl: overrideUrl.toString().replace(/\/+$/, '') };
  } catch (error) {
    logger.warn('[WordPress Proxy] Invalid wpUrl override', {
      override,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid WordPress target.' }, { status: 400 }),
    };
  }
}

function stripPort(hostname: string | null): string {
  return (hostname || '').replace(/:\d+$/, '').toLowerCase();
}

function isInternalHostingHostname(hostname: string): boolean {
  return INTERNAL_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix));
}

function normalizeHostname(request: NextRequest): string {
  const host = stripPort(request.headers.get('host'));
  const forwardedHost = stripPort(request.headers.get('x-forwarded-host'));

  if (host && !isInternalHostingHostname(host)) {
    return host;
  }

  if (forwardedHost && !isInternalHostingHostname(forwardedHost)) {
    return forwardedHost;
  }

  return host || forwardedHost;
}

function getForwardedWordPressPath(request: NextRequest): string {
  const headerPath = request.headers.get('x-bb-wordpress-path') || '';
  return normalizeProxyPath(headerPath);
}

function buildUpstreamQueryString(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  const upstreamSearchParams = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (key === 'path' || key === 'wpUrl') {
      continue;
    }
    upstreamSearchParams.append(key, value);
  }

  if (upstreamSearchParams.toString()) {
    return upstreamSearchParams.toString();
  }

  return request.headers.get('x-bb-wordpress-query') || '';
}

function rewriteLocationHeader(
  location: string,
  targetUrl: string,
  publicHostname: string,
  protocol: string
): string {
  if (!location || !publicHostname) {
    return location;
  }

  try {
    const targetOrigin = new URL(targetUrl).origin;
    const parsedLocation = new URL(location, `${targetOrigin}/`);

    if (
      parsedLocation.origin !== targetOrigin
      && !isInternalHostingHostname(parsedLocation.hostname.toLowerCase())
    ) {
      return location;
    }

    const publicUrl = new URL(
      `${parsedLocation.pathname}${parsedLocation.search}${parsedLocation.hash}`,
      `${protocol}://${publicHostname}/`
    );
    publicUrl.pathname = normalizePublicWordPressPath(publicUrl.pathname);
    return publicUrl.toString();
  } catch {
    return location;
  }
}

async function resolveMappedWordPressTarget(request: NextRequest): Promise<string | null> {
  const hostname = normalizeHostname(request);
  if (!hostname) return null;

  const mapping = await getDomainMapping(hostname);
  if (mapping?.targetType !== 'wordpress_site') {
    return null;
  }

  const upstreamUrl = mapping.targetConfig?.upstreamUrl?.trim();
  if (!upstreamUrl) {
    logger.error('[WordPress Proxy] Domain mapping missing upstreamUrl', { hostname });
    return null;
  }

  return upstreamUrl;
}

async function handleProxyRequest(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = normalizeProxyPath(searchParams.get('path') || '') || getForwardedWordPressPath(request);
  const upstreamQueryString = buildUpstreamQueryString(request);
  const publicHostname = normalizeHostname(request);
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const mappedTarget = await resolveMappedWordPressTarget(request);
  let targetUrl = mappedTarget;

  if (!targetUrl) {
    const configuredTarget = process.env.ANDREWS_WP_URL?.trim();

    if (!configuredTarget) {
      logger.error('[WordPress Proxy] No mapped WordPress target or ANDREWS_WP_URL configured', {
        hostname: publicHostname,
      });
      return NextResponse.json({ error: 'WordPress proxy is not configured.' }, { status: 500 });
    }

    const targetResult = resolveTargetUrl(configuredTarget, searchParams.get('wpUrl'));
    if (!targetResult.ok) {
      return targetResult.response;
    }

    targetUrl = targetResult.targetUrl;
  }

  const fullUrl = new URL(
    normalizeUpstreamWordPressPath(path || ''),
    `${targetUrl.replace(/\/+$/, '')}/`
  );
  if (upstreamQueryString) {
    fullUrl.search = upstreamQueryString;
  }
  logger.info('[WordPress Proxy] Proxying request', {
    path,
    targetOrigin: new URL(targetUrl).origin,
  });

  const upstreamHeaders: Record<string, string> = {
    Host: new URL(targetUrl).hostname,
    'User-Agent': request.headers.get('user-agent') || '',
    Accept: request.headers.get('accept') || '*/*',
    'X-Forwarded-Host': publicHostname,
    'X-Forwarded-Proto': protocol,
  };

  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (!PASSTHROUGH_REQUEST_HEADERS.has(lowerKey)) {
      continue;
    }
    if (lowerKey === 'accept') {
      continue;
    }
    upstreamHeaders[key] = value;
  }

  try {
    const requestBody = (
      request.method === 'GET'
      || request.method === 'HEAD'
    )
      ? undefined
      : await request.arrayBuffer();

    const response = await fetch(fullUrl.toString(), {
      method: request.method,
      redirect: 'manual',
      headers: upstreamHeaders,
      body: requestBody,
    });

    logger.info('[WordPress Proxy] Received response', {
      status: response.status,
      path,
    });

    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.startsWith('x-nextjs-')
        || HOP_BY_HOP_HEADERS.has(lowerKey)
        || !PASSTHROUGH_RESPONSE_HEADERS.has(lowerKey)
      ) {
        continue;
      }

      if (lowerKey === 'location') {
        headers.set(key, rewriteLocationHeader(value, targetUrl, publicHostname, protocol));
        continue;
      }

      headers.set(key, value);
    }

    const shouldOmitBody = (
      request.method === 'HEAD'
      || (response.status >= 300 && response.status < 400)
      || response.status === 204
      || response.status === 304
    );

    return new Response(shouldOmitBody ? null : response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    logger.error('[WordPress Proxy] Failed to fetch WordPress', {
      path,
      fullUrl: fullUrl.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch WordPress.' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request);
}
