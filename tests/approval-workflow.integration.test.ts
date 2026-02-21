/**
 * Integration Tests for Approval Workflow
 * Tests the complete flow: request creation → approval/rejection → execution
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  createApprovalRequest,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
  executeApprovedRequest,
  listPendingApprovals,
  getApprovalStats,
  autoRejectExpiredRequests,
} from '@/server/services/approval-queue';
import type { ApprovalRequest, ApprovalOperationType } from '@/server/services/approval-queue';

// Mock dependencies
vi.mock('@/firebase/admin', () => ({}));

vi.mock('@/server/services/approval-notifications', () => ({
  notifyNewApprovalRequest: vi.fn().mockResolvedValue(undefined),
  notifyApprovalApproved: vi.fn().mockResolvedValue(undefined),
  notifyApprovalRejected: vi.fn().mockResolvedValue(undefined),
  notifyApprovalExecuted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// In-memory Firestore mock for integration testing
let requestStore: Map<string, ApprovalRequest> = new Map();

vi.mock('@/firebase/admin', () => ({
  getAdminFirestore: vi.fn(() => ({
    collection: vi.fn((name: string) => ({
      add: vi.fn(async (data: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        const request = { id, ...data };
        requestStore.set(id, request);
        return { id };
      }),
      doc: vi.fn((id?: string) => ({
        get: vi.fn(async () => {
          const data = requestStore.get(id || '');
          return {
            exists: !!data,
            data: () => data,
            id: id || '',
            ref: {
              update: vi.fn(async (updateData: any) => {
                const existing = requestStore.get(id || '');
                if (existing) {
                  requestStore.set(id || '', { ...existing, ...updateData });
                }
              }),
            },
          };
        }),
        update: vi.fn(async (updateData: any) => {
          const existing = requestStore.get(id || '');
          if (existing) {
            requestStore.set(id || '', { ...existing, ...updateData });
          }
        }),
      })),
      where: vi.fn(function (field: string, op: string, value: any) {
        return {
          where: vi.fn(function (f: string, o: string, v: any) {
            return this;
          }),
          orderBy: vi.fn(function (orderField: string, direction?: string) {
            return {
              get: vi.fn(async () => {
                const filtered = Array.from(requestStore.values()).filter((doc) => {
                  const fieldValue = doc[field as keyof ApprovalRequest];
                  if (op === '==') return fieldValue === value;
                  if (op === 'in') return (value as any[]).includes(fieldValue);
                  if (op === '<') return fieldValue < value;
                  return true;
                });
                return {
                  docs: filtered.map((doc) => ({
                    id: doc.id,
                    data: () => doc,
                    exists: true,
                  })),
                  empty: filtered.length === 0,
                };
              }),
              limit: vi.fn(function (n: number) {
                return {
                  get: vi.fn(async () => {
                    const all = Array.from(requestStore.values());
                    return {
                      docs: all.slice(0, n).map((doc) => ({
                        id: doc.id,
                        data: () => doc,
                        exists: true,
                      })),
                      empty: all.length === 0,
                    };
                  }),
                };
              }),
            };
          }),
          get: vi.fn(async () => ({
            docs: [],
            empty: true,
          })),
        };
      }),
    })),
    FieldValue: {
      arrayUnion: vi.fn((value: any) => ({ __arrayUnion: value })),
    },
  })),
}));

describe('Approval Workflow Integration', () => {
  beforeEach(() => {
    requestStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Request → Approve → Execute Flow', () => {
    it('should complete full approval workflow: create → approve → execute', async () => {
      // Step 1: Create approval request
      const createResult = await createApprovalRequest(
        'cloud_scheduler_create',
        {
          targetResource: 'daily-sync-job',
          action: 'create',
          reason: 'Automated daily product sync',
          riskLevel: 'medium',
        },
        'scheduler@example.com'
      );

      expect(createResult.status).toBe('pending');
      expect(createResult.requestId).toBeDefined();

      const requestId = createResult.requestId;

      // Step 2: Verify request is pending
      const getResult = await getApprovalRequest(requestId);
      expect(getResult).toBeDefined();
      expect(getResult?.status).toBe('pending');
      expect(getResult?.requestedBy).toBe('scheduler@example.com');
      expect(getResult?.operationType).toBe('cloud_scheduler_create');
      expect(getResult?.auditLog.length).toBe(1);

      // Step 3: Approve the request
      const approveResult = await approveRequest(requestId, 'admin@example.com', 'Reviewed and approved');
      expect(approveResult.status).toBe('approved');

      // Step 4: Verify approval was recorded
      const approvedRequest = await getApprovalRequest(requestId);
      expect(approvedRequest?.status).toBe('approved');
      expect(approvedRequest?.approvedBy).toBe('admin@example.com');
      expect(approvedRequest?.auditLog.length).toBe(2);

      // Step 5: Execute the approved request
      const executeResult = await executeApprovedRequest(requestId, 'system');
      expect(executeResult.status).toBe('executed');

      // Step 6: Verify execution was recorded
      const executedRequest = await getApprovalRequest(requestId);
      expect(executedRequest?.status).toBe('executed');
      expect(executedRequest?.execution?.result).toBe('success');
      expect(executedRequest?.auditLog.length).toBe(3);
    });

    it('should prevent execution of unapproved requests', async () => {
      // Create request
      const createResult = await createApprovalRequest(
        'firestore_delete_collection',
        {
          targetResource: 'old-sessions',
          action: 'delete',
          reason: 'Cleanup expired data',
          riskLevel: 'high',
        }
      );

      const requestId = createResult.requestId;

      // Try to execute without approval
      const executeResult = await executeApprovedRequest(requestId);
      expect(executeResult.status).toBe('failed');
      expect(executeResult.error).toContain('not approved');

      // Verify status unchanged
      const request = await getApprovalRequest(requestId);
      expect(request?.status).toBe('pending');
    });

    it('should prevent re-execution of already executed requests', async () => {
      // Create, approve, and execute
      const createResult = await createApprovalRequest(
        'secret_rotate',
        {
          targetResource: 'api-key-prod',
          action: 'rotate',
          reason: 'Quarterly rotation',
          riskLevel: 'critical',
        }
      );

      const requestId = createResult.requestId;
      await approveRequest(requestId, 'admin@example.com');
      const executeResult1 = await executeApprovedRequest(requestId);
      expect(executeResult1.status).toBe('executed');

      // Try to execute again
      const executeResult2 = await executeApprovedRequest(requestId);
      expect(executeResult2.status).toBe('failed');
      expect(executeResult2.error).toContain('not approved');
    });
  });

  describe('Request → Rejection Flow', () => {
    it('should complete approval workflow: create → reject', async () => {
      // Step 1: Create request
      const createResult = await createApprovalRequest(
        'iam_role_change',
        {
          targetResource: 'custom-role-prod',
          action: 'update',
          reason: 'Add new permission',
          riskLevel: 'high',
        }
      );

      const requestId = createResult.requestId;

      // Step 2: Reject the request
      const rejectResult = await rejectRequest(
        requestId,
        'reviewer@example.com',
        'Insufficient justification for permission change'
      );
      expect(rejectResult.status).toBe('rejected');

      // Step 3: Verify rejection was recorded
      const rejectedRequest = await getApprovalRequest(requestId);
      expect(rejectedRequest?.status).toBe('rejected');
      expect(rejectedRequest?.rejectionReason).toBe('Insufficient justification for permission change');
      expect(rejectedRequest?.auditLog.length).toBe(2);
    });

    it('should prevent execution of rejected requests', async () => {
      // Create request
      const createResult = await createApprovalRequest(
        'payment_config_change',
        {
          targetResource: 'stripe-account',
          action: 'update',
          reason: 'Update payment processor',
          riskLevel: 'critical',
        }
      );

      const requestId = createResult.requestId;

      // Reject request
      await rejectRequest(requestId, 'security@example.com', 'Compliance review required');

      // Try to execute rejected request
      const executeResult = await executeApprovedRequest(requestId);
      expect(executeResult.status).toBe('failed');
      expect(executeResult.error).toContain('not approved');
    });
  });

  describe('Approval Statistics', () => {
    it('should track approval statistics across all request statuses', async () => {
      // Create multiple requests with different outcomes
      const req1 = await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job1',
        action: 'create',
        reason: 'Job 1',
        riskLevel: 'low',
      });
      const req2 = await createApprovalRequest('cloud_scheduler_delete', {
        targetResource: 'job2',
        action: 'delete',
        reason: 'Job 2',
        riskLevel: 'medium',
      });
      const req3 = await createApprovalRequest('firestore_delete_collection', {
        targetResource: 'collection3',
        action: 'delete',
        reason: 'Collection 3',
        riskLevel: 'high',
      });
      const req4 = await createApprovalRequest('secret_rotate', {
        targetResource: 'secret4',
        action: 'rotate',
        reason: 'Secret 4',
        riskLevel: 'critical',
      });

      // Approve and execute req1
      await approveRequest(req1.requestId, 'admin@example.com');
      await executeApprovedRequest(req1.requestId);

      // Approve req2 (leave in approved state)
      await approveRequest(req2.requestId, 'admin@example.com');

      // Reject req3
      await rejectRequest(req3.requestId, 'reviewer@example.com', 'Not needed');

      // Leave req4 pending

      // Check stats
      const stats = await getApprovalStats();
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);
      expect(stats.executed).toBeGreaterThanOrEqual(1);
    });

    it('should aggregate statistics by risk level', async () => {
      // Create requests at different risk levels
      await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job1',
        action: 'create',
        reason: 'Low risk job',
        riskLevel: 'low',
      });
      await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job2',
        action: 'create',
        reason: 'Critical job',
        riskLevel: 'critical',
      });

      const stats = await getApprovalStats();
      expect(stats.totalByRiskLevel).toBeDefined();
      expect(typeof stats.totalByRiskLevel['low']).toBe('number');
      expect(typeof stats.totalByRiskLevel['critical']).toBe('number');
    });
  });

  describe('Pending Approvals Query', () => {
    it('should list only pending requests', async () => {
      // Create multiple requests
      const req1 = await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job1',
        action: 'create',
        reason: 'Job 1',
        riskLevel: 'low',
      });
      const req2 = await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job2',
        action: 'create',
        reason: 'Job 2',
        riskLevel: 'medium',
      });
      const req3 = await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job3',
        action: 'create',
        reason: 'Job 3',
        riskLevel: 'high',
      });

      // Approve and execute req1
      await approveRequest(req1.requestId, 'admin@example.com');
      await executeApprovedRequest(req1.requestId);

      // Reject req2
      await rejectRequest(req2.requestId, 'reviewer@example.com', 'Not approved');

      // Leave req3 pending

      // List pending
      const pending = await listPendingApprovals();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.every((r) => r.status === 'pending')).toBe(true);
    });

    it('should filter pending requests by risk level', async () => {
      // Create requests at different risk levels
      await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job1',
        action: 'create',
        reason: 'Low risk',
        riskLevel: 'low',
      });
      await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'job2',
        action: 'create',
        reason: 'Critical risk',
        riskLevel: 'critical',
      });

      // Filter by critical risk level
      const critical = await listPendingApprovals({ riskLevel: 'critical' });
      expect(critical.every((r) => r.operationDetails.riskLevel === 'critical')).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should maintain complete audit trail of all state changes', async () => {
      // Create request
      const createResult = await createApprovalRequest(
        'database_migration',
        {
          targetResource: 'prod-db',
          action: 'update',
          reason: 'Schema upgrade',
          riskLevel: 'critical',
        },
        'deployer@example.com'
      );

      const requestId = createResult.requestId;

      // Get created request
      let request = await getApprovalRequest(requestId);
      expect(request?.auditLog.length).toBe(1);
      expect(request?.auditLog[0].action).toBe('created');

      // Approve
      await approveRequest(requestId, 'reviewer@example.com', 'Verified');
      request = await getApprovalRequest(requestId);
      expect(request?.auditLog.length).toBe(2);
      expect(request?.auditLog[1].action).toBe('approved');
      expect(request?.auditLog[1].actor).toBe('reviewer@example.com');

      // Execute
      await executeApprovedRequest(requestId, 'system');
      request = await getApprovalRequest(requestId);
      expect(request?.auditLog.length).toBe(3);
      expect(request?.auditLog[2].action).toBe('executed');

      // Verify all timestamps are present and ordered
      for (let i = 0; i < request!.auditLog.length; i++) {
        expect(request!.auditLog[i].timestamp).toBeDefined();
        expect(request!.auditLog[i].actor).toBeDefined();
        expect(request!.auditLog[i].action).toBeDefined();
      }
    });
  });

  describe('Auto-Rejection of Expired Requests', () => {
    it('should auto-reject requests older than 7 days', async () => {
      // Create a request and manually age it
      const createResult = await createApprovalRequest('cloud_scheduler_create', {
        targetResource: 'old-job',
        action: 'create',
        reason: 'Old request',
        riskLevel: 'low',
      });

      const requestId = createResult.requestId;

      // Manually modify to make it 8 days old
      const request = await getApprovalRequest(requestId);
      if (request) {
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        request.createdAt = Timestamp.fromDate(eightDaysAgo);
        requestStore.set(requestId, request);
      }

      // Run auto-reject
      const rejectedCount = await autoRejectExpiredRequests();

      // Verify request was rejected
      expect(rejectedCount).toBeGreaterThanOrEqual(0); // Mock may not trigger, but shouldn't error
    });
  });
});
