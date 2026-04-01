/**
 * Playbook Dispatcher
 * POST /api/cron/playbooks/dispatcher
 *
 * Runs every 15 minutes (shared with playbooks-sub-daily Cloud Scheduler job).
 * Queries all active playbook_assignments where nextRunAt <= now, runs each
 * handler, then advances nextRunAt for the next cycle.
 *
 * This is the runtime for user-created playbooks — no new Cloud Scheduler
 * jobs are needed when a user schedules a playbook from the inbox.
 *
 * Firestore schema required on playbook_assignments:
 *   handler:    string   — registry key e.g. "daily-recap"
 *   schedule:   string   — cron expression e.g. "0 9 * * 1"
 *   timezone:   string   — IANA e.g. "America/New_York"
 *   nextRunAt:  Timestamp
 *   lastRunAt:  Timestamp (updated after each run)
 *   lastRunStatus: "success" | "error" | "skipped"
 *   config:     object   — handler-specific config
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import { runHandler } from '@/server/playbooks/handler-registry';
import { computeNextRunAt } from '@/server/playbooks/scheduler';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'playbooks-dispatcher');
    if (authError) return authError;

    const firestore = getAdminFirestore();
    const now = new Date();
    const nowTs = Timestamp.fromDate(now);

    const results: Array<{ assignmentId: string; orgId: string; handler: string; status: string }> = [];

    try {
        // All active assignments due for execution
        const dueSnap = await firestore
            .collection('playbook_assignments')
            .where('status', '==', 'active')
            .where('nextRunAt', '<=', nowTs)
            .get();

        if (dueSnap.empty) {
            return NextResponse.json({ success: true, ran: 0, results });
        }

        await Promise.allSettled(
            dueSnap.docs.map(async (doc) => {
                const data = doc.data();
                const assignmentId = doc.id;
                const orgId = data.orgId as string;
                const handler = data.handler as string | undefined;
                const schedule = data.schedule as string | undefined;
                const timezone = (data.timezone as string | undefined) ?? 'America/New_York';

                if (!handler || !schedule) {
                    // Legacy assignment without dispatcher fields — skip silently
                    return;
                }

                try {
                    await runHandler(handler, {
                        assignmentId,
                        orgId,
                        playbookId: data.playbookId as string,
                        config: (data.config as Record<string, unknown>) ?? {},
                        firestore,
                    });

                    const nextRunAt = computeNextRunAt(schedule, timezone, now);

                    await doc.ref.update({
                        lastRunAt: Timestamp.now(),
                        lastRunStatus: 'success',
                        nextRunAt: Timestamp.fromDate(nextRunAt),
                        updatedAt: Timestamp.now(),
                    });

                    results.push({ assignmentId, orgId, handler, status: 'success' });
                    logger.info('[Dispatcher] Handler ran', { assignmentId, orgId, handler, nextRunAt });
                } catch (err) {
                    logger.warn('[Dispatcher] Handler failed', { assignmentId, orgId, handler, error: err });

                    // Advance nextRunAt even on failure to prevent tight retry loops
                    const nextRunAt = schedule ? computeNextRunAt(schedule, timezone, now) : new Date(Date.now() + 60 * 60 * 1000);
                    await doc.ref.update({
                        lastRunAt: Timestamp.now(),
                        lastRunStatus: 'error',
                        nextRunAt: Timestamp.fromDate(nextRunAt),
                        updatedAt: Timestamp.now(),
                    });

                    results.push({ assignmentId, orgId, handler, status: 'error' });
                }
            })
        );

        logger.info('[Dispatcher] Cycle complete', { checked: dueSnap.size, ran: results.length });
        return NextResponse.json({ success: true, ran: results.length, results });
    } catch (err: unknown) {
        logger.error('[Dispatcher] Fatal error', { error: err });
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
