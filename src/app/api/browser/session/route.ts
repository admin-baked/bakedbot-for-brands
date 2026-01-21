/**
 * Browser Session API Routes
 *
 * POST /api/browser/session - Create new session
 * GET /api/browser/session/active - Get active session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { browserSessionManager } from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/browser/session - Create a new browser session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperUser();
    const body = await request.json().catch(() => ({}));

    const result = await browserSessionManager.createSession(session.uid, body);

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    logger.error('Failed to create browser session', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/browser/session - Get active session
 */
export async function GET() {
  try {
    const session = await requireSuperUser();
    const browserSession = await browserSessionManager.getActiveSession(session.uid);

    return NextResponse.json(
      { success: true, data: browserSession },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to get active session', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500, headers: corsHeaders }
    );
  }
}
