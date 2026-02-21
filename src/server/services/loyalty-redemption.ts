/**
 * Loyalty Redemption Service
 *
 * Handles points redemption at checkout:
 * - Atomic points deduction using Firestore transactions
 * - Exchange rate calculation based on redemption tiers
 * - Partial redemption support
 * - Redemption history audit trail
 * - Insufficient points handling
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { CustomerProfile, LoyaltySettings, RedemptionTier } from '@/types/customers';

export interface RedemptionRequest {
  customerId: string;
  orgId: string;
  pointsToRedeem: number;
  orderId: string;
  orderTotal: number;
}

export interface RedemptionResult {
  success: boolean;
  customerId: string;
  orderId: string;
  pointsRedeemed: number;
  dollarValue: number;
  remainingPoints: number;
  error?: string;
}

export interface RedemptionValidation {
  isValid: boolean;
  maxPoints: number;
  maxDollarValue: number;
  suggestedTier?: RedemptionTier;
  error?: string;
}

export class LoyaltyRedemptionService {
  private firestore: ReturnType<typeof getAdminFirestore>;

  constructor() {
    this.firestore = getAdminFirestore();
  }

  /**
   * Validate redemption before order placement
   */
  async validateRedemption(
    customerId: string,
    orgId: string,
    pointsToRedeem: number,
    loyaltySettings: LoyaltySettings
  ): Promise<RedemptionValidation> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      const customerDoc = await customerRef.get();

      if (!customerDoc.exists) {
        return {
          isValid: false,
          maxPoints: 0,
          maxDollarValue: 0,
          error: 'Customer not found',
        };
      }

      const profile = customerDoc.data() as CustomerProfile;
      const availablePoints = profile.points || 0;

      // Check if customer has enough points
      if (pointsToRedeem > availablePoints) {
        return {
          isValid: false,
          maxPoints: availablePoints,
          maxDollarValue: this.calculateDollarValue(availablePoints, loyaltySettings),
          error: `Insufficient points. Available: ${availablePoints}, Requested: ${pointsToRedeem}`,
        };
      }

      // Check if points meet minimum redemption tier
      const redemptionTier = this.getBestRedemptionTier(pointsToRedeem, loyaltySettings);

      if (!redemptionTier) {
        const minTier = loyaltySettings.redemptionTiers?.[0];
        return {
          isValid: false,
          maxPoints: availablePoints,
          maxDollarValue: this.calculateDollarValue(availablePoints, loyaltySettings),
          error: minTier
            ? `Minimum redemption: ${minTier.pointsCost} points`
            : 'No redemption tiers configured',
        };
      }

      return {
        isValid: true,
        maxPoints: availablePoints,
        maxDollarValue: this.calculateDollarValue(availablePoints, loyaltySettings),
        suggestedTier: redemptionTier,
      };
    } catch (error) {
      logger.error('[LoyaltyRedemption] Validation failed', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        maxPoints: 0,
        maxDollarValue: 0,
        error: 'Validation failed',
      };
    }
  }

  /**
   * Redeem points for order discount
   * Uses Firestore transaction for atomic points deduction
   */
  async redeemPoints(
    request: RedemptionRequest,
    loyaltySettings: LoyaltySettings
  ): Promise<RedemptionResult> {
    try {
      logger.info('[LoyaltyRedemption] Starting redemption', {
        customerId: request.customerId,
        pointsToRedeem: request.pointsToRedeem,
        orderId: request.orderId,
      });

      const customerRef = this.firestore
        .collection('customers')
        .doc(`${request.orgId}_${request.customerId}`);

      // Use transaction for atomic points deduction
      const result = await this.firestore.runTransaction(async (transaction) => {
        const customerDoc = await transaction.get(customerRef);

        if (!customerDoc.exists) {
          return {
            success: false,
            customerId: request.customerId,
            orderId: request.orderId,
            pointsRedeemed: 0,
            dollarValue: 0,
            remainingPoints: 0,
            error: 'Customer not found',
          };
        }

        const profile = customerDoc.data() as CustomerProfile;
        const currentPoints = profile.points || 0;

        // Check sufficient points
        if (request.pointsToRedeem > currentPoints) {
          return {
            success: false,
            customerId: request.customerId,
            orderId: request.orderId,
            pointsRedeemed: 0,
            dollarValue: 0,
            remainingPoints: currentPoints,
            error: `Insufficient points: ${currentPoints} available, ${request.pointsToRedeem} requested`,
          };
        }

        // Calculate dollar value
        const dollarValue = this.calculateDollarValue(
          request.pointsToRedeem,
          loyaltySettings
        );

        // Validate dollar value doesn't exceed order total
        if (dollarValue > request.orderTotal) {
          return {
            success: false,
            customerId: request.customerId,
            orderId: request.orderId,
            pointsRedeemed: 0,
            dollarValue: 0,
            remainingPoints: currentPoints,
            error: `Redemption value ($${dollarValue}) exceeds order total ($${request.orderTotal})`,
          };
        }

        // Deduct points atomically
        const newPoints = currentPoints - request.pointsToRedeem;

        transaction.update(customerRef, {
          points: newPoints,
          updatedAt: Timestamp.now(),
        });

        // Record redemption in customer_activities
        const activityRef = this.firestore.collection('customer_activities').doc();

        transaction.set(activityRef, {
          id: activityRef.id,
          customerId: request.customerId,
          orgId: request.orgId,
          type: 'points_redeemed',
          description: `Redeemed ${request.pointsToRedeem} points for $${dollarValue.toFixed(2)} off`,
          metadata: {
            orderId: request.orderId,
            pointsRedeemed: request.pointsToRedeem,
            dollarValue,
            previousPoints: currentPoints,
            newPoints,
          },
          createdAt: Timestamp.now(),
        });

        logger.info('[LoyaltyRedemption] Points redeemed', {
          customerId: request.customerId,
          orderId: request.orderId,
          pointsRedeemed: request.pointsToRedeem,
          dollarValue,
          previousPoints: currentPoints,
          newPoints,
        });

        return {
          success: true,
          customerId: request.customerId,
          orderId: request.orderId,
          pointsRedeemed: request.pointsToRedeem,
          dollarValue,
          remainingPoints: newPoints,
        };
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[LoyaltyRedemption] Redemption failed', {
        customerId: request.customerId,
        orderId: request.orderId,
        error: errorMsg,
      });

      return {
        success: false,
        customerId: request.customerId,
        orderId: request.orderId,
        pointsRedeemed: 0,
        dollarValue: 0,
        remainingPoints: 0,
        error: errorMsg,
      };
    }
  }

  /**
   * Calculate dollar value for points using redemption tiers
   */
  calculateDollarValue(
    points: number,
    loyaltySettings: LoyaltySettings
  ): number {
    if (!loyaltySettings.redemptionTiers || loyaltySettings.redemptionTiers.length === 0) {
      // Fallback: 100 points = $1 (standard ratio)
      return points / 100;
    }

    const tier = this.getBestRedemptionTier(points, loyaltySettings);

    if (!tier) {
      return 0; // Not enough points for any tier
    }

    // Calculate value based on tier exchange rate
    const exchangeRate = tier.rewardValue / tier.pointsCost;
    return points * exchangeRate;
  }

  /**
   * Find the best redemption tier for given points
   * Returns the highest tier that customer qualifies for
   */
  private getBestRedemptionTier(
    points: number,
    loyaltySettings: LoyaltySettings
  ): RedemptionTier | undefined {
    if (!loyaltySettings.redemptionTiers) {
      return undefined;
    }

    // Sort tiers by points cost descending (highest first)
    const sortedTiers = [...loyaltySettings.redemptionTiers].sort(
      (a, b) => b.pointsCost - a.pointsCost
    );

    // Return the highest tier the customer can afford
    return sortedTiers.find((tier) => points >= tier.pointsCost);
  }

  /**
   * Get suggested redemption options for customer
   */
  async getSuggestedRedemptions(
    customerId: string,
    orgId: string,
    loyaltySettings: LoyaltySettings
  ): Promise<Array<{
    tier: RedemptionTier;
    canRedeem: boolean;
    pointsNeeded?: number;
  }>> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      const customerDoc = await customerRef.get();

      if (!customerDoc.exists) {
        return [];
      }

      const profile = customerDoc.data() as CustomerProfile;
      const availablePoints = profile.points || 0;

      if (!loyaltySettings.redemptionTiers) {
        return [];
      }

      // Map each tier to redemption option
      return loyaltySettings.redemptionTiers.map((tier) => {
        const canRedeem = availablePoints >= tier.pointsCost;
        const pointsNeeded = canRedeem ? undefined : tier.pointsCost - availablePoints;

        return {
          tier,
          canRedeem,
          pointsNeeded,
        };
      });
    } catch (error) {
      logger.error('[LoyaltyRedemption] Failed to get suggestions', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  }

  /**
   * Get redemption history for a customer
   */
  async getRedemptionHistory(
    customerId: string,
    orgId: string,
    limit: number = 50
  ): Promise<Array<{
    date: Date;
    orderId: string;
    pointsRedeemed: number;
    dollarValue: number;
  }>> {
    try {
      const snapshot = await this.firestore
        .collection('customer_activities')
        .where('customerId', '==', customerId)
        .where('orgId', '==', orgId)
        .where('type', '==', 'points_redeemed')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          date: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(data.createdAt),
          orderId: data.metadata.orderId,
          pointsRedeemed: data.metadata.pointsRedeemed,
          dollarValue: data.metadata.dollarValue,
        };
      });
    } catch (error) {
      logger.error('[LoyaltyRedemption] Failed to get history', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return [];
    }
  }
}
