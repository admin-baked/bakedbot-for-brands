/**
 * Daily Executive Cadence Megacron
 *
 * One route, four daily windows — routes by current hour (ET).
 * Register FOUR Cloud Scheduler jobs all pointing to this single endpoint:
 *
 *   8 AM ET  → Morning Scan   (UTC 13:00) — Marty/Leo/Jack/Linus/Pops/Ezal/MrsParker/Deebo
 *   12 PM ET → Midday Check   (UTC 17:00) — Leo/Jack/Glenda/Linus/Pops/Craig/Puff
 *   6 PM ET  → Late-Day Close (UTC 23:00) — Leo/Felisha/Pops/Puff/OpenClaw
 *   10 PM ET → Overnight Prep (UTC 03:00) — Ezal/Deebo/Roach/Puff/OpenClaw
 *
 * Cloud Scheduler commands (run once per job):
 *   CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
 *   BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"
 *
 *   gcloud scheduler jobs create http daily-morning-scan \
 *     --schedule="0 13 * * *" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/daily-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 *
 *   gcloud scheduler jobs create http daily-midday-check \
 *     --schedule="0 17 * * *" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/daily-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 *
 *   gcloud scheduler jobs create http daily-closeout \
 *     --schedule="0 23 * * *" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/daily-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 *
 *   gcloud scheduler jobs create http daily-overnight-prep \
 *     --schedule="0 3 * * *" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/daily-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

// ---------------------------------------------------------------------------
// Window detection — ET offset is -5 (EST) or -4 (EDT)
// We use UTC hour from Cloud Scheduler to determine the window.
// ---------------------------------------------------------------------------

type DailyWindow = 'morning' | 'midday' | 'closeout' | 'overnight';

function detectWindow(utcHour: number): DailyWindow {
    if (utcHour === 13) return 'morning';    // 8 AM ET
    if (utcHour === 17) return 'midday';     // 12 PM ET
    if (utcHour === 23) return 'closeout';   // 6 PM ET
    if (utcHour === 2 || utcHour === 3) return 'overnight'; // 10 PM ET (EDT=2, EST=3)
    // Fallback: pick nearest window
    if (utcHour < 15) return 'morning';
    if (utcHour < 20) return 'midday';
    if (utcHour < 24) return 'closeout';
    return 'overnight';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

async function loadDailyContext() {
    const db = getAdminFirestore();
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [openTasksSnap, activeOrgsSnap, outreachTodaySnap, auditSnap] = await Promise.allSettled([
        db.collection('agent_tasks').where('status', 'in', ['pending', 'in_progress']).count().get(),
        db.collection('organizations').where('status', '==', 'active').count().get(),
        db.collection('ny_outreach_log').where('sentAt', '>=', dayStart).count().get(),
        db.collection('agent_audit_reports').orderBy('createdAt', 'desc').limit(1).get(),
    ]);

    return {
        openTasks: openTasksSnap.status === 'fulfilled' ? openTasksSnap.value.data().count : 0,
        activeOrgs: activeOrgsSnap.status === 'fulfilled' ? activeOrgsSnap.value.data().count : 0,
        outreachToday: outreachTodaySnap.status === 'fulfilled' ? outreachTodaySnap.value.data().count : 0,
        lastAuditScore: auditSnap.status === 'fulfilled' && !auditSnap.value.empty
            ? (auditSnap.value.docs[0].data().averageScore ?? null) : null,
        dateStr: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }),
        timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }),
    };
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateMorningScan(ctx: Awaited<ReturnType<typeof loadDailyContext>>): Promise<string[]> {
    const prompt = `You are the BakedBot executive morning scan system. Today is ${ctx.dateStr}.

COMPANY PULSE:
- Active orgs: ${ctx.activeOrgs}
- Open agent tasks: ${ctx.openTasks}
- Outreach sent today so far: ${ctx.outreachToday}
- Last agent audit score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100` : 'N/A'}

Generate 5 crisp morning scan items covering: overnight changes to watch, top 1-2 revenue risks, today's highest-leverage priorities, any compliance or market flags, and who owns what today.
Format as short bullet points starting with the agent name in brackets. Under 25 words each.`;

    try {
        const text = await callClaude({ model: 'claude-haiku-4-5-20251001', userMessage: prompt, maxTokens: 400, caller: 'daily-executive-cadence/morning' });
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 10).slice(0, 6);
    } catch {
        return [
            `[Marty] Revenue priority: push today's outreach batch (${ctx.outreachToday} sent so far)`,
            `[Leo] Review open tasks: ${ctx.openTasks} pending — assign or reassign by 10 AM`,
            '[Jack] Pipeline check: any deals stalling? Flag top 3 follow-ups for today',
            '[Linus] Build health pass — verify no overnight deployment or integration failures',
            '[Pops] KPI snapshot: pull yesterday\'s conversion and usage numbers',
            '[Deebo] Review any content scheduled to send today before it goes out',
        ];
    }
}

async function generateMiddayCheck(ctx: Awaited<ReturnType<typeof loadDailyContext>>): Promise<string[]> {
    const prompt = `You are the BakedBot midday check system. Today is ${ctx.dateStr}, midday.

PROGRESS PULSE:
- Active orgs: ${ctx.activeOrgs}
- Open tasks still pending: ${ctx.openTasks}
- Outreach sent today: ${ctx.outreachToday}

Generate 4 midday check items: confirm priority progress, identify anything stalled that needs intervention before day ends, flag cross-agent handoffs needed, and surface one growth move to accelerate now.
Format as short bullet points with [AGENT] tags. Under 25 words each.`;

    try {
        const text = await callClaude({ model: 'claude-haiku-4-5-20251001', userMessage: prompt, maxTokens: 350, caller: 'daily-executive-cadence/midday' });
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 10).slice(0, 5);
    } catch {
        return [
            `[Leo] Blocker check: ${ctx.openTasks} tasks open — any stuck without owner?`,
            '[Jack] Pipeline movement: confirm at least 1 follow-up sent or proposal advanced today',
            '[Craig] Campaign check: anything queued for this afternoon that needs Deebo clearance?',
            '[Pops] Usage pulse: any account health changes since this morning?',
        ];
    }
}

async function generateCloseout(ctx: Awaited<ReturnType<typeof loadDailyContext>>): Promise<string[]> {
    const prompt = `You are the BakedBot late-day closeout system. Today is ${ctx.dateStr}, late afternoon.

DAY SUMMARY PULSE:
- Outreach sent today: ${ctx.outreachToday}
- Open tasks remaining: ${ctx.openTasks}
- Active orgs: ${ctx.activeOrgs}

Generate 4 closeout items: what moved today (or didn't), action items to carry into tomorrow, follow-up queue for Puff/OpenClaw to execute tonight, and any overdue items that need owner assignment.
Format as short bullet points. Under 25 words each.`;

    try {
        const text = await callClaude({ model: 'claude-haiku-4-5-20251001', userMessage: prompt, maxTokens: 350, caller: 'daily-executive-cadence/closeout' });
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 10).slice(0, 5);
    } catch {
        return [
            `[Leo] Closeout: ${ctx.outreachToday} outreach sent today. ${ctx.openTasks} tasks still open — roll to tomorrow`,
            '[Felisha] Capture today\'s action items: who committed to what? Document before EOD',
            '[Puff] Queue overnight follow-ups and any sends that missed today\'s window',
            '[OpenClaw] Execute any approved low-risk tasks queued for tonight',
        ];
    }
}

async function generateOvernightPrep(ctx: Awaited<ReturnType<typeof loadDailyContext>>): Promise<string[]> {
    const prompt = `You are the BakedBot overnight prep system. Today is ${ctx.dateStr}.

OVERNIGHT CONTEXT:
- Active orgs: ${ctx.activeOrgs}
- Last audit score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100` : 'N/A'}

Generate 4 overnight prep items: research or analysis to queue for morning, competitor and market intelligence to gather, compliance or content pre-checks for tomorrow's sends, and knowledge captures to archive.
Format as short bullet points with [AGENT] tags. Under 25 words each.`;

    try {
        const text = await callClaude({ model: 'claude-haiku-4-5-20251001', userMessage: prompt, maxTokens: 300, caller: 'daily-executive-cadence/overnight' });
        return text.split('\n').map(l => l.trim()).filter(l => l.length > 10).slice(0, 5);
    } catch {
        return [
            '[Ezal] Overnight sweep: scan competitor pricing and campaign activity in NY cannabis market',
            '[Deebo] Pre-clear any content scheduled for tomorrow morning sends',
            '[Roach] Archive today\'s key findings and tag unresolved research questions',
            '[Puff] Prepare tomorrow morning\'s priority queue from tonight\'s task rollover',
        ];
    }
}

// ---------------------------------------------------------------------------
// Slack post
// ---------------------------------------------------------------------------

async function postWindowToSlack(window: DailyWindow, items: string[], ctx: Awaited<ReturnType<typeof loadDailyContext>>) {
    const windowMeta: Record<DailyWindow, { emoji: string; title: string; agents: string }> = {
        morning: { emoji: ':sunrise:', title: 'Morning Scan', agents: 'Marty · Leo · Jack · Linus · Pops · Ezal · Mrs. Parker · Deebo' },
        midday: { emoji: ':sun_with_face:', title: 'Midday Check', agents: 'Leo · Jack · Glenda · Linus · Pops · Craig · Puff' },
        closeout: { emoji: ':sunset:', title: 'Late-Day Closeout', agents: 'Leo · Felisha · Pops · Puff · OpenClaw' },
        overnight: { emoji: ':crescent_moon:', title: 'Overnight Prep', agents: 'Ezal · Deebo · Roach · Puff · OpenClaw' },
    };

    const { emoji, title, agents } = windowMeta[window];
    const itemLines = items.map(i => `• ${i}`).join('\n');

    try {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: `daily-executive-cadence/${window}`,
            channelName: 'ceo',
            fallbackText: `${emoji} ${title} — ${ctx.dateStr}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${emoji} *${title}* — ${ctx.dateStr} ${ctx.timeStr} ET\n_Active agents: ${agents}_\n\n${itemLines}`,
                    },
                },
            ],
        });
    } catch (e) {
        logger.error('[daily-executive-cadence] Slack post failed', { window, error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Firestore log
// ---------------------------------------------------------------------------

async function logWindow(window: DailyWindow, items: string[]) {
    try {
        const db = getAdminFirestore();
        await db.collection('executive_cadence_log').add({
            window,
            type: 'daily',
            items,
            firedAt: new Date(),
            createdAt: Date.now(),
        });
    } catch (e) {
        logger.warn('[daily-executive-cadence] Firestore log failed', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'daily-executive-cadence');
    if (authError) return authError;

    const now = new Date();
    const utcHour = now.getUTCHours();
    const window = detectWindow(utcHour);

    logger.info('[daily-executive-cadence] Firing', { window, utcHour });

    try {
        const ctx = await loadDailyContext();

        let items: string[];
        switch (window) {
            case 'morning':   items = await generateMorningScan(ctx); break;
            case 'midday':    items = await generateMiddayCheck(ctx); break;
            case 'closeout':  items = await generateCloseout(ctx); break;
            case 'overnight': items = await generateOvernightPrep(ctx); break;
        }

        await Promise.allSettled([
            postWindowToSlack(window, items, ctx),
            logWindow(window, items),
        ]);

        return NextResponse.json({ success: true, window, items, utcHour });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[daily-executive-cadence] Failed', { window, error: msg });
        return NextResponse.json({ success: false, window, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
