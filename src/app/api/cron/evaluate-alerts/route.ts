// src/app/api/cron/evaluate-alerts/route.ts
/**
 * Cron endpoint for evaluating alerts
 * Should be called every 5-15 minutes by Cloud Scheduler or Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateAllAlerts } from '@/server/services/alert-evaluator';
import { logger } from '@/lib/monitoring';

// Vercel cron config
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED, not optional
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // SECURITY: CRON_SECRET must be configured, otherwise reject all requests
    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const stats = await evaluateAllAlerts();

        logger.info('Cron: Alert evaluation complete', stats);

        return NextResponse.json({
            success: true,
            ...stats,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error('Cron: Alert evaluation failed', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// For manual testing via POST
export async function POST(request: NextRequest) {
    return GET(request);
}
