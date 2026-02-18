/**
 * Cron Endpoint: Process Playbook Retries
 *
 * Triggered by Cloud Scheduler every 5 minutes
 * Processes pending webhook retries with exponential backoff
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPendingRetries, getRetryStats } from '@/server/services/webhook-retry-processor';
import { logger } from '@/lib/logger';

export const maxDuration = 60; // 60 second timeout

/**
 * Verify CRON_SECRET header
 */
function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;

  if (!secret || !expected) {
    return false;
  }

  return secret === expected;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      logger.warn('[PlaybookRetriesCron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[PlaybookRetriesCron] Starting retry processing');

    // Process pending retries
    const result = await processPendingRetries();

    // Get updated stats
    const stats = await getRetryStats();

    logger.info('[PlaybookRetriesCron] Retry processing complete', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      stats,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[PlaybookRetriesCron] Error processing retries', {
      error: error.message,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
