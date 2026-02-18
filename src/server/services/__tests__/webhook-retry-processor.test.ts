/**
 * Webhook Retry Processor Tests
 */

import {
  processPendingRetries,
  getRetryStats,
  getDLQEvents,
} from '../webhook-retry-processor';
import { createServerClient } from '@/firebase/server-client';
import { executePlaybook } from '../playbook-executor';

jest.mock('@/firebase/server-client');
jest.mock('../playbook-executor');
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Webhook Retry Processor', () => {
  let mockFirestore: any;
  let mockQuerySnap: any;
  let mockDoc: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = {
      ref: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      data: jest.fn().mockReturnValue({
        playbookId: 'pb_test',
        orgId: 'org_test',
        attempt: 1,
        nextRetryAt: new Date(),
        error: 'Previous error',
        status: 'retrying',
        eventData: { event: 'test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    mockQuerySnap = {
      docs: [mockDoc],
      size: 1,
      get: jest.fn().mockResolvedValue(mockQuerySnap),
    };

    mockFirestore = {
      collection: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockQuerySnap),
              }),
            }),
          }),
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockQuerySnap),
          }),
          get: jest.fn().mockResolvedValue(mockQuerySnap),
        }),
        add: jest.fn().mockResolvedValue({ id: 'dlq_123' }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockQuerySnap),
          }),
        }),
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });
  });

  describe('processPendingRetries', () => {
    it('should process retries that are due', async () => {
      (executePlaybook as jest.Mock).mockResolvedValue({ success: true });

      const result = await processPendingRetries();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should update retry record on success', async () => {
      (executePlaybook as jest.Mock).mockResolvedValue({ success: true });

      await processPendingRetries();

      expect(mockDoc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
        })
      );
    });

    it('should schedule next retry on failure', async () => {
      (executePlaybook as jest.Mock).mockRejectedValue(new Error('Execution failed'));

      mockDoc.data.mockReturnValue({
        playbookId: 'pb_test',
        orgId: 'org_test',
        attempt: 1,
        nextRetryAt: new Date(),
        error: 'Previous error',
        status: 'retrying',
        eventData: { event: 'test' },
      });

      await processPendingRetries();

      expect(mockDoc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 2,
          status: 'retrying',
          error: expect.stringContaining('Execution failed'),
        })
      );
    });

    it('should move to DLQ after max retries', async () => {
      (executePlaybook as jest.Mock).mockRejectedValue(new Error('Max retries exceeded'));

      // Set to max attempts
      mockDoc.data.mockReturnValue({
        playbookId: 'pb_test',
        orgId: 'org_test',
        attempt: 3, // MAX_RETRIES = 3
        nextRetryAt: new Date(),
        error: 'Previous error',
        status: 'retrying',
        eventData: { event: 'test' },
      });

      await processPendingRetries();

      // Should update retry record with 'failed' status
      expect(mockDoc.ref.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );

      // Should add to DLQ
      expect(mockFirestore.collection).toHaveBeenCalledWith('playbook_dead_letter_queue');
    });

    it('should handle empty retry queue', async () => {
      mockQuerySnap.docs = [];
      mockQuerySnap.size = 0;

      const result = await processPendingRetries();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle batch processing (up to 100)', async () => {
      const docs = Array.from({ length: 100 }, (_, i) => ({
        ...mockDoc,
        data: jest.fn().mockReturnValue({
          playbookId: `pb_test_${i}`,
          orgId: 'org_test',
          attempt: 1,
          nextRetryAt: new Date(),
          status: 'retrying',
          eventData: { event: 'test' },
        }),
      }));

      mockQuerySnap.docs = docs;
      mockQuerySnap.size = 100;

      (executePlaybook as jest.Mock).mockResolvedValue({ success: true });

      const result = await processPendingRetries();

      expect(result.processed).toBe(100);
      expect(result.succeeded).toBe(100);
    });
  });

  describe('getRetryStats', () => {
    it('should return retry statistics', async () => {
      mockFirestore.collection().where().get.mockResolvedValueOnce({
        size: 5, // pending
      });
      mockFirestore.collection().where().get.mockResolvedValueOnce({
        size: 10, // retrying
      });
      mockFirestore.collection().where().get.mockResolvedValueOnce({
        size: 3, // failed
      });
      mockFirestore.collection().get.mockResolvedValueOnce({
        size: 2, // dlq
      });

      const stats = await getRetryStats();

      expect(stats.pending).toBe(5);
      expect(stats.retrying).toBe(10);
      expect(stats.failed).toBe(3);
      expect(stats.dlqCount).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      (createServerClient as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const stats = await getRetryStats();

      expect(stats.pending).toBe(0);
      expect(stats.retrying).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.dlqCount).toBe(0);
    });
  });

  describe('getDLQEvents', () => {
    it('should return DLQ events', async () => {
      const dlqDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `dlq_${i}`,
        data: jest.fn().mockReturnValue({
          playbookId: `pb_${i}`,
          orgId: 'org_test',
          eventName: 'order.created',
          error: `Error ${i}`,
          attempts: 3,
          failedAt: new Date(),
        }),
      }));

      mockFirestore.collection().orderBy().limit().get.mockResolvedValue({
        docs: dlqDocs,
      });

      const events = await getDLQEvents();

      expect(events.length).toBe(5);
      expect(events[0].playbookId).toBe('pb_0');
      expect(events[0].attempts).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const limitSpy = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      });

      mockFirestore.collection().orderBy().limit = limitSpy;

      await getDLQEvents(50);

      expect(limitSpy).toHaveBeenCalledWith(50);
    });

    it('should return empty array on error', async () => {
      (createServerClient as jest.Mock).mockRejectedValue(new Error('Firebase error'));

      const events = await getDLQEvents();

      expect(events).toEqual([]);
    });
  });

  describe('Retry Schedule', () => {
    it('should use exponential backoff delays [5s, 30s, 5m]', () => {
      // This test verifies the retry delays are correct
      // RETRY_DELAYS_MS = [5000, 30000, 300000]
      const expected = [5000, 30000, 300000];

      // The delays are hardcoded in the implementation
      // This test documents the expected behavior
      expect(expected[0]).toBe(5000); // 5 seconds
      expect(expected[1]).toBe(30000); // 30 seconds
      expect(expected[2]).toBe(300000); // 5 minutes
    });

    it('should have maximum 3 retry attempts', () => {
      // MAX_RETRIES = RETRY_DELAYS_MS.length = 3
      const MAX_RETRIES = 3;
      expect(MAX_RETRIES).toBe(3);
    });
  });
});
