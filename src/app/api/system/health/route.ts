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
        const heartbeatDoc = await db.collection('system').doc('heartbeat').get();

        if (!heartbeatDoc.exists) {
            return NextResponse.json({
                pulse: 'unknown',
                message: 'Heartbeat not yet initialized',
                timestamp: null,
            });
        }

        const data = heartbeatDoc.data();
        const timestamp = data?.timestamp?.toDate();
        const nextExpected = data?.nextPulseExpected;
        const now = new Date();

        // Check if heartbeat is stale (more than 15 minutes old)
        const isStale = timestamp && (now.getTime() - timestamp.getTime() > 15 * 60 * 1000);

        // Determine pulse status
        let pulse: 'alive' | 'warning' | 'error' | 'unknown';
        if (data?.status === 'error') {
            pulse = 'error';
        } else if (isStale) {
            pulse = 'warning'; // Heartbeat is stale
        } else {
            pulse = 'alive';
        }

        return NextResponse.json({
            pulse,
            timestamp: timestamp?.toISOString(),
            nextExpected: nextExpected?.toDate?.()?.toISOString(),
            status: data?.status,
            schedulesProcessed: data?.schedulesProcessed || 0,
            schedulesExecuted: data?.schedulesExecuted || 0,
            browserTasksProcessed: data?.browserTasksProcessed || 0,
            browserTasksExecuted: data?.browserTasksExecuted || 0,
            errors: data?.errors?.length || 0,
            healthy: pulse === 'alive',
        });

    } catch (error: any) {
        return NextResponse.json({
            pulse: 'error',
            message: error.message,
            timestamp: null,
        }, { status: 500 });
    }
}
