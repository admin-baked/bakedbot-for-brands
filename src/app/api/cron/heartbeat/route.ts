/**
 * Heartbeat Cron Endpoint
 *
 * Called by Cloud Scheduler to process heartbeat checks for all tenants.
 * Frequency: Every 5 minutes (to catch 15-minute intervals)
 *
 * Deploy cron job:
 * gcloud scheduler jobs create http heartbeat-cron --schedule="every 5 minutes"
 *   --uri="https://bakedbot.ai/api/cron/heartbeat" --http-method=GET
 *   --headers="Authorization=Bearer CRON_SECRET" --location=us-central1
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDueHeartbeats } from '@/server/services/heartbeat';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes max

export async function GET(req: NextRequest) {
    // Authorize
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const startTime = Date.now();

    try {
        logger.info('[Heartbeat Cron] Starting heartbeat processing');

        const result = await processDueHeartbeats();

        const duration = Date.now() - startTime;

        logger.info('[Heartbeat Cron] Processing complete', {
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
        logger.error('[Heartbeat Cron] Processing failed', { error: errorMessage });

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * Manual trigger endpoint for testing
 */
export async function POST(req: NextRequest) {
    // Authorize
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { tenantId, userId, role, force } = body;

        if (!tenantId || !userId || !role) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: tenantId, userId, role' },
                { status: 400 }
            );
        }

        // Import dynamically to avoid circular deps
        const { executeHeartbeat, getTenantHeartbeatConfig } = await import('@/server/services/heartbeat');
        const { buildDefaultConfig } = await import('@/types/heartbeat');

        // Get or build config
        const savedConfig = await getTenantHeartbeatConfig(tenantId, role);
        const config = savedConfig || buildDefaultConfig(role);

        const result = await executeHeartbeat({
            tenantId,
            userId,
            role,
            config,
            force: force ?? true, // Force by default for manual triggers
        });

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Heartbeat Cron] Manual trigger failed', { error: errorMessage });

        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}
