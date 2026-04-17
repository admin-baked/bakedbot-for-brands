/**
 * Evening Pulse Cron
 *
 * Runs daily at 5 PM EST (10 PM UTC) on weekdays.
 * Posts an evening briefing to the Daily Briefing inbox thread with:
 *   - Tomorrow's meetings (preview the next day's agenda)
 *   - Emails received since this afternoon
 *   - Pending review items to clear before EOD
 *
 * Cloud Scheduler:
 *   Name:     evening-pulse
 *   Schedule: 0 22 * * 1-5    (5 PM EST = 10 PM UTC, weekdays)
 *   URL:      /api/cron/evening-pulse
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { PLATFORM_ORG_ID } from '@/server/auth/actor-context';
import { logger } from '@/lib/logger';
import { generateDayPulse, postPulseToInbox } from '@/server/services/morning-briefing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'evening-pulse');
    if (authError) return authError;

    logger.info('[EveningPulse] Generating tomorrow\'s preview');

    try {
        const pulse = await generateDayPulse('evening');
        await postPulseToInbox(PLATFORM_ORG_ID, pulse);

        logger.info('[EveningPulse] Posted to inbox', {
            meetings: pulse.meetings?.length ?? 0,
            emailUnread: pulse.emailDigest?.unreadCount ?? 0,
        });

        return NextResponse.json({
            success: true,
            summary: {
                pulseType: 'evening',
                tomorrowMeetings: pulse.meetings?.length ?? 0,
                emailUnread: pulse.emailDigest?.unreadCount ?? 0,
                topEmailSubjects: pulse.emailDigest?.topEmails.slice(0, 3).map(e => e.subject) ?? [],
            },
        });
    } catch (error) {
        logger.error('[EveningPulse] Failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
