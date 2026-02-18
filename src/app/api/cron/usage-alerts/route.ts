import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { TIERS, type TierId } from '@/config/tiers';
import { notifyUsage80Percent, type UsageAlertMetric } from '@/server/services/billing-notifications';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface UsageCheckResult {
  orgId: string;
  tierId: string;
  alertedMetrics: UsageAlertMetric[];
  sentEmail: boolean;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[usage-alerts] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firestore } = await createServerClient();

    // 2. Get all active subscriptions
    const subscriptionsSnapshot = await firestore
      .collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    if (subscriptionsSnapshot.empty) {
      logger.info('[usage-alerts] No active subscriptions');
      return NextResponse.json({
        success: true,
        alertsSent: 0,
        subscriptionsChecked: 0,
        results: [],
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Process each subscription
    const results: UsageCheckResult[] = [];

    await Promise.all(
      subscriptionsSnapshot.docs.map(async (subDoc) => {
        const subscription = subDoc.data() as any;
        const orgId = subscription.customerId || subDoc.id;
        const tierId = subscription.tierId as TierId | undefined;

        if (!tierId || !orgId) {
          logger.warn('[usage-alerts] Invalid subscription data', { subDoc: subDoc.id });
          return;
        }

        try {
          const tierConfig = TIERS[tierId as TierId];
          if (!tierConfig) {
            logger.warn('[usage-alerts] Invalid tierId', { tierId });
            return;
          }

          // Get current month usage
          const now = new Date();
          const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
            2,
            '0'
          )}`;

          const usageDoc = await firestore
            .collection('usage')
            .doc(`${orgId}-${period}`)
            .get();

          if (!usageDoc.exists) {
            // No usage data yet for this org
            return;
          }

          const usage = usageDoc.data() as any;

          // Already sent alert this month?
          if (usage.alertSentAt80Percent === true) {
            return;
          }

          // Calculate percentages for metered metrics
          const alertedMetrics: UsageAlertMetric[] = [];

          // Check SMS Customer
          if (
            tierConfig.allocations.smsCustomer > 0 &&
            usage.smsCustomerUsed / tierConfig.allocations.smsCustomer >= 0.8
          ) {
            alertedMetrics.push({
              name: 'Customer SMS',
              used: usage.smsCustomerUsed,
              limit: tierConfig.allocations.smsCustomer,
              percent: Math.round((usage.smsCustomerUsed / tierConfig.allocations.smsCustomer) * 100),
            });
          }

          // Check Emails
          if (
            tierConfig.allocations.emails > 0 &&
            usage.emailsUsed / tierConfig.allocations.emails >= 0.8
          ) {
            alertedMetrics.push({
              name: 'Emails',
              used: usage.emailsUsed,
              limit: tierConfig.allocations.emails,
              percent: Math.round((usage.emailsUsed / tierConfig.allocations.emails) * 100),
            });
          }

          // Check Creative Assets
          if (
            tierConfig.allocations.creativeAssets > 0 &&
            usage.creativeAssetsUsed / tierConfig.allocations.creativeAssets >= 0.8
          ) {
            alertedMetrics.push({
              name: 'Creative Assets',
              used: usage.creativeAssetsUsed,
              limit: tierConfig.allocations.creativeAssets,
              percent: Math.round(
                (usage.creativeAssetsUsed / tierConfig.allocations.creativeAssets) * 100
              ),
            });
          }

          // Check Competitors
          if (
            tierConfig.allocations.competitors > 0 &&
            usage.competitorsTracked / tierConfig.allocations.competitors >= 0.8
          ) {
            alertedMetrics.push({
              name: 'Competitors Tracked',
              used: usage.competitorsTracked,
              limit: tierConfig.allocations.competitors,
              percent: Math.round(
                (usage.competitorsTracked / tierConfig.allocations.competitors) * 100
              ),
            });
          }

          // If any metrics hit 80%, send alert
          if (alertedMetrics.length > 0) {
            const emailSent = await notifyUsage80Percent(orgId, alertedMetrics);

            // Create inbox notification
            if (emailSent) {
              try {
                // Get org admin user ID for inbox notification
                const usersSnapshot = await firestore
                  .collection('users')
                  .where('organizationIds', 'array-contains', orgId)
                  .where('role', '==', 'dispensary')
                  .limit(1)
                  .get();

                if (!usersSnapshot.empty) {
                  const adminUserId = usersSnapshot.docs[0].id;

                  await firestore.collection('inbox').add({
                    userId: adminUserId,
                    type: 'system',
                    category: 'billing',
                    title: 'Usage limit approaching',
                    message: `You've used ${alertedMetrics
                      .map((m) => `${m.percent}% of ${m.name}`)
                      .join(', ')}`,
                    priority: 'high',
                    read: false,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
                  });
                }
              } catch (error: any) {
                logger.warn('[usage-alerts] Failed to create inbox notification', {
                  orgId,
                  error: error.message,
                });
              }

              // Mark alert as sent
              await firestore
                .collection('usage')
                .doc(`${orgId}-${period}`)
                .set(
                  {
                    alertSentAt80Percent: true,
                    updatedAt: FieldValue.serverTimestamp(),
                  },
                  { merge: true }
                );
            }

            results.push({
              orgId,
              tierId,
              alertedMetrics,
              sentEmail: emailSent,
            });
          }
        } catch (error: any) {
          logger.error('[usage-alerts] Error processing subscription', {
            orgId,
            error: error.message,
          });
        }
      })
    );

    const alertsSent = results.filter((r) => r.sentEmail).length;

    logger.info('[usage-alerts] Cron completed', {
      subscriptionsChecked: subscriptionsSnapshot.size,
      alertsSent,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      alertsSent,
      subscriptionsChecked: subscriptionsSnapshot.size,
      results,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    logger.error('[usage-alerts] Cron error', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ready', endpoint: '/api/cron/usage-alerts' });
}
