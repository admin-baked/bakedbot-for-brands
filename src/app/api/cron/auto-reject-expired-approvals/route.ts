/**
 * Auto-Reject Expired Approval Requests Cron Job
 *
 * Cloud Scheduler daily job (4 AM UTC) that auto-rejects approval requests
 * that have been pending for longer than 7 days.
 *
 * Endpoint: POST/GET /api/cron/auto-reject-expired-approvals
 * Auth: CRON_SECRET via Authorization header
 * Frequency: Daily at 4 AM UTC (configurable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { autoRejectExpiredRequests } from '@/server/services/approval-queue';
import { notifyApprovalRejected } from '@/server/services/approval-notifications';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * Validate CRON_SECRET from Authorization header
 */
function requireCronSecret(request: NextRequest): { valid: boolean; error?: string } {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.error('[AutoRejectCron] CRON_SECRET environment variable is not configured');
    return { valid: false, error: 'Server misconfiguration' };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    logger.warn('[AutoRejectCron] Missing authorization header');
    return { valid: false, error: 'Unauthorized' };
  }

  const expectedAuth = `Bearer ${cronSecret}`;
  if (authHeader !== expectedAuth) {
    logger.warn('[AutoRejectCron] Invalid authorization header');
    return { valid: false, error: 'Unauthorized' };
  }

  return { valid: true };
}

/**
 * Get auto-rejected requests for notification
 */
async function getAutoRejectedRequests(
  rejectedIds: string[]
): Promise<Record<string, any>[]> {
  if (rejectedIds.length === 0) return [];

  try {
    const db = getAdminFirestore();
    const requests: Record<string, any>[] = [];

    for (const id of rejectedIds) {
      const doc = await db.collection('linus-approvals').doc(id).get();
      if (doc.exists) {
        requests.push({ id: doc.id, ...doc.data() });
      }
    }

    return requests;
  } catch (error) {
    logger.error('[AutoRejectCron] Error fetching auto-rejected requests', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Send Slack notifications for auto-rejected requests (non-blocking)
 */
async function notifyAutoRejections(requests: Record<string, any>[]): Promise<void> {
  for (const request of requests) {
    try {
      // Create a notification-compatible object
      const notificationData = {
        ...request,
        rejectionReason: 'Auto-rejected: request expired after 7 days without approval',
      };
      await notifyApprovalRejected(notificationData, 'system');
    } catch (error) {
      logger.warn('[AutoRejectCron] Failed to send rejection notification', {
        error: error instanceof Error ? error.message : String(error),
        requestId: request.id,
      });
      // Continue with other notifications despite individual failures
    }
  }
}

/**
 * Handle POST requests from Cloud Scheduler
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate CRON_SECRET
    const auth = requireCronSecret(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    logger.info('[AutoRejectCron] Starting auto-reject job');

    // Run auto-rejection
    const rejectedCount = await autoRejectExpiredRequests();

    logger.info('[AutoRejectCron] Auto-reject job completed', {
      rejectedCount,
    });

    // Fetch rejected requests for Slack notifications (non-blocking)
    if (rejectedCount > 0) {
      try {
        const db = getAdminFirestore();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const snapshot = await db
          .collection('linus-approvals')
          .where('status', '==', 'rejected')
          .where('createdAt', '<', sevenDaysAgo)
          .get();

        const rejectedIds = snapshot.docs.map((doc) => doc.id);
        const rejectedRequests = await getAutoRejectedRequests(rejectedIds);
        await notifyAutoRejections(rejectedRequests);
      } catch (notificationError) {
        logger.warn('[AutoRejectCron] Failed to send notifications', {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
        // Continue despite notification failures
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Auto-reject job completed',
        rejectedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[AutoRejectCron] Unexpected error in auto-reject job', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run auto-reject job',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for manual testing
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate CRON_SECRET
    const auth = requireCronSecret(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    logger.info('[AutoRejectCron] Manual trigger via GET');

    // Delegate to POST handler logic
    return POST(request);
  } catch (error) {
    logger.error('[AutoRejectCron] Unexpected error in GET handler', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run auto-reject job',
      },
      { status: 500 }
    );
  }
}
