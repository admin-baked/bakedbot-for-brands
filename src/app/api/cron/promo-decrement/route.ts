/**
 * Promo Decrement Cron Endpoint
 * POST /api/cron/promo-decrement
 *
 * Decrements free_months promo counters on active subscriptions once per month.
 * Sends expiring (1 month left) and expired (0 months left) email notifications.
 * Runs at midnight on the 1st of each month to align with billing cycles.
 *
 * Cloud Scheduler:
 *   Schedule: 0 0 1 * *  (monthly — 1st of month midnight ET)
 *   gcloud scheduler jobs create http promo-decrement \
 *     --schedule="0 0 1 * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/promo-decrement" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { TIERS, type TierId } from '@/config/tiers';
import {
  notifyPromoExpiring,
  notifyPromoExpired,
} from '@/server/services/billing-notifications';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface PromoDecrementResult {
  orgId: string;
  tierId: string;
  monthsRemaining: number;
  action: 'decremented' | 'expired';
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[promo-decrement] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firestore } = await createServerClient();

    // 2. Get all active subscriptions with free_months promos
    const subscriptionsSnapshot = await firestore
      .collection('subscriptions')
      .where('promoType', '==', 'free_months')
      .where('promoMonthsRemaining', '>', 0)
      .where('status', '==', 'active')
      .get();

    if (subscriptionsSnapshot.empty) {
      logger.info('[promo-decrement] No active free_months promotions');
      return NextResponse.json({
        success: true,
        decremented: 0,
        expired: 0,
        subscriptionsChecked: 0,
        results: [],
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Process each subscription
    const results: PromoDecrementResult[] = [];
    const decrementedCount = 0;
    const expiredCount = 0;

    await Promise.all(
      subscriptionsSnapshot.docs.map(async (subDoc) => {
        const subscription = subDoc.data() as any;
        const orgId = subscription.customerId || subDoc.id;
        const tierId = subscription.tierId as TierId | undefined;
        const currentMonthsRemaining = subscription.promoMonthsRemaining || 0;

        if (!tierId || !orgId || currentMonthsRemaining <= 0) {
          return;
        }

        try {
          const tierConfig = TIERS[tierId as TierId];
          if (!tierConfig) {
            logger.warn('[promo-decrement] Invalid tierId', { tierId });
            return;
          }

          // Decrement months remaining
          const newMonthsRemaining = currentMonthsRemaining - 1;

          // Check if promo is expiring (1 month left) or expired (0 months left)
          if (newMonthsRemaining === 1) {
            // Send expiring notification
            await notifyPromoExpiring(orgId, tierId, 1).catch((e: any) => {
              logger.warn('[promo-decrement] Expiring notification failed', {
                orgId,
                error: e.message,
              });
            });
          } else if (newMonthsRemaining === 0) {
            // Promo has expired — send expired notification
            await notifyPromoExpired(orgId, tierId, tierConfig.price).catch(
              (e: any) => {
                logger.warn('[promo-decrement] Expired notification failed', {
                  orgId,
                  error: e.message,
                });
              }
            );
          }

          // Update subscription with decremented value
          await firestore
            .collection('subscriptions')
            .doc(orgId)
            .set(
              {
                promoMonthsRemaining: newMonthsRemaining,
                ...(newMonthsRemaining === 0 && {
                  promoCode: null,
                  promoType: null,
                  promoMonthsRemaining: 0,
                }),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          // Also update org subscription doc
          await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('subscription')
            .doc('current')
            .set(
              {
                promoMonthsRemaining: newMonthsRemaining,
                ...(newMonthsRemaining === 0 && {
                  promoCode: null,
                  promoType: null,
                  promoMonthsRemaining: 0,
                }),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

          results.push({
            orgId,
            tierId,
            monthsRemaining: newMonthsRemaining,
            action: newMonthsRemaining === 0 ? 'expired' : 'decremented',
          });
        } catch (error: any) {
          logger.error('[promo-decrement] Error processing subscription', {
            orgId,
            error: error.message,
          });
        }
      })
    );

    const decremented = results.filter((r) => r.action === 'decremented').length;
    const expired = results.filter((r) => r.action === 'expired').length;

    logger.info('[promo-decrement] Cron completed', {
      subscriptionsChecked: subscriptionsSnapshot.size,
      decremented,
      expired,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      decremented,
      expired,
      subscriptionsChecked: subscriptionsSnapshot.size,
      results,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });
  } catch (error: any) {
    logger.error('[promo-decrement] Cron error', {
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
  return NextResponse.json({ status: 'ready', endpoint: '/api/cron/promo-decrement' });
}
