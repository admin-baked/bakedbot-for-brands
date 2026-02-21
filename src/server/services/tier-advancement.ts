/**
 * Tier Advancement Service
 *
 * Handles automatic loyalty tier assignment based on:
 * - Total lifetime spend
 * - Tier threshold configuration
 * - Tier demotion after inactivity (optional)
 *
 * Runs:
 * - On every order completion (instant check)
 * - Daily cron at 3 AM (batch recalculation for all customers)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile, LoyaltySettings, LoyaltyTier } from '@/types/customers';
import { Timestamp } from 'firebase-admin/firestore';

export interface TierAdvancementResult {
  customerId: string;
  previousTier: string;
  newTier: string;
  threshold: number;
  lifetimeValue: number;
  promoted: boolean;
}

export interface BatchTierRecalculationResult {
  success: boolean;
  totalCustomers: number;
  tiersChanged: number;
  promotions: number;
  demotions: number;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
  duration: number;
}

export class TierAdvancementService {
  private firestore: ReturnType<typeof getAdminFirestore>;
  private readonly INACTIVITY_DEMOTION_DAYS = 180; // 6 months

  constructor() {
    this.firestore = getAdminFirestore();
  }

  /**
   * Calculate and assign tier for a single customer
   * Called after order completion
   */
  async assignTierForCustomer(
    customerId: string,
    orgId: string,
    loyaltySettings: LoyaltySettings
  ): Promise<TierAdvancementResult | null> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      const customerDoc = await customerRef.get();

      if (!customerDoc.exists) {
        logger.warn('[TierAdvancement] Customer not found', { customerId, orgId });
        return null;
      }

      const profile = customerDoc.data() as CustomerProfile;
      const previousTier = profile.tier || 'bronze';
      const lifetimeValue = profile.lifetimeValue || profile.totalSpent || 0;

      // Calculate new tier based on lifetime value
      const newTier = this.calculateTier(lifetimeValue, loyaltySettings);

      // Only update if tier changed
      if (newTier.name.toLowerCase() !== previousTier) {
        await customerRef.update({
          tier: newTier.name.toLowerCase() as any,
          tierThreshold: newTier.threshold,
          tierUpdatedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        const promoted = this.getTierRank(newTier.name, loyaltySettings) >
          this.getTierRank(previousTier, loyaltySettings);

        logger.info('[TierAdvancement] Tier changed', {
          customerId,
          orgId,
          from: previousTier,
          to: newTier.name,
          lifetimeValue,
          promoted,
        });

        return {
          customerId,
          previousTier,
          newTier: newTier.name,
          threshold: newTier.threshold,
          lifetimeValue,
          promoted,
        };
      }

      logger.debug('[TierAdvancement] Tier unchanged', {
        customerId,
        tier: previousTier,
        lifetimeValue,
      });

      return null;
    } catch (error) {
      logger.error('[TierAdvancement] Failed to assign tier', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  /**
   * Batch recalculate tiers for all customers in an org
   * Called by daily cron job
   */
  async recalculateTiersForOrg(
    orgId: string,
    loyaltySettings: LoyaltySettings,
    includeDemotion: boolean = false
  ): Promise<BatchTierRecalculationResult> {
    const startTime = Date.now();

    logger.info('[TierAdvancement] Starting batch tier recalculation', { orgId });

    const result: BatchTierRecalculationResult = {
      success: true,
      totalCustomers: 0,
      tiersChanged: 0,
      promotions: 0,
      demotions: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get all customers for this org
      const customersSnapshot = await this.firestore
        .collection('customers')
        .where('orgId', '==', orgId)
        .get();

      result.totalCustomers = customersSnapshot.size;

      logger.info('[TierAdvancement] Processing customers', {
        orgId,
        count: result.totalCustomers,
      });

      // Process in batches to avoid memory issues
      const BATCH_SIZE = 100;
      const customers = customersSnapshot.docs;

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (doc) => {
            try {
              const profile = doc.data() as CustomerProfile;
              const customerId = profile.id;
              const previousTier = profile.tier || 'bronze';
              const lifetimeValue = profile.lifetimeValue || profile.totalSpent || 0;

              // Calculate new tier
              let newTier = this.calculateTier(lifetimeValue, loyaltySettings);

              // Check for inactivity demotion (optional)
              if (includeDemotion && profile.daysSinceLastOrder) {
                if (profile.daysSinceLastOrder >= this.INACTIVITY_DEMOTION_DAYS) {
                  // Demote by one tier (or to bronze)
                  const previousRank = this.getTierRank(previousTier, loyaltySettings);
                  if (previousRank > 0) {
                    const sortedTiers = [...loyaltySettings.tiers].sort(
                      (a, b) => a.threshold - b.threshold
                    );
                    newTier = sortedTiers[Math.max(0, previousRank - 1)];

                    logger.info('[TierAdvancement] Inactivity demotion', {
                      customerId,
                      daysSinceOrder: profile.daysSinceLastOrder,
                      from: previousTier,
                      to: newTier.name,
                    });
                  }
                }
              }

              // Update tier if changed
              if (newTier.name.toLowerCase() !== previousTier) {
                await doc.ref.update({
                  tier: newTier.name.toLowerCase() as any,
                  tierThreshold: newTier.threshold,
                  tierUpdatedAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });

                result.tiersChanged++;

                const promoted = this.getTierRank(newTier.name, loyaltySettings) >
                  this.getTierRank(previousTier, loyaltySettings);

                if (promoted) {
                  result.promotions++;
                } else {
                  result.demotions++;
                }

                logger.debug('[TierAdvancement] Tier updated', {
                  customerId,
                  from: previousTier,
                  to: newTier.name,
                  promoted,
                });
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              result.errors.push({
                customerId: doc.data().id || doc.id,
                error: errorMsg,
              });

              logger.error('[TierAdvancement] Failed to process customer', {
                customerId: doc.id,
                error: errorMsg,
              });
            }
          })
        );

        logger.info('[TierAdvancement] Batch processed', {
          batch: Math.floor(i / BATCH_SIZE) + 1,
          processed: Math.min(i + BATCH_SIZE, customers.length),
          total: customers.length,
        });
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      logger.info('[TierAdvancement] Batch recalculation complete', {
        orgId,
        totalCustomers: result.totalCustomers,
        tiersChanged: result.tiersChanged,
        promotions: result.promotions,
        demotions: result.demotions,
        errors: result.errors.length,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('[TierAdvancement] Batch recalculation failed', {
        orgId,
        error: errorMsg,
      });

      result.success = false;
      result.duration = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * Calculate tier based on lifetime value
   */
  private calculateTier(
    lifetimeValue: number,
    loyaltySettings: LoyaltySettings
  ): LoyaltyTier {
    // Sort tiers by threshold descending (highest first)
    const sortedTiers = [...loyaltySettings.tiers].sort(
      (a, b) => b.threshold - a.threshold
    );

    // Find the highest tier that customer qualifies for
    const qualifiedTier = sortedTiers.find(
      (tier) => lifetimeValue >= tier.threshold
    );

    // Default to lowest tier if none qualify
    return qualifiedTier || sortedTiers[sortedTiers.length - 1];
  }

  /**
   * Get tier rank (0 = lowest, higher = better)
   */
  private getTierRank(tierName: string, loyaltySettings: LoyaltySettings): number {
    const sortedTiers = [...loyaltySettings.tiers].sort(
      (a, b) => a.threshold - b.threshold
    );

    const index = sortedTiers.findIndex(
      (tier) => tier.name.toLowerCase() === tierName.toLowerCase()
    );

    return index >= 0 ? index : 0;
  }

  /**
   * Get tier progress percentage for a customer
   */
  getTierProgress(
    lifetimeValue: number,
    currentTier: LoyaltyTier,
    nextTier?: LoyaltyTier
  ): number {
    if (!nextTier) {
      return 100; // Already at top tier
    }

    const progressRange = nextTier.threshold - currentTier.threshold;
    const customerProgress = lifetimeValue - currentTier.threshold;

    return Math.min(100, Math.max(0, (customerProgress / progressRange) * 100));
  }
}
