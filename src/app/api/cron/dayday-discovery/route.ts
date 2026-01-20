
import { NextRequest, NextResponse } from 'next/server';
import { runDayDayDailyDiscovery } from '@/server/jobs/dayday-daily-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[Cron] Starting Day Day Daily Discovery...');
        const result = await runDayDayDailyDiscovery(5); // Process 5 markets per run
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('[Cron] Day Day Discovery failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
