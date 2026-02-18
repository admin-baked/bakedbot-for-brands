/**
 * Firebase Build Monitor Cron Endpoint
 * Called every 10 minutes by Cloud Scheduler
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { runBuildMonitoring } from '@/server/services/firebase-build-monitor';

export const dynamic = 'force-dynamic';

/**
 * Verify CRON_SECRET
 */
function verifyCronSecret(bearerToken: string): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        logger.error('[BuildMonitor Cron] CRON_SECRET not configured');
        return false;
    }
    return bearerToken === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        // Verify authorization
        const authHeader = request.headers.get('authorization') || '';
        if (!verifyCronSecret(authHeader)) {
            logger.warn('[BuildMonitor Cron] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Run monitoring
        const result = await runBuildMonitoring();

        logger.info('[BuildMonitor Cron] Execution complete', {
            success: result.success,
            checked: result.checked,
            failures: result.failures,
            notificationsSent: result.notificationsSent,
            durationMs: result.durationMs
        });

        return NextResponse.json({
            success: result.success,
            checked: result.checked,
            failures: result.failures,
            notificationsSent: result.notificationsSent,
            durationMs: result.durationMs,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('[BuildMonitor Cron] Failed to execute', {
            error: error instanceof Error ? error.message : String(error)
        });

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to run build monitoring',
                durationMs: Date.now() - startTime
            },
            { status: 500 }
        );
    }
}
