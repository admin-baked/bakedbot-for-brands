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
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid cron request
    // Support two auth methods:
    // 1. OIDC service account (preferred for Cloud Scheduler)
    // 2. CRON_SECRET (fallback/manual trigger)
    const authHeader = request.headers.get('authorization');

    // Check CRON_SECRET as fallback auth method
    const cronAuthError = await requireCronSecret(request, 'COLLECT_METRICS');

    // If CRON_SECRET check failed and no OIDC header present, reject in production
    if (cronAuthError && !authHeader && process.env.NODE_ENV === 'production') {
      return cronAuthError;
    }

    logger.info('[COLLECT_METRICS] Starting system metrics collection');

    // Collect and store current metrics
    await collectAndStoreMetrics();

    // Every hour (at :00 minutes), also run cleanup
    const now = new Date();
    if (now.getMinutes() === 0) {
      logger.info('[COLLECT_METRICS] Running metrics cleanup');
      await cleanupOldMetrics();
    }

    return NextResponse.json({
      success: true,
      message: 'Metrics collected successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[COLLECT_METRICS] Failed to collect metrics', { error });
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

