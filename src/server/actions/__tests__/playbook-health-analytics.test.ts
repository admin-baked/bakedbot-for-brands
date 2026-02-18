/**
 * Playbook Health Analytics Tests
 */

import { getPlaybookHealthAnalytics } from '../playbook-health-analytics';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Playbook Health Analytics', () => {
  let mockFirestore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user_test',
      name: 'Test User',
    });

    mockFirestore = {
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              data: () => ({
                playbookId: 'pb_test',
                playbookName: 'Test Playbook',
                status: 'completed',
                customerId: 'cust_123',
                startedAt: new Date(),
                steps: [
                  {
                    agent: 'craig',
                    status: 'success',
                    duration: 1000,
                    completedAt: new Date().toISOString(),
                  },
                  {
                    agent: 'mrs_parker',
                    status: 'success',
                    duration: 500,
                    completedAt: new Date().toISOString(),
                  },
                ],
                eventData: { event: 'order.created' },
              }),
            },
          ],
          size: 1,
        }),
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });
  });

  describe('getPlaybookHealthAnalytics', () => {
    it('should return health analytics data', async () => {
      const result = await getPlaybookHealthAnalytics('org_test', 30);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.agentPerformance).toBeDefined();
        expect(result.playbookHealth).toBeDefined();
        expect(result.customerJourneys).toBeDefined();
        expect(result.retryStats).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      (requireUser as jest.Mock).mockResolvedValue(null);

      const result = await getPlaybookHealthAnalytics('org_test');

      expect('error' in result).toBe(true);
    });

    it('should calculate agent performance metrics', async () => {
      const result = await getPlaybookHealthAnalytics('org_test');

      if (!('error' in result)) {
        expect(result.agentPerformance.length).toBeGreaterThan(0);
        const craig = result.agentPerformance.find((a) => a.agent === 'craig');
        expect(craig).toBeDefined();
        if (craig) {
          expect(craig.successRate).toBeGreaterThanOrEqual(0);
          expect(craig.totalActions).toBeGreaterThan(0);
        }
      }
    });

    it('should include retry statistics', async () => {
      const result = await getPlaybookHealthAnalytics('org_test');

      if (!('error' in result)) {
        expect(result.retryStats).toEqual({
          totalPending: expect.any(Number),
          totalRetrying: expect.any(Number),
          totalFailed: expect.any(Number),
          dlqCount: expect.any(Number),
        });
      }
    });

    it('should calculate playbook health metrics', async () => {
      const result = await getPlaybookHealthAnalytics('org_test');

      if (!('error' in result)) {
        expect(result.playbookHealth.length).toBeGreaterThan(0);
        const pb = result.playbookHealth[0];
        expect(pb.playbookId).toBeDefined();
        expect(pb.failureRate).toBeGreaterThanOrEqual(0);
        expect(pb.retryRate).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate customer journey conversion rates', async () => {
      const result = await getPlaybookHealthAnalytics('org_test');

      if (!('error' in result)) {
        expect(result.customerJourneys).toBeDefined();
        if (result.customerJourneys.length > 0) {
          const journey = result.customerJourneys[0];
          expect(journey.eventName).toBeDefined();
          expect(journey.totalEvents).toBeGreaterThanOrEqual(0);
          expect(journey.conversionRate).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle errors gracefully', async () => {
      (createServerClient as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const result = await getPlaybookHealthAnalytics('org_test');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Firebase error');
      }
    });

    it('should support custom date range', async () => {
      const result = await getPlaybookHealthAnalytics('org_test', 7);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.period.endDate).toBeDefined();
        expect(result.period.startDate).toBeDefined();
      }
    });
  });
});
