/**
 * Loyalty Redemption Service Tests
 */

import { LoyaltyRedemptionService } from '../loyalty-redemption';
import type { LoyaltySettings, RedemptionTier } from '@/types/customers';
import { DEFAULT_LOYALTY_SETTINGS } from '@/types/customers';

// Mock Firestore
const mockRunTransaction = jest.fn();
const mockGet = jest.fn();
const mockCollection = jest.fn();

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LoyaltyRedemptionService', () => {
  let service: LoyaltyRedemptionService;
  let loyaltySettings: LoyaltySettings;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LoyaltyRedemptionService();
    loyaltySettings = DEFAULT_LOYALTY_SETTINGS;

    // Default mock setup
    mockCollection.mockReturnValue({
      doc: jest.fn(() => ({
        get: mockGet,
      })),
    });
  });

  describe('calculateDollarValue', () => {
    it('calculates $5 for 100 points (small tier)', () => {
      const value = service.calculateDollarValue(100, loyaltySettings);

      expect(value).toBe(5);
    });

    it('calculates $15 for 250 points (medium tier)', () => {
      const value = service.calculateDollarValue(250, loyaltySettings);

      expect(value).toBe(15);
    });

    it('calculates $35 for 500 points (large tier)', () => {
      const value = service.calculateDollarValue(500, loyaltySettings);

      expect(value).toBe(35);
    });

    it('returns 0 when points below minimum tier', () => {
      const value = service.calculateDollarValue(50, loyaltySettings);

      expect(value).toBe(0);
    });

    it('uses best tier exchange rate for higher points', () => {
      // 500 points = $35 (large tier, 14 points per dollar)
      // So 1000 points should be $70
      const value = service.calculateDollarValue(1000, loyaltySettings);

      expect(value).toBeCloseTo(70, 2);
    });

    it('falls back to 100:1 ratio when no tiers configured', () => {
      const noTiersSettings: LoyaltySettings = {
        ...loyaltySettings,
        redemptionTiers: [],
      };

      const value = service.calculateDollarValue(200, noTiersSettings);

      expect(value).toBe(2); // 200 points = $2 at 100:1 ratio
    });
  });

  describe('validateRedemption', () => {
    it('returns invalid when customer not found', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await service.validateRedemption(
        'customer-123',
        'org-001',
        100,
        loyaltySettings
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    it('returns invalid when insufficient points', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          points: 50,
        }),
      });

      const result = await service.validateRedemption(
        'customer-123',
        'org-001',
        100,
        loyaltySettings
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Insufficient points');
      expect(result.maxPoints).toBe(50);
    });

    it('returns invalid when below minimum tier', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          points: 75,
        }),
      });

      const result = await service.validateRedemption(
        'customer-123',
        'org-001',
        75,
        loyaltySettings
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum redemption');
    });

    it('returns valid with suggested tier when points sufficient', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          points: 250,
        }),
      });

      const result = await service.validateRedemption(
        'customer-123',
        'org-001',
        250,
        loyaltySettings
      );

      expect(result.isValid).toBe(true);
      expect(result.maxPoints).toBe(250);
      expect(result.suggestedTier).toBeDefined();
      expect(result.suggestedTier?.pointsCost).toBe(250);
    });
  });

  describe('redeemPoints', () => {
    it('returns error when customer not found in transaction', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: false,
          }),
          update: jest.fn(),
          set: jest.fn(),
        };

        return await callback(transaction);
      });

      const result = await service.redeemPoints(
        {
          customerId: 'customer-123',
          orgId: 'org-001',
          pointsToRedeem: 100,
          orderId: 'order-789',
          orderTotal: 50,
        },
        loyaltySettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });

    it('returns error when insufficient points in transaction', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              points: 50,
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };

        return await callback(transaction);
      });

      const result = await service.redeemPoints(
        {
          customerId: 'customer-123',
          orgId: 'org-001',
          pointsToRedeem: 100,
          orderId: 'order-789',
          orderTotal: 50,
        },
        loyaltySettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient points');
    });

    it('returns error when redemption exceeds order total', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              points: 500,
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };

        return await callback(transaction);
      });

      const result = await service.redeemPoints(
        {
          customerId: 'customer-123',
          orgId: 'org-001',
          pointsToRedeem: 500, // Worth $35
          orderId: 'order-789',
          orderTotal: 20, // Only $20 order
        },
        loyaltySettings
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds order total');
    });
  });

  describe('getSuggestedRedemptions', () => {
    it('returns empty array when customer not found', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await service.getSuggestedRedemptions(
        'customer-123',
        'org-001',
        loyaltySettings
      );

      expect(result).toEqual([]);
    });

    it('marks tiers as canRedeem=false when insufficient points', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          points: 150,
        }),
      });

      const result = await service.getSuggestedRedemptions(
        'customer-123',
        'org-001',
        loyaltySettings
      );

      // Customer has 150 points
      // Can redeem: 100 point tier (yes)
      // Cannot redeem: 250 point tier (needs 100 more)
      // Cannot redeem: 500 point tier (needs 350 more)
      expect(result.length).toBe(3);
      expect(result[0].canRedeem).toBe(true); // 100 points
      expect(result[1].canRedeem).toBe(false); // 250 points
      expect(result[1].pointsNeeded).toBe(100);
      expect(result[2].canRedeem).toBe(false); // 500 points
      expect(result[2].pointsNeeded).toBe(350);
    });

    it('marks all tiers as canRedeem=true when enough points', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          points: 600,
        }),
      });

      const result = await service.getSuggestedRedemptions(
        'customer-123',
        'org-001',
        loyaltySettings
      );

      expect(result.length).toBe(3);
      expect(result.every((r) => r.canRedeem)).toBe(true);
      expect(result.every((r) => r.pointsNeeded === undefined)).toBe(true);
    });
  });

  describe('getRedemptionHistory', () => {
    it('returns empty array on error', async () => {
      mockCollection.mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getRedemptionHistory(
        'customer-123',
        'org-001'
      );

      expect(result).toEqual([]);
    });
  });
});
