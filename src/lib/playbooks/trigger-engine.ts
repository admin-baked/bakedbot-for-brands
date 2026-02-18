'use server';

/**
 * Playbook Trigger Engine
 *
 * Resolves which playbooks should fire for a given scheduled run (daily/weekly/monthly/quarterly)
 * and dispatches them to the execution service.
 *
 * Called by:
 *   /api/cron/playbooks/daily   → frequency: 'daily'
 *   /api/cron/playbooks/weekly  → frequency: 'weekly'
 *   /api/cron/playbooks/monthly → frequency: 'monthly' (1st of month)
 *
 * Event-driven triggers are called directly via executePlaybooksForEvent()
 * from server actions (e.g. on order creation, usage threshold, etc.)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { PLAYBOOKS } from '@/config/playbooks';
import type { PlaybookFrequency } from '@/config/playbooks';
import { executePlaybookWithRetry } from './execution-service';
import type { PlaybookExecutionResult } from './execution-service';
import type { PlaybookAssignmentDoc } from './assignment-service';

export interface TriggerRunResult {
    frequency: string;
    subscriptionsChecked: number;
    playbooksTriggered: number;
    successes: number;
    failures: number;
    durationMs: number;
}

/**
 * Run all scheduled playbooks for a given frequency.
 *
 * Fetches all active subscriptions, then for each subscription finds
 * active playbook assignments matching the frequency, and fires them.
 */
export async function runScheduledPlaybooks(
    frequency: Exclude<PlaybookFrequency, 'event_driven'>
): Promise<TriggerRunResult> {
    const startTime = Date.now();
    const firestore = getAdminFirestore();

    logger.info('[PlaybookTrigger] Starting scheduled run', { frequency });

    // Get all active subscriptions
    const subsSnap = await firestore
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();

    let playbooksTriggered = 0;
    let successes = 0;
    let failures = 0;

    for (const subDoc of subsSnap.docs) {
        const sub = subDoc.data();
        const subscriptionId = subDoc.id;
        const orgId = sub.customerId as string ?? sub.orgId as string;

        // Get active playbook assignments for this subscription
        const assignmentsSnap = await firestore
            .collection('playbook_assignments')
            .where('subscriptionId', '==', subscriptionId)
            .where('status', '==', 'active')
            .get();

        // Filter to matching frequency
        const matching = assignmentsSnap.docs.filter((doc) => {
            const data = doc.data() as PlaybookAssignmentDoc;
            const definition = PLAYBOOKS[data.playbookId];
            return (
                definition?.trigger.type === 'schedule' &&
                definition.trigger.frequency === frequency
            );
        });

        if (matching.length === 0) continue;

        // Fire each playbook in parallel for this subscription
        const results: PlaybookExecutionResult[] = await Promise.all(
            matching.map((doc) =>
                executePlaybookWithRetry({
                    subscriptionId,
                    orgId,
                    playbookId: doc.data().playbookId as string,
                    triggerEvent: `schedule.${frequency}`,
                })
            )
        );

        playbooksTriggered += results.length;
        successes += results.filter((r) => r.success).length;
        failures += results.filter((r) => !r.success).length;
    }

    const durationMs = Date.now() - startTime;
    logger.info('[PlaybookTrigger] Scheduled run complete', {
        frequency,
        subscriptionsChecked: subsSnap.size,
        playbooksTriggered,
        successes,
        failures,
        durationMs,
    });

    return {
        frequency,
        subscriptionsChecked: subsSnap.size,
        playbooksTriggered,
        successes,
        failures,
        durationMs,
    };
}

/**
 * Check if today is a quarterly trigger day (Jan 1, Apr 1, Jul 1, Oct 1).
 */
export function isQuarterlyTriggerDay(date = new Date()): boolean {
    const month = date.getMonth(); // 0-indexed
    const day = date.getDate();
    return day === 1 && [0, 3, 6, 9].includes(month); // Jan, Apr, Jul, Oct
}
