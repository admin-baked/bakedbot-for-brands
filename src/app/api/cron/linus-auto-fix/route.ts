export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Linus Auto-Fix — Autonomous Bug Resolution
 *
 * Runs every 30 minutes via Cloud Scheduler.
 *
 * Logic:
 *  1. Query agent_tasks for open bugs (critical or high priority) assigned to Linus
 *     that have been sitting unclaimed for > 1 hour.
 *  2. For each eligible task, claim it immediately (dedup guard) then dispatch
 *     Linus with the full task context and a green light to fix + commit + push.
 *  3. Post a #linus-incidents Slack notification so the team knows Linus is on it.
 *
 * Linus uses delegate_to_claude_code to queue the fix as a Claude Code task,
 * which runs /shipit after the fix lands.
 *
 * Auth: Bearer CRON_SECRET (same as all other cron routes)
 * Cloud Scheduler job: linus-auto-fix — every 30 min
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { claimTask } from '@/server/actions/agent-tasks';
import { dispatchLinusIncidentResponse } from '@/server/services/linus-incident-response';
import type { AgentTask } from '@/types/agent-task';

const ONE_HOUR_MS = 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.get('authorization') || '';
    if (header === `Bearer ${secret}`) return true;
    const param = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('token');
    return param === secret;
}

async function findStaleBugs(): Promise<AgentTask[]> {
    const db = getAdminFirestore();
    const cutoff = new Date(Date.now() - ONE_HOUR_MS).toISOString();

    const snap = await db
        .collection('agent_tasks')
        .where('status', '==', 'open')
        .where('assignedTo', '==', 'linus')
        .orderBy('createdAt', 'asc')
        .limit(10)
        .get();

    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AgentTask))
        .filter(t => {
            const isPriority = t.priority === 'critical' || t.priority === 'high';
            const isStale = t.createdAt < cutoff;
            return isPriority && isStale;
        });
}

async function dispatchFix(task: AgentTask): Promise<void> {
    const prompt = `
You have been given the green light to autonomously fix the following bug that has been open and unclaimed for over 1 hour:

**Task ID:** ${task.id}
**Title:** ${task.title}
**Priority:** ${task.priority}
**Reported by:** ${task.reportedBy ?? 'automated system'}
**Filed at:** ${task.createdAt}
${task.filePath ? `**File:** ${task.filePath}` : ''}
${task.errorSnippet ? `**Error:** ${task.errorSnippet}` : ''}

**Full context:**
${task.body}

Instructions:
1. Read the relevant file(s) to understand the bug.
2. Use delegate_to_claude_code to queue the fix — include the full task context and instruct Claude Code to run /shipit after the fix.
3. Mark the task in_progress (via check_task_queue complete action) once you've dispatched the fix.
4. Post a brief status update to #linus-incidents.

You have full autonomy here. No human approval needed. Fix it, deploy it, close it.
`.trim();

    await dispatchLinusIncidentResponse({
        prompt,
        source: 'auto-escalator',
        incidentId: task.id,
        analysisHeader: `🔧 Linus Auto-Fix — ${task.title.slice(0, 60)}`,
        analysisFallbackPrefix: '🔧 Linus auto-fix dispatched',
        channelName: 'linus-incidents',
        maxIterations: 8,
    });
}

async function run(): Promise<{ dispatched: number; tasks: string[] }> {
    const staleBugs = await findStaleBugs();

    if (!staleBugs.length) {
        logger.info('[LinusAutoFix] No stale bugs found — all clear');
        return { dispatched: 0, tasks: [] };
    }

    logger.info('[LinusAutoFix] Found stale bugs', {
        count: staleBugs.length,
        tasks: staleBugs.map(t => t.id),
    });

    const dispatched: string[] = [];

    for (const task of staleBugs) {
        // Claim first — prevents concurrent runs from double-dispatching
        const claimed = await claimTask(task.id, 'linus-auto');
        if (!claimed.success) {
            logger.info('[LinusAutoFix] Task already claimed, skipping', { taskId: task.id });
            continue;
        }

        try {
            await dispatchFix(task);
            dispatched.push(task.id);
            logger.info('[LinusAutoFix] Fix dispatched', { taskId: task.id, title: task.title });
        } catch (err) {
            logger.error('[LinusAutoFix] Dispatch failed', {
                taskId: task.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return { dispatched: dispatched.length, tasks: dispatched };
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[LinusAutoFix] Handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[LinusAutoFix] Handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
