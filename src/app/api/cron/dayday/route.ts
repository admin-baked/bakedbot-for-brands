/**
 * DayDay Megacron
 *
 * One route for all DayDay jobs — replaces 4 separate route files.
 * Routes internally by the `type` field in the request body (or `?type=` query param).
 *
 * Consolidated from:
 *   dayday-discovery             (daily 6 AM ET — domestic market discovery, 5 markets/run)
 *   dayday-international-discovery (daily 7 AM ET — international markets, 2 markets/run)
 *   dayday-seo-report            (daily/weekly 8 AM ET — GSC + GA4 SEO report → Slack)
 *   dayday-review                (weekly Monday 8 AM ET — aggregate discovery results review)
 *
 * Cloud Scheduler — update existing jobs to point here with typed body:
 *   BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"
 *
 *   gcloud scheduler jobs update http dayday-discovery \
 *     --uri="$BASE/api/cron/dayday" \
 *     --message-body='{"type":"discovery"}'
 *
 *   gcloud scheduler jobs update http dayday-international-discovery \
 *     --uri="$BASE/api/cron/dayday" \
 *     --message-body='{"type":"international"}'
 *
 *   gcloud scheduler jobs update http dayday-seo-report \
 *     --uri="$BASE/api/cron/dayday" \
 *     --message-body='{"type":"seo-report"}'
 *
 *   gcloud scheduler jobs update http dayday-review \
 *     --uri="$BASE/api/cron/dayday" \
 *     --message-body='{"type":"review"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Type routing
// ---------------------------------------------------------------------------

type DayDayJobType = 'discovery' | 'international' | 'seo-report' | 'review' | 'brand-page-seo';

const VALID_TYPES = new Set<DayDayJobType>(['discovery', 'international', 'seo-report', 'review', 'brand-page-seo']);

function parseType(req: NextRequest, body: Record<string, unknown>): DayDayJobType | null {
    const t = (body.type as string) ?? req.nextUrl.searchParams.get('type');
    return VALID_TYPES.has(t as DayDayJobType) ? (t as DayDayJobType) : null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'dayday');
    if (authError) return authError;

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* body may be empty */ }

    const type = parseType(request, body);
    if (!type) {
        return NextResponse.json(
            { error: `Missing or invalid type. Valid values: ${[...VALID_TYPES].join(', ')}` },
            { status: 400 }
        );
    }

    logger.info('[dayday] Firing', { type });

    try {
        switch (type) {
            case 'discovery': {
                const { runDayDayDailyDiscovery } = await import('@/server/jobs/dayday-daily-discovery');
                logger.info('[dayday/discovery] Starting domestic discovery (5 markets)');
                const result = await runDayDayDailyDiscovery(5);
                return NextResponse.json({ success: true, type, result });
            }

            case 'international': {
                const { runInternationalDiscovery } = await import('@/server/jobs/dayday-international-discovery');
                logger.info('[dayday/international] Starting international discovery (2 markets)');
                const result = await runInternationalDiscovery(2);
                return NextResponse.json({
                    success: result.errors.length === 0,
                    type,
                    timestamp: new Date().toISOString(),
                    ...result,
                });
            }

            case 'seo-report': {
                const { runDayDaySEOReport } = await import('@/server/jobs/dayday-seo-report');
                logger.info('[dayday/seo-report] Starting SEO report');
                const report = await runDayDaySEOReport();
                return NextResponse.json({
                    success: true,
                    type,
                    gscConnected: report.gscConnected,
                    ga4Connected: report.ga4Connected,
                    clicks: report.totalClicks,
                    impressions: report.totalImpressions,
                    sessions: report.ga4TotalSessions,
                    pageGroups: report.pageGroups.length,
                    opportunities: report.opportunities.length,
                });
            }

            case 'review': {
                const { runDayDayWeeklyReview } = await import('@/server/jobs/dayday-weekly-review');
                logger.info('[dayday/review] Starting weekly review');
                const result = await runDayDayWeeklyReview();
                return NextResponse.json({ success: true, type, result });
            }

            case 'brand-page-seo': {
                const { runBrandPageSEOAudit } = await import('@/server/jobs/dayday-brand-page-seo');
                logger.info('[dayday/brand-page-seo] Starting brand page SEO audit');
                const result = await runBrandPageSEOAudit();
                return NextResponse.json({
                    success: true,
                    type,
                    totalPages: result.totalPages,
                    zeroPages: result.zeroPages.length,
                    lowPages: result.lowPages.length,
                    rankingPages: result.rankingPages.length,
                    gscConnected: result.gscConnected,
                });
            }
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[dayday] Failed', { type, error: msg });
        return NextResponse.json({ success: false, type, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
