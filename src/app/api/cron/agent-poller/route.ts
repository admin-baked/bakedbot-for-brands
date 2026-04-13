/**
 * Agent Task Poller Cron
 * 
 * GET /api/cron/agent-poller
 * 
 * Runs every 5 minutes to check for pending agent tasks
 * and triggers the wakeup endpoint to spawn the agent.
 * 
 * CRON_SECRET auth required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';

export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes


async function checkForPendingTasks(): Promise<{ hasTasks: boolean; tasks: Array<{ id: string; title: string; reportedBy: string }> }> {
    const db = getAdminFirestore();
    
    const fiveMinAgo = new Date(Date.now() - POLL_INTERVAL_MS);
    
    const snap = await db.collection('agent_tasks')
        .where('status', '==', 'open')
        .where('createdAt', '>=', fiveMinAgo.toISOString())
        .limit(5)
        .get();

    const tasks = snap.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        reportedBy: doc.data().reportedBy,
    }));

    return {
        hasTasks: tasks.length > 0,
        tasks
    };
}

export async function GET(req: NextRequest) {
    const authError = await requireCronSecret(req, 'agent-poller');
    if (authError) return authError;

    try {
        logger.info('[Agent Poller] Checking for pending tasks...');

        const { hasTasks, tasks } = await checkForPendingTasks();

        if (!hasTasks) {
            return NextResponse.json({ 
                status: 'no-tasks',
                message: 'No pending tasks found',
                checkedAt: new Date().toISOString()
            });
        }

        logger.info('[Agent Poller] Found tasks:', { tasks });

        const wakeupUrl = process.env.AGENT_WAKEUP_URL || `${req.nextUrl.origin}/api/agent-wakeup`;
        const cronSecret = process.env.CRON_SECRET;

        const results = await Promise.allSettled(
            tasks.map(async (task) => {
                const response = await fetch(wakeupUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${cronSecret}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        taskId: task.id,
                        taskType: 'bug-hunt',
                        context: `Process task: ${task.title} (reported by ${task.reportedBy})`,
                    }),
                });

                return {
                    taskId: task.id,
                    status: response.ok ? 'triggered' : 'failed',
                    response: await response.json(),
                };
            })
        );

        const triggered = results.filter(r => r.status === 'fulfilled' && r.value.status === 'triggered').length;

        return NextResponse.json({
            status: 'success',
            tasksFound: tasks.length,
            triggered,
            results,
            checkedAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error('[Agent Poller] Error:', { error });
        return NextResponse.json({
            error: 'Poller failed',
            details: String(error)
        }, { status: 500 });
    }
}
