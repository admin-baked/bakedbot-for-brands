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
const TEXTUAL_CONTENT_TYPE_PATTERN = /^(text\/|application\/(?:json|javascript|xml|xhtml\+xml)|image\/svg\+xml)/i;

function normalizeProxyPath(path: string): string {
  return path
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
    .join('/');
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
    const parsedLocation = new URL(location);
    const targetOrigin = new URL(targetUrl).origin;

    if (
      parsedLocation.origin !== targetOrigin
      && !isInternalHostingHostname(parsedLocation.hostname.toLowerCase())
    ) {
      return location;
    }

    return new URL(
      `${parsedLocation.pathname}${parsedLocation.search}${parsedLocation.hash}`,
      `${protocol}://${publicHostname}/`
    ).toString();
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = normalizeProxyPath(searchParams.get('path') || '');
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

  const fullUrl = new URL(path || '', `${targetUrl.replace(/\/+$/, '')}/`).toString();
  logger.info('[WordPress Proxy] Proxying request', {
    path,
    targetOrigin: new URL(targetUrl).origin,
  });

  try {
    const response = await fetch(fullUrl, {
      method: request.method,
      redirect: 'manual',
      headers: {
        Host: new URL(targetUrl).hostname,
        'User-Agent': request.headers.get('user-agent') || '',
        Accept: '*/*',
        'X-Forwarded-Host': publicHostname,
        'X-Forwarded-Proto': protocol,
      },
    });

    logger.info('[WordPress Proxy] Received response', {
      status: response.status,
      path,
    });

    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith('x-nextjs-') || HOP_BY_HOP_HEADERS.has(lowerKey)) {
        continue;
      }

      if (lowerKey === 'location') {
        headers.set(key, rewriteLocationHeader(value, targetUrl, publicHostname, protocol));
        continue;
      }

      headers.set(key, value);
    }

    const responseContentType = response.headers.get('content-type') || '';
    const responseBody = (
      request.method === 'HEAD'
      || (response.status >= 300 && response.status < 400)
      || response.status === 204
      || response.status === 304
    )
      ? null
      : TEXTUAL_CONTENT_TYPE_PATTERN.test(responseContentType)
        ? await response.text()
        : await response.blob();

    return new NextResponse(responseBody, {
      status: response.status,
      headers,
    });
  } catch (error) {
    logger.error('[WordPress Proxy] Failed to fetch WordPress', {
      path,
      fullUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to fetch WordPress.' }, { status: 502 });
  }
}
