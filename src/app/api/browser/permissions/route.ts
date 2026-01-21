/**
 * Permissions List API Route
 *
 * GET /api/browser/permissions - List all permissions
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { permissionGuard } from '@/server/services/browser-automation';
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
 * GET /api/browser/permissions - List all site permissions
 */
export async function GET() {
  try {
    const session = await requireSuperUser();
    const permissions = await permissionGuard.listPermissions(session.uid);

    return NextResponse.json(
      { success: true, data: permissions },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to list permissions', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list permissions' },
      { status: 500, headers: corsHeaders }
    );
  }
}
