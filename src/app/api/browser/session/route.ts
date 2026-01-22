/**
 * Browser Session API Routes
 *
 * POST /api/browser/session - Create new session
 * GET /api/browser/session/active - Get active session
 *
 * SECURITY: Uses restricted CORS instead of wildcard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { browserSessionManager } from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';

/**
 * Get allowed CORS origins from environment or defaults.
 * SECURITY: Restrict CORS to known trusted origins instead of '*'.
 */
function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://bakedbot.ai,chrome-extension://')
    .split(',')
    .map(o => o.trim());

  // Check if the request origin matches any allowed origin
  if (origin) {
    for (const allowed of allowedOrigins) {
      // Exact match or prefix match for chrome extensions
      if (origin === allowed || (allowed.startsWith('chrome-extension://') && origin.startsWith('chrome-extension://'))) {
        return origin;
      }
    }
  }

  // Default to primary origin if no match (will cause CORS error for unauthorized origins)
  return allowedOrigins[0] || 'https://bakedbot.ai';
}

function getCorsHeaders(request: NextRequest) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

/**
 * POST /api/browser/session - Create a new browser session
 */
export async function POST(request: NextRequest) {
  const headers = getCorsHeaders(request);
  try {
    const session = await requireSuperUser();
    const body = await request.json().catch(() => ({}));

    const result = await browserSessionManager.createSession(session.uid, body);

    return NextResponse.json(result, { headers });
  } catch (error) {
    logger.error('Failed to create browser session', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500, headers }
    );
  }
}

/**
 * GET /api/browser/session - Get active session
 */
export async function GET(request: NextRequest) {
  const headers = getCorsHeaders(request);
  try {
    const session = await requireSuperUser();
    const browserSession = await browserSessionManager.getActiveSession(session.uid);

    return NextResponse.json(
      { success: true, data: browserSession },
      { headers }
    );
  } catch (error) {
    logger.error('Failed to get active session', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500, headers }
    );
  }
}
