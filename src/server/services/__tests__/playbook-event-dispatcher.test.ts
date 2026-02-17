/**
 * Unit Tests: Playbook Event Dispatcher
 *
 * Tests for real-time event → playbook execution bridge
 * (2026-02-17)
 */

import { dispatchPlaybookEvent } from '../playbook-event-dispatcher';
import { executePlaybook } from '../playbook-executor';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('../playbook-executor');
jest.mock('@/lib/logger');

describe('Playbook Event Dispatcher', () => {
  const mockFirestore = {
    collection: jest.fn(),
  };

  const mockQuerySnap = {
    empty: false,
    docs: [
      {
        id: 'listener-1',
        data: jest.fn(() => ({
          playbookId: 'playbook-1',
          orgId: 'org-test',
          eventName: 'order.created',
          status: 'active',
        })),
      },
    ],
    size: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: mockFirestore,
    });

    (executePlaybook as jest.Mock).mockResolvedValue({
      success: true,
    });

    mockFirestore.collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockQuerySnap),
      add: jest.fn().mockResolvedValue({}),
    });
  });

  describe('dispatchPlaybookEvent', () => {
    it('should dispatch event asynchronously without blocking', async () => {
      const orgId = 'org-test';
      const eventName = 'order.created';
      const eventData = { orderId: '123', customerId: 'cust-1' };

      // Call should return immediately (fire-and-forget)
      dispatchPlaybookEvent(orgId, eventName, eventData);

      // Promise should resolve immediately
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify firestore was queried
      expect(mockFirestore.collection).toHaveBeenCalled();
    });

    it('should query listeners with correct filters', async () => {
      const orgId = 'org-test';
      const eventName = 'order.created';

      dispatchPlaybookEvent(orgId, eventName, {});

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify query had correct filters
      const queryObj = mockFirestore.collection().where;
      expect(queryObj).toHaveBeenCalledWith('orgId', '==', orgId);
      expect(queryObj).toHaveBeenCalledWith('eventName', '==', eventName);
      expect(queryObj).toHaveBeenCalledWith('status', '==', 'active');
    });

    it('should execute playbook for each listener', async () => {
      const orgId = 'org-test';
      const eventName = 'order.created';
      const eventData = { orderId: '123', customerId: 'cust-1', customerEmail: 'test@example.com' };

      dispatchPlaybookEvent(orgId, eventName, eventData);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(executePlaybook).toHaveBeenCalledWith(
        expect.objectContaining({
          playbookId: 'playbook-1',
          orgId: 'org-test',
          userId: 'system',
          triggeredBy: 'event',
          eventData,
        })
      );
    });

    it('should handle empty listener results gracefully', async () => {
      mockFirestore.collection().get.mockResolvedValueOnce({
        empty: true,
        docs: [],
        size: 0,
      });

      dispatchPlaybookEvent('org-test', 'order.created', {});

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not attempt to execute playbooks
      expect(executePlaybook).not.toHaveBeenCalled();
    });

    it('should record dedup entry after execution', async () => {
      const eventData = { orderId: '123', customerId: 'cust-1' };

      dispatchPlaybookEvent('org-test', 'order.created', eventData);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify dedup record was added
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });

    it('should handle execution errors without blocking', async () => {
      (executePlaybook as jest.Mock).mockRejectedValueOnce(new Error('Execution failed'));

      dispatchPlaybookEvent('org-test', 'order.created', {});

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not throw, just log error
      expect(logger.error).toHaveBeenCalledWith(
        '[EventDispatcher] Failed to execute playbook',
        expect.any(Object)
      );
    });

    it('should log info messages at each step', async () => {
      dispatchPlaybookEvent('org-test', 'order.created', { customerId: 'cust-1' });

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should log query start
      expect(logger.info).toHaveBeenCalledWith(
        '[EventDispatcher] Querying listeners',
        expect.any(Object)
      );

      // Should log found listeners
      expect(logger.info).toHaveBeenCalledWith(
        '[EventDispatcher] Found listeners',
        expect.any(Object)
      );

      // Should log execution
      expect(logger.info).toHaveBeenCalledWith(
        '[EventDispatcher] Executing playbook',
        expect.any(Object)
      );
    });

    it('should support multiple concurrent dispatches', async () => {
      const events = [
        { orgId: 'org-1', eventName: 'order.created', data: { orderId: '1' } },
        { orgId: 'org-2', eventName: 'customer.signup', data: { customerId: '1' } },
        { orgId: 'org-1', eventName: 'inventory.low_stock', data: { productId: '1' } },
      ];

      // Fire all dispatches
      events.forEach((e) => dispatchPlaybookEvent(e.orgId, e.eventName, e.data));

      // Wait for async completion
      await new Promise((resolve) => setTimeout(resolve, 300));

      // All should have attempted execution
      expect(executePlaybook).toHaveBeenCalledTimes(3);
    });
  });
});
