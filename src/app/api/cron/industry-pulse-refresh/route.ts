/**
 * Industry Pulse Refresh Cron
 *
 * Runs daily at 5:30 AM EST (10:30 AM UTC), 2.5 hours before the morning briefing.
 * Pre-warms the Industry Pulse news cache for all 5 topic categories so
 * the CEO Content tab loads instantly when the super user opens the dashboard.
 *
 * Cloud Scheduler:
 *   Name:     industry-pulse-refresh
 *   Schedule: 30 10 * * 1-5    (5:30 AM EST = 10:30 AM UTC, weekdays)
 *   URL:      /api/cron/industry-pulse-refresh
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { refreshIndustryPulse } from '@/server/services/industry-pulse';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'industry-pulse-refresh');
    if (authError) return authError;

    logger.info('[IndustryPulse] Starting daily pre-warm for all topics');

    const results = await refreshIndustryPulse();

    const cached = results.filter(r => r.status === 'cached');
    const failed = results.filter(r => r.status === 'failed');
    const totalItems = cached.reduce((sum, r) => sum + r.count, 0);

    logger.info('[IndustryPulse] Pre-warm complete', {
        cached: cached.length,
        failed: failed.length,
        totalItems,
    });

    return NextResponse.json({
        success: true,
        summary: {
            topicsRefreshed: cached.length,
            topicsFailed: failed.length,
            totalArticles: totalItems,
            topics: results,
            message: cached.length === 5
                ? `All 5 topics pre-warmed — ${totalItems} articles ready`
                : `${cached.length}/5 topics cached — ${failed.map(r => r.topic).join(', ')} failed`,
        },
    });
}

// Cloud Scheduler sends POST — also allow GET for manual testing
export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
