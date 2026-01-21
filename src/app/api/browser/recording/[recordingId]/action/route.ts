/**
 * Record Action API Route
 *
 * POST /api/browser/recording/[recordingId]/action - Record an action
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { workflowRecorder } from '@/server/services/browser-automation';
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
 * POST /api/browser/recording/[recordingId]/action - Record a browser action
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await params;
    await requireSuperUser();

    const action = await request.json();

    await workflowRecorder.recordAction(recordingId, action);

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to record action', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record action' },
      { status: 500, headers: corsHeaders }
    );
  }
}
