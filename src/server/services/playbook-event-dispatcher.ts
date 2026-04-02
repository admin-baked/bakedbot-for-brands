/**
 * Playbook Event Dispatcher
 *
 * Bridges webhook events to playbook execution.
 * - Queries active event listeners
 * - Deduplicates event-triggered sends in a 24h window
 * - Supports async fire-and-forget dispatch and synchronous delivery checks
 * - Retries failed async executions with exponential backoff
 * - Routes permanently failed async events to Dead Letter Queue
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { executePlaybook } from './playbook-executor';

const RETRY_DELAYS_MS = [5000, 30000, 300000];
const MAX_RETRIES = RETRY_DELAYS_MS.length;

interface ExecutionRetryRecord {
    playbookId: string;
    orgId: string;
    attempt: number;
    lastError?: string;
    nextRetryAt?: Date;
    status: 'pending' | 'retrying' | 'failed' | 'success';
    eventData: Record<string, any>;
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

export interface PlaybookEventDispatchResult {
    playbookId: string;
    status: 'success' | 'failed' | 'deduped';
    error?: string;
}

export interface PlaybookEventDispatchSummary {
    delivered: boolean;
    deduped: boolean;
    results: PlaybookEventDispatchResult[];
}

interface EventListenerRecord {
    id: string;
    playbookId: string;
    orgId: string;
    eventName: string;
    status: string;
}

interface PlaybookDocRecord {
    id: string;
    orgId: string;
    status?: string;
    active?: boolean;
    triggers?: unknown;
}

const PLAYBOOK_EVENT_COMPATIBILITY_ALIASES: Record<string, string[]> = {
    'customer.signup': ['customer.created'],
    'order.completed': ['order.post_purchase'],
};

function dedupeCompatibleEventNames(eventNames: string[]): string[] {
    return Array.from(new Set(eventNames));
}

function buildListenerDocId(playbookId: string, eventName: string): string {
    return `listener:${playbookId}:${eventName}`.replace(/[\/\\?#\[\]\s]+/g, '_');
}

function isPlaybookActive(playbook: PlaybookDocRecord): boolean {
    return String(playbook.status || '').toLowerCase() === 'active' || playbook.active === true;
}

function getEventNameFromTrigger(trigger: unknown): string | null {
    if (!trigger || typeof trigger !== 'object') {
        return null;
    }

    const record = trigger as {
        type?: unknown;
        eventName?: unknown;
        config?: { eventName?: unknown; eventPattern?: unknown };
    };

    if (record.type !== 'event') {
        return null;
    }

    const directEvent = typeof record.eventName === 'string' ? record.eventName.trim() : '';
    if (directEvent) {
        return directEvent;
    }

    const configEvent = typeof record.config?.eventName === 'string' ? record.config.eventName.trim() : '';
    if (configEvent) {
        return configEvent;
    }

    const configPattern = typeof record.config?.eventPattern === 'string' ? record.config.eventPattern.trim() : '';
    return configPattern || null;
}

async function backfillPlaybookListeners(
    firestore: FirebaseFirestore.Firestore,
    listeners: EventListenerRecord[],
): Promise<void> {
    if (listeners.length === 0) {
        return;
    }

    const now = new Date();
    const listenersRef = firestore.collection('playbook_event_listeners');
    const batch = firestore.batch();

    listeners.forEach((listener) => {
        batch.set(
            listenersRef.doc(listener.id),
            {
                playbookId: listener.playbookId,
                orgId: listener.orgId,
                eventName: listener.eventName,
                status: 'active',
                source: 'event_dispatcher_backfill',
                updatedAt: now,
            },
            { merge: true },
        );
    });

    await batch.commit();
}

async function getFallbackPlaybookListeners(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    eventName: string,
): Promise<EventListenerRecord[]> {
    const compatibleEventNames = new Set(getCompatiblePlaybookEventNames(eventName));
    const playbookSnap = await firestore.collection('playbooks').where('orgId', '==', orgId).get();

    if (playbookSnap.empty) {
        return [];
    }

    const listeners = playbookSnap.docs.flatMap((doc) => {
        const data = doc.data() as PlaybookDocRecord;
        const playbook: PlaybookDocRecord = {
            id: doc.id,
            orgId,
            status: data.status,
            active: data.active,
            triggers: data.triggers,
        };

        if (!isPlaybookActive(playbook) || !Array.isArray(playbook.triggers)) {
            return [];
        }

        const matchingEvents = dedupeCompatibleEventNames(
            playbook.triggers
                .map((trigger) => getEventNameFromTrigger(trigger))
                .filter((value): value is string => Boolean(value && compatibleEventNames.has(value))),
        );

        return matchingEvents.map((matchedEventName) => ({
            id: buildListenerDocId(doc.id, matchedEventName),
            playbookId: doc.id,
            orgId,
            eventName: matchedEventName,
            status: 'active',
        }));
    });

    if (listeners.length > 0) {
        await backfillPlaybookListeners(firestore, listeners);
        logger.info('[EventDispatcher] Backfilled missing event listeners from playbook definitions', {
            orgId,
            eventName,
            playbookIds: Array.from(new Set(listeners.map((listener) => listener.playbookId))),
            listenerCount: listeners.length,
        });
    }

    return listeners;
}

export function getCompatiblePlaybookEventNames(eventName: string): string[] {
    return dedupeCompatibleEventNames([
        eventName,
        ...(PLAYBOOK_EVENT_COMPATIBILITY_ALIASES[eventName] ?? []),
    ]);
}

export function getCompatiblePlaybookDedupTypes(eventName: string): string[] {
    return getCompatiblePlaybookEventNames(eventName).map((name) => `playbook_event_${name}`);
}

function getCustomerIdentity(eventData: Record<string, any>): {
    customerId?: string;
    customerEmail?: string;
    dedupeKey?: string;
} {
    const customerId = typeof eventData.customerId === 'string'
        ? eventData.customerId
        : typeof eventData.customer_id === 'string'
            ? eventData.customer_id
            : undefined;
    const customerEmail = typeof eventData.customerEmail === 'string'
        ? eventData.customerEmail
        : typeof eventData.customer_email === 'string'
            ? eventData.customer_email
            : undefined;
    const dedupeKey = typeof eventData.dedupeKey === 'string' && eventData.dedupeKey.trim().length > 0
        ? eventData.dedupeKey.trim()
        : undefined;

    return {
        customerId,
        customerEmail,
        dedupeKey,
    };
}

async function getActiveEventListeners(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    eventName: string,
): Promise<EventListenerRecord[]> {
    const compatibleEventNames = getCompatiblePlaybookEventNames(eventName);
    const listenerSnaps = await Promise.all(
        compatibleEventNames.map((compatibleEventName) =>
            firestore
                .collection('playbook_event_listeners')
                .where('orgId', '==', orgId)
                .where('eventName', '==', compatibleEventName)
                .where('status', '==', 'active')
                .get(),
        ),
    );

    const listenerDocs = listenerSnaps.flatMap((snap) => snap.docs);
    const uniqueListenerDocs = Array.from(
        new Map(listenerDocs.map((doc) => [doc.id, doc])).values(),
    );

    const listeners = uniqueListenerDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            playbookId: String(data.playbookId || ''),
            orgId: String(data.orgId || orgId),
            eventName: String(data.eventName || eventName),
            status: String(data.status || 'active'),
        };
    }).filter((listener) => listener.playbookId.length > 0);

    if (listeners.length > 0) {
        return listeners;
    }

    return getFallbackPlaybookListeners(firestore, orgId, eventName);
}

async function hasRecentPlaybookDedup(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    eventName: string,
    eventData: Record<string, any>,
): Promise<boolean> {
    const { customerId, customerEmail, dedupeKey } = getCustomerIdentity(eventData);
    const lookback24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dedupTypes = getCompatiblePlaybookDedupTypes(eventName);

    const dedupSnaps = await Promise.all(
        dedupTypes.map((dedupType) => {
            let dedupQuery = firestore
                .collection('customer_communications')
                .where('orgId', '==', orgId)
                .where('type', '==', dedupType);

            if (dedupeKey) {
                dedupQuery = dedupQuery.where('dedupeKey', '==', dedupeKey);
            } else if (customerId) {
                dedupQuery = dedupQuery.where('customerId', '==', customerId);
            } else if (customerEmail) {
                dedupQuery = dedupQuery.where('customerEmail', '==', customerEmail);
            } else {
                return Promise.resolve({ empty: true });
            }

            return dedupQuery.where('sentAt', '>=', lookback24h).get();
        }),
    );

    return dedupSnaps.some((snap) => !snap.empty);
}

async function recordPlaybookDedup(
    firestore: FirebaseFirestore.Firestore,
    input: {
        orgId: string;
        playbookId: string;
        eventName: string;
        eventData: Record<string, any>;
        sentAt: Date;
    },
): Promise<void> {
    const { customerId, customerEmail, dedupeKey } = getCustomerIdentity(input.eventData);

    await firestore.collection('customer_communications').add({
        orgId: input.orgId,
        type: `playbook_event_${input.eventName}`,
        customerId: customerId || null,
        customerEmail: customerEmail || null,
        playbookId: input.playbookId,
        dedupeKey: dedupeKey || null,
        channel: 'playbook',
        sentAt: input.sentAt,
        metadata: {
            eventName: input.eventName,
        },
    });
}

function createDedupedSummary(listeners: EventListenerRecord[]): PlaybookEventDispatchSummary {
    return {
        delivered: true,
        deduped: true,
        results: listeners.map((listener) => ({
            playbookId: listener.playbookId,
            status: 'deduped' as const,
        })),
    };
}

async function executePlaybookWithRetry(
    executionData: {
        playbookId: string;
        orgId: string;
        userId: string;
        triggeredBy: 'event' | 'manual' | 'schedule';
        eventData: Record<string, any>;
    },
    attempt: number = 1,
): Promise<{ success: boolean; error?: string }> {
    const { firestore } = await createServerClient();
    const startTime = Date.now();

    try {
        const result = await executePlaybook(executionData);
        if (result.status !== 'completed') {
            throw new Error(result.error || `Execution finished with status ${result.status}`);
        }

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
        }

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

export async function dispatchPlaybookEventSync(
    orgId: string,
    eventName: string,
    eventData: Record<string, any>,
): Promise<PlaybookEventDispatchSummary> {
    try {
        const { firestore } = await createServerClient();
        const listeners = await getActiveEventListeners(firestore, orgId, eventName);

        if (listeners.length === 0) {
            logger.debug('[EventDispatcher] No active listeners', { orgId, eventName });
            return {
                delivered: false,
                deduped: false,
                results: [],
            };
        }

        if (await hasRecentPlaybookDedup(firestore, orgId, eventName, eventData)) {
            logger.info('[EventDispatcher] Event deduped (24h window)', {
                orgId,
                eventName,
                dedupeKey: eventData.dedupeKey,
            });
            return createDedupedSummary(listeners);
        }

        const sentAt = new Date();
        const results: PlaybookEventDispatchResult[] = [];

        for (const listener of listeners) {
            try {
                const result = await executePlaybook({
                    playbookId: listener.playbookId,
                    orgId,
                    userId: 'system',
                    triggeredBy: 'event',
                    eventData: {
                        ...eventData,
                        eventName,
                    },
                });

                if (result.status === 'completed') {
                    await recordPlaybookDedup(firestore, {
                        orgId,
                        playbookId: listener.playbookId,
                        eventName,
                        eventData,
                        sentAt,
                    });

                    results.push({
                        playbookId: listener.playbookId,
                        status: 'success',
                    });
                } else {
                    results.push({
                        playbookId: listener.playbookId,
                        status: 'failed',
                        error: result.error || `Execution finished with status ${result.status}`,
                    });
                }
            } catch (error) {
                results.push({
                    playbookId: listener.playbookId,
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return {
            delivered: results.some((result) => result.status === 'success'),
            deduped: false,
            results,
        };
    } catch (error) {
        logger.error('[EventDispatcher] Error dispatching sync event', {
            orgId,
            eventName,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            delivered: false,
            deduped: false,
            results: [],
        };
    }
}

export async function dispatchPlaybookEvent(
    orgId: string,
    eventName: string,
    eventData: Record<string, any>,
): Promise<void> {
    try {
        const { firestore } = await createServerClient();
        const listeners = await getActiveEventListeners(firestore, orgId, eventName);

        if (listeners.length === 0) {
            logger.debug('[EventDispatcher] No active listeners', { orgId, eventName });
            return;
        }

        if (await hasRecentPlaybookDedup(firestore, orgId, eventName, eventData)) {
            logger.info('[EventDispatcher] Event deduped (24h window)', {
                orgId,
                eventName,
                dedupeKey: eventData.dedupeKey,
            });
            return;
        }

        const sentAt = new Date();

        for (const listener of listeners) {
            Promise.resolve()
                .then(async () => {
                    const result = await executePlaybookWithRetry(
                        {
                            playbookId: listener.playbookId,
                            orgId,
                            userId: 'system',
                            triggeredBy: 'event',
                            eventData: {
                                ...eventData,
                                eventName,
                            },
                        },
                        1,
                    );

                    if (result.success) {
                        await recordPlaybookDedup(firestore, {
                            orgId,
                            playbookId: listener.playbookId,
                            eventName,
                            eventData,
                            sentAt,
                        });
                    } else {
                        logger.error('[EventDispatcher] Failed to execute playbook', {
                            playbookId: listener.playbookId,
                            orgId,
                            eventName,
                            error: result.error || 'Unknown error',
                        });
                    }
                })
                .catch((error) => {
                    logger.error('[EventDispatcher] Unexpected error during dispatch', {
                        playbookId: listener.playbookId,
                        orgId,
                        eventName,
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
        }
    } catch (error) {
        logger.error('[EventDispatcher] Error dispatching event', {
            orgId,
            eventName,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
