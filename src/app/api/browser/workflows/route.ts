/**
 * Workflows API Route
 *
 * GET /api/browser/workflows - List workflows
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { workflowRecorder } from '@/server/services/browser-automation';
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
 * GET /api/browser/workflows - List all workflows
 */
export async function GET() {
  try {
    const session = await requireSuperUser();
    const workflows = await workflowRecorder.listWorkflows(session.uid);

    return NextResponse.json(
      { success: true, data: workflows },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to list workflows', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list workflows' },
      { status: 500, headers: corsHeaders }
    );
  }
}
