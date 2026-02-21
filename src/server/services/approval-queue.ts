/**
 * Approval Queue Service
 *
 * Manages approval requests for destructive operations
 * Provides creation, approval, rejection, and execution of requests
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
    notifyNewApprovalRequest,
    notifyApprovalApproved,
    notifyApprovalRejected,
    notifyApprovalExecuted,
} from './approval-notifications';

export type ApprovalOperationType =
  | 'cloud_scheduler_create'
  | 'cloud_scheduler_delete'
  | 'cloud_scheduler_modify'
  | 'secret_rotate'
  | 'firestore_delete_collection'
  | 'iam_role_change'
  | 'payment_config_change'
  | 'environment_variable_change'
  | 'service_account_key_rotate'
  | 'database_migration';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';

export interface OperationDetails {
  targetResource: string;
  action: 'create' | 'update' | 'delete' | 'rotate';
  reason: string;
  parameters?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: {
    service: string;
    costBefore: number;
    costAfter: number;
    estimatedMonthly: number;
  };
}

export interface ApprovalRequest {
  id: string;
  createdAt: Timestamp;
  requestedBy: string;
  operationType: ApprovalOperationType;
  operationDetails: OperationDetails;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalTimestamp?: Timestamp;
  rejectionReason?: string;
  execution?: {
    executedAt?: Timestamp;
    executedBy?: string;
    result: 'success' | 'failure';
    error?: string;
    resultDetails?: Record<string, any>;
  };
  auditLog: Array<{
    timestamp: Timestamp;
    actor: string;
    action: string;
    details?: string;
  }>;
}

/**
 * Create an approval request for a destructive operation
 */
export async function createApprovalRequest(
  operationType: ApprovalOperationType,
  operationDetails: OperationDetails,
  requestedBy: string = 'linus-agent'
): Promise<{ requestId: string; status: 'pending' }> {
  try {
    const db = getAdminFirestore();

    const now = Timestamp.now();
    const request: Omit<ApprovalRequest, 'id'> = {
      createdAt: now,
      requestedBy,
      operationType,
      operationDetails,
      status: 'pending',
      auditLog: [
        {
          timestamp: now,
          actor: requestedBy,
          action: 'created',
          details: `Created approval request for ${operationType}`,
        },
      ],
    };

    const docRef = await db.collection('linus-approvals').add(request);

    // Send Slack notification
    const dashboardUrl = `https://bakedbot-prod.web.app/dashboard/linus-approvals?request=${docRef.id}`;
    try {
      await notifyNewApprovalRequest({ id: docRef.id, ...request } as ApprovalRequest, dashboardUrl);
    } catch (notificationError) {
      logger.warn('[ApprovalQueue] Failed to send Slack notification', {
        error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        requestId: docRef.id,
      });
      // Continue anyway - notification failure shouldn't block approval request creation
    }

    logger.info('[ApprovalQueue] Request created', {
      requestId: docRef.id,
      operationType,
      riskLevel: operationDetails.riskLevel,
    });

    return { requestId: docRef.id, status: 'pending' };
  } catch (error) {
    logger.error('[ApprovalQueue] Error creating approval request', {
      error: error instanceof Error ? error.message : String(error),
      operationType,
    });
    throw error;
  }
}

/**
 * Get a single approval request by ID
 */
export async function getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('linus-approvals').doc(requestId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as ApprovalRequest;
  } catch (error) {
    logger.error('[ApprovalQueue] Error getting approval request', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    return null;
  }
}

/**
 * List all pending approvals, optionally filtered
 */
