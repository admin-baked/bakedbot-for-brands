/**
 * Cron Endpoint: Daily Analytics Rollup
 *
 * Recalculates trending metrics for all products across all organizations.
 * Scheduled to run daily at 3 AM UTC via Cloud Scheduler.
 *
 * Endpoint: POST /api/cron/analytics-rollup
 * Auth: CRON_SECRET header required
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@google-cloud/firestore';
import { runAnalyticsRollup } from '@/server/services/order-analytics';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!CRON_SECRET || bearerToken !== CRON_SECRET) {
    logger.warn('[CRON] Unauthorized analytics rollup attempt', {
      ip: request.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('[CRON] Starting analytics rollup');

    const db = getFirestore();

    // Get all organizations (from users collection)
    const usersSnapshot = await db.collection('users').get();
    const orgIds = new Set<string>();

    usersSnapshot.docs.forEach(doc => {
      const orgId = doc.data().orgId;
      if (orgId) orgIds.add(orgId);
    });

    const orgList = Array.from(orgIds);
    logger.info('[CRON] Found orgs to process', { count: orgList.length });

    // Run rollup for each org
    let successCount = 0;
    let failureCount = 0;

    for (const orgId of orgList) {
      try {
        await runAnalyticsRollup(orgId);
        successCount++;
      } catch (error) {
        logger.error('[CRON] Rollup failed for org', {
          orgId,
          error: error instanceof Error ? error.message : String(error),
        });
        failureCount++;
      }
    }

    logger.info('[CRON] Rollup completed', {
      successful: successCount,
      failed: failureCount,
    });

    return NextResponse.json({
      success: true,
      message: 'Analytics rollup completed',
      results: {
        orgsProcessed: orgList.length,
        successful: successCount,
        failed: failureCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[CRON] Analytics rollup error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also accept GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
