/**
 * Playbook Attribution Service
 *
 * - Records playbook message deliveries (email/SMS)
 * - Calculates revenue attributed within attribution window
 * - Updates execution records with revenue + ROI metrics
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export interface PlaybookAttributionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  customersReached: number;
  revenueAttributed: number;
  roi: number;
}

export async function recordPlaybookDelivery(
  orgId: string,
  playbookId: string,
  executionId: string,
  customerId: string,
  channel: 'email' | 'sms',
  recipient: string
): Promise<void> {
  try {
    const { firestore } = await createServerClient();

    await firestore.collection('playbook_deliveries').add({
      orgId,
      playbookId,
      executionId,
      customerId,
      channel,
      recipient,
      sentAt: new Date(),
      status: 'sent',
    });

    logger.debug('[Attribution] Delivery recorded', {
      playbookId,
      customerId,
      channel,
    });
  } catch (err) {
    logger.error('[Attribution] Error recording delivery', {
      playbookId,
      customerId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function calculatePlaybookRevenue(
  orgId: string,
  customerId: string,
  attributionWindowDays: number = 7
): Promise<number> {
  try {
    const { firestore } = await createServerClient();

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - attributionWindowDays);

    const ordersSnap = await firestore
      .collection('orders')
      .where('orgId', '==', orgId)
      .where('customerId', '==', customerId)
      .where('createdAt', '>=', windowStart)
      .get();

    let totalRevenue = 0;
    for (const doc of ordersSnap.docs) {
      const order = doc.data();
      totalRevenue += order.total || 0;
    }

    return totalRevenue;
  } catch (err) {
    logger.error('[Attribution] Error calculating revenue', {
      orgId,
      customerId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

export async function updateExecutionRevenue(
  orgId: string,
  executionId: string,
  revenueAttributed: number
): Promise<void> {
  try {
    const { firestore } = await createServerClient();

    await firestore
      .collection('playbook_executions')
      .doc(executionId)
      .update({
        revenueAttributed,
        updatedAt: new Date(),
      });

    logger.debug('[Attribution] Execution revenue updated', {
      executionId,
      revenueAttributed,
    });
  } catch (err) {
    logger.error('[Attribution] Error updating execution revenue', {
      executionId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getPlaybookRoiMetrics(
  orgId: string,
  playbookId: string,
  days: number = 30
): Promise<PlaybookAttributionMetrics> {
  try {
    const { firestore } = await createServerClient();

    const lookback = new Date();
    lookback.setDate(lookback.getDate() - days);

    const execSnap = await firestore
      .collection('playbook_executions')
      .where('orgId', '==', orgId)
      .where('playbookId', '==', playbookId)
      .where('createdAt', '>=', lookback)
      .get();

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let customersReached = new Set<string>();
    let totalRevenue = 0;

    for (const doc of execSnap.docs) {
      const exec = doc.data();
      totalExecutions++;

      if (exec.status === 'completed') {
        successfulExecutions++;
      } else if (exec.status === 'failed') {
        failedExecutions++;
      }

      if (exec.customerId) {
        customersReached.add(exec.customerId);
      }

      totalRevenue += exec.revenueAttributed || 0;
    }

    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const roi =
      totalExecutions > 0
        ? ((totalRevenue - totalExecutions * 5) / (totalExecutions * 5)) * 100
        : 0; // Assume $5 cost per execution

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      customersReached: customersReached.size,
      revenueAttributed: totalRevenue,
      roi,
    };
  } catch (err) {
    logger.error('[Attribution] Error calculating ROI metrics', {
      playbookId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      customersReached: 0,
      revenueAttributed: 0,
      roi: 0,
    };
  }
}
