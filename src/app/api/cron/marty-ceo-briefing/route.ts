export const dynamic = 'force-dynamic'; // pressure-test-rebuild
/**
 * Marty CEO Briefing Cron
 * POST /api/cron/marty-ceo-briefing
 *
 * Runs 3x daily (9 AM, 1 PM, 6 PM ET). Posts to #ceo Slack channel with:
 * - Today's calendar & upcoming meetings
 * - Outreach stats and follow-up reminders
 * - Marty's action items and what he's driving forward
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http marty-ceo-morning-briefing \
 *     --schedule="0 9 * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/marty-ceo-briefing" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{"briefingType":"morning"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { listGoogleCalendarEvents, getGoogleCalendarBusyTimes } from '@/server/services/executive-calendar/google-calendar';
import { getExecutiveProfile } from '@/server/actions/executive-calendar';
import { getOutreachStats } from '@/server/services/ny-outreach/outreach-read-model';
import { getAllAgentLearningDocs } from '@/server/services/agent-performance';

export const maxDuration = 120;

type BriefingType = 'morning' | 'midday' | 'evening';

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'marty-ceo-briefing');
    if (authError) return authError;

    let body: { briefingType?: BriefingType; pressureTest?: boolean; question?: string; agent?: string } = {};
    try { body = await request.json(); } catch { /* empty body OK */ }

    // Pressure test mode — invoke an agent with a single question
    if (body.pressureTest && body.question) {
        return runPressureTest(body.agent || 'marty', body.question);
    }

    const briefingType = body.briefingType || detectBriefingType();

    try {
        const result = await runCeoBriefing(briefingType);
        return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[MartyCEOBriefing] Failed', { error: msg, briefingType });
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

async function runPressureTest(agent: string, question: string) {
    logger.info('[PressureTest] Running', { agent, question: question.slice(0, 80) });
    const start = Date.now();
    try {
        if (agent === 'marty') {
            const { runMarty } = await import('@/server/agents/marty');
            const res = await runMarty({ prompt: question, maxIterations: 4, context: { userId: 'pressure-test', orgId: 'org_bakedbot_internal' } });
            return NextResponse.json({ agent, question, response: res.content, model: res.model, toolsUsed: (res.toolExecutions || []).map(t => ({ name: t.name, result: JSON.stringify(t.output).slice(0, 300) })), elapsed: `${Math.round((Date.now() - start) / 1000)}s` });
        }
        if (agent === 'linus') {
            const { runLinus } = await import('@/server/agents/linus');
            const res = await runLinus({ prompt: question, maxIterations: 4, toolMode: 'slack' as const, context: { userId: 'pressure-test', orgId: 'org_bakedbot_internal' } });
            return NextResponse.json({ agent, question, response: res.content, model: res.model, toolsUsed: (res.toolExecutions || []).map(t => ({ name: t.name, result: JSON.stringify(t.output).slice(0, 300) })), elapsed: `${Math.round((Date.now() - start) / 1000)}s` });
        }
        if (agent === 'elroy') {
            const { runElroy } = await import('@/server/agents/elroy');
            const res = await runElroy({ prompt: question, maxIterations: 4, context: { userId: 'pressure-test' } });
            return NextResponse.json({ agent, question, response: res.content, model: res.model, toolsUsed: (res.toolExecutions || []).map(t => ({ name: t.name, result: JSON.stringify(t.output).slice(0, 300) })), elapsed: `${Math.round((Date.now() - start) / 1000)}s` });
        }
        return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

function detectBriefingType(): BriefingType {
    const hour = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false });
    const h = parseInt(hour, 10);
    if (h < 12) return 'morning';
    if (h < 17) return 'midday';
    return 'evening';
}

async function runCeoBriefing(type: BriefingType) {
    logger.info(`[MartyCEOBriefing] Running ${type} briefing...`);

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    // Gather data in parallel
    const [calendarData, meetingsData, outreachData, crmData, agentTrendData] = await Promise.allSettled([
        getCalendarSummary(),
        getUpcomingBookings(),
        getOutreachStats(),
        getCrmPipelineSummary(),
        buildAgentTrendSummary(),
    ]);

    const calendar = calendarData.status === 'fulfilled' ? calendarData.value : null;
    const bookings = meetingsData.status === 'fulfilled' ? meetingsData.value : [];
    const outreach = outreachData.status === 'fulfilled' ? outreachData.value : null;
    const crm = crmData.status === 'fulfilled' ? crmData.value : null;
    const agentTrend = agentTrendData.status === 'fulfilled' ? agentTrendData.value : null;

    // Build briefing blocks
    const greeting = type === 'morning' ? 'Good morning' : type === 'midday' ? 'Midday check-in' : 'End of day wrap-up';
    const emoji = type === 'morning' ? ':sunrise:' : type === 'midday' ? ':sun_with_face:' : ':city_sunset:';

    const blocks: any[] = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${greeting} — ${todayStr}` },
        },
    ];

    // Calendar section
    if (calendar) {
        const eventLines = calendar.events.length > 0
            ? calendar.events.map(e => {
                const time = new Date(e.startAt).toLocaleTimeString('en-US', {
                    timeZone: 'America/New_York',
                    hour: 'numeric',
                    minute: '2-digit',
                });
                return `• *${time}* — ${e.title}${e.attendees.length > 0 ? ` (${e.attendees.slice(0, 2).join(', ')})` : ''}`;
            }).join('\n')
            : '_No events scheduled_';

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:calendar: *Today's Schedule* (${calendar.events.length} events)\n${eventLines}`,
            },
        });
    }

    // BakedBot bookings
    if (bookings.length > 0) {
        const bookingLines = bookings.map(b => {
            const time = new Date(b.startAt).toLocaleTimeString('en-US', {
                timeZone: 'America/New_York',
                hour: 'numeric',
                minute: '2-digit',
            });
            return `• *${time}* — ${b.meetingTypeName} with ${b.externalName}`;
        }).join('\n');

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:handshake: *BakedBot Meetings*\n${bookingLines}`,
            },
        });
    }

    // Outreach stats
    if (outreach) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:dart: *Outreach Pipeline*\n• Emails sent: *${outreach.totalSent}*\n• Bad emails: ${outreach.totalBadEmails}\n• Failures: ${outreach.totalFailed}`,
            },
        });
    }

    // CRM pipeline
    if (crm) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:busts_in_silhouette: *CRM Pipeline*\n• Prospects: *${crm.prospects}*\n• Contacted: *${crm.contacted}*\n• Demo scheduled: *${crm.demoScheduled}*\n• Customers: *${crm.customers}*`,
            },
        });
    }

    // Agent learning trend (morning only — not needed at every briefing)
    if (agentTrend && type === 'morning') {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:brain: *Agent Performance*\n${agentTrend.summary}${agentTrend.declingNotes ? `\n_${agentTrend.declingNotes}_` : ''}`,
            },
        });
    }

    // Action items by briefing type
    const actionText = type === 'morning'
        ? ':rocket: *Today\'s Focus*\n• Check inbox for hot leads and investor replies\n• Send outreach to 3-5 new dispensaries\n• Follow up on pending contact form submissions\n• Review any meetings coming up today'
        : type === 'midday'
            ? ':eyes: *Midday Check*\n• Any meeting prep needed for this afternoon?\n• Review outreach responses from this morning\n• Update CRM with any new contacts\n• Flag anything that needs my attention'
            : ':clipboard: *End of Day*\n• Outreach sent today vs. goal\n• Any meetings to prep for tomorrow?\n• Pending follow-ups that need scheduling\n• Open items that carry over to tomorrow';

    blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: actionText },
    });

    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: `${emoji} _Marty Benjamins — AI CEO | ${type} briefing | Reply to give me tasks_`,
        }],
    });

    // Post to #ceo
    const posted = await postLinusIncidentSlack({
        source: 'marty-ceo-briefing',
        channelName: 'ceo',
        fallbackText: `${greeting} — ${todayStr}`,
        blocks,
    });

    logger.info('[MartyCEOBriefing] Posted', { type, sent: posted.sent });
    return { briefingType: type, posted: posted.sent, events: calendar?.events.length ?? 0, bookings: bookings.length };
}

