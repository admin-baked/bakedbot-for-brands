/**
 * Webhook Retry Processor
 *
 * Handles pending retries with exponential backoff
 * - Monitors playbook_execution_retries collection
 * - Processes retries when scheduled time arrives
 * - Updates retry status and handles final failures
 */

import { createServerClient } from '@/firebase/server-client';
import { executePlaybook } from './playbook-executor';
import { logger } from '@/lib/logger';

const RETRY_DELAYS_MS = [5000, 30000, 300000]; // 5s, 30s, 5m
const MAX_RETRIES = RETRY_DELAYS_MS.length;

interface RetryRecord {
  id: string;
  playbookId: string;
  orgId: string;
  attempt: number;
  nextRetryAt: Date;
  error: string;
  status: 'pending' | 'retrying' | 'failed' | 'success';
  eventData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Process pending retries
 * Should be called by a Cloud Scheduler or Cloud Tasks job periodically
 */
export async function processPendingRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  error?: string;
}> {
  try {
    const { firestore } = await createServerClient();
    const now = new Date();

    logger.info('[RetryProcessor] Starting retry processing', { timestamp: now });

    // Find all pending retries that are due
    const retrySnap = await firestore
      .collection('playbook_execution_retries')
      .where('status', '==', 'retrying')
      .where('nextRetryAt', '<=', now)
      .limit(100); // Process up to 100 at a time

    const snap = await retrySnap.get();
    let succeeded = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      const retry = doc.data() as RetryRecord;

      try {
        logger.info('[RetryProcessor] Processing retry', {
          playbookId: retry.playbookId,
          orgId: retry.orgId,
          attempt: retry.attempt,
          retryId: doc.id,
        });

        // Execute playbook
        try {
          await executePlaybook({
            playbookId: retry.playbookId,
            orgId: retry.orgId,
            userId: 'system',
            triggeredBy: 'event',
            eventData: retry.eventData,
          });

          // Success! Update retry record
          await doc.ref.update({
            status: 'success',
            updatedAt: new Date(),
          });

          logger.info('[RetryProcessor] Retry succeeded', {
            playbookId: retry.playbookId,
            orgId: retry.orgId,
            attempt: retry.attempt,
            retryId: doc.id,
          });

          succeeded++;
        } catch (executionError) {
          // Execution failed, decide if we should retry again
          const errorMsg =
            executionError instanceof Error ? executionError.message : String(executionError);

          if (retry.attempt < MAX_RETRIES) {
            // Schedule next retry
            const nextAttempt = retry.attempt + 1;
            const delayMs = RETRY_DELAYS_MS[nextAttempt - 1];
            const nextRetryAt = new Date(Date.now() + delayMs);

            await doc.ref.update({
              attempt: nextAttempt,
              nextRetryAt,
              error: errorMsg,
              status: 'retrying',
              updatedAt: new Date(),
            });

            logger.warn('[RetryProcessor] Retry failed, scheduling next attempt', {
              playbookId: retry.playbookId,
              orgId: retry.orgId,
              currentAttempt: retry.attempt,
              nextAttempt,
              retryDelayMs: delayMs,
              error: errorMsg,
              retryId: doc.id,
            });

            failed++;
          } else {
            // Max retries exceeded, move to DLQ
            await doc.ref.update({
              status: 'failed',
              error: errorMsg,
              updatedAt: new Date(),
            });

            // Add to Dead Letter Queue
            await firestore.collection('playbook_dead_letter_queue').add({
              playbookId: retry.playbookId,
              orgId: retry.orgId,
              eventName: retry.eventData.eventName || 'unknown',
              eventData: retry.eventData,
              error: errorMsg,
              attempts: retry.attempt,
              failedAt: new Date(),
              createdAt: new Date(),
            });

            logger.error('[RetryProcessor] Max retries exceeded, moved to DLQ', {
              playbookId: retry.playbookId,
              orgId: retry.orgId,
              attempts: retry.attempt,
              error: errorMsg,
              retryId: doc.id,
            });

            failed++;
          }
        }
      } catch (err) {
        logger.error('[RetryProcessor] Unexpected error processing retry', {
          playbookId: retry.playbookId,
          orgId: retry.orgId,
          retryId: doc.id,
          error: err instanceof Error ? err.message : String(err),
        });
        failed++;
      }
    }

    logger.info('[RetryProcessor] Retry processing complete', {
      processed: snap.size,
      succeeded,
      failed,
    });

    return {
      processed: snap.size,
      succeeded,
      failed,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('[RetryProcessor] Error processing retries', { error: errorMsg });
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      error: errorMsg,
    };
  }
}

/**
 * Get retry statistics for monitoring
 */
export async function getRetryStats(): Promise<{
  pending: number;
  retrying: number;
  failed: number;
  dlqCount: number;
}> {
  try {
    const { firestore } = await createServerClient();

    const [pendingSnap, retryingSnap, failedSnap, dlqSnap] = await Promise.all([
      firestore.collection('playbook_execution_retries').where('status', '==', 'pending').get(),
      firestore.collection('playbook_execution_retries').where('status', '==', 'retrying').get(),
      firestore.collection('playbook_execution_retries').where('status', '==', 'failed').get(),
      firestore.collection('playbook_dead_letter_queue').get(),
    ]);

    return {
      pending: pendingSnap.size,
      retrying: retryingSnap.size,
      failed: failedSnap.size,
      dlqCount: dlqSnap.size,
    };
  } catch (error) {
    logger.error('[RetryProcessor] Error getting retry stats', { error });
    return {
      pending: 0,
      retrying: 0,
      failed: 0,
      dlqCount: 0,
    };
  }
}

/**
 * Get DLQ events for inspection/alerting
 */
export async function getDLQEvents(limit: number = 100): Promise<
  Array<{
    id: string;
    playbookId: string;
    orgId: string;
    eventName: string;
    error: string;
    attempts: number;
    failedAt: Date;
  }>
> {
  try {
    const { firestore } = await createServerClient();

    const snap = await firestore
      .collection('playbook_dead_letter_queue')
      .orderBy('failedAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
  } catch (error) {
    logger.error('[RetryProcessor] Error getting DLQ events', { error });
    return [];
  }
}
