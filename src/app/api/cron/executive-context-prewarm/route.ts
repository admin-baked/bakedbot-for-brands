/**
 * Executive Context Pre-warm Cron
 *
 * Runs at 7:45 AM EST weekdays — 15 min before the morning briefing.
 * Pre-fetches Gmail digest + today's meetings and caches them in Firestore
 * so the 9 AM executive-proactive-check reads from cache instead of hitting
 * Gmail cold (saves ~1-2s and avoids OAuth timeouts).
 *
 * Cloud Scheduler:
 *   Name:     executive-context-prewarm
 *   Schedule: 45 7 * * 1-5    (7:45 AM EST, weekdays)
 *   URL:      /api/cron/executive-context-prewarm
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 *
 * Cache doc: platform_cache/exec_context_today
 * TTL: 4 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getMeetingsForDay } from '@/server/services/calendar-digest';
import { findSuperUserUid, getEmailDigest } from '@/server/services/email-digest';

export const dynamic = 'force-dynamic';

export const EXEC_CONTEXT_CACHE_DOC = 'exec_context_today';
export const BIZ_DEV_CACHE_DOC = 'biz_dev_context_today';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'executive-context-prewarm');
    if (authError) return authError;

    logger.info('[ExecContextPrewarm] Starting executive context pre-warm');

    const now = new Date();
    const db = getAdminFirestore();

    const [meetingsResult, emailResult] = await Promise.allSettled([
        getMeetingsForDay(now),
        (async () => {
            const uid = await findSuperUserUid();
            if (!uid) return null;
            // Capture overnight emails: last 12h (since ~8 PM yesterday)
            const sinceMs = Date.now() - 12 * 60 * 60 * 1000;
            return getEmailDigest(uid, sinceMs, 10);
        })(),
    ]);

    const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
    const emailDigest = emailResult.status === 'fulfilled' ? emailResult.value : null;

    // Serialize meetings: convert Date → ISO string for Firestore storage
    const serializedMeetings = meetings.map(m => ({
        ...m,
        startTime: String(m.startTime),
    }));

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });

    await db.collection('platform_cache').doc(EXEC_CONTEXT_CACHE_DOC).set({
        meetings: serializedMeetings,
        emailDigest,
        cachedAt: now.toISOString(),
        dateStr,
    });

    // Pre-warm biz dev dashboard counts (non-blocking if any query fails)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const [pendingDraftsSnap, queueDepthSnap, sentTodaySnap, unenrichedSnap] = await Promise.allSettled([
        db.collection('ny_outreach_drafts').where('status', '==', 'draft').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_outreach_log').where('timestamp', '>=', todayStartMs).where('emailSent', '==', true).count().get(),
        db.collection('ny_dispensary_leads').where('enriched', '==', false).count().get(),
    ]);

    const bizDevCounts = {
        pendingDrafts: pendingDraftsSnap.status === 'fulfilled' ? pendingDraftsSnap.value.data().count : 0,
        queueDepth: queueDepthSnap.status === 'fulfilled' ? queueDepthSnap.value.data().count : 0,
        sentToday: sentTodaySnap.status === 'fulfilled' ? sentTodaySnap.value.data().count : 0,
        unenrichedLeads: unenrichedSnap.status === 'fulfilled' ? unenrichedSnap.value.data().count : 0,
        cachedAt: now.toISOString(),
    };

    await db.collection('platform_cache').doc(BIZ_DEV_CACHE_DOC).set(bizDevCounts);

    logger.info('[ExecContextPrewarm] Biz dev cache written', bizDevCounts);

    logger.info('[ExecContextPrewarm] Cache written', {
        meetings: meetings.length,
        emailUnread: emailDigest?.unreadCount ?? 0,
        emailConnected: emailDigest !== null,
    });

    return NextResponse.json({
        success: true,
        meetings: meetings.length,
        emailUnread: emailDigest?.unreadCount ?? 0,
        cachedAt: now.toISOString(),
        bizDev: bizDevCounts,
    });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
