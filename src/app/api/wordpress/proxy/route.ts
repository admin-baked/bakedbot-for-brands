import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = normalizeProxyPath(searchParams.get('path') || '');
  const configuredTarget = process.env.ANDREWS_WP_URL?.trim();

  if (!configuredTarget) {
    logger.error('[WordPress Proxy] ANDREWS_WP_URL is not configured');
    return NextResponse.json({ error: 'WordPress proxy is not configured.' }, { status: 500 });
  }

  const targetResult = resolveTargetUrl(configuredTarget, searchParams.get('wpUrl'));
  if (!targetResult.ok) {
    return targetResult.response;
  }

  const fullUrl = new URL(path || '', `${targetResult.targetUrl.replace(/\/+$/, '')}/`).toString();
  logger.info('[WordPress Proxy] Proxying request', {
    path,
    targetOrigin: new URL(targetResult.targetUrl).origin,
  });

  try {
    const response = await fetch(fullUrl, {
      method: request.method,
      headers: {
        Host: new URL(targetResult.targetUrl).hostname,
        'User-Agent': request.headers.get('user-agent') || '',
        Accept: '*/*',
      },
    });

    logger.info('[WordPress Proxy] Received response', {
      status: response.status,
      path,
    });

    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (!key.toLowerCase().startsWith('x-nextjs-')) {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
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
