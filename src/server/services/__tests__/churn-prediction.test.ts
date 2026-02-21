/**
 * Churn Prediction Service Tests
 */

import { ChurnPredictionService } from '../churn-prediction';
import type { CustomerProfile } from '@/types/customers';

// Mock Firestore
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
      })),
      where: jest.fn(function(this: any) {
        return {
          where: jest.fn(() => ({
            get: jest.fn(() => ({
              docs: [],
              size: 0,
            })),
          })),
        };
      }),
    })),
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

// Mock callClaude
jest.mock('@/ai/claude', () => ({
  callClaude: jest.fn(),
}));

describe('ChurnPredictionService', () => {
  let service: ChurnPredictionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChurnPredictionService();
  });

  describe('extractFeatures', () => {
    it('extracts RFM features correctly', () => {
      const profile: Partial<CustomerProfile> = {
        id: 'customer-123',
        daysSinceLastOrder: 15,
        orderCount: 5,
        lifetimeValue: 250,
        totalSpent: 250,
        avgOrderValue: 50,
        firstOrderDate: new Date('2025-12-01'),
        segment: 'loyal',
        tier: 'silver',
        points: 125,
      } as CustomerProfile;

      // Access private method via any cast for testing
      const features = (service as any).extractFeatures(profile);

      expect(features.customerId).toBe('customer-123');
      expect(features.recency).toBe(15);
      expect(features.frequency).toBe(5);
      expect(features.monetary).toBe(250);
      expect(features.avgOrderValue).toBe(50);
      expect(features.segment).toBe('loyal');
      expect(features.tier).toBe('silver');
      expect(features.points).toBe(125);
    });

    it('handles missing values with defaults', () => {
      const profile: Partial<CustomerProfile> = {
        id: 'customer-123',
        segment: 'new',
      } as CustomerProfile;

      const features = (service as any).extractFeatures(profile);

      expect(features.recency).toBe(0);
      expect(features.frequency).toBe(0);
      expect(features.monetary).toBe(0);
      expect(features.avgOrderValue).toBe(0);
      expect(features.points).toBe(0);
    });

    it('sets recentTrend to declining for at-risk customers', () => {
      const profile: Partial<CustomerProfile> = {
        id: 'customer-123',
        segment: 'at_risk',
        daysSinceLastOrder: 65,
      } as CustomerProfile;

      const features = (service as any).extractFeatures(profile);

      expect(features.recentTrend).toBe('declining');
    });

    it('sets recentTrend to stable for loyal customers', () => {
      const profile: Partial<CustomerProfile> = {
        id: 'customer-123',
        segment: 'loyal',
        daysSinceLastOrder: 10,
      } as CustomerProfile;

      const features = (service as any).extractFeatures(profile);

      expect(features.recentTrend).toBe('stable');
    });

    it('sets recentTrend to increasing for new customers', () => {
      const profile: Partial<CustomerProfile> = {
        id: 'customer-123',
        segment: 'new',
        daysSinceLastOrder: 5,
      } as CustomerProfile;

      const features = (service as any).extractFeatures(profile);

      expect(features.recentTrend).toBe('increasing');
    });
  });

  describe('fallbackPrediction', () => {
    it('assigns critical risk for high recency + low frequency + declining trend', () => {
      const features = {
        customerId: 'customer-123',
        recency: 80,
        frequency: 1,
        monetary: 50,
        avgOrderValue: 50,
        daysSinceFirst: 100,
        orderFrequency: 0.3,
        recentTrend: 'declining' as const,
        segment: 'churned' as const,
        tier: 'bronze',
        points: 0,
        daysSinceLastOrder: 80,
      };

      const result = (service as any).fallbackPrediction(features);

      expect(result.riskLevel).toBe('critical');
      expect(result.churnProbability).toBeGreaterThan(75);
    });

    it('assigns low risk for low recency + high frequency + stable trend', () => {
      const features = {
        customerId: 'customer-123',
        recency: 7,
        frequency: 10,
        monetary: 500,
        avgOrderValue: 50,
        daysSinceFirst: 180,
        orderFrequency: 1.67,
        recentTrend: 'stable' as const,
        segment: 'loyal' as const,
        tier: 'gold',
        points: 250,
        daysSinceLastOrder: 7,
      };

      const result = (service as any).fallbackPrediction(features);

      expect(result.riskLevel).toBe('low');
      expect(result.churnProbability).toBeLessThan(26);
    });

    it('assigns medium risk for moderate values', () => {
      const features = {
        customerId: 'customer-123',
        recency: 28,
        frequency: 3,
        monetary: 150,
        avgOrderValue: 50,
        daysSinceFirst: 90,
        orderFrequency: 1.0,
        recentTrend: 'stable' as const,
        segment: 'slipping' as const,
        tier: 'bronze',
        points: 75,
        daysSinceLastOrder: 28,
      };

      const result = (service as any).fallbackPrediction(features);

      expect(result.riskLevel).toBe('medium');
      expect(result.churnProbability).toBeGreaterThanOrEqual(26);
      expect(result.churnProbability).toBeLessThanOrEqual(50);
    });

    it('never exceeds 100 probability', () => {
      const features = {
        customerId: 'customer-123',
        recency: 89,
        frequency: 1,
        monetary: 30,
        avgOrderValue: 30,
        daysSinceFirst: 365,
        orderFrequency: 0.08,
        recentTrend: 'declining' as const,
        segment: 'churned' as const,
        tier: 'bronze',
        points: 0,
        daysSinceLastOrder: 89,
      };

      const result = (service as any).fallbackPrediction(features);

      expect(result.churnProbability).toBeLessThanOrEqual(100);
    });
  });

  describe('predictChurn', () => {
    it('returns null when customer not found', async () => {
      const { getAdminFirestore } = await import('@/firebase/admin');
      const firestore = (getAdminFirestore as jest.Mock)();

      firestore.collection().doc().get.mockResolvedValue({
        exists: false,
      });

      const result = await service.predictChurn('customer-123', 'org-001');

      expect(result).toBeNull();
    });
  });

  describe('predictChurnForOrg', () => {
    it('returns success when no customers found', async () => {
      const result = await service.predictChurnForOrg('org-001');

      expect(result.success).toBe(true);
      expect(result.totalCustomers).toBe(0);
      expect(result.predictions).toBe(0);
    });
  });
});
