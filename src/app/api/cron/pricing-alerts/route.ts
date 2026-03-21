/**
 * Pricing Alerts Cron Endpoint
 *
 * Called by Cloud Scheduler to check for competitor price changes and send alerts.
 * Frequency: Every 6 hours (configurable per tenant)
 *
 * Deploy cron job:
 * gcloud scheduler jobs create http pricing-alerts-cron
 *   --schedule="0 STAR/6 STAR STAR STAR" (replace STAR with *)
 *   --uri="https://bakedbot.ai/api/cron/pricing-alerts"
 *   --http-method=GET
 *   --headers="Authorization=Bearer CRON_SECRET"
 *   --location=us-central1
 *
 * Cloud Scheduler:
 *   Schedule: "0 * /6 * * *"  (every 6 hours)
 *   gcloud scheduler jobs create http pricing-alerts \
 *     --schedule="0 * /6 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/pricing-alerts" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import {
  getPricingAlertConfig,
  checkCompetitorPriceChanges,
  sendPricingAlertEmails,
} from '@/server/services/pricing-alerts';
import { syncCompetitorPricingWatch } from '@/server/services/competitor-pricing-watch';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function GET(req: NextRequest) {
  // Authorize
  const authError = await requireCronSecret(req, 'PRICING_ALERTS');
  if (authError) {
    return authError;
  }

  const startTime = Date.now();
  const db = getAdminFirestore();

  try {
    logger.info('[Pricing Alerts Cron] Starting price monitoring');

    // Get all tenants with pricing alerts enabled
    const tenantsSnap = await db
      .collection('tenants')
      .where('status', '==', 'active')
      .get();

    let tenantsChecked = 0;
    let totalAlerts = 0;
    let emailsSent = 0;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      // Get alert configuration
      const config = await getPricingAlertConfig(tenantId);

      if (!config || !config.enabled) {
        continue; // Alerts not enabled for this tenant
      }

      // Check if it's time to run based on frequency
      const lastRunSnap = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('pricing_alerts')
        .get();

      const lastRun = lastRunSnap.data()?.lastRun?.toDate?.();
      const intervalMs = (config.checkFrequency || 360) * 60 * 1000; // Default 6 hours

      if (lastRun && Date.now() - lastRun.getTime() < intervalMs) {
        continue; // Not due yet
      }

      // Check for price changes
      const alerts = await checkCompetitorPriceChanges(tenantId, config);
      let proactiveSync = null;

      if (alerts.length > 0) {
        // Send email alerts
        const result = await sendPricingAlertEmails(config, alerts);
        emailsSent += result.sent;
        totalAlerts += alerts.length;
        proactiveSync = await syncCompetitorPricingWatch({
          orgId: tenantId,
          alerts,
          emailsSent: result.sent,
        });
      } else {
        proactiveSync = await syncCompetitorPricingWatch({
          orgId: tenantId,
          alerts,
          emailsSent: 0,
        });
      }

      // Update lastRun
      await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('pricing_alerts')
        .set({ lastRun: new Date() }, { merge: true });

      if (proactiveSync && !proactiveSync.success) {
        logger.warn('[Pricing Alerts Cron] Proactive sync failed for tenant', {
          tenantId,
          error: proactiveSync.error,
        });
      }

      tenantsChecked++;
    }

    const duration = Date.now() - startTime;

    logger.info('[Pricing Alerts Cron] Processing complete', {
      tenantsChecked,
      totalAlerts,
      emailsSent,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      tenantsChecked,
      totalAlerts,
      emailsSent,
      durationMs: duration,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Pricing Alerts Cron] Processing failed', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Manual trigger endpoint for testing
 */
export async function POST(req: NextRequest) {
  // Authorize
  const authError = await requireCronSecret(req, 'PRICING_ALERTS_MANUAL');
  if (authError) {
    return authError;
  }

  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Get configuration
    const config = await getPricingAlertConfig(tenantId);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Pricing alerts not configured for this tenant' },
        { status: 404 }
      );
    }

    // Force check (ignore frequency)
    const alerts = await checkCompetitorPriceChanges(tenantId, config);

    // Send emails if any alerts
    let emailResult = { sent: 0, failed: 0 };
    if (alerts.length > 0) {
      emailResult = await sendPricingAlertEmails(config, alerts);
    }
    const proactive = await syncCompetitorPricingWatch({
      orgId: tenantId,
      alerts,
      emailsSent: emailResult.sent,
    });

    return NextResponse.json({
      success: true,
      alertsTriggered: alerts.length,
      emailsSent: emailResult.sent,
      emailsFailed: emailResult.failed,
      proactive,
      alerts: alerts.map((a) => ({
        productName: a.productName,
        alertType: a.alertType,
        priceGapPercent: a.priceGapPercent,
      })),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Pricing Alerts Cron] Manual trigger failed', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
