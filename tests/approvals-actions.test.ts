/**
 * Unit Tests for Approvals Server Actions
 * Tests role-based access control and approval request handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  getPendingApprovals,
  getApprovalDetails,
  approveApprovalRequest,
  rejectApprovalRequest,
  getApprovalHistoryAction,
  getApprovalStatsAction,
  getAllApprovals,
} from '@/app/actions/approvals';

// Mock auth module
vi.mock('@/server/auth/auth', () => ({
  requireSuperUser: vi.fn(async () => {
    throw new Error('Unauthorized');
  }),
}));

// Mock approval queue service
vi.mock('@/server/services/approval-queue', () => ({
  listPendingApprovals: vi.fn(async () => []),
  listAllApprovals: vi.fn(async () => []),
  getApprovalRequest: vi.fn(async () => null),
  approveRequest: vi.fn(async () => ({ status: 'approved' })),
  rejectRequest: vi.fn(async () => ({ status: 'rejected' })),
  getApprovalHistory: vi.fn(async () => []),
  getApprovalStats: vi.fn(async () => ({
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
    failed: 0,
    totalByRiskLevel: {},
  })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  requireSuperUser,
} from '@/server/auth/auth';
import {
  listPendingApprovals,
  listAllApprovals,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
  getApprovalHistory,
  getApprovalStats,
} from '@/server/services/approval-queue';

describe('Approvals Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPendingApprovals', () => {
    it('should reject non-super-users', async () => {
      const result = await getPendingApprovals();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should return empty list for super user with no pending approvals', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listPendingApprovals as any).mockResolvedValue([]);

      const result = await getPendingApprovals();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should support filtering by risk level', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listPendingApprovals as any).mockResolvedValue([]);

      const result = await getPendingApprovals({ riskLevel: 'high' });

      expect(listPendingApprovals).toHaveBeenCalledWith({ riskLevel: 'high' });
      expect(result.success).toBe(true);
    });

    it('should support filtering by operation type', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listPendingApprovals as any).mockResolvedValue([]);

      const result = await getPendingApprovals({ operationType: 'cloud_scheduler_create' });

      expect(listPendingApprovals).toHaveBeenCalledWith({ operationType: 'cloud_scheduler_create' });
      expect(result.success).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listPendingApprovals as any).mockRejectedValue(new Error('Database error'));

      const result = await getPendingApprovals();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed');
    });
  });

  describe('getApprovalDetails', () => {
    it('should reject non-super-users', async () => {
      const result = await getApprovalDetails('test-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should return approval request for super user', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'pending',
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);

      const result = await getApprovalDetails('test-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApproval);
    });

    it('should return error for non-existent request', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(null);

      const result = await getApprovalDetails('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('approveApprovalRequest', () => {
    it('should reject non-super-users', async () => {
      const result = await approveApprovalRequest('test-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should reject non-existent requests', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(null);

      const result = await approveApprovalRequest('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject already-approved requests', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'approved' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);

      const result = await approveApprovalRequest('test-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already approved');
    });

    it('should approve pending requests with optional comments', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'pending' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'approver@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);
      (approveRequest as any).mockResolvedValue({ status: 'approved' });

      const result = await approveApprovalRequest('test-123', 'Looks good, approved.');

      expect(result.success).toBe(true);
      expect(approveRequest).toHaveBeenCalledWith('test-123', 'approver@example.com', 'Looks good, approved.');
    });
  });

  describe('rejectApprovalRequest', () => {
    it('should reject non-super-users', async () => {
      const result = await rejectApprovalRequest('test-123', 'Security risk');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should reject non-existent requests', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(null);

      const result = await rejectApprovalRequest('non-existent', 'Not approved');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should require rejection reason', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'pending' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);

      const result = await rejectApprovalRequest('test-123', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('reason');
    });

    it('should reject pending requests with reason', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'pending' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'reviewer@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);
      (rejectRequest as any).mockResolvedValue({ status: 'rejected' });

      const result = await rejectApprovalRequest('test-123', 'Security concerns detected');

      expect(result.success).toBe(true);
      expect(rejectRequest).toHaveBeenCalledWith('test-123', 'reviewer@example.com', 'Security concerns detected');
    });

    it('should reject already-rejected requests', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'rejected' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);

      const result = await rejectApprovalRequest('test-123', 'Already rejected');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reject');
    });
  });

  describe('getApprovalHistoryAction', () => {
    it('should reject non-super-users', async () => {
      const result = await getApprovalHistoryAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should return empty history for super user', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalHistory as any).mockResolvedValue([]);

      const result = await getApprovalHistoryAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should support filtering by operation type', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalHistory as any).mockResolvedValue([]);

      const result = await getApprovalHistoryAction('cloud_scheduler_create', 10);

      expect(getApprovalHistory).toHaveBeenCalledWith('cloud_scheduler_create', 10);
      expect(result.success).toBe(true);
    });
  });

  describe('getApprovalStatsAction', () => {
    it('should reject non-super-users', async () => {
      const result = await getApprovalStatsAction();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should return approval statistics for super user', async () => {
      const mockStats = {
        pending: 3,
        approved: 15,
        rejected: 2,
        executed: 12,
        failed: 1,
        totalByRiskLevel: {
          low: 5,
          medium: 10,
          high: 8,
          critical: 0,
        },
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalStats as any).mockResolvedValue(mockStats);

      const result = await getApprovalStatsAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data?.pending).toBe(3);
      expect(result.data?.approved).toBe(15);
    });
  });

  describe('getAllApprovals', () => {
    it('should reject non-super-users', async () => {
      const result = await getAllApprovals();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Super User');
    });

    it('should return all approvals for super user', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listAllApprovals as any).mockResolvedValue([]);

      const result = await getAllApprovals();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should support limiting results', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listAllApprovals as any).mockResolvedValue([]);

      const result = await getAllApprovals(25);

      expect(listAllApprovals).toHaveBeenCalledWith(25);
      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors in getPendingApprovals', async () => {
      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (listPendingApprovals as any).mockRejectedValue(new Error('Database error'));

      const result = await getPendingApprovals();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle service errors in approveApprovalRequest', async () => {
      const mockApproval = {
        id: 'test-123',
        status: 'pending' as const,
        operationType: 'cloud_scheduler_create' as const,
        operationDetails: {
          targetResource: 'test-job',
          action: 'create' as const,
          reason: 'Testing',
          riskLevel: 'medium' as const,
        },
        createdAt: Timestamp.now(),
        requestedBy: 'user@example.com',
        auditLog: [],
      };

      (requireSuperUser as any).mockResolvedValue({ email: 'admin@example.com' });
      (getApprovalRequest as any).mockResolvedValue(mockApproval);
      (approveRequest as any).mockRejectedValue(new Error('Firestore error'));

      const result = await approveApprovalRequest('test-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed');
    });
  });
});
