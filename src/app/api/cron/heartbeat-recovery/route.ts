/**
 * Heartbeat Automatic Recovery Cron Endpoint
 *
 * Runs independently from the regular heartbeat checks to detect and recover failures.
 * Frequency: Every 5 minutes (catches failures quickly)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAutomaticRecovery } from '@/server/services/heartbeat/auto-recovery';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

function authorizeCron(req: NextRequest): NextResponse | null {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[Heartbeat Recovery Cron] CRON_SECRET is not configured');
        return NextResponse.json(
            { success: false, error: 'Server misconfiguration' },
            { status: 500 }
        );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    return null;
}

export async function POST(req: NextRequest) {
    const authError = authorizeCron(req);
    if (authError) {
        return authError;
    }

    const startTime = Date.now();

    try {
        logger.info('[Heartbeat Recovery Cron] Starting automatic recovery check');

        const result = await runAutomaticRecovery();

        const duration = Date.now() - startTime;

        logger.info('[Heartbeat Recovery Cron] Recovery check complete', {
            ...result,
            durationMs: duration,
        });

        return NextResponse.json({
            success: true,
            ...result,
            durationMs: duration,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Heartbeat Recovery Cron] Recovery check failed', { error: errorMessage });

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

// Deployment instructions:
// Create Cloud Scheduler job:
// gcloud scheduler jobs create http heartbeat-recovery-cron \
//   --schedule="*/5 * * * *" \
//   --uri="https://bakedbot.ai/api/cron/heartbeat-recovery" \
//   --http-method=POST \
//   --headers="Authorization=Bearer CRON_SECRET" \
//   --location=us-central1
