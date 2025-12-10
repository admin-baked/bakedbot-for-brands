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
   * Create or update customer profile in iHeart
   */
  async upsertCustomer(customer: IHeartCustomer): Promise<{ success: boolean; customerId: string; error?: string }> {
    try {
      logger.info('[iHeart] Upserting customer', {
        customerId: customer.id,
        email: customer.email
      });

      // Mock API call - replace with actual iHeart API integration
      const response = await this.makeRequest('POST', '/customers', {
        customer_id: customer.id,
        email: customer.email,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
        date_of_birth: customer.dateOfBirth,
        state: customer.state,
        medical_card: customer.hasMedicalCard,
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

      // Mock API call - replace with actual iHeart API integration
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

      // Mock API call - replace with actual iHeart API integration
      const response = await this.makeRequest('POST', `/customers/${transaction.customerId}/transactions`, {
        order_id: transaction.orderId,
        order_total: transaction.orderTotal,
        points_earned: pointsEarned,
        points_redeemed: 0,
        transaction_date: new Date().toISOString(),
      });

      return {
        success: true,
        pointsAwarded: pointsEarned,
        newBalance: response.new_balance || pointsEarned,
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

      // Mock API call - replace with actual iHeart API integration
      const response = await this.makeRequest('POST', `/customers/${customerId}/redeem`, {
        reward_id: rewardId,
        points_cost: pointsCost,
        redeemed_at: new Date().toISOString(),
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

      // Mock API call - replace with actual iHeart API integration
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

    // Mock implementation - replace with actual HTTP client
    logger.debug('[iHeart] API Request', { method, url, body });

    // Simulate API response delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock successful response
    return {
      success: true,
      points: 100,
      total_orders: 5,
      total_spent: 250.00,
      new_balance: 100,
      rewards: [],
    };
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
