'use server';

/**
 * schedulePlaybook — server action for Linus to call from the inbox
 *
 * User says: "Send me a daily check-in digest every morning at 9am"
 * Linus calls: schedulePlaybook({ orgId: 'org_thrive_syracuse', intent: '...' })
 *
 * What happens:
 *   1. Claude (Haiku) parses the intent into a ScheduleSpec
 *   2. nextRunAt is computed from the cron expression
 *   3. A playbook_assignments doc is created with all scheduler fields
 *   4. The dispatcher picks it up on the next 15-min cycle
 *
 * Returns the assignment ID and when the first run is scheduled.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { parseScheduleIntent, computeNextRunAt } from '@/server/playbooks/scheduler';

export interface SchedulePlaybookInput {
    orgId: string;
    /** Free-form description from the user  e.g. "every Monday at 9am, send FlnnStoned analysis" */
    intent: string;
    /** Override the detected handler if already known */
    handler?: string;
    /** Override detected schedule if already known (cron expression) */
    schedule?: string;
    /** Override timezone (defaults to org timezone or America/New_York) */
    timezone?: string;
    /** Extra config merged into the parsed config */
    extraConfig?: Record<string, unknown>;
    /** subscriptionId if known — links to billing tier */
    subscriptionId?: string;
    /** Who triggered this: 'user' | 'linus' | 'system' */
    createdBy?: 'user' | 'linus' | 'system';
}

export interface SchedulePlaybookResult {
    assignmentId: string;
    handler: string;
    schedule: string;
    scheduleDescription: string;
    nextRunAt: Date;
    timezone: string;
}

export async function schedulePlaybook(input: SchedulePlaybookInput): Promise<SchedulePlaybookResult> {
    const {
        orgId,
        intent,
        handler: overrideHandler,
        schedule: overrideSchedule,
        timezone: overrideTz,
        extraConfig,
        subscriptionId,
        createdBy = 'linus',
    } = input;

    // Resolve org timezone
    const orgTz = overrideTz ?? await getOrgTimezone(orgId);

    // Parse intent with Claude
    const spec = await parseScheduleIntent(intent, orgTz);

    // Apply overrides
    const finalHandler = overrideHandler ?? spec.handler;
    const finalSchedule = overrideSchedule ?? spec.schedule;
    const finalTz = orgTz;
    const config = { ...spec.config, ...extraConfig };

    // Compute first run
    const nextRunAt = computeNextRunAt(finalSchedule, finalTz);

    // Create assignment
    const firestore = getAdminFirestore();
    const ref = await firestore.collection('playbook_assignments').add({
        orgId,
        subscriptionId: subscriptionId ?? null,
        playbookId: `user-${finalHandler}-${Date.now()}`,
        status: 'active',
        // Dispatcher fields
        handler: finalHandler,
        schedule: finalSchedule,
        timezone: finalTz,
        nextRunAt: Timestamp.fromDate(nextRunAt),
        lastRunAt: null,
        lastRunStatus: null,
        config,
        // Metadata
        intentDescription: intent,
        scheduleDescription: spec.description,
        createdBy,
        triggerCount: 0,
        lastTriggered: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    logger.info('[SchedulePlaybook] Created', { orgId, assignmentId: ref.id, handler: finalHandler, schedule: finalSchedule, nextRunAt });

    return {
        assignmentId: ref.id,
        handler: finalHandler,
        schedule: finalSchedule,
        scheduleDescription: spec.description,
        nextRunAt,
        timezone: finalTz,
    };
}

/**
 * Pause a user-scheduled playbook (e.g. "stop the daily recap").
 */
export async function pauseScheduledPlaybook(assignmentId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('playbook_assignments').doc(assignmentId).update({
        status: 'paused',
        updatedAt: Timestamp.now(),
    });
    logger.info('[SchedulePlaybook] Paused', { assignmentId });
}

/**
 * Resume a paused playbook. Recomputes nextRunAt from now.
 */
export async function resumeScheduledPlaybook(assignmentId: string): Promise<void> {
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('playbook_assignments').doc(assignmentId).get();
    if (!doc.exists) throw new Error(`Assignment ${assignmentId} not found`);

    const data = doc.data()!;
    const schedule = data.schedule as string | undefined;
    const timezone = (data.timezone as string | undefined) ?? 'America/New_York';

    const nextRunAt = schedule ? computeNextRunAt(schedule, timezone) : new Date(Date.now() + 60 * 60 * 1000);

    await doc.ref.update({
        status: 'active',
        nextRunAt: Timestamp.fromDate(nextRunAt),
        updatedAt: Timestamp.now(),
    });
    logger.info('[SchedulePlaybook] Resumed', { assignmentId, nextRunAt });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrgTimezone(orgId: string): Promise<string> {
    try {
        const firestore = getAdminFirestore();
        const snap = await firestore.doc(`tenants/${orgId}`).get();
        return (snap.data()?.timezone as string | undefined) ?? 'America/New_York';
    } catch {
        return 'America/New_York';
    }
}
