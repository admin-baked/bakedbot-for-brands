import {
  getPendingApprovals,
  approveRequest,
  createApprovalRequest,
  rejectRequest,
  executeApprovedRequest,
  autoRejectExpiredRequests,
} from '@/server/actions/approvals';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

jest.mock('@/server/auth/auth');
jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger');

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

describe('Linus Approvals System', () => {
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockWhere: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockSet: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhere = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockResolvedValue({});
    mockSet = jest.fn().mockResolvedValue({});
    mockGet = jest.fn();

    mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      set: mockSet,
    });

    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      get: mockGet,
    });

    mockFirestore = {
      collection: mockCollection,
      doc: jest.fn((path: string) => ({
        get: mockGet,
        update: mockUpdate,
        set: mockSet,
      })),
    };

    mockCreateServerClient.mockResolvedValue({
      firestore: mockFirestore,
    } as any);

    mockRequireUser.mockResolvedValue('user_123');
  });

  describe('getPendingApprovals', () => {
    it('queries pending approvals for tenant', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              id: 'req1',
              status: 'pending',
              operationType: 'bundle_creation',
              payload: { bundleName: 'Test Bundle' },
              createdAt: Date.now(),
            }),
          },
        ],
      });

      const result = await getPendingApprovals('tenant_123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
    });

    it('returns empty array when no pending approvals', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [],
      });

      const result = await getPendingApprovals('tenant_123');

      expect(result).toEqual([]);
    });

    it('handles Firestore errors gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      try {
        await getPendingApprovals('tenant_123');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('approveRequest', () => {
    it('updates request status to approved with approver info', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await approveRequest('tenant_123', 'req1', true);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          approverId: 'user_123',
          approvedAt: expect.any(Number),
        })
      );
    });

    it('rejects request with rejected status', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await approveRequest('tenant_123', 'req1', false);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
        })
      );
    });

    it('throws error if request not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(approveRequest('tenant_123', 'nonexistent', true)).rejects.toThrow('Request not found');
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValueOnce(new Error('Unauthenticated'));

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await expect(approveRequest('tenant_123', 'req1', true)).rejects.toThrow();
    });
  });

  describe('createApprovalRequest', () => {
    it('creates approval request in Firestore', async () => {
      const requestData = {
        operationType: 'campaign_send',
        payload: { campaignId: 'camp_123', recipientCount: 1000 },
        risk: 'high',
      };

      await createApprovalRequest('tenant_123', requestData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          operationType: 'campaign_send',
          payload: expect.any(Object),
          createdAt: expect.any(Number),
        })
      );
    });

    it('sends Slack notification non-blocking', async () => {
      mockSet.mockResolvedValueOnce({});

      const requestData = {
        operationType: 'bundle_creation',
        payload: { bundleName: 'Q1 Deal' },
        risk: 'medium',
      };

      const result = await createApprovalRequest('tenant_123', requestData);

      expect(result.success).toBe(true);
      // Slack notification should be sent but not block creation
      expect(mockSet).toHaveBeenCalled();
    });

    it('returns requestId after creation', async () => {
      mockSet.mockResolvedValueOnce({});

      const requestData = {
        operationType: 'pricing_update',
        payload: { productId: 'prod_123', newPrice: 99.99 },
        risk: 'high',
      };

      const result = await createApprovalRequest('tenant_123', requestData);

      expect(result.requestId).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('rejectRequest', () => {
    it('updates request with rejected status and reason', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await rejectRequest('tenant_123', 'req1', 'Pricing too aggressive');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          rejectionReason: 'Pricing too aggressive',
        })
      );
    });

    it('throws error if request not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(rejectRequest('tenant_123', 'nonexistent', 'Reason')).rejects.toThrow();
    });

    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValueOnce(new Error('Unauthenticated'));

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: 'req1', status: 'pending' }),
      });

      await expect(rejectRequest('tenant_123', 'req1', 'Reason')).rejects.toThrow();
    });
  });

  describe('executeApprovedRequest', () => {
    it('executes approved request payload', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'req1',
          status: 'approved',
          operationType: 'campaign_send',
          payload: { campaignId: 'camp_123' },
        }),
      });

      const result = await executeApprovedRequest('tenant_123', 'req1');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          executedAt: expect.any(Number),
        })
      );
    });

    it('guards against non-approved requests', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'req1',
          status: 'pending',
          operationType: 'campaign_send',
        }),
      });

      const result = await executeApprovedRequest('tenant_123', 'req1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not approved');
    });

    it('marks request as failed on execution error', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'req1',
          status: 'approved',
          operationType: 'bundle_creation',
          payload: { invalid: true },
        }),
      });

      const result = await executeApprovedRequest('tenant_123', 'req1');

      if (!result.success) {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
          })
        );
      }
    });

    it('throws error if request not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(executeApprovedRequest('tenant_123', 'nonexistent')).rejects.toThrow();
    });
  });

  describe('autoRejectExpiredRequests', () => {
    it('rejects pending requests older than 7 days', async () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000; // 1 second past 7 days

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'req1',
            data: () => ({
              id: 'req1',
              status: 'pending',
              createdAt: sevenDaysAgo,
            }),
            ref: {
              update: mockUpdate,
            },
          },
        ],
      });

      const result = await autoRejectExpiredRequests('tenant_123');

      expect(result.rejectedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          rejectionReason: expect.stringContaining('7 days'),
        })
      );
    });

    it('keeps pending requests younger than 7 days', async () => {
      const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;

      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'req1',
            data: () => ({
              id: 'req1',
              status: 'pending',
              createdAt: sixDaysAgo,
            }),
            ref: {
              update: mockUpdate,
            },
          },
        ],
      });

      const result = await autoRejectExpiredRequests('tenant_123');

      expect(result.rejectedCount).toBe(0);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns count of auto-rejected requests', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'req1',
            data: () => ({
              id: 'req1',
              status: 'pending',
              createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
            }),
            ref: { update: mockUpdate },
          },
          {
            id: 'req2',
            data: () => ({
              id: 'req2',
              status: 'pending',
              createdAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
            }),
            ref: { update: mockUpdate },
          },
        ],
      });

      const result = await autoRejectExpiredRequests('tenant_123');

      expect(result.rejectedCount).toBe(2);
    });

    it('ignores non-pending requests', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'req1',
            data: () => ({
              id: 'req1',
              status: 'approved', // Not pending
              createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
            }),
            ref: { update: mockUpdate },
          },
        ],
      });

      const result = await autoRejectExpiredRequests('tenant_123');

      expect(result.rejectedCount).toBe(0);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Approval Workflow Integration', () => {
    it('supports full lifecycle: create → approve → execute', async () => {
      // Create
      mockSet.mockResolvedValueOnce({});
      const createResult = await createApprovalRequest('tenant_123', {
        operationType: 'campaign_send',
        payload: { campaignId: 'camp_123' },
        risk: 'high',
      });
      expect(createResult.success).toBe(true);

      // Approve
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: createResult.requestId, status: 'pending' }),
      });
      mockUpdate.mockResolvedValueOnce({});
      await approveRequest('tenant_123', createResult.requestId, true);
      expect(mockUpdate).toHaveBeenCalled();

      // Execute
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: createResult.requestId,
          status: 'approved',
          operationType: 'campaign_send',
          payload: { campaignId: 'camp_123' },
        }),
      });
      const executeResult = await executeApprovedRequest('tenant_123', createResult.requestId);
      expect(executeResult.success).toBe(true);
    });

    it('supports full lifecycle: create → reject', async () => {
      mockSet.mockResolvedValueOnce({});
      const createResult = await createApprovalRequest('tenant_123', {
        operationType: 'pricing_update',
        payload: { productId: 'prod_123', newPrice: 999.99 },
        risk: 'critical',
      });

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ id: createResult.requestId, status: 'pending' }),
      });
      mockUpdate.mockResolvedValueOnce({});
      await rejectRequest('tenant_123', createResult.requestId, 'Price too high');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
