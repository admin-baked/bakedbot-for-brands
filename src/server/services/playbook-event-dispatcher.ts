/**
 * Playbook Event Dispatcher
 *
 * Bridges webhook events to playbook execution.
 * - Queries active event listeners
 * - Deduplicates by customer (24h window)
 * - Dispatches playbooks asynchronously (fire-and-forget)
 */

import { createServerClient } from '@/firebase/server-client';
import { executePlaybook } from './playbook-executor';
import { logger } from '@/lib/logger';

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
          await executePlaybook({
            playbookId,
            orgId,
            userId: 'system',
            triggeredBy: 'event',
            eventData,
          });

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
        })
        .catch((err) => {
          logger.error('[EventDispatcher] Execution failed', {
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
