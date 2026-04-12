export const dynamic = 'force-dynamic';
/**
 * Day Day SEO Report — Cron Endpoint
 * POST /api/cron/dayday-seo-report
 *
 * Generates SEO performance report from GSC + GA4 and posts to Slack #ceo via Marty.
 *
 * Schedule:
 *   Burn-in (first 3 days): daily at 8 AM ET
 *   Steady state: weekly Monday 8 AM ET
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http dayday-seo-report \
 *     --schedule="0 13 * * *" --time-zone="UTC" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/dayday-seo-report" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { runDayDaySEOReport } from '@/server/jobs/dayday-seo-report';
import { logger } from '@/lib/logger';

export const maxDuration = 120; // 2 minutes

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'dayday-seo-report');
    if (authError) return authError;

    try {
        logger.info('[Cron] Starting Day Day SEO Report');
        const report = await runDayDaySEOReport();

        return NextResponse.json({
            success: true,
            gscConnected: report.gscConnected,
            ga4Connected: report.ga4Connected,
            clicks: report.totalClicks,
            impressions: report.totalImpressions,
            sessions: report.ga4TotalSessions,
            pageGroups: report.pageGroups.length,
            opportunities: report.opportunities.length,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        logger.error('[Cron] Day Day SEO Report Failed', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // Diagnostic mode: ?diagnose=1 returns raw auth test results
    const { searchParams } = new URL(request.url);
    if (searchParams.get('diagnose') === '1') {
        const authError = await requireCronSecret(request, 'dayday-seo-report');
        if (authError) return authError;

        const { diagnoseAnalyticsAuth } = await import('./diagnose');
        const results = await diagnoseAnalyticsAuth();
        return NextResponse.json(results);
    }
    return POST(request);
}
