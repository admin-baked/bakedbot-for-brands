/**
 * Permission Check API Route
 *
 * GET /api/browser/permission/check - Check permission for domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { permissionGuard } from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';
import type { AllowedAction } from '@/types/browser-automation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/browser/permission/check - Check permission for domain/action
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperUser();
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const action = searchParams.get('action') as AllowedAction;

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await permissionGuard.checkPermission(
      session.uid,
      `https://${domain}`,
      action || 'navigate'
    );

    return NextResponse.json(
      { success: true, ...result },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to check permission', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check permission' },
      { status: 500, headers: corsHeaders }
    );
  }
}
