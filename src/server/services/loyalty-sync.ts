/**
 * Loyalty Sync Service
 *
 * Hybrid loyalty system that:
 * 1. Calculates points from Alleaves order history
 * 2. Syncs with Alpine IQ (source of truth)
 * 3. Stores in Firestore customer profiles
 * 4. Alerts on discrepancies >10%
 */

import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';
import { AlpineIQClient } from '@/server/integrations/alpine-iq/client';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile, LoyaltySettings } from '@/types/customers';

// ==========================================
// Types
// ==========================================

export interface LoyaltySyncResult {
  success: boolean;
  customerId: string;
  calculated: {
    points: number;
    tier: string;
    ordersProcessed: number;
    totalSpent: number;
  };
  alpine?: {
    points: number;
    tier: string;
    lastVisit: string;
  };
  reconciliation: {
    reconciled: boolean;
    discrepancy: number;
    discrepancyPercent: number;
    action: 'none' | 'alert_admin';
  };
  updatedAt: Date;
}

export interface BatchSyncResult {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  discrepancies: Array<{
    customerId: string;
    calculated: number;
    alpine: number;
    difference: number;
  }>;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
  duration: number;
}

export interface ReconciliationResult {
  customerId: string;
  reconciled: boolean;
  calculated: {
    points: number;
    source: 'orders';
  };
  alpine: {
    points: number;
    source: 'alpine_iq';
  };
  discrepancy: number;
  discrepancyPercent: number;
  recommendation: 'none' | 'alert_admin' | 'needs_review';
}

// ==========================================
// LoyaltySyncService
// ==========================================

export class LoyaltySyncService {
  private posClient: ALLeavesClient;
  private alpineClient: AlpineIQClient;
  private firestore: ReturnType<typeof getAdminFirestore>;

  // Thresholds
  private readonly DISCREPANCY_THRESHOLD = 0.10; // 10%
  private readonly BATCH_SIZE = 50; // Process 50 customers at a time

  constructor(
    posClient: ALLeavesClient,
    alpineClient?: AlpineIQClient
  ) {
    this.posClient = posClient;
    this.alpineClient = alpineClient || new AlpineIQClient();
    this.firestore = getAdminFirestore();
  }

