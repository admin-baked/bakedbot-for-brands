/**
 * Bundle Redemption Service
 *
 * Tracks bundle redemptions with:
 * - Atomic increment of currentRedemptions
 * - Per-customer limit enforcement
 * - Redemption history audit trail
 * - Auto-expiration when maxRedemptions reached
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { BundleDeal } from '@/types/bundles';

export interface RedemptionAttemptResult {
  success: boolean;
  bundleId: string;
  customerId: string;
  orderId: string;
  error?: string;
  reason?: string;
}

export interface CustomerRedemptionCheck {
  canRedeem: boolean;
  currentCount: number;
  maxAllowed?: number;
  reason?: string;
}

export class BundleRedemptionService {
  private firestore: ReturnType<typeof getAdminFirestore>;

  constructor() {
    this.firestore = getAdminFirestore();
  }

  /**
   * Record a bundle redemption when order is placed
   * Uses Firestore transaction for atomic operations
   */
  async recordRedemption(
    bundleId: string,
    customerId: string,
    orderId: string,
    orgId: string
  ): Promise<RedemptionAttemptResult> {
    try {
      logger.info('[BundleRedemption] Starting redemption', {
        bundleId,
        customerId,
        orderId,
      });

      const bundleRef = this.firestore.collection('bundles').doc(bundleId);

      // Use transaction to ensure atomicity
      const result = await this.firestore.runTransaction(async (transaction) => {
        const bundleDoc = await transaction.get(bundleRef);

        if (!bundleDoc.exists) {
          return {
            success: false,
            bundleId,
            customerId,
            orderId,
            error: 'Bundle not found',
          };
        }

        const bundle = bundleDoc.data() as BundleDeal;

        // 1. Check bundle status
        if (bundle.status !== 'active') {
          return {
            success: false,
            bundleId,
            customerId,
            orderId,
            error: `Bundle is not active (status: ${bundle.status})`,
          };
        }

        // 2. Check global redemption limit
        if (
          bundle.maxRedemptions &&
          bundle.currentRedemptions >= bundle.maxRedemptions
        ) {
          return {
            success: false,
            bundleId,
            customerId,
            orderId,
            error: 'Bundle redemption limit reached',
          };
        }

        // 3. Check per-customer limit
        if (bundle.perCustomerLimit) {
          const customerRedemptionCount = await this.getCustomerRedemptionCount(
            bundleId,
            customerId,
            transaction
          );

          if (customerRedemptionCount >= bundle.perCustomerLimit) {
            return {
              success: false,
              bundleId,
              customerId,
              orderId,
              error: `Customer has reached per-customer limit (${customerRedemptionCount}/${bundle.perCustomerLimit})`,
            };
          }
        }

        // 4. Record redemption atomically
        transaction.update(bundleRef, {
          currentRedemptions: FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        });

        // 5. Add to redemption history sub-collection
        const redemptionRef = bundleRef
          .collection('redemptions')
          .doc(orderId);

        transaction.set(redemptionRef, {
          bundleId,
          customerId,
          orderId,
          orgId,
          redeemedAt: Timestamp.now(),
          bundleName: bundle.name,
          savingsAmount: bundle.savingsAmount,
        });

        // 6. Check if this redemption hit the limit
        const newRedemptionCount = bundle.currentRedemptions + 1;
        const hitLimit = bundle.maxRedemptions && newRedemptionCount >= bundle.maxRedemptions;

        logger.info('[BundleRedemption] Redemption recorded', {
          bundleId,
          customerId,
          orderId,
          newCount: newRedemptionCount,
          hitLimit,
        });

        return {
          success: true,
          bundleId,
          customerId,
          orderId,
          reason: hitLimit ? 'Redemption limit reached after this redemption' : undefined,
        };
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[BundleRedemption] Redemption failed', {
        bundleId,
        customerId,
        orderId,
        error: errorMsg,
      });

      return {
        success: false,
        bundleId,
        customerId,
        orderId,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if customer can redeem a bundle (before order placement)
   */
  async canCustomerRedeem(
    bundleId: string,
    customerId: string
  ): Promise<CustomerRedemptionCheck> {
    try {
      const bundleDoc = await this.firestore
        .collection('bundles')
        .doc(bundleId)
        .get();

      if (!bundleDoc.exists) {
        return {
          canRedeem: false,
          currentCount: 0,
          reason: 'Bundle not found',
        };
      }

      const bundle = bundleDoc.data() as BundleDeal;

      // Check bundle status
      if (bundle.status !== 'active') {
        return {
          canRedeem: false,
          currentCount: 0,
          reason: `Bundle is ${bundle.status}`,
        };
      }

      // Check global limit
      if (
        bundle.maxRedemptions &&
        bundle.currentRedemptions >= bundle.maxRedemptions
      ) {
        return {
          canRedeem: false,
          currentCount: bundle.currentRedemptions,
          maxAllowed: bundle.maxRedemptions,
          reason: 'Bundle redemption limit reached',
        };
      }

      // Check per-customer limit
      if (bundle.perCustomerLimit) {
        const customerCount = await this.getCustomerRedemptionCount(
          bundleId,
          customerId
        );

        if (customerCount >= bundle.perCustomerLimit) {
          return {
            canRedeem: false,
            currentCount: customerCount,
            maxAllowed: bundle.perCustomerLimit,
            reason: 'You have reached the per-customer limit for this bundle',
          };
        }

        return {
          canRedeem: true,
          currentCount: customerCount,
          maxAllowed: bundle.perCustomerLimit,
        };
      }

      return {
        canRedeem: true,
        currentCount: 0,
      };
    } catch (error) {
      logger.error('[BundleRedemption] Failed to check customer eligibility', {
        bundleId,
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        canRedeem: false,
        currentCount: 0,
        reason: 'Failed to check eligibility',
      };
    }
  }

  /**
   * Get number of times customer has redeemed this bundle
   */
  private async getCustomerRedemptionCount(
    bundleId: string,
    customerId: string,
    transaction?: FirebaseFirestore.Transaction
  ): Promise<number> {
    const redemptionsRef = this.firestore
      .collection('bundles')
      .doc(bundleId)
      .collection('redemptions')
      .where('customerId', '==', customerId);

    if (transaction) {
      const snapshot = await transaction.get(redemptionsRef);
      return snapshot.size;
    } else {
      const snapshot = await redemptionsRef.get();
      return snapshot.size;
    }
  }

  /**
   * Get redemption history for a bundle
   */
  async getRedemptionHistory(
    bundleId: string,
    limit: number = 50
  ): Promise<Array<{
    orderId: string;
    customerId: string;
    redeemedAt: Date;
    savingsAmount: number;
  }>> {
    try {
      const snapshot = await this.firestore
        .collection('bundles')
        .doc(bundleId)
        .collection('redemptions')
        .orderBy('redeemedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          orderId: data.orderId,
          customerId: data.customerId,
          redeemedAt: data.redeemedAt instanceof Timestamp
            ? data.redeemedAt.toDate()
            : new Date(data.redeemedAt),
          savingsAmount: data.savingsAmount,
        };
      });
    } catch (error) {
      logger.error('[BundleRedemption] Failed to get history', {
        bundleId,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  }

  /**
   * Get redemption statistics for a bundle
   */
  async getRedemptionStats(bundleId: string): Promise<{
    totalRedemptions: number;
    uniqueCustomers: number;
    totalSavings: number;
    averageSavings: number;
  } | null> {
    try {
      const snapshot = await this.firestore
        .collection('bundles')
        .doc(bundleId)
        .collection('redemptions')
        .get();

      const uniqueCustomers = new Set<string>();
      let totalSavings = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        uniqueCustomers.add(data.customerId);
        totalSavings += data.savingsAmount || 0;
      });

      const totalRedemptions = snapshot.size;

      return {
        totalRedemptions,
        uniqueCustomers: uniqueCustomers.size,
        totalSavings,
        averageSavings: totalRedemptions > 0 ? totalSavings / totalRedemptions : 0,
      };
    } catch (error) {
      logger.error('[BundleRedemption] Failed to get stats', {
        bundleId,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }
}