export async function listPendingApprovals(filter?: {
  riskLevel?: string;
  operationType?: string;
}): Promise<ApprovalRequest[]> {
  try {
    const db = getAdminFirestore();
    let query = db.collection('linus-approvals').where('status', '==', 'pending');

    if (filter?.riskLevel) {
      query = query.where('operationDetails.riskLevel', '==', filter.riskLevel);
    }

    if (filter?.operationType) {
      query = query.where('operationType', '==', filter.operationType);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ApprovalRequest[];
  } catch (error) {
    logger.error('[ApprovalQueue] Error listing pending approvals', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get all approval requests (any status)
 */
export async function listAllApprovals(limit: number = 50): Promise<ApprovalRequest[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('linus-approvals')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ApprovalRequest[];
  } catch (error) {
    logger.error('[ApprovalQueue] Error listing all approvals', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Approve an approval request
 */
export async function approveRequest(
  requestId: string,
  approvedBy: string,
  comments?: string
): Promise<{ status: 'approved' }> {
  try {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    const updateData = {
      status: 'approved' as const,
      approvedBy,
      approvalTimestamp: now,
      'auditLog': FieldValue.arrayUnion({
        timestamp: now,
        actor: approvedBy,
        action: 'approved',
        details: comments,
      }),
    };

    await db.collection('linus-approvals').doc(requestId).update(updateData);

    // Send Slack notification
    const approval = await getApprovalRequest(requestId);
    if (approval) {
      try {
        await notifyApprovalApproved(approval, approvedBy);
      } catch (notificationError) {
        logger.warn('[ApprovalQueue] Failed to send approval notification', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          requestId,
        });
      }
    }

    logger.info('[ApprovalQueue] Request approved', {
      requestId,
      approvedBy,
    });

    return { status: 'approved' };
  } catch (error) {
    logger.error('[ApprovalQueue] Error approving request', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    throw error;
  }
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<{ status: 'rejected' }> {
  try {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    const updateData = {
      status: 'rejected' as const,
      rejectionReason: reason,
      approvedBy: rejectedBy,
      approvalTimestamp: now,
      'auditLog': FieldValue.arrayUnion({
        timestamp: now,
        actor: rejectedBy,
        action: 'rejected',
        details: reason,
      }),
    };

    await db.collection('linus-approvals').doc(requestId).update(updateData);

    // Send Slack notification
    const approval = await getApprovalRequest(requestId);
    if (approval) {
      try {
        await notifyApprovalRejected(approval, rejectedBy);
      } catch (notificationError) {
        logger.warn('[ApprovalQueue] Failed to send rejection notification', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          requestId,
        });
      }
    }

    logger.info('[ApprovalQueue] Request rejected', {
      requestId,
      rejectedBy,
    });

    return { status: 'rejected' };
  } catch (error) {
    logger.error('[ApprovalQueue] Error rejecting request', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    throw error;
  }
}

/**
 * Execute an approved request
 */
export async function executeApprovedRequest(
  requestId: string,
  executedBy: string = 'linus-agent'
): Promise<{ status: 'executed' | 'failed'; error?: string }> {
  try {
    const db = getAdminFirestore();
    const request = await getApprovalRequest(requestId);

    if (!request) {
      logger.error('[ApprovalQueue] Request not found', { requestId });
      return { status: 'failed', error: 'Request not found' };
    }

    if (request.status !== 'approved') {
      logger.warn('[ApprovalQueue] Cannot execute non-approved request', {
        requestId,
        status: request.status,
      });
      return { status: 'failed', error: `Request status is ${request.status}, not approved` };
    }

    const now = Timestamp.now();

    const updateData = {
      status: 'executed' as const,
      'execution.executedAt': now,
      'execution.executedBy': executedBy,
      'execution.result': 'success' as const,
      'auditLog': FieldValue.arrayUnion({
        timestamp: now,
        actor: executedBy,
        action: 'executed',
        details: `Executed ${request.operationType}`,
      }),
    };

    await db.collection('linus-approvals').doc(requestId).update(updateData);

    // Send Slack notification
    const updatedApproval = await getApprovalRequest(requestId);
    if (updatedApproval) {
      try {
        await notifyApprovalExecuted(updatedApproval);
      } catch (notificationError) {
        logger.warn('[ApprovalQueue] Failed to send execution notification', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          requestId,
        });
      }
    }

    logger.info('[ApprovalQueue] Request executed', {
      requestId,
      operationType: request.operationType,
    });

    return { status: 'executed' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('[ApprovalQueue] Error executing request', {
      error: errorMsg,
      requestId,
    });

    // Mark as failed
    try {
      const db = getAdminFirestore();
      const now = Timestamp.now();
      await db.collection('linus-approvals').doc(requestId).update({
        status: 'failed',
        'execution.result': 'failure',
        'execution.error': errorMsg,
        'execution.executedAt': now,
        'auditLog': FieldValue.arrayUnion({
          timestamp: now,
          actor: 'system',
          action: 'execution_failed',
          details: errorMsg,
        }),
      });
    } catch (updateError) {
      logger.error('[ApprovalQueue] Error marking request as failed', {
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
    }

    return { status: 'failed', error: errorMsg };
  }
}

/**
 * Get approval history (approved/rejected/executed requests)
 */
export async function getApprovalHistory(
  operationType?: ApprovalOperationType,
  limit: number = 20
): Promise<ApprovalRequest[]> {
  try {
    const db = getAdminFirestore();
    let query = db
      .collection('linus-approvals')
      .where('status', 'in', ['approved', 'rejected', 'executed', 'failed']);

    if (operationType) {
      query = query.where('operationType', '==', operationType);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ApprovalRequest[];
  } catch (error) {
    logger.error('[ApprovalQueue] Error getting approval history', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Auto-reject requests older than 7 days
 */
export async function autoRejectExpiredRequests(): Promise<number> {
  try {
    const db = getAdminFirestore();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const snapshot = await db
      .collection('linus-approvals')
      .where('status', '==', 'pending')
      .where('createdAt', '<', Timestamp.fromDate(sevenDaysAgo))
      .get();

    let rejectedCount = 0;

    for (const doc of snapshot.docs) {
      const result = await rejectRequest(
        doc.id,
        'system',
        'Auto-rejected: request expired after 7 days without approval'
      );
      if (result.status === 'rejected') {
        rejectedCount++;
      }
    }

    logger.info('[ApprovalQueue] Auto-rejected expired requests', { count: rejectedCount });

    return rejectedCount;
  } catch (error) {
    logger.error('[ApprovalQueue] Error auto-rejecting expired requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Get stats on approval requests
 */
export async function getApprovalStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  totalByRiskLevel: Record<string, number>;
}> {
  try {
    const db = getAdminFirestore();

    const allRequests = await db.collection('linus-approvals').get();
    const requests = allRequests.docs.map((doc) => doc.data()) as ApprovalRequest[];

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      executed: 0,
      failed: 0,
      totalByRiskLevel: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<string, number>,
    };

    for (const req of requests) {
      stats[req.status]++;
      stats.totalByRiskLevel[req.operationDetails.riskLevel]++;
    }

    return stats;
  } catch (error) {
    logger.error('[ApprovalQueue] Error getting approval stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      executed: 0,
      failed: 0,
      totalByRiskLevel: {},
    };
  }
}
