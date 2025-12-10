/**
 * Unit Tests: iHeart Integration Service
 *
 * Tests for iHeart loyalty platform integration
 * Verifies customer profile management, points calculation, and rewards redemption
 *
 * [BUILDER-MODE @ 2025-12-10]
 * Created as part of feat_iheart_loyalty_production (test_iheart_service_mock)
 */

import { IHeartService, IHeartCustomer, IHeartApiConfig } from '@/server/services/iheart';

// Mock logger to prevent console spam during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('IHeartService', () => {
  let service: IHeartService;
  let mockConfig: IHeartApiConfig;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      baseUrl: 'https://api.test.com',
      merchantId: 'test-merchant',
    };
    service = new IHeartService(mockConfig);
    jest.clearAllMocks();
  });

  describe('upsertCustomer', () => {
    it('should successfully create/update customer profile', async () => {
      const customer: IHeartCustomer = {
        id: 'cust_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15555551234',
        state: 'IL',
      };

      const result = await service.upsertCustomer(customer);

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('cust_123');
      expect(result.error).toBeUndefined();
    });

    it('should handle customer with medical card', async () => {
      const customer: IHeartCustomer = {
        id: 'cust_456',
        email: 'medical@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        hasMedicalCard: true,
        state: 'CA',
      };

      const result = await service.upsertCustomer(customer);

      expect(result.success).toBe(true);
      expect(result.customerId).toBe('cust_456');
    });

    it('should handle errors gracefully', async () => {
      // Mock makeRequest to throw error
      jest.spyOn(service as any, 'makeRequest').mockRejectedValueOnce(
        new Error('API connection failed')
      );

      const customer: IHeartCustomer = {
        id: 'cust_error',
        email: 'error@example.com',
      };

      const result = await service.upsertCustomer(customer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API connection failed');
    });
  });

  describe('getLoyaltyProfile', () => {
    it('should fetch customer loyalty profile', async () => {
      const profile = await service.getLoyaltyProfile('cust_123');

      expect(profile).toBeDefined();
      expect(profile?.customerId).toBe('cust_123');
      expect(profile?.points).toBeGreaterThanOrEqual(0);
      expect(profile?.tier).toMatch(/New|Regular|VIP/);
      expect(profile?.totalOrders).toBeGreaterThanOrEqual(0);
      expect(profile?.totalSpent).toBeGreaterThanOrEqual(0);
    });

    it('should calculate correct tier based on points', async () => {
      // Mock different point levels
      jest.spyOn(service as any, 'makeRequest').mockResolvedValueOnce({
        points: 50,
        total_orders: 1,
        total_spent: 50,
      });

      const newProfile = await service.getLoyaltyProfile('cust_new');
      expect(newProfile?.tier).toBe('New');

      jest.spyOn(service as any, 'makeRequest').mockResolvedValueOnce({
        points: 500,
        total_orders: 10,
        total_spent: 500,
      });

      const regularProfile = await service.getLoyaltyProfile('cust_regular');
      expect(regularProfile?.tier).toBe('Regular');

      jest.spyOn(service as any, 'makeRequest').mockResolvedValueOnce({
        points: 1500,
        total_orders: 30,
        total_spent: 1500,
      });

      const vipProfile = await service.getLoyaltyProfile('cust_vip');
      expect(vipProfile?.tier).toBe('VIP');
    });

    it('should return null on error', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValueOnce(
        new Error('Customer not found')
      );

      const profile = await service.getLoyaltyProfile('cust_notfound');

      expect(profile).toBeNull();
    });
  });

  describe('awardPoints', () => {
    it('should award points based on order total', async () => {
      const result = await service.awardPoints({
        customerId: 'cust_123',
        orderId: 'order_abc',
        orderTotal: 50.0,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50); // 1 point per dollar by default
      expect(result.newBalance).toBeGreaterThanOrEqual(50);
    });

    it('should apply points multiplier correctly', async () => {
      const result = await service.awardPoints({
        customerId: 'cust_123',
        orderId: 'order_xyz',
        orderTotal: 100.0,
        pointsMultiplier: 2, // Double points promotion
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(200); // 100 * 2
    });

    it('should round points to nearest integer', async () => {
      const result = await service.awardPoints({
        customerId: 'cust_123',
        orderId: 'order_def',
        orderTotal: 49.99,
      });

      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(50); // Math.round(49.99)
    });

    it('should handle errors when awarding points', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValueOnce(
        new Error('Transaction failed')
      );

      const result = await service.awardPoints({
        customerId: 'cust_error',
        orderId: 'order_error',
        orderTotal: 100.0,
      });

      expect(result.success).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.error).toBe('Transaction failed');
    });
  });

  describe('redeemPoints', () => {
    it('should redeem points for a reward', async () => {
      const result = await service.redeemPoints('cust_123', 'reward_10off', 100);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBeGreaterThanOrEqual(0);
    });

    it('should handle redemption errors', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValueOnce(
        new Error('Insufficient points')
      );

      const result = await service.redeemPoints('cust_123', 'reward_expensive', 10000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient points');
    });
  });

  describe('getRewards', () => {
    it('should fetch rewards catalog', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValueOnce({
        rewards: [
          {
            id: 'reward_1',
            name: '$5 Off',
            description: '$5 off your next order',
            pointsCost: 50,
            active: true,
          },
          {
            id: 'reward_2',
            name: '$10 Off',
            description: '$10 off your next order',
            pointsCost: 100,
            active: true,
          },
        ],
      });

      const rewards = await service.getRewards();

      expect(rewards).toHaveLength(2);
      expect(rewards[0].name).toBe('$5 Off');
      expect(rewards[1].pointsCost).toBe(100);
    });

    it('should return empty array on error', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValueOnce(
        new Error('API unavailable')
      );

      const rewards = await service.getRewards();

      expect(rewards).toEqual([]);
    });
  });

  describe('tier calculation', () => {
    it('should calculate New tier for points < 300', () => {
      const service = new IHeartService(mockConfig);
      expect((service as any).calculateTier(0)).toBe('New');
      expect((service as any).calculateTier(100)).toBe('New');
      expect((service as any).calculateTier(299)).toBe('New');
    });

    it('should calculate Regular tier for points 300-999', () => {
      const service = new IHeartService(mockConfig);
      expect((service as any).calculateTier(300)).toBe('Regular');
      expect((service as any).calculateTier(500)).toBe('Regular');
      expect((service as any).calculateTier(999)).toBe('Regular');
    });

    it('should calculate VIP tier for points >= 1000', () => {
      const service = new IHeartService(mockConfig);
      expect((service as any).calculateTier(1000)).toBe('VIP');
      expect((service as any).calculateTier(5000)).toBe('VIP');
      expect((service as any).calculateTier(10000)).toBe('VIP');
    });
  });
});
