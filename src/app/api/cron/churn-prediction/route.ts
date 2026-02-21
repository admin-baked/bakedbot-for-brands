/**
 * Churn Prediction Cron Job
 *
 * Runs weekly (Sunday 2 AM) to:
 * - Calculate churn probability for all active customers
 * - Store predictions on CustomerProfile (churnProbability, churnRiskLevel)
 * - Generate insights for high-risk customers
 *
 * Cloud Scheduler config:
 * - Schedule: 0 2 * * 0 (Sunday 2 AM)
 * - URL: https://bakedbot-prod.web.app/api/cron/churn-prediction
 * - Method: POST
 * - Headers: Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ChurnPredictionService } from '@/server/services/churn-prediction';
import { getAdminFirestore } from '@/firebase/admin';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes max (Claude API calls take time)

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('[Cron] Churn prediction job started');

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
      logger.warn('[Cron] Unauthorized churn prediction attempt', {
        authHeader: authHeader ? 'present' : 'missing',
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get all organizations with loyalty programs enabled
    const firestore = getAdminFirestore();
    const tenantsSnapshot = await firestore.collection('tenants').get();

    const results: Array<{
      orgId: string;
      success: boolean;
      predictions: number;
      highRisk: number;
      errors: number;
      duration: number;
    }> = [];

    // 3. Run predictions for each org
    for (const tenantDoc of tenantsSnapshot.docs) {
      try {
        const orgId = tenantDoc.id;

        // Check if loyalty is enabled
        const loyaltySettingsDoc = await tenantDoc.ref
          .collection('settings')
          .doc('loyalty')
          .get();

        if (!loyaltySettingsDoc.exists) {
          logger.debug('[Cron] Skipping org (no loyalty settings)', { orgId });
          continue;
        }

        logger.info('[Cron] Running churn prediction for org', { orgId });

        const service = new ChurnPredictionService();
        const result = await service.predictChurnForOrg(orgId);

        results.push({
          orgId,
          success: result.success,
          predictions: result.predictions,
          highRisk: result.highRisk,
          errors: result.errors.length,
          duration: result.duration,
        });

        logger.info('[Cron] Org churn prediction complete', {
          orgId,
          predictions: result.predictions,
          highRisk: result.highRisk,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        logger.error('[Cron] Org churn prediction failed', {
          orgId: tenantDoc.id,
          error: errorMsg,
        });

        results.push({
          orgId: tenantDoc.id,
          success: false,
          predictions: 0,
          highRisk: 0,
          errors: 1,
          duration: 0,
        });
      }
    }

    const duration = Date.now() - startTime;

    // 4. Calculate summary
    const summary = {
      totalOrgs: results.length,
      successfulOrgs: results.filter((r) => r.success).length,
      totalPredictions: results.reduce((sum, r) => sum + r.predictions, 0),
      totalHighRisk: results.reduce((sum, r) => sum + r.highRisk, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors, 0),
    };

    logger.info('[Cron] Churn prediction job completed', {
      ...summary,
      duration,
    });

    return NextResponse.json({
      success: true,
      jobDuration: duration,
      results,
      summary,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error('[Cron] Churn prediction job failed', {
      error: errorMsg,
      duration,
    });

    return NextResponse.json(
      {
        error: 'Churn prediction job failed',
        details: errorMsg,
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual trigger (testing/debugging)
 * Requires query params: ?secret=CRON_SECRET&orgId=<orgId>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const orgId = searchParams.get('orgId');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing orgId query parameter' },
        { status: 400 }
      );
    }

    logger.info('[Cron] Manual churn prediction trigger', { orgId });

    const service = new ChurnPredictionService();
    const result = await service.predictChurnForOrg(orgId);

    return NextResponse.json({
      success: result.success,
      totalCustomers: result.totalCustomers,
      predictions: result.predictions,
      highRisk: result.highRisk,
      mediumRisk: result.mediumRisk,
      lowRisk: result.lowRisk,
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
