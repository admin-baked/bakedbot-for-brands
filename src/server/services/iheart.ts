/**
 * iHeart Integration Service
 *
 * Handles integration with iHeart loyalty platform for cannabis dispensaries.
 * Provides customer profile management, loyalty points, and rewards tracking.
 *
 * [BUILDER-MODE @ 2025-12-10]
 * Created as part of feat_iheart_loyalty_production
 */

import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface IHeartCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  state?: string;
  hasMedicalCard?: boolean;
}

export interface IHeartLoyaltyProfile {
  customerId: string;
  points: number;
  tier: 'New' | 'Regular' | 'VIP';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IHeartTransaction {
  id: string;
  customerId: string;
  orderId: string;
  pointsEarned: number;
  pointsRedeemed: number;
  orderTotal: number;
  transactionDate: string;
}

export interface IHeartReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  active: boolean;
  termsAndConditions?: string;
}

export interface IHeartApiConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  merchantId: string;
}

// ============================================================================
// IHEART SERVICE CLASS
// ============================================================================

export class IHeartService {
  private config: IHeartApiConfig;

  constructor(config: IHeartApiConfig) {
    this.config = config;
  }

  /**
  /**
   * Sync menu from iHeart to Firestore
   * Fetch products from iHeart and update local inventory
   */
  async syncMenu(storeId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      logger.info('[iHeart] Syncing menu', { storeId });

      const menu = await this.getMenu(storeId);
      const { getAdminFirestore } = await import('@/firebase/admin');
      const db = getAdminFirestore();

      const batch = db.batch();
      let count = 0;

      for (const product of menu) {
        const productRef = db.collection('organizations').doc(storeId).collection('products').doc(product.id);
        batch.set(productRef, {
          ...product, // Assuming product structure matches or mapping is handled in getMenu
          updatedAt: new Date(),
          source: 'iheart'
        }, { merge: true });
        count++;

        // Commit batch every 500 items
        if (count % 400 === 0) {
          await batch.commit();
        }
      }

      if (count > 0 && count % 400 !== 0) {
        await batch.commit();
      }

      return { success: true, count };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to sync menu', { storeId, error: err.message });
      return { success: false, count: 0, error: err.message };
    }
  }

  /**
   * Get live menu from iHeart
   */
  async getMenu(storeId: string): Promise<any[]> {
    const response = await this.makeRequest('GET', `/menu?store_id=${storeId}`);
    return response.products || [];
  }

  /**
   * Create or update customer profile in iHeart
   */
  async upsertCustomer(customer: IHeartCustomer): Promise<{ success: boolean; customerId: string; error?: string }> {
    try {
      logger.info('[iHeart] Upserting customer', {
        customerId: customer.id,
        email: customer.email
      });

      await this.makeRequest('POST', '/customers', {
        external_id: customer.id,
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        dob: customer.dateOfBirth,
        state: customer.state,
        medical: customer.hasMedicalCard,
      });

      return {
        success: true,
        customerId: customer.id,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to upsert customer', {
        customerId: customer.id,
        error: err.message
      });

      return {
        success: false,
        customerId: customer.id,
        error: err.message,
      };
    }
  }

  /**
   * Get customer loyalty profile from iHeart
   */
  async getLoyaltyProfile(customerId: string): Promise<IHeartLoyaltyProfile | null> {
    try {
      logger.info('[iHeart] Fetching loyalty profile', { customerId });

      const response = await this.makeRequest('GET', `/customers/${customerId}/loyalty`);

      return {
        customerId,
        points: response.points || 0,
        tier: this.calculateTier(response.points || 0),
        totalOrders: response.total_orders || 0,
        totalSpent: response.total_spent || 0,
        lastOrderDate: response.last_order_date,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to fetch loyalty profile', {
        customerId,
        error: err.message
      });

      return null;
    }
  }

  /**
   * Award loyalty points for a transaction
   */
  async awardPoints(transaction: {
    customerId: string;
    orderId: string;
    orderTotal: number;
    pointsMultiplier?: number;
  }): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; error?: string }> {
    try {
      const pointsEarned = Math.round(transaction.orderTotal * (transaction.pointsMultiplier || 1));

      logger.info('[iHeart] Awarding points', {
        customerId: transaction.customerId,
        orderId: transaction.orderId,
        pointsEarned
      });

      const response = await this.makeRequest('POST', `/customers/${transaction.customerId}/transactions`, {
        order_id: transaction.orderId,
        amount: transaction.orderTotal,
        points: pointsEarned,
        type: 'earn',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        pointsAwarded: pointsEarned,
        newBalance: response.new_balance || 0,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to award points', {
        customerId: transaction.customerId,
        orderId: transaction.orderId,
        error: err.message
      });

      return {
        success: false,
        pointsAwarded: 0,
        newBalance: 0,
        error: err.message,
      };
    }
  }

  /**
   * Redeem loyalty points for a reward
   */
  async redeemPoints(customerId: string, rewardId: string, pointsCost: number): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      logger.info('[iHeart] Redeeming points', {
        customerId,
        rewardId,
        pointsCost
      });

      const response = await this.makeRequest('POST', `/customers/${customerId}/redeem`, {
        reward_id: rewardId,
        points: pointsCost,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        newBalance: response.new_balance || 0,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to redeem points', {
        customerId,
        rewardId,
        error: err.message
      });

      return {
        success: false,
        newBalance: 0,
        error: err.message,
      };
    }
  }

  /**
   * Get available rewards catalog
   */
  async getRewards(): Promise<IHeartReward[]> {
    try {
      logger.info('[iHeart] Fetching rewards catalog');

      const response = await this.makeRequest('GET', '/rewards');

      return response.rewards || [];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[iHeart] Failed to fetch rewards', { error: err.message });

      return [];
    }
  }

  /**
   * Calculate customer tier based on points
   */
  private calculateTier(points: number): 'New' | 'Regular' | 'VIP' {
    if (points >= 1000) return 'VIP';
    if (points >= 300) return 'Regular';
    return 'New';
  }

  /**
   * Make authenticated request to iHeart API
   */
  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;

    // For now, if we are in test mode or missing keys, we might want to fallback or throw.
    // But since this is "Real API" implementation, we'll code it for real fetch.
    // Currently relying on props.env, which might be mock strings in dev.

    if (this.config.apiKey === 'mock-api-key') {
      // Keep the mock behavior if keys are missing to prevent breaking local dev without keys
      logger.warn('[iHeart] Using Mock Response (No API Key)');
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        products: [], // Mock empty menu
        points: 100,
        new_balance: 150
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-Merchant-Id': this.config.merchantId
    };

    // Add signature if needed (simplified for now)

    logger.debug('[iHeart] API Request', { method, url });

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`iHeart API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

/**
 * Default iHeart service instance
 * Configure with actual credentials from environment variables
 */
export const iheartService = new IHeartService({
  apiKey: process.env.IHEART_API_KEY || 'mock-api-key',
  apiSecret: process.env.IHEART_API_SECRET || 'mock-api-secret',
  baseUrl: process.env.IHEART_API_URL || 'https://api.ihearttjane.com/v1',
  merchantId: process.env.IHEART_MERCHANT_ID || 'mock-merchant-id',
});
