/**
 * Run Workflow API Route
 *
 * POST /api/browser/workflow/[workflowId]/run - Run a workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { workflowRecorder, browserSessionManager } from '@/server/services/browser-automation';
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
 * POST /api/browser/workflow/[workflowId]/run - Run a workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;
    const session = await requireSuperUser();
    const { variables } = await request.json().catch(() => ({}));

    // Get or create browser session
    let browserSession = await browserSessionManager.getActiveSession(session.uid);

    if (!browserSession) {
      const result = await browserSessionManager.createSession(session.uid, {
        taskDescription: `Running workflow: ${workflowId}`,
      });
      if (!result.success || !result.data) {
        const error = result.error || 'Failed to create session';
        // Return 503 if no devices are available
        const status = error.includes('No available devices') ? 503 : 500;

        return NextResponse.json(
          { success: false, error },
          { status, headers: corsHeaders }
        );
      }
      browserSession = result.data;
    }

    const result = await workflowRecorder.runWorkflow(
      workflowId,
      browserSession.id,
      variables
    );

    if (!result.success) {
      const error = result.error || 'Workflow failed';
      let status = 400; // Default to Bad Request for execution failures

      if (error === 'Workflow not found') {
        status = 404;
      }

      return NextResponse.json(
        { success: false, error },
        { status, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: result.success, data: result, error: result.error },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to run workflow', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run workflow' },
      { status: 500, headers: corsHeaders }
    );
  }
}
