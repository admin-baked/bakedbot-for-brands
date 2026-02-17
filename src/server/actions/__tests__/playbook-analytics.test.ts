/**
 * Unit Tests: Playbook Analytics Server Action
 *
 * Tests for ROI dashboard data fetching
 * (2026-02-17)
 */

import {
  getPlaybookAnalytics,
  getPlaybookSummary,
  PlaybookMetric,
} from '../playbook-analytics';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/lib/logger');

describe('Playbook Analytics', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockUser = {
    uid: 'user-123',
    email: 'user@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });

    (requireUser as jest.Mock).mockResolvedValue(mockUser);
    (canAccessOrg as jest.Mock).mockReturnValue(true);

    mockFirestore.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [],
      }),
    });
  });

  describe('getPlaybookAnalytics', () => {
    it('should fetch and aggregate execution data', async () => {
      const mockExecution = {
        id: 'exec-1',
        playbookId: 'playbook-1',
        playbookName: 'Welcome Campaign',
        orgId: 'org-test',
        status: 'completed',
        startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        revenueAttributed: 100,
        eventData: {
          customerId: 'cust-1',
          event: 'order.created',
        },
      };

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: [{ data: () => mockExecution }],
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      expect(result.totalPlaybooks).toBe(1);
      expect(result.totalExecutions).toBe(1);
      expect(result.totalRevenue).toBe(100);
      expect(result.playbookMetrics).toHaveLength(1);
    });

    it('should calculate success rates correctly', async () => {
      const executions = [
        {
          id: 'exec-1',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { customerId: 'cust-1' },
        },
        {
          id: 'exec-2',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { customerId: 'cust-2' },
        },
        {
          id: 'exec-3',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'failed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: {},
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: executions.map((e) => ({ data: () => e })),
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      const metric = result.playbookMetrics[0];
      expect(metric.totalExecutions).toBe(3);
      expect(metric.successfulExecutions).toBe(2);
      expect(metric.failedExecutions).toBe(1);
      expect(metric.successRate).toBe(66.66666666666666); // 2/3 * 100
    });

    it('should count unique customers reached', async () => {
      const executions = [
        {
          id: 'exec-1',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { customerId: 'cust-1' },
        },
        {
          id: 'exec-2',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { customerId: 'cust-1' }, // Duplicate
        },
        {
          id: 'exec-3',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { customerId: 'cust-2' },
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: executions.map((e) => ({ data: () => e })),
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      expect(result.playbookMetrics[0].customersReached).toBe(2);
    });

    it('should build daily trend data', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const executions = [
        {
          id: 'exec-1',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: today,
          revenueAttributed: 100,
          eventData: { customerId: 'cust-1' },
        },
        {
          id: 'exec-2',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: yesterday,
          revenueAttributed: 50,
          eventData: { customerId: 'cust-2' },
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: executions.map((e) => ({ data: () => e })),
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      expect(result.executionTrendDaily.length).toBe(2);
      expect(result.executionTrendDaily[0].count).toBeGreaterThan(0);
      expect(result.executionTrendDaily[0].revenue).toBeGreaterThan(0);
    });

    it('should calculate event distribution', async () => {
      const executions = [
        {
          id: 'exec-1',
          playbookId: 'playbook-1',
          playbookName: 'Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { event: 'order.created' },
        },
        {
          id: 'exec-2',
          playbookId: 'playbook-2',
          playbookName: 'Campaign 2',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { event: 'order.created' },
        },
        {
          id: 'exec-3',
          playbookId: 'playbook-3',
          playbookName: 'Campaign 3',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 0,
          eventData: { event: 'customer.signup' },
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: executions.map((e) => ({ data: () => e })),
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      expect(result.eventDistribution).toContainEqual({ event: 'order.created', count: 2 });
      expect(result.eventDistribution).toContainEqual({ event: 'customer.signup', count: 1 });
    });

    it('should sort top playbooks by revenue', async () => {
      const executions = [
        {
          id: 'exec-1',
          playbookId: 'playbook-1',
          playbookName: 'Top Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 500,
          eventData: { customerId: 'cust-1' },
        },
        {
          id: 'exec-2',
          playbookId: 'playbook-2',
          playbookName: 'Low Campaign',
          status: 'completed',
          startedAt: new Date(),
          revenueAttributed: 50,
          eventData: { customerId: 'cust-2' },
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: executions.map((e) => ({ data: () => e })),
      });

      const result = await getPlaybookAnalytics('org-test', 30);

      if ('error' in result) {
        throw new Error('Should not have error');
      }

      expect(result.topPlaybooks[0].playbookName).toBe('Top Campaign');
      expect(result.topPlaybooks[1].playbookName).toBe('Low Campaign');
    });

    it('should verify user is authenticated', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: [],
      });

      await getPlaybookAnalytics('org-test', 30);

      expect(requireUser).toHaveBeenCalled();
    });

    it('should return error when user not authenticated', async () => {
      (requireUser as jest.Mock).mockResolvedValueOnce(null);

      const result = await getPlaybookAnalytics('org-test', 30);

      expect(result).toEqual({ error: 'Not authenticated' });
    });

    it('should handle database errors gracefully', async () => {
      (createServerClient as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await getPlaybookAnalytics('org-test', 30);

      expect(result).toEqual({ error: 'DB error' });
      expect(logger.error).toHaveBeenCalledWith(
        '[PlaybookAnalytics] Error fetching analytics',
        expect.any(Object)
      );
    });
  });

  describe('getPlaybookSummary', () => {
    it('should return metrics for specific playbook', async () => {
      const mockMetric: PlaybookMetric = {
        playbookId: 'playbook-1',
        playbookName: 'Campaign 1',
        totalExecutions: 10,
        successfulExecutions: 8,
        failedExecutions: 2,
        successRate: 80,
        customersReached: 5,
        revenueAttributed: 500,
        roi: 4900,
      };

      (getPlaybookAnalytics as jest.Mock) = jest.fn().mockResolvedValueOnce({
        playbookMetrics: [mockMetric],
      });

      const result = await getPlaybookSummary('org-test', 'playbook-1', 30);

      expect(result).toEqual(mockMetric);
    });

    it('should return error when playbook not found', async () => {
      (getPlaybookAnalytics as jest.Mock) = jest.fn().mockResolvedValueOnce({
        playbookMetrics: [],
      });

      const result = await getPlaybookSummary('org-test', 'playbook-1', 30);

      expect(result).toEqual({ error: 'Playbook not found' });
    });
  });
});
