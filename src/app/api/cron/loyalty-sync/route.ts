/**
 * Loyalty Sync Cron Job
 *
 * Scheduled endpoint for daily loyalty sync at 2 AM
 *
 * Firebase Cloud Scheduler Configuration:
 * - Schedule: 0 2 * * * (2 AM daily)
 * - Target: POST /api/cron/loyalty-sync
 * - Auth: Include cron secret header
 *
 * Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/loyalty-sync",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/loyalty-sync
 * Triggered by cron scheduler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret (security check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('[Cron] CRON_SECRET is not configured');
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Cron] Unauthorized loyalty sync attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('[Cron] Starting daily loyalty sync');

    const appBaseUrl =
      process.env.APP_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin;
    const syncHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      authorization: `Bearer ${cronSecret}`,
    };

    // Get all organizations with Alleaves POS configured
    const firestore = getAdminFirestore();
    const brandsRef = firestore.collection('brands');
    const snapshot = await brandsRef
      .where('posConfig.provider', '==', 'alleaves')
      .get();

    const brands = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('[Cron] Found brands to sync', { count: brands.length });

    const results = {
      totalBrands: brands.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ brandId: string; error: string }>,
      brandResults: [] as Array<{
        brandId: string;
        success: boolean;
        customersProcessed: number;
        discrepancies: number;
      }>
    };

    // Sync each brand
    for (const brand of brands) {
      try {
        logger.info('[Cron] Syncing brand', { brandId: brand.id });

        // Call the sync API for this brand
        const syncResponse = await fetch(`${appBaseUrl}/api/loyalty/sync`, {
          method: 'POST',
          headers: syncHeaders,
          body: JSON.stringify({
            orgId: brand.id
          })
        });

        if (!syncResponse.ok) {
          throw new Error(`Sync failed: ${syncResponse.status}`);
        }

        const syncData = await syncResponse.json();

        results.successful++;
        results.brandResults.push({
          brandId: brand.id,
          success: true,
          customersProcessed: syncData.result.totalProcessed,
          discrepancies: syncData.result.discrepancies.length
        });

        logger.info('[Cron] Brand sync completed', {
          brandId: brand.id,
          customersProcessed: syncData.result.totalProcessed,
          discrepancies: syncData.result.discrepancies.length
        });

        // Alert if significant discrepancies
        if (syncData.result.discrepancies.length > 10) {
          logger.warn('[Cron] High discrepancy count', {
            brandId: brand.id,
            count: syncData.result.discrepancies.length
          });

          // TODO: Send Discord/email alert
        }

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        results.errors.push({
          brandId: brand.id,
          error: errorMessage
        });

        logger.error('[Cron] Brand sync failed', {
          brandId: brand.id,
          error: errorMessage
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('[Cron] Daily loyalty sync completed', {
      duration,
      totalBrands: results.totalBrands,
      successful: results.successful,
      failed: results.failed
    });

    return NextResponse.json({
      success: true,
      results,
      duration
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('[Cron] Daily loyalty sync failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/loyalty-sync
 * Test endpoint (for manual trigger)
 */
export async function GET(request: NextRequest) {
  // Redirect to POST for actual sync
  return POST(request);
}
