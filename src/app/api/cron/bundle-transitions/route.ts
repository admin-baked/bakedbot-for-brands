/**
 * Bundle Transitions Cron Job
 *
 * Runs every 5 minutes to:
 * - Activate scheduled bundles when startDate arrives
 * - Expire active bundles when endDate passes
 * - Expire bundles when maxRedemptions reached
 * - Check time window constraints (daysOfWeek, timeStart/timeEnd)
 *
 * Cloud Scheduler config:
 * - Schedule: every 5 minutes
 * - URL: https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/bundle-transitions
 * - Method: POST
 * - Headers: Authorization: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { BundleSchedulerService } from '@/server/services/bundle-scheduler';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('[Cron] Bundle transitions job started');

    // 1. Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized bundle transitions attempt', {
        authHeader: authHeader ? 'present' : 'missing',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Run bundle scheduler
    const scheduler = new BundleSchedulerService();
    const result = await scheduler.transitionBundles();

    const duration = Date.now() - startTime;

    logger.info('[Cron] Bundle transitions job completed', {
      success: result.success,
      transitions: result.transitionsPerformed.length,
      errors: result.errors.length,
      duration,
    });

    // Return detailed result
    return NextResponse.json({
      success: result.success,
      jobDuration: duration,
      schedulerDuration: result.duration,
      transitions: result.transitionsPerformed,
      errors: result.errors,
      summary: {
        transitionsPerformed: result.transitionsPerformed.length,
        errorsEncountered: result.errors.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error('[Cron] Bundle transitions job failed', {
      error: errorMsg,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Bundle transitions job failed',
        details: errorMsg,
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual trigger (testing/debugging)
 * Requires query param ?secret=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('[Cron] Manual bundle transitions trigger');

    const scheduler = new BundleSchedulerService();
    const result = await scheduler.transitionBundles();

    return NextResponse.json({
      success: result.success,
      transitions: result.transitionsPerformed,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error('[Cron] Manual trigger failed', { error: errorMsg });

    return NextResponse.json(
      { error: 'Manual trigger failed', details: errorMsg },
      { status: 500 }
    );
  }
}
