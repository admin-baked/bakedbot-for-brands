'use server';

/**
 * Server Actions for Linus Approval Dashboard
 * Used by the Super User approval interface
 */

import { logger } from '@/lib/logger';
import {
  listPendingApprovals,
  listAllApprovals,
  getApprovalRequest,
  approveRequest,
  rejectRequest,
  getApprovalHistory,
  getApprovalStats,
  type ApprovalRequest,
  type ApprovalOperationType,
} from '@/server/services/approval-queue';
import { requireSuperUser } from '@/server/auth/auth';

/**
 * Check if user is Super User
 */
async function checkSuperUserRole(): Promise<{ success: boolean; error?: string; userEmail?: string }> {
  try {
    const user = await requireSuperUser();
    return { success: true, userEmail: user.email };
  } catch (error) {
    logger.warn('[ApprovalsAction] Non-super-user attempted access', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Only Super Users can access approvals' };
  }
}

/**
 * Get all pending approval requests
 */
export async function getPendingApprovals(filter?: {
  riskLevel?: string;
  operationType?: string;
}): Promise<{ success: boolean; data?: ApprovalRequest[]; error?: string }> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const approvals = await listPendingApprovals(filter);

    return {
      success: true,
      data: approvals,
    };
  } catch (error) {
    logger.error('[ApprovalsAction] Error getting pending approvals', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to get pending approvals',
    };
  }
}

/**
 * Get a single approval request by ID
 */
export async function getApprovalDetails(
  requestId: string
): Promise<{ success: boolean; data?: ApprovalRequest; error?: string }> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const approval = await getApprovalRequest(requestId);

    if (!approval) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    return {
      success: true,
      data: approval,
    };
  } catch (error) {
    logger.error('[ApprovalsAction] Error getting approval details', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    return {
      success: false,
      error: 'Failed to get approval details',
    };
  }
}

/**
 * Approve an approval request
 */
export async function approveApprovalRequest(
  requestId: string,
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const approverEmail = roleCheck.userEmail || 'super_user';

    // Verify request exists and is pending
    const approval = await getApprovalRequest(requestId);
    if (!approval) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    if (approval.status !== 'pending') {
      return {
        success: false,
        error: `Cannot approve a ${approval.status} request`,
      };
    }

    await approveRequest(requestId, approverEmail, comments);

    logger.info('[ApprovalsAction] Approval request approved', {
      requestId,
      approvedBy: approverEmail,
    });

    return { success: true };
  } catch (error) {
    logger.error('[ApprovalsAction] Error approving request', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    return {
      success: false,
      error: 'Failed to approve request',
    };
  }
}

/**
 * Reject an approval request
 */
export async function rejectApprovalRequest(
  requestId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const rejectorEmail = roleCheck.userEmail || 'super_user';

    // Verify request exists and is pending
    const approval = await getApprovalRequest(requestId);
    if (!approval) {
      return {
        success: false,
        error: 'Approval request not found',
      };
    }

    if (approval.status !== 'pending') {
      return {
        success: false,
        error: `Cannot reject a ${approval.status} request`,
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Rejection reason is required',
      };
    }

    await rejectRequest(requestId, rejectorEmail, reason);

    logger.info('[ApprovalsAction] Approval request rejected', {
      requestId,
      rejectedBy: rejectorEmail,
    });

    return { success: true };
  } catch (error) {
    logger.error('[ApprovalsAction] Error rejecting request', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });
    return {
      success: false,
      error: 'Failed to reject request',
    };
  }
}

/**
 * Get approval history
 */
export async function getApprovalHistoryAction(
  operationType?: ApprovalOperationType,
  limit?: number
): Promise<{ success: boolean; data?: ApprovalRequest[]; error?: string }> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const history = await getApprovalHistory(operationType, limit);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    logger.error('[ApprovalsAction] Error getting approval history', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to get approval history',
    };
  }
}

/**
 * Get approval statistics
 */
export async function getApprovalStatsAction(): Promise<{
  success: boolean;
  data?: Awaited<ReturnType<typeof getApprovalStats>>;
  error?: string;
}> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const stats = await getApprovalStats();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    logger.error('[ApprovalsAction] Error getting approval stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to get approval stats',
    };
  }
}

/**
 * Get all approvals (any status)
 */
export async function getAllApprovals(limit?: number): Promise<{
  success: boolean;
  data?: ApprovalRequest[];
  error?: string;
}> {
  try {
    const roleCheck = await checkSuperUserRole();
    if (!roleCheck.success) {
      return { success: false, error: roleCheck.error };
    }

    const approvals = await listAllApprovals(limit);

    return {
      success: true,
      data: approvals,
    };
  } catch (error) {
    logger.error('[ApprovalsAction] Error getting all approvals', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to get approvals',
    };
  }
}
