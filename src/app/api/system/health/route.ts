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

        // Get heartbeat document
        const heartbeatDoc = await db.collection('system').doc('heartbeat').get();
        const data = heartbeatDoc.exists ? heartbeatDoc.data() : null;
        const timestamp = data?.timestamp?.toDate();
        const now = new Date();

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
        } else if (errorCount >= 5 || data?.status === 'error') {
            pulse = 'warning'; // Warning: 5-9 errors or heartbeat error
        } else if (isStale) {
            pulse = 'warning'; // Warning: Heartbeat is stale
        } else if (!heartbeatDoc.exists) {
            pulse = 'unknown'; // Heartbeat not yet initialized
        } else {
            pulse = 'alive'; // All good!
        }

        // Calculate uptime percentage (matches Super User insights logic)
        const uptime = errorCount < 5 ? '99.9%' : errorCount < 20 ? '99.5%' : '98.0%';

        return NextResponse.json({
            pulse,
            timestamp: timestamp?.toISOString() || null,
            nextExpected: data?.nextPulseExpected?.toDate?.()?.toISOString(),
            status: data?.status,
            schedulesProcessed: data?.schedulesProcessed || 0,
            schedulesExecuted: data?.schedulesExecuted || 0,
            browserTasksProcessed: data?.browserTasksProcessed || 0,
            browserTasksExecuted: data?.browserTasksExecuted || 0,
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