  /**
   * Sync loyalty data for a single customer
   */
  async syncCustomer(
    customerId: string,
    orgId: string,
    loyaltySettings: LoyaltySettings
  ): Promise<LoyaltySyncResult> {
    const startTime = Date.now();

    try {
      logger.info('[LoyaltySync] Starting sync for customer', { customerId, orgId });

      // 1. Fetch customer data from Alleaves
      const alleaveCustomers = await this.posClient.getAllCustomers(1, 100);
      const alleaveCustomer = alleaveCustomers.find(
        (c: any) => c.id_customer.toString() === customerId
      );

      if (!alleaveCustomer) {
        throw new Error(`Customer ${customerId} not found in Alleaves`);
      }

      // 2. Calculate points from order history
      const calculated = await this.calculatePointsFromOrders(
        alleaveCustomer,
        loyaltySettings
      );

      // 3. Fetch Alpine IQ points (source of truth)
      let alpine: { points: number; tier: string; lastVisit: string } | undefined;

      if (alleaveCustomer.phone || alleaveCustomer.alpine_user_code) {
        const alpineProfile = await this.alpineClient.getLoyaltyProfile(
          alleaveCustomer.phone || alleaveCustomer.alpine_user_code
        );

        if (alpineProfile) {
          alpine = {
            points: alpineProfile.points,
            tier: alpineProfile.tier,
            lastVisit: alpineProfile.lastVisit
          };
        }
      }

      // 4. Reconcile and determine action
      const reconciliation = this.reconcile(
        calculated.points,
        alpine?.points
      );

      // 5. Update Firestore customer profile
      // Use Alpine IQ as source of truth, fall back to calculated
      const finalPoints = alpine?.points ?? calculated.points;
      const finalTier = alpine?.tier ?? calculated.tier;

      await this.updateCustomerProfile(orgId, customerId, {
        points: finalPoints,
        pointsFromOrders: calculated.points,
        pointsFromAlpine: alpine?.points,
        tier: finalTier as any,
        tierSource: alpine ? 'alpine_iq' : 'calculated',
        loyaltyReconciled: reconciliation.reconciled,
        loyaltyDiscrepancy: reconciliation.discrepancy,
        pointsLastCalculated: new Date(),
        alpineUserId: alleaveCustomer.alpine_user_code || undefined,
      });

      const duration = Date.now() - startTime;

      logger.info('[LoyaltySync] Sync completed', {
        customerId,
        duration,
        calculated: calculated.points,
        alpine: alpine?.points,
        reconciled: reconciliation.reconciled
      });

      return {
        success: true,
        customerId,
        calculated,
        alpine,
        reconciliation,
        updatedAt: new Date()
      };

    } catch (error) {
      logger.error('[LoyaltySync] Sync failed', {
        customerId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Sync all customers for an organization
   */
  async syncAllCustomers(
    orgId: string,
    loyaltySettings: LoyaltySettings
  ): Promise<BatchSyncResult> {
    const startTime = Date.now();

    logger.info('[LoyaltySync] Starting batch sync', { orgId });

    const result: BatchSyncResult = {
      success: true,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      discrepancies: [],
      errors: [],
      duration: 0
    };

    try {
      // 1. Fetch all customers from Alleaves
      const customers = await this.posClient.getAllCustomersPaginated(100);
      result.totalProcessed = customers.length;

      logger.info('[LoyaltySync] Processing customers', { count: customers.length });

      // 2. Get customer spending data in bulk
      const spendingMap = await this.posClient.getCustomerSpending();

      // 3. Process in batches
      for (let i = 0; i < customers.length; i += this.BATCH_SIZE) {
        const batch = customers.slice(i, i + this.BATCH_SIZE);

        await Promise.all(
          batch.map(async (customer: any) => {
            try {
              const customerId = customer.id_customer.toString();
              const spending = spendingMap.get(customer.id_customer);

              // Calculate points
              const calculated = await this.calculatePointsFromSpending(
                spending?.totalSpent || 0,
                spending?.orderCount || 0,
                loyaltySettings,
                customer.equityStatus || false
              );

              // Try to fetch Alpine IQ points
              let alpine: { points: number; tier: string } | undefined;

              if (customer.phone) {
                const alpineProfile = await this.alpineClient.getLoyaltyProfile(customer.phone);
                if (alpineProfile) {
                  alpine = {
                    points: alpineProfile.points,
                    tier: alpineProfile.tier
                  };
                }
              }

              // Reconcile
              const reconciliation = this.reconcile(
                calculated.points,
                alpine?.points
              );

              // Track discrepancies
              if (!reconciliation.reconciled && alpine) {
                result.discrepancies.push({
                  customerId,
                  calculated: calculated.points,
                  alpine: alpine.points,
                  difference: reconciliation.discrepancy
                });
              }

              // Update Firestore
              const finalPoints = alpine?.points ?? calculated.points;
              const finalTier = alpine?.tier ?? calculated.tier;

              await this.updateCustomerProfile(orgId, customerId, {
                points: finalPoints,
                pointsFromOrders: calculated.points,
                pointsFromAlpine: alpine?.points,
                tier: finalTier as any,
                tierSource: alpine ? 'alpine_iq' : 'calculated',
                loyaltyReconciled: reconciliation.reconciled,
                loyaltyDiscrepancy: reconciliation.discrepancy,
                pointsLastCalculated: new Date(),
                alpineUserId: customer.alpine_user_code || undefined,
              });

              result.successful++;

            } catch (error) {
              result.failed++;
              result.errors.push({
                customerId: customer.id_customer.toString(),
                error: error instanceof Error ? error.message : String(error)
              });

              logger.error('[LoyaltySync] Customer sync failed', {
                customerId: customer.id_customer,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          })
        );

        logger.info('[LoyaltySync] Batch processed', {
          batch: Math.floor(i / this.BATCH_SIZE) + 1,
          processed: Math.min(i + this.BATCH_SIZE, customers.length),
          total: customers.length
        });
      }

      result.duration = Date.now() - startTime;
      result.success = result.failed === 0;

      logger.info('[LoyaltySync] Batch sync completed', {
        orgId,
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        discrepancies: result.discrepancies.length,
        duration: result.duration
      });

      return result;

    } catch (error) {
      logger.error('[LoyaltySync] Batch sync failed', {
        orgId,
        error: error instanceof Error ? error.message : String(error)
      });

      result.success = false;
      result.duration = Date.now() - startTime;

      throw error;
    }
  }

  /**
   * Calculate points from order history
   */
  private async calculatePointsFromOrders(
    customer: any,
    loyaltySettings: LoyaltySettings
  ): Promise<{
    points: number;
    tier: string;
    ordersProcessed: number;
    totalSpent: number;
  }> {
    try {
      // Get spending data for this customer
      const spendingMap = await this.posClient.getCustomerSpending();
      const spending = spendingMap.get(customer.id_customer);

      if (!spending) {
        return {
          points: 0,
          tier: 'bronze',
          ordersProcessed: 0,
          totalSpent: 0
        };
      }

      return this.calculatePointsFromSpending(
        spending.totalSpent,
        spending.orderCount,
        loyaltySettings,
        customer.equityStatus || false
      );

    } catch (error) {
      logger.error('[LoyaltySync] Failed to calculate points', {
        customerId: customer.id_customer,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        points: 0,
        tier: 'bronze',
        ordersProcessed: 0,
        totalSpent: 0
      };
    }
  }

  /**
   * Calculate points from spending data
   */
  private calculatePointsFromSpending(
    totalSpent: number,
    orderCount: number,
    loyaltySettings: LoyaltySettings,
    isEquity: boolean
  ): {
    points: number;
    tier: string;
    ordersProcessed: number;
    totalSpent: number;
  } {
    // Base points
    const basePoints = totalSpent * loyaltySettings.pointsPerDollar;

    // Equity bonus
    const equityBonus = isEquity
      ? basePoints * (loyaltySettings.equityMultiplier - 1)
      : 0;

    const totalPoints = Math.round(basePoints + equityBonus);

    // Determine tier
    const tier = this.calculateTier(totalPoints, loyaltySettings);

    return {
      points: totalPoints,
      tier,
      ordersProcessed: orderCount,
      totalSpent
    };
  }

  /**
   * Calculate tier based on points
   */
  private calculateTier(points: number, loyaltySettings: LoyaltySettings): string {
    const sortedTiers = [...loyaltySettings.tiers].sort((a, b) => b.threshold - a.threshold);

    const tier = sortedTiers.find(t => points >= t.threshold);

    return tier?.name || 'Bronze';
  }

  /**
   * Reconcile calculated points with Alpine IQ
   */
  private reconcile(
    calculatedPoints: number,
    alpinePoints?: number
  ): {
    reconciled: boolean;
    discrepancy: number;
    discrepancyPercent: number;
    action: 'none' | 'alert_admin';
  } {
    // If no Alpine IQ data, consider reconciled (using calculated)
    if (!alpinePoints) {
      return {
        reconciled: true,
        discrepancy: 0,
        discrepancyPercent: 0,
        action: 'none'
      };
    }

    const discrepancy = Math.abs(alpinePoints - calculatedPoints);
    const discrepancyPercent = alpinePoints > 0
      ? discrepancy / alpinePoints
      : 0;

    const reconciled = discrepancyPercent <= this.DISCREPANCY_THRESHOLD;
    const action = reconciled ? 'none' : 'alert_admin';

    return {
      reconciled,
      discrepancy,
      discrepancyPercent,
      action
    };
  }

  /**
   * Update customer profile in Firestore
   */
  private async updateCustomerProfile(
    orgId: string,
    customerId: string,
    updates: Partial<CustomerProfile>
  ): Promise<void> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      // Filter out undefined values (Firestore doesn't allow them)
      const cleanUpdates: any = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      }

      await customerRef.set(
        {
          ...cleanUpdates,
          updatedAt: new Date()
        },
        { merge: true }
      );

      logger.debug('[LoyaltySync] Customer profile updated', {
        orgId,
        customerId,
        points: updates.points
      });

    } catch (error) {
      logger.error('[LoyaltySync] Failed to update customer profile', {
        orgId,
        customerId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Get reconciliation report for a customer
   */
  async getReconciliationReport(
    customerId: string,
    orgId: string
  ): Promise<ReconciliationResult | null> {
    try {
      const customerRef = this.firestore
        .collection('customers')
        .doc(`${orgId}_${customerId}`);

      const doc = await customerRef.get();

      if (!doc.exists) {
        return null;
      }

      const profile = doc.data() as CustomerProfile;

      const reconciled = profile.loyaltyReconciled ?? true;
      const discrepancy = profile.loyaltyDiscrepancy ?? 0;
      const discrepancyPercent = profile.pointsFromAlpine
        ? discrepancy / profile.pointsFromAlpine
        : 0;

      let recommendation: 'none' | 'alert_admin' | 'needs_review' = 'none';

      if (!reconciled) {
        recommendation = discrepancyPercent > this.DISCREPANCY_THRESHOLD
          ? 'alert_admin'
          : 'needs_review';
      }

      return {
        customerId,
        reconciled,
        calculated: {
          points: profile.pointsFromOrders || 0,
          source: 'orders'
        },
        alpine: {
          points: profile.pointsFromAlpine || 0,
          source: 'alpine_iq'
        },
        discrepancy,
        discrepancyPercent,
        recommendation
      };

    } catch (error) {
      logger.error('[LoyaltySync] Failed to get reconciliation report', {
        customerId,
        orgId,
        error: error instanceof Error ? error.message : String(error)
      });

      return null;
    }
  }
}
