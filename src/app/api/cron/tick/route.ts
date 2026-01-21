
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { CronExpressionParser } from 'cron-parser';
import { executePlaybook } from '@/server/tools/playbook-manager';
import { taskScheduler } from '@/server/services/browser-automation';

export const dynamic = 'force-dynamic'; // Prevent caching
export const maxDuration = 60; // Allow 1 minute for processing

export async function GET(req: NextRequest) {
    // 1. Authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getAdminFirestore();
    const schedulesRef = db.collection('schedules');

    try {
        // 2. Fetch Active Schedules
        const snapshot = await schedulesRef.where('enabled', '==', true).get();
        const results = [];

        for (const doc of snapshot.docs) {
            const schedule = doc.data();
            const { cron, task, lastRun } = schedule;
            
            // 3. Check if Due
            // Default to createdAt if never run
            const lastRunDate = lastRun ? lastRun.toDate() : schedule.createdAt.toDate();
            
            try {
                const interval = CronExpressionParser.parse(cron, { currentDate: lastRunDate });
                const nextRun = interval.next().toDate();
                const now = new Date();

                // If next run is in the past (or now), it's due
                // We add a small buffer (e.g. 1 minute ahead) to handle execution delays? 
                // No, standard is: if nextRun <= now, it's due.
                if (nextRun <= now) {
                    console.log(`[Pulse] Executing schedule ${doc.id}: ${task}`);
                    
                    let result = null;

                    // 4. Execution Logic
                    // Check if it's a Playbook execution
                    if (schedule.params && schedule.params.playbookId) {
                        result = await executePlaybook(schedule.params.playbookId);
                    } else {
                        // Fallback for generic tasks (not yet implemented)
                        result = { skipped: true, reason: 'Generic task not supported yet' };
                    }

                    // 5. Update Last Run
                    await doc.ref.update({
                        lastRun: FieldValue.serverTimestamp(),
                        lastResult: result
                    });

                    results.push({ id: doc.id, task, status: 'executed', result });
                } else {
                    results.push({ id: doc.id, task, status: 'skipped', nextRun });
                }
            } catch (err: any) {
                console.error(`[Pulse] Failed to process schedule ${doc.id}:`, err);
                results.push({ id: doc.id, status: 'error', error: err.message });
            }
        }

        // 6. Process Browser Automation Tasks (BakedBot AI in Chrome)
        const browserTaskResults = [];
        try {
            const dueTasks = await taskScheduler.getDueTasks();

            for (const task of dueTasks) {
                try {
                    console.log(`[Pulse] Executing browser task ${task.id}: ${task.name}`);
                    const taskResult = await taskScheduler.executeTask(task.id);
                    browserTaskResults.push({
                        id: task.id,
                        name: task.name,
                        status: taskResult.success ? 'executed' : 'failed',
                        result: taskResult,
                    });
                } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    console.error(`[Pulse] Browser task ${task.id} failed:`, err);
                    browserTaskResults.push({
                        id: task.id,
                        name: task.name,
                        status: 'error',
                        error: errorMessage,
                    });
                }
            }
        } catch (err) {
            console.warn('[Pulse] Failed to process browser tasks:', err);
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            details: results,
            browserTasks: browserTaskResults,
        });

    } catch (error: any) {
        console.error('[Pulse] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
