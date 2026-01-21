/**
 * Active Recording API Route
 *
 * GET /api/browser/recording/active - Get active recording
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
 * GET /api/browser/recording/active - Get active recording session
 */
export async function GET() {
  try {
    const session = await requireSuperUser();
    const recording = await workflowRecorder.getActiveRecording(session.uid);

    return NextResponse.json(
      { success: true, data: recording },
      { headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Failed to get active recording', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get recording' },
      { status: 500, headers: corsHeaders }
    );
  }
}
