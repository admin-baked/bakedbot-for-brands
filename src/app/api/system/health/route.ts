import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/**
 * System Health API
 * Returns real-time heartbeat status for dashboard indicators
 * Public endpoint - no auth required (shows overall system health)
 */
export async function GET() {
    try {
        const db = getAdminFirestore();
        const now = new Date();

        // Check heartbeat_executions for recent activity (last 15 minutes)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        let lastExecution: any = null;
        let schedulesExecuted = 0;
        let browserTasksExecuted = 0;

        try {
            const executionsSnapshot = await db
                .collection('heartbeat_executions')
                .where('completedAt', '>=', fifteenMinsAgo)
                .orderBy('completedAt', 'desc')
                .limit(10)
                .get();

            if (!executionsSnapshot.empty) {
                lastExecution = executionsSnapshot.docs[0].data();
                // Count total executions
                schedulesExecuted = executionsSnapshot.size;
            }
        } catch (err) {
            // heartbeat_executions doesn't exist yet - will show as unknown
        }

        const timestamp = lastExecution?.completedAt?.toDate();

        // Check system_logs for recent errors (last 24 hours) - ties to Super User insights
        let errorCount = 0;
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const errorsSnapshot = await db
                .collection('system_logs')
                .where('level', '==', 'error')
                .where('timestamp', '>=', oneDayAgo)
                .limit(100)
                .get();

            errorCount = errorsSnapshot.size;
        } catch (err) {
            // If system_logs doesn't exist, continue with errorCount = 0
        }

        // Check if heartbeat is stale (more than 15 minutes old)
        const isStale = timestamp && (now.getTime() - timestamp.getTime() > 15 * 60 * 1000);

        // Determine pulse status (prioritize system logs errors over heartbeat)
        let pulse: 'alive' | 'warning' | 'error' | 'unknown';
        if (errorCount >= 10) {
            pulse = 'error'; // Critical: 10+ errors in last 24h
        } else if (errorCount >= 5 || lastExecution?.overallStatus === 'has_errors') {
            pulse = 'warning'; // Warning: 5-9 errors or heartbeat error
        } else if (isStale) {
            pulse = 'warning'; // Warning: Heartbeat is stale
        } else if (!lastExecution) {
            pulse = 'unknown'; // Heartbeat not yet initialized
        } else {
            pulse = 'alive'; // All good!
        }

        // Calculate uptime percentage (matches Super User insights logic)
        const uptime = errorCount < 5 ? '99.9%' : errorCount < 20 ? '99.5%' : '98.0%';

        // Calculate next expected pulse (5 min intervals for cron)
        const nextExpected = timestamp
            ? new Date(timestamp.getTime() + 5 * 60 * 1000)
            : null;

        return NextResponse.json({
            pulse,
            timestamp: timestamp?.toISOString() || null,
            nextExpected: nextExpected?.toISOString() || null,
            status: lastExecution?.overallStatus || 'unknown',
            schedulesProcessed: schedulesExecuted,
            schedulesExecuted,
            browserTasksProcessed: 0,
            browserTasksExecuted: 0,
            errors: errorCount,
            uptime,
            healthy: pulse === 'alive',
        });

    } catch (error: any) {
        return NextResponse.json({
            pulse: 'error',
            message: error.message,
            timestamp: null,
            healthy: false,
        }, { status: 500 });
    }
}
