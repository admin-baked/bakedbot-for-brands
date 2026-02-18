/**
 * Playbook Event Dispatcher
 *
 * Bridges webhook events to playbook execution.
 * - Queries active event listeners
 * - Deduplicates by customer (24h window)
 * - Dispatches playbooks asynchronously (fire-and-forget)
 * - Retries failed executions with exponential backoff
 * - Routes permanently failed events to Dead Letter Queue
 */

import { createServerClient } from '@/firebase/server-client';
import { executePlaybook } from './playbook-executor';
import { logger } from '@/lib/logger';

// Retry configuration: [5s, 30s, 5m]
const RETRY_DELAYS_MS = [5000, 30000, 300000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

interface ExecutionRetryRecord {
  executionId: string;
  playbookId: string;
  orgId: string;
  attempt: number;
  lastError?: string;
  nextRetryAt?: Date;
  status: 'pending' | 'retrying' | 'failed' | 'success';
  createdAt: Date;
  updatedAt: Date;
}

interface DeadLetterEvent {
  id: string;
  playbookId: string;
  orgId: string;
  eventName: string;
  eventData: Record<string, any>;
  error: string;
  attempts: number;
  failedAt: Date;
  createdAt: Date;
}

/**
 * Execute playbook with retry logic
 */
async function executePlaybookWithRetry(
  executionData: {
    playbookId: string;
    orgId: string;
    userId: string;
    triggeredBy: string;
    eventData: Record<string, any>;
  },
  attempt: number = 1
): Promise<{ success: boolean; error?: string }> {
  const { firestore } = await createServerClient();
  const startTime = Date.now();

  try {
    const result = await executePlaybook(executionData);

    logger.info('[EventDispatcher] Playbook executed successfully', {
      playbookId: executionData.playbookId,
      orgId: executionData.orgId,
      attempt,
      duration: Date.now() - startTime,
    });

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (attempt < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const delayMs = RETRY_DELAYS_MS[attempt - 1];
      const nextRetryAt = new Date(Date.now() + delayMs);

      logger.warn('[EventDispatcher] Playbook execution failed, scheduling retry', {
        playbookId: executionData.playbookId,
        orgId: executionData.orgId,
        attempt,
        nextAttempt: attempt + 1,
        retryDelayMs: delayMs,
        error: errorMsg,
      });

      // Record retry in database
      try {
        await firestore.collection('playbook_execution_retries').add({
          playbookId: executionData.playbookId,
          orgId: executionData.orgId,
          attempt,
          nextRetryAt,
          error: errorMsg,
          status: 'retrying',
          eventData: executionData.eventData,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ExecutionRetryRecord);
      } catch (dbErr) {
        logger.error('[EventDispatcher] Failed to record retry', { error: dbErr });
      }

      return {
        success: false,
        error: `Retry scheduled (attempt ${attempt}/${MAX_RETRIES}), next in ${delayMs}ms`,
      };
    } else {
      // Max retries exceeded, send to Dead Letter Queue
      logger.error('[EventDispatcher] Max retries exceeded, sending to DLQ', {
        playbookId: executionData.playbookId,
        orgId: executionData.orgId,
        attempts: attempt,
        error: errorMsg,
      });

      try {
        await firestore.collection('playbook_dead_letter_queue').add({
          playbookId: executionData.playbookId,
          orgId: executionData.orgId,
          eventName: executionData.eventData.eventName || 'unknown',
          eventData: executionData.eventData,
          error: errorMsg,
          attempts: attempt,
          failedAt: new Date(),
          createdAt: new Date(),
        } as DeadLetterEvent);
      } catch (dlqErr) {
        logger.error('[EventDispatcher] Failed to record DLQ event', { error: dlqErr });
      }

      return { success: false, error: `Max retries exceeded: ${errorMsg}` };
    }
  }
}

export async function dispatchPlaybookEvent(
  orgId: string,
  eventName: string,
  eventData: Record<string, any>
): Promise<void> {
  try {
    const { firestore } = await createServerClient();

    // Query active event listeners for this org + event
    const listenersSnap = await firestore
      .collection('playbook_event_listeners')
      .where('orgId', '==', orgId)
      .where('eventName', '==', eventName)
      .where('status', '==', 'active')
      .get();

    if (listenersSnap.empty) {
      logger.debug('[EventDispatcher] No active listeners', { orgId, eventName });
      return;
    }

    const customerId = eventData.customerId || eventData.customer_id;
    const customerEmail = eventData.customerEmail || eventData.customer_email;

    // Check 24h dedup window
    const now = new Date();
    const lookback24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dedupQuery = firestore
      .collection('customer_communications')
      .where('orgId', '==', orgId)
      .where('type', '==', `playbook_event_${eventName}`)
      .where('sentAt', '>=', lookback24h);

    if (customerId) {
      dedupQuery.where('customerId', '==', customerId);
    } else if (customerEmail) {
      dedupQuery.where('customerEmail', '==', customerEmail);
    }

    const dedupSnap = await dedupQuery.get();

    if (!dedupSnap.empty) {
      logger.info('[EventDispatcher] Event dedupped (24h window)', {
        orgId,
        eventName,
        customerId,
      });
      return;
    }

    // Dispatch each matching listener asynchronously (fire-and-forget)
    for (const doc of listenersSnap.docs) {
      const listener = doc.data();
      const playbookId = listener.playbookId;

      Promise.resolve()
        .then(async () => {
          // Execute with retry logic
          const result = await executePlaybookWithRetry(
            {
              playbookId,
              orgId,
              userId: 'system',
              triggeredBy: 'event',
              eventData,
            },
            1 // First attempt
          );

          if (result.success) {
            // Record dedup
            await firestore.collection('customer_communications').add({
              orgId,
              type: `playbook_event_${eventName}`,
              customerId: customerId || null,
              customerEmail: customerEmail || null,
              playbookId,
              sentAt: now,
              channel: 'playbook',
            });

            logger.debug('[EventDispatcher] Dedup record created', {
              playbookId,
              orgId,
              eventName,
            });
          }
        })
        .catch((err) => {
          logger.error('[EventDispatcher] Unexpected error during dispatch', {
            playbookId,
            orgId,
            eventName,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
  } catch (err) {
    logger.error('[EventDispatcher] Error dispatching event', {
      orgId,
      eventName,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