async function getCalendarSummary() {
    const profile = await getExecutiveProfile('martez');
    if (!profile?.googleCalendarTokens?.refresh_token) return { events: [] };

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await listGoogleCalendarEvents(profile.googleCalendarTokens, now, endOfDay);
    return {
        events: events.map(e => ({
            title: e.title,
            startAt: e.startAt.toISOString(),
            endAt: e.endAt.toISOString(),
            attendees: e.attendees,
        })),
    };
}

async function getUpcomingBookings() {
    const db = getAdminFirestore();
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const snap = await db.collection('meeting_bookings')
        .where('profileSlug', '==', 'martez')
        .where('startAt', '>=', Timestamp.fromDate(now))
        .where('startAt', '<=', Timestamp.fromDate(endOfDay))
        .where('status', '==', 'confirmed')
        .orderBy('startAt', 'asc')
        .limit(10)
        .get();

    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            externalName: data.externalName,
            meetingTypeName: data.meetingTypeName,
            startAt: data.startAt?.toDate?.()?.toISOString() ?? '',
            endAt: data.endAt?.toDate?.()?.toISOString() ?? '',
        };
    });
}

async function buildAgentTrendSummary(): Promise<{ summary: string; declingNotes: string }> {
    const docs = await getAllAgentLearningDocs();
    let improving = 0, stable = 0, declining = 0;
    const decliningNotes: string[] = [];

    for (const doc of docs) {
        if (doc.performanceTrend === 'improving') improving++;
        else if (doc.performanceTrend === 'stable') stable++;
        else if (doc.performanceTrend === 'declining') {
            declining++;
            if (doc.trendBasis) {
                decliningNotes.push(`${doc.agentId}: ${doc.trendBasis}`);
            }
        }
    }

    const summary = `Agent performance this week: ${improving} improving, ${stable} stable, ${declining} declining.`;
    const declingNotes = decliningNotes.slice(0, 2).join(' | ');
    return { summary, declingNotes };
}

async function getCrmPipelineSummary() {
    const db = getAdminFirestore();
    const snap = await db.collection('crm_outreach_contacts').get();
    const counts = { prospects: 0, contacted: 0, demoScheduled: 0, customers: 0, total: snap.size };
    for (const doc of snap.docs) {
        const status = doc.data().status;
        if (status === 'prospect') counts.prospects++;
        else if (status === 'contacted') counts.contacted++;
        else if (status === 'demo_scheduled') counts.demoScheduled++;
        else if (status === 'customer') counts.customers++;
    }
    return counts;
}
