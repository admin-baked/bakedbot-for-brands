/**
 * Bundle Redemption Service Tests
 */

import { BundleRedemptionService } from '../bundle-redemption';

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

describe('BundleRedemptionService', () => {
  let service: BundleRedemptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BundleRedemptionService();

    // Default mock setup
    mockCollection.mockReturnValue({
      doc: jest.fn(() => ({
        get: mockGet,
        collection: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn(() => ({ size: 0 })),
          })),
        })),
      })),
    });
  });

  describe('canCustomerRedeem', () => {
    it('returns false when bundle not found', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const result = await service.canCustomerRedeem('bundle-123', 'customer-456');

      expect(result.canRedeem).toBe(false);
      expect(result.reason).toBe('Bundle not found');
    });

    it('returns false when bundle is not active', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'expired',
          currentRedemptions: 0,
        }),
      });

      const result = await service.canCustomerRedeem('bundle-123', 'customer-456');

      expect(result.canRedeem).toBe(false);
      expect(result.reason).toBe('Bundle is expired');
    });

    it('returns false when global limit reached', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'active',
          maxRedemptions: 100,
          currentRedemptions: 100,
        }),
      });

      const result = await service.canCustomerRedeem('bundle-123', 'customer-456');

      expect(result.canRedeem).toBe(false);
      expect(result.reason).toBe('Bundle redemption limit reached');
    });

    it('returns true when bundle is active and no limits', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'active',
          currentRedemptions: 10,
        }),
      });

      const result = await service.canCustomerRedeem('bundle-123', 'customer-456');

      expect(result.canRedeem).toBe(true);
      expect(result.currentCount).toBe(0);
    });
  });

  describe('recordRedemption', () => {
    it('returns error when bundle not found in transaction', async () => {
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

      const result = await service.recordRedemption(
        'bundle-123',
        'customer-456',
        'order-789',
        'org-001'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bundle not found');
    });

    it('returns error when bundle is not active', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              status: 'expired',
              currentRedemptions: 0,
            }),
          }),
          update: jest.fn(),
          set: jest.fn(),
        };

        return await callback(transaction);
      });

      const result = await service.recordRedemption(
        'bundle-123',
        'customer-456',
        'order-789',
        'org-001'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });
  });

  describe('getRedemptionHistory', () => {
    it('returns empty array on error', async () => {
      mockCollection.mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getRedemptionHistory('bundle-123');

      expect(result).toEqual([]);
    });
  });

  describe('getRedemptionStats', () => {
    it('returns null on error', async () => {
      mockCollection.mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getRedemptionStats('bundle-123');

      expect(result).toBeNull();
    });
  });
});
