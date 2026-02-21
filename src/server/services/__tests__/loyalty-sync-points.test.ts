/**
 * Loyalty Sync Service - Points Calculation Tests
 */

import { LoyaltySyncService } from '../loyalty-sync';
import type { LoyaltySettings } from '@/types/customers';
import { DEFAULT_LOYALTY_SETTINGS } from '@/types/customers';

// Mock dependencies
jest.mock('@/lib/pos/adapters/alleaves');
jest.mock('@/server/integrations/alpine-iq/client');

// Mock Firestore
const mockRunTransaction = jest.fn();
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
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

describe('LoyaltySyncService - Points Calculation', () => {
  let service: LoyaltySyncService;
  let loyaltySettings: LoyaltySettings;

  beforeEach(() => {
    jest.clearAllMocks();
    loyaltySettings = DEFAULT_LOYALTY_SETTINGS; // 1 point per dollar, 1.2x equity multiplier
    service = new LoyaltySyncService({} as any, undefined);
  });

  describe('calculatePointsForOrder', () => {
    it('calculates base points correctly', () => {
      const points = service.calculatePointsForOrder(
        100, // $100 order
        loyaltySettings,
        false // Not equity customer
      );

      expect(points).toBe(100); // $100 * 1 point/dollar = 100 points
    });

    it('calculates points with equity bonus', () => {
      const points = service.calculatePointsForOrder(
        100, // $100 order
        loyaltySettings,
        true // Equity customer
      );

      // Base: $100 * 1 = 100 points
      // Equity bonus: 100 * (1.2 - 1) = 20 points
      // Total: 120 points
      expect(points).toBe(120);
    });

    it('floors fractional points', () => {
      const settingsWithFractional: LoyaltySettings = {
        ...loyaltySettings,
        pointsPerDollar: 1.5,
      };

      const points = service.calculatePointsForOrder(
        33, // $33 order
        settingsWithFractional,
        false
      );

      // $33 * 1.5 = 49.5 → floor to 49
      expect(points).toBe(49);
    });

    it('floors fractional points with equity bonus', () => {
      const settingsWithFractional: LoyaltySettings = {
        ...loyaltySettings,
        pointsPerDollar: 1.5,
        equityMultiplier: 1.25,
      };

      const points = service.calculatePointsForOrder(
        33, // $33 order
        settingsWithFractional,
        true
      );

      // Base: $33 * 1.5 = 49.5 points
      // Equity bonus: 49.5 * (1.25 - 1) = 12.375 points
      // Total: 49.5 + 12.375 = 61.875 → floor to 61
      expect(points).toBe(61);
    });

    it('calculates 0 points for $0 order', () => {
      const points = service.calculatePointsForOrder(
        0,
        loyaltySettings,
        false
      );

      expect(points).toBe(0);
    });

    it('works with custom points per dollar rate', () => {
      const customSettings: LoyaltySettings = {
        ...loyaltySettings,
        pointsPerDollar: 2,
      };

      const points = service.calculatePointsForOrder(
        50,
        customSettings,
        false
      );

      expect(points).toBe(100); // $50 * 2 points/dollar = 100
    });

    it('works with high equity multiplier', () => {
      const highEquitySettings: LoyaltySettings = {
        ...loyaltySettings,
        equityMultiplier: 2.0, // 2x for equity
      };

      const points = service.calculatePointsForOrder(
        100,
        highEquitySettings,
        true
      );

      // Base: $100 * 1 = 100 points
      // Equity bonus: 100 * (2.0 - 1) = 100 points
      // Total: 200 points
      expect(points).toBe(200);
    });

    it('handles decimal order totals correctly', () => {
      const points = service.calculatePointsForOrder(
        49.99,
        loyaltySettings,
        false
      );

      // $49.99 * 1 = 49.99 → floor to 49
      expect(points).toBe(49);
    });
  });

  describe('awardPointsForOrder', () => {
    it('returns error when transaction fails', async () => {
      mockRunTransaction.mockRejectedValue(new Error('Transaction failed'));

      const result = await service.awardPointsForOrder(
        'customer-123',
        'org-001',
        100,
        'order-789',
        loyaltySettings,
        false
      );

      expect(result.success).toBe(false);
      expect(result.pointsAwarded).toBe(0);
      expect(result.error).toContain('Transaction failed');
    });

    it('returns error when customer not found', async () => {
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

      const result = await service.awardPointsForOrder(
        'customer-123',
        'org-001',
        100,
        'order-789',
        loyaltySettings,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Customer not found');
    });
  });
});
