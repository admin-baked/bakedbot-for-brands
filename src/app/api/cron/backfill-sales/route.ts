/**
 * Endpoint: Backfill Sales Analytics
 *
 * Populates historical sales data from orders into product metrics.
 * One-time operation to initialize salesCount, salesVelocity, and trending.
 *
 * Endpoint: POST /api/cron/backfill-sales
 * Query params: orgId, days (default 90)
 * Auth: CRON_SECRET header required
 */

import { NextRequest, NextResponse } from 'next/server';
import { backfillHistoricalSalesData } from '@/server/services/order-analytics';
import { logger } from '@/lib/logger';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!CRON_SECRET || bearerToken !== CRON_SECRET) {
    logger.warn('[BACKFILL] Unauthorized backfill attempt', {
      ip: request.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const days = searchParams.get('days');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter required' },
        { status: 400 }
      );
    }

    const lookbackDays = parseInt(days || '90', 10);
    if (isNaN(lookbackDays) || lookbackDays < 1) {
      return NextResponse.json(
        { error: 'days must be a positive integer' },
        { status: 400 }
      );
    }

    logger.info('[BACKFILL] Starting sales analytics backfill', {
      orgId,
      lookbackDays,
    });

    const result = await backfillHistoricalSalesData(orgId, lookbackDays);

    logger.info('[BACKFILL] Completed successfully', {
      orgId,
      ...result,
    });

    return NextResponse.json({
      success: true,
      message: 'Backfill completed successfully',
      results: {
        ...result,
        lookbackDays,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[BACKFILL] Error', {
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
