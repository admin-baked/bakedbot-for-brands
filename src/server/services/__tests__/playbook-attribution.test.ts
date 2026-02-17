/**
 * Unit Tests: Playbook Attribution Service
 *
 * Tests for revenue attribution and ROI calculations
 * (2026-02-17)
 */

import {
  recordPlaybookDelivery,
  calculatePlaybookRevenue,
  updateExecutionRevenue,
  getPlaybookRoiMetrics,
} from '../playbook-attribution';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger');

describe('Playbook Attribution Service', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });

    mockFirestore.collection.mockReturnValue({
      add: jest.fn().mockResolvedValue({ id: 'doc-123' }),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [],
      }),
    });
  });

  describe('recordPlaybookDelivery', () => {
    it('should add attribution record to Firestore', async () => {
      await recordPlaybookDelivery(
        'org-test',
        'playbook-1',
        'exec-1',
        'cust-1',
        'email'
      );

      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-test',
          playbookId: 'playbook-1',
          executionId: 'exec-1',
          customerId: 'cust-1',
          channel: 'email',
          status: 'delivered',
          attributionWindowDays: 7,
          revenueAttributed: 0,
        })
      );
    });

    it('should handle SMS channel', async () => {
      await recordPlaybookDelivery(
        'org-test',
        'playbook-1',
        'exec-1',
        'cust-1',
        'sms'
      );

      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'sms',
        })
      );
    });

    it('should not throw on error', async () => {
      mockFirestore.collection().add.mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(
        recordPlaybookDelivery('org-test', 'playbook-1', 'exec-1', 'cust-1', 'email')
      ).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        '[Attribution] Failed to record delivery',
        expect.any(Object)
      );
    });
  });

  describe('calculatePlaybookRevenue', () => {
    it('should sum revenue from orders within attribution window', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              customerId: 'cust-1',
              deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
              attributionWindowDays: 7,
            }),
          },
        ],
      });

      // Mock orders query
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              total: '50.00',
            }),
          },
          {
            data: () => ({
              total: '75.50',
            }),
          },
        ],
      });

      const revenue = await calculatePlaybookRevenue('org-test', 'playbook-1', 'exec-1');

      expect(revenue).toBe(125.50);
    });

    it('should return 0 when no deliveries found', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const revenue = await calculatePlaybookRevenue('org-test', 'playbook-1', 'exec-1');

      expect(revenue).toBe(0);
    });

    it('should return 0 when no orders within window', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              customerId: 'cust-1',
              deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              attributionWindowDays: 7,
            }),
          },
        ],
      });

      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const revenue = await calculatePlaybookRevenue('org-test', 'playbook-1', 'exec-1');

      expect(revenue).toBe(0);
    });

    it('should handle error gracefully', async () => {
      (createServerClient as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const revenue = await calculatePlaybookRevenue('org-test', 'playbook-1', 'exec-1');

      expect(revenue).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith(
        '[Attribution] Failed to calculate revenue',
        expect.any(Object)
      );
    });
  });

  describe('updateExecutionRevenue', () => {
    it('should update execution with attributed revenue', async () => {
      const mockRef = {
        update: jest.fn().mockResolvedValue({}),
      };

      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: mockRef }],
      });

      await updateExecutionRevenue('exec-1', 150.00);

      expect(mockRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          revenueAttributed: 150.00,
        })
      );
    });

    it('should not update if execution not found', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await updateExecutionRevenue('exec-1', 150.00);

      // Should not throw or call update
      expect(logger.info).not.toHaveBeenCalledWith(
        '[Attribution] Updated execution revenue',
        expect.any(Object)
      );
    });

    it('should handle errors gracefully', async () => {
      mockFirestore.collection().get.mockRejectedValueOnce(new Error('DB error'));

      await expect(updateExecutionRevenue('exec-1', 150.00)).resolves.not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        '[Attribution] Failed to update execution',
        expect.any(Object)
      );
    });
  });

  describe('getPlaybookRoiMetrics', () => {
    it('should calculate ROI metrics for playbook', async () => {
      const mockExecutions = [
        {
          playbookId: 'playbook-1',
          status: 'completed',
          revenueAttributed: 100,
          eventData: { customerId: 'cust-1' },
        },
        {
          playbookId: 'playbook-1',
          status: 'completed',
          revenueAttributed: 50,
          eventData: { customerId: 'cust-2' },
        },
        {
          playbookId: 'playbook-1',
          status: 'failed',
          revenueAttributed: 0,
          eventData: {},
        },
      ];

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: mockExecutions.map((exec) => ({
          data: () => exec,
        })),
      });

      const metrics = await getPlaybookRoiMetrics('org-test', 'playbook-1', 30);

      expect(metrics).toEqual(
        expect.objectContaining({
          totalExecutions: 3,
          successfulExecutions: 2,
          failedExecutions: 1,
          totalRevenueAttributed: 150,
          customersReached: 2,
          averageOrderValue: 75, // 150 / 2
        })
      );
    });

    it('should calculate positive ROI when revenue exceeds cost', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              status: 'completed',
              revenueAttributed: 100,
              eventData: { customerId: 'cust-1' },
            }),
          },
        ],
      });

      const metrics = await getPlaybookRoiMetrics('org-test', 'playbook-1', 30);

      // Cost: 1 exec * $0.01 = $0.01
      // Revenue: $100
      // ROI: (100 - 0.01) / 0.01 = 9999%
      expect(metrics.roi).toBeGreaterThan(0);
    });

    it('should return zero metrics on error', async () => {
      (createServerClient as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const metrics = await getPlaybookRoiMetrics('org-test', 'playbook-1', 30);

      expect(metrics).toEqual(
        expect.objectContaining({
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          totalRevenueAttributed: 0,
          customersReached: 0,
          averageOrderValue: 0,
          roi: 0,
        })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        '[Attribution] Failed to get ROI metrics',
        expect.any(Object)
      );
    });

    it('should handle empty execution list', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: [],
      });

      const metrics = await getPlaybookRoiMetrics('org-test', 'playbook-1', 30);

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalRevenueAttributed).toBe(0);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      mockFirestore.collection().get.mockResolvedValueOnce({
        docs: [],
      });

      await getPlaybookRoiMetrics('org-test', 'playbook-1', 30);

      // Verify startDate filter was applied
      expect(mockFirestore.collection().where).toHaveBeenCalledWith(
        'startedAt',
        '>=',
        expect.any(Date)
      );
    });
  });
});
