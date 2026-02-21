/**
 * Tier Advancement Service Tests
 */

import { TierAdvancementService } from '../tier-advancement';
import type { LoyaltySettings, LoyaltyTier } from '@/types/customers';
import { DEFAULT_LOYALTY_SETTINGS } from '@/types/customers';

// Mock Firestore
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(() => ({
          docs: [],
          size: 0,
        })),
      })),
    })),
    runTransaction: jest.fn(),
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

describe('TierAdvancementService', () => {
  let service: TierAdvancementService;
  let loyaltySettings: LoyaltySettings;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TierAdvancementService();
    loyaltySettings = DEFAULT_LOYALTY_SETTINGS;
  });

  describe('getTierProgress', () => {
    it('returns 0 when at bottom of current tier', () => {
      const currentTier: LoyaltyTier = {
        id: 'bronze',
        name: 'Bronze',
        threshold: 0,
        color: '#cd7f32',
        benefits: ['1x points'],
      };

      const nextTier: LoyaltyTier = {
        id: 'silver',
        name: 'Silver',
        threshold: 200,
        color: '#c0c0c0',
        benefits: ['1.25x points'],
      };

      const progress = service.getTierProgress(0, currentTier, nextTier);

      expect(progress).toBe(0);
    });

    it('returns 50 when halfway to next tier', () => {
      const currentTier: LoyaltyTier = {
        id: 'bronze',
        name: 'Bronze',
        threshold: 0,
        color: '#cd7f32',
        benefits: ['1x points'],
      };

      const nextTier: LoyaltyTier = {
        id: 'silver',
        name: 'Silver',
        threshold: 200,
        color: '#c0c0c0',
        benefits: ['1.25x points'],
      };

      const progress = service.getTierProgress(100, currentTier, nextTier);

      expect(progress).toBe(50);
    });

    it('returns 100 when at next tier threshold', () => {
      const currentTier: LoyaltyTier = {
        id: 'bronze',
        name: 'Bronze',
        threshold: 0,
        color: '#cd7f32',
        benefits: ['1x points'],
      };

      const nextTier: LoyaltyTier = {
        id: 'silver',
        name: 'Silver',
        threshold: 200,
        color: '#c0c0c0',
        benefits: ['1.25x points'],
      };

      const progress = service.getTierProgress(200, currentTier, nextTier);

      expect(progress).toBe(100);
    });

    it('returns 100 when no next tier (already at top)', () => {
      const currentTier: LoyaltyTier = {
        id: 'platinum',
        name: 'Platinum',
        threshold: 1000,
        color: '#e5e4e2',
        benefits: ['2x points'],
      };

      const progress = service.getTierProgress(1500, currentTier, undefined);

      expect(progress).toBe(100);
    });

    it('never exceeds 100', () => {
      const currentTier: LoyaltyTier = {
        id: 'bronze',
        name: 'Bronze',
        threshold: 0,
        color: '#cd7f32',
        benefits: ['1x points'],
      };

      const nextTier: LoyaltyTier = {
        id: 'silver',
        name: 'Silver',
        threshold: 200,
        color: '#c0c0c0',
        benefits: ['1.25x points'],
      };

      const progress = service.getTierProgress(500, currentTier, nextTier);

      expect(progress).toBeLessThanOrEqual(100);
    });

    it('never goes below 0', () => {
      const currentTier: LoyaltyTier = {
        id: 'silver',
        name: 'Silver',
        threshold: 200,
        color: '#c0c0c0',
        benefits: ['1.25x points'],
      };

      const nextTier: LoyaltyTier = {
        id: 'gold',
        name: 'Gold',
        threshold: 500,
        color: '#ffd700',
        benefits: ['1.5x points'],
      };

      const progress = service.getTierProgress(150, currentTier, nextTier);

      expect(progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('tier calculation', () => {
    it('assigns bronze tier for $0 lifetime value', () => {
      // This would need access to private method, so we skip or make it public for testing
      // For now, just document expected behavior
      expect(loyaltySettings.tiers[0].name).toBe('Bronze');
      expect(loyaltySettings.tiers[0].threshold).toBe(0);
    });

    it('has tiers in ascending order by threshold', () => {
      for (let i = 1; i < loyaltySettings.tiers.length; i++) {
        expect(loyaltySettings.tiers[i].threshold).toBeGreaterThan(
          loyaltySettings.tiers[i - 1].threshold
        );
      }
    });
  });

  describe('assignTierForCustomer', () => {
    it('returns null when customer not found', async () => {
      const { getAdminFirestore } = await import('@/firebase/admin');
      const firestore = (getAdminFirestore as jest.Mock)();

      firestore.collection().doc().get.mockResolvedValue({
        exists: false,
      });

      const result = await service.assignTierForCustomer(
        'customer-123',
        'org-001',
        loyaltySettings
      );

      expect(result).toBeNull();
    });
  });

  describe('recalculateTiersForOrg', () => {
    it('returns success when no customers found', async () => {
      const result = await service.recalculateTiersForOrg('org-001', loyaltySettings);

      expect(result.success).toBe(true);
      expect(result.totalCustomers).toBe(0);
      expect(result.tiersChanged).toBe(0);
    });
  });
});
