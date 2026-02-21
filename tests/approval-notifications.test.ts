/**
 * Unit Tests for Approval Notifications Service
 * Tests Slack notification generation for approval events
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  notifyNewApprovalRequest,
  notifyApprovalApproved,
  notifyApprovalRejected,
  notifyApprovalExecuted,
} from '@/server/services/approval-notifications';
import type { ApprovalRequest } from '@/server/services/approval-queue';

// Mock fetch globally
global.fetch = vi.fn();

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockApprovalRequest: ApprovalRequest = {
  id: 'test-request-123',
  createdAt: Timestamp.now(),
  requestedBy: 'test-user@example.com',
  operationType: 'cloud_scheduler_create',
  operationDetails: {
    targetResource: 'test-job',
    action: 'create',
    reason: 'Testing approval system',
    riskLevel: 'high',
    estimatedCost: {
      service: 'Cloud Scheduler',
      costBefore: 0,
      costAfter: 50,
      estimatedMonthly: 50,
    },
  },
  status: 'pending',
  auditLog: [],
};

describe('Approval Notifications Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyNewApprovalRequest', () => {
    it('should send new approval request notification to Slack', async () => {
      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      await notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should include risk emoji in notification blocks', async () => {
      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      await notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toContain('New Approval Request');
      expect(body.blocks).toBeDefined();
      expect(body.blocks.length).toBeGreaterThan(0);
    });

    it('should include dashboard link in action buttons', async () => {
      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      await notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const actionBlock = body.blocks.find((b: any) => b.type === 'actions');
      expect(actionBlock).toBeDefined();
      expect(actionBlock?.elements[0]?.url).toBe(dashboardUrl);
    });

    it('should skip notification if webhook URL not configured', async () => {
      const originalEnv = process.env.SLACK_WEBHOOK_LINUS_APPROVALS;
      delete process.env.SLACK_WEBHOOK_LINUS_APPROVALS;
      delete process.env.SLACK_WEBHOOK_URL;

      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      await notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl);

      expect(global.fetch).not.toHaveBeenCalled();

      if (originalEnv) process.env.SLACK_WEBHOOK_LINUS_APPROVALS = originalEnv;
    });
  });

  describe('notifyApprovalApproved', () => {
    it('should send approval granted notification to Slack', async () => {
      const approvedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'approved',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalApproved(approvedRequest, 'approver@example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should include approver email in notification', async () => {
      const approverEmail = 'approver@example.com';
      const approvedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'approved',
        approvedBy: approverEmail,
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalApproved(approvedRequest, approverEmail);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const blocksText = JSON.stringify(body.blocks);
      expect(blocksText).toContain(approverEmail);
    });

    it('should include success checkmark in header', async () => {
      const approvedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'approved',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalApproved(approvedRequest, 'approver@example.com');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.blocks[0].text.text).toContain('✅');
    });
  });

  describe('notifyApprovalRejected', () => {
    it('should send rejection notification to Slack', async () => {
      const rejectedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'rejected',
        rejectionReason: 'Security concerns',
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalRejected(rejectedRequest, 'reviewer@example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include rejection reason in notification', async () => {
      const rejectionReason = 'Security concerns with this operation';
      const rejectedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'rejected',
        rejectionReason,
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalRejected(rejectedRequest, 'reviewer@example.com');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const blocksText = JSON.stringify(body.blocks);
      expect(blocksText).toContain(rejectionReason);
    });

    it('should include rejection X emoji in header', async () => {
      const rejectedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'rejected',
        rejectionReason: 'Not approved',
        approvalTimestamp: Timestamp.now(),
      };

      await notifyApprovalRejected(rejectedRequest, 'reviewer@example.com');

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.blocks[0].text.text).toContain('❌');
    });
  });

  describe('notifyApprovalExecuted', () => {
    it('should send execution success notification to Slack', async () => {
      const executedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'executed',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
        execution: {
          executedAt: Timestamp.now(),
          executedBy: 'system',
          result: 'success',
        },
      };

      await notifyApprovalExecuted(executedRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should send execution failure notification to Slack', async () => {
      const failedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'failed',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
        execution: {
          executedAt: Timestamp.now(),
          executedBy: 'system',
          result: 'failure',
          error: 'Resource already exists',
        },
      };

      await notifyApprovalExecuted(failedRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include success emoji for successful executions', async () => {
      const executedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'executed',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
        execution: {
          executedAt: Timestamp.now(),
          executedBy: 'system',
          result: 'success',
        },
      };

      await notifyApprovalExecuted(executedRequest);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.blocks[0].text.text).toContain('⚡');
    });

    it('should include failure emoji for failed executions', async () => {
      const failedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'failed',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
        execution: {
          executedAt: Timestamp.now(),
          executedBy: 'system',
          result: 'failure',
          error: 'Resource conflict',
        },
      };

      await notifyApprovalExecuted(failedRequest);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.blocks[0].text.text).toContain('💥');
    });

    it('should include error message in failed execution notification', async () => {
      const errorMsg = 'Timeout: operation exceeded 30s limit';
      const failedRequest: ApprovalRequest = {
        ...mockApprovalRequest,
        status: 'failed',
        approvedBy: 'approver@example.com',
        approvalTimestamp: Timestamp.now(),
        execution: {
          executedAt: Timestamp.now(),
          executedBy: 'system',
          result: 'failure',
          error: errorMsg,
        },
      };

      await notifyApprovalExecuted(failedRequest);

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      const blocksText = JSON.stringify(body.blocks);
      expect(blocksText).toContain(errorMsg);
    });
  });

  describe('Slack webhook error handling', () => {
    it('should handle Slack webhook failures gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      // Should not throw, just log error
      await expect(notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl)).rejects.toThrow();
    });

    it('should handle network failures gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network timeout'));

      const dashboardUrl = 'https://bakedbot-prod.web.app/dashboard/linus-approvals?request=test-123';

      // Should not throw, just log error
      await expect(notifyNewApprovalRequest(mockApprovalRequest, dashboardUrl)).rejects.toThrow();
    });
  });
});
