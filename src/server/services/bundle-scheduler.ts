/**
 * Bundle Scheduler Service
 *
 * Handles automatic bundle status transitions:
 * - scheduled → active (when startDate arrives)
 * - active → expired (when endDate passes)
 * - Time window enforcement (daysOfWeek, timeStart/timeEnd)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { BundleDeal, BundleStatus } from '@/types/bundles';
import { Timestamp } from 'firebase-admin/firestore';

export interface BundleTransitionResult {
  bundleId: string;
  from: BundleStatus;
  to: BundleStatus;
  reason: string;
}

export interface SchedulerRunResult {
  success: boolean;
  transitionsPerformed: BundleTransitionResult[];
  errors: Array<{
    bundleId: string;
    error: string;
  }>;
  duration: number;
}

export class BundleSchedulerService {
  private firestore: ReturnType<typeof getAdminFirestore>;

  constructor() {
    this.firestore = getAdminFirestore();
  }

  /**
   * Main scheduler run - called by cron every 5 minutes
   * Transitions all bundles that need status updates
   */
  async transitionBundles(): Promise<SchedulerRunResult> {
    const startTime = Date.now();

    logger.info('[BundleScheduler] Starting bundle transition check');

    const result: SchedulerRunResult = {
      success: true,
      transitionsPerformed: [],
      errors: [],
      duration: 0,
    };

    try {
      const now = new Date();

      // 1. Activate scheduled bundles whose startDate has arrived
      const scheduledBundles = await this.firestore
        .collection('bundles')
        .where('status', '==', 'scheduled')
        .get();

      logger.info('[BundleScheduler] Found scheduled bundles', { count: scheduledBundles.size });

      for (const doc of scheduledBundles.docs) {
        try {
          const bundle = doc.data() as BundleDeal;
          const startDate = bundle.startDate instanceof Timestamp
            ? bundle.startDate.toDate()
            : bundle.startDate
            ? new Date(bundle.startDate)
            : null;

          if (startDate && now >= startDate) {
            // Check if within time window (if configured)
            if (this.isWithinTimeWindow(now, bundle)) {
              await doc.ref.update({
                status: 'active' as BundleStatus,
                updatedAt: Timestamp.now(),
              });

              result.transitionsPerformed.push({
                bundleId: doc.id,
                from: 'scheduled',
                to: 'active',
                reason: 'Start date reached and within time window',
              });

              logger.info('[BundleScheduler] Activated bundle', {
                bundleId: doc.id,
                name: bundle.name,
                startDate,
              });
            } else {
              logger.debug('[BundleScheduler] Bundle not in time window', {
                bundleId: doc.id,
                name: bundle.name,
              });
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({
            bundleId: doc.id,
            error: errorMsg,
          });
          logger.error('[BundleScheduler] Failed to activate bundle', {
            bundleId: doc.id,
            error: errorMsg,
          });
        }
      }

      // 2. Expire active bundles whose endDate has passed
      const activeBundles = await this.firestore
        .collection('bundles')
        .where('status', '==', 'active')
        .get();

      logger.info('[BundleScheduler] Found active bundles', { count: activeBundles.size });

      for (const doc of activeBundles.docs) {
        try {
          const bundle = doc.data() as BundleDeal;
          const endDate = bundle.endDate instanceof Timestamp
            ? bundle.endDate.toDate()
            : bundle.endDate
            ? new Date(bundle.endDate)
            : null;

          // Check endDate
          if (endDate && now >= endDate) {
            await doc.ref.update({
              status: 'expired' as BundleStatus,
              updatedAt: Timestamp.now(),
            });

            result.transitionsPerformed.push({
              bundleId: doc.id,
              from: 'active',
              to: 'expired',
              reason: 'End date reached',
            });

            logger.info('[BundleScheduler] Expired bundle', {
              bundleId: doc.id,
              name: bundle.name,
              endDate,
            });
            continue;
          }

          // Check time window (pause if outside window)
          if (!this.isWithinTimeWindow(now, bundle)) {
            // Don't change status, just skip showing it
            // Frontend should check isWithinTimeWindow before displaying
            logger.debug('[BundleScheduler] Bundle outside time window', {
              bundleId: doc.id,
              name: bundle.name,
            });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({
            bundleId: doc.id,
            error: errorMsg,
          });
          logger.error('[BundleScheduler] Failed to expire bundle', {
            bundleId: doc.id,
            error: errorMsg,
          });
        }
      }

      // 3. Check redemption limits
      const allActiveBundles = await this.firestore
        .collection('bundles')
        .where('status', '==', 'active')
        .get();

      for (const doc of allActiveBundles.docs) {
        try {
          const bundle = doc.data() as BundleDeal;

          // Check if max redemptions reached
          if (
            bundle.maxRedemptions &&
            bundle.currentRedemptions >= bundle.maxRedemptions
          ) {
            await doc.ref.update({
              status: 'expired' as BundleStatus,
              updatedAt: Timestamp.now(),
            });

            result.transitionsPerformed.push({
              bundleId: doc.id,
              from: 'active',
              to: 'expired',
              reason: `Max redemptions reached (${bundle.currentRedemptions}/${bundle.maxRedemptions})`,
            });

            logger.info('[BundleScheduler] Expired bundle due to redemption limit', {
              bundleId: doc.id,
              name: bundle.name,
              redemptions: bundle.currentRedemptions,
              max: bundle.maxRedemptions,
            });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push({
            bundleId: doc.id,
            error: errorMsg,
          });
          logger.error('[BundleScheduler] Failed to check redemption limit', {
            bundleId: doc.id,
            error: errorMsg,
          });
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      logger.info('[BundleScheduler] Transition check complete', {
        transitions: result.transitionsPerformed.length,
        errors: result.errors.length,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BundleScheduler] Scheduler run failed', { error: errorMsg });

      result.success = false;
      result.duration = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * Check if current time is within bundle's configured time window
   * Returns true if no time restrictions configured
   */
  isWithinTimeWindow(now: Date, bundle: BundleDeal): boolean {
    // If no time restrictions, always within window
    if (!bundle.daysOfWeek && !bundle.timeStart && !bundle.timeEnd) {
      return true;
    }

    // Check day of week (0 = Sunday, 6 = Saturday)
    if (bundle.daysOfWeek && bundle.daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!bundle.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check time range (HH:MM format, e.g., "09:00", "17:00")
    if (bundle.timeStart && bundle.timeEnd) {
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (currentTime < bundle.timeStart || currentTime > bundle.timeEnd) {
        return false;
      }
    }

    return true;
  }

  /**
   * Force transition a specific bundle (for manual overrides)
   */
  async forceBundleTransition(
    bundleId: string,
    newStatus: BundleStatus,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const bundleRef = this.firestore.collection('bundles').doc(bundleId);
      const doc = await bundleRef.get();

      if (!doc.exists) {
        return { success: false, error: 'Bundle not found' };
      }

      const currentStatus = doc.data()?.status;

      await bundleRef.update({
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      logger.info('[BundleScheduler] Forced bundle transition', {
        bundleId,
        from: currentStatus,
        to: newStatus,
        reason,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BundleScheduler] Failed to force transition', {
        bundleId,
        error: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  }
}
