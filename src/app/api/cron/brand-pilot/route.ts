import { NextRequest, NextResponse } from 'next/server';
import { runBrandPilotJob } from '@/server/jobs/brand-discovery-job';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city') || 'Chicago';
        const state = searchParams.get('state') || 'IL';

        logger.info(`[API] Starting Brand Pilot for ${city}, ${state}...`);
        const result = await runBrandPilotJob(city, state);
        return NextResponse.json(result);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[API] Brand Pilot Error', { error });
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
