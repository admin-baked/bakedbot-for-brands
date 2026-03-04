/**
 * Midday Pulse Cron
 *
 * Runs daily at 12 PM EST (5 PM UTC) on weekdays.
 * Posts a lighter midday briefing to the Daily Briefing inbox thread with:
 *   - Remaining meetings for today (afternoon agenda)
 *   - Emails received since this morning
 *   - Pending review items (outreach drafts, blog drafts)
 *
 * Cloud Scheduler:
 *   Name:     midday-pulse
 *   Schedule: 0 17 * * 1-5    (12 PM EST = 5 PM UTC, weekdays)
 *   URL:      /api/cron/midday-pulse
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { generateDayPulse, postPulseToInbox } from '@/server/services/morning-briefing';

export const dynamic = 'force-dynamic';

// Super user's home org (Martez Knox currentOrgId)
const PLATFORM_ORG_ID = 'bakedbot_super_admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'midday-pulse');
    if (authError) return authError;

    logger.info('[MiddayPulse] Generating midday check-in');

    try {
        const pulse = await generateDayPulse('midday');
        await postPulseToInbox(PLATFORM_ORG_ID, pulse);

        logger.info('[MiddayPulse] Posted to inbox', {
            meetings: pulse.meetings?.length ?? 0,
            emailUnread: pulse.emailDigest?.unreadCount ?? 0,
            pendingMetrics: pulse.metrics.length,
        });

        return NextResponse.json({
            success: true,
            summary: {
                pulseType: 'midday',
                meetings: pulse.meetings?.length ?? 0,
                emailUnread: pulse.emailDigest?.unreadCount ?? 0,
                topEmailSubjects: pulse.emailDigest?.topEmails.slice(0, 3).map(e => e.subject) ?? [],
                pendingReview: pulse.metrics.length > 0 ? pulse.metrics[0].value : 'None',
            },
        });
    } catch (error) {
        logger.error('[MiddayPulse] Failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
