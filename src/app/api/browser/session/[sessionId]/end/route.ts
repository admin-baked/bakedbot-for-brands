/**
 * End Browser Session API Route
 *
 * POST /api/browser/session/[sessionId]/end - End a session
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { browserSessionManager } from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/browser/session/[sessionId]/end - End a browser session
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    await requireSuperUser();

    const result = await browserSessionManager.endSession(sessionId);
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    logger.error('Failed to end browser session', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to end session' },
      { status: 500, headers: corsHeaders }
    );
  }
}
