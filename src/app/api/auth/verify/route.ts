/**
 * Auth Verify API Route
 *
 * GET /api/auth/verify - Verify authentication token and super user status
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/auth/verify - Verify token and check if user is a Super User
 */
export async function GET() {
  try {
    const session = await requireSuperUser();

    return NextResponse.json(
      {
        success: true,
        isSuperUser: true,
        userId: session.uid,
        email: session.email,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Auth verification failed', { error });
    return NextResponse.json(
      {
        success: false,
        isSuperUser: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 401, headers: corsHeaders }
    );
  }
}
