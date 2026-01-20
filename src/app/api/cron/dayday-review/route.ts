
import { NextResponse } from 'next/server';
import { runDayDayWeeklyReview } from '@/server/jobs/dayday-weekly-review';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const result = await runDayDayWeeklyReview();
        
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        logger.error(`[Cron] DayDay Review Failed: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
