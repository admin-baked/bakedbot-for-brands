/**
 * Workflow API Route
 *
 * GET /api/browser/workflow/[workflowId] - Get workflow
 */

import { NextRequest, NextResponse } from 'next/server';
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
 * GET /api/browser/workflow/[workflowId] - Get workflow by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;
    await requireSuperUser();

    const workflow = await workflowRecorder.getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: workflow },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to get workflow', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get workflow' },
      { status: 500, headers: corsHeaders }
    );
  }
}
