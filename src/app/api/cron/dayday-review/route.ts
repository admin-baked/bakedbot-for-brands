import { NextRequest, NextResponse } from 'next/server';
import { runDayDayWeeklyReview } from '@/server/jobs/dayday-weekly-review';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
    // SECURITY: Verify cron secret - REQUIRED
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const result = await runDayDayWeeklyReview();

        return NextResponse.json({ success: true, result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[Cron] DayDay Review Failed', { error });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
