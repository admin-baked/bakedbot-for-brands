/**
 * Stop Recording API Route
 *
 * POST /api/browser/recording/[recordingId]/stop - Stop recording
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
 * POST /api/browser/recording/[recordingId]/stop - Stop and save recording
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await params;
    await requireSuperUser();

    const workflow = await workflowRecorder.stopRecording(recordingId);

    return NextResponse.json(
      { success: true, data: workflow },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to stop recording', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to stop recording' },
      { status: 500, headers: corsHeaders }
    );
  }
}
