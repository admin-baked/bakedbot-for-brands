/**
 * Start Recording API Route
 *
 * POST /api/browser/recording/start - Start workflow recording
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
 * POST /api/browser/recording/start - Start recording a workflow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperUser();
    const { name, description } = await request.json();

    // Get active browser session if any
    const browserSession = await browserSessionManager.getActiveSession(session.uid);

    const recording = await workflowRecorder.startRecording(
      session.uid,
      name || `Recording ${new Date().toLocaleString()}`,
      description,
      browserSession?.id
    );

    return NextResponse.json(
      { success: true, data: recording },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to start recording', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start recording' },
      { status: 500, headers: corsHeaders }
    );
  }
}
