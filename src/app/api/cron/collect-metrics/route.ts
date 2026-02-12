/**
 * System Metrics Collection Cron Job
 *
 * Endpoint: /api/cron/collect-metrics
 * Schedule: Every 15 minutes
 * Purpose: Collect and store system health metrics for historical tracking
 *
 * Cloud Scheduler Setup:
 * gcloud scheduler jobs create http collect-metrics-cron \
 *   --schedule="every 15 minutes" \
 *   --uri="https://bakedbot.ai/api/cron/collect-metrics" \
 *   --http-method=POST \
 *   --oidc-service-account-email=firebase-adminsdk-xxxxx@studio-567050101-bc6e8.iam.gserviceaccount.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectAndStoreMetrics, cleanupOldMetrics } from '@/server/services/metrics-collector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid cron request
    // In production, verify the Cloud Scheduler auth header
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && !authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing auth header' },
        { status: 401 }
      );
    }

    console.log('[Cron] Collecting system metrics...');

    // Collect and store current metrics
    await collectAndStoreMetrics();

    // Every hour (at :00 minutes), also run cleanup
    const now = new Date();
    if (now.getMinutes() === 0) {
      console.log('[Cron] Running metrics cleanup...');
      await cleanupOldMetrics();
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics collected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Failed to collect metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow manual trigger via GET (dev only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Manual trigger disabled in production' },
      { status: 403 }
    );
  }

  try {
    await collectAndStoreMetrics();
    return NextResponse.json({
      success: true,
      message: 'Metrics collected (manual trigger)',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

