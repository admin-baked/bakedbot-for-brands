/**
 * Weekly Executive Cadence Megacron — Tuesday Build Day + Thursday Proof Day
 *
 * Two Cloud Scheduler jobs fire this single route on different days:
 *   - Tue 9 AM EST (14:00 UTC) → Build and Move Day
 *   - Thu 1 PM EST (18:00 UTC) → Optimization and Proof Day
 *
 * Routes internally by getDay() so adding future weekdays is a one-block change.
 *
 * Cloud Scheduler commands (run once per job):
 *   CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
 *   BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"
 *
 *   gcloud scheduler jobs create http weekly-tuesday-build \
 *     --schedule="0 14 * * 2" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/weekly-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 *
 *   gcloud scheduler jobs create http weekly-thursday-proof \
 *     --schedule="0 18 * * 4" --time-zone="UTC" \
 *     --uri="$BASE/api/cron/weekly-executive-cadence" \
 *     --http-method=POST --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body='{}' --project=studio-567050101-bc6e8
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, parseBullets } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { buildMartyScoreboard, TARGET_MRR } from '@/server/services/marty-reporting';
import { sendGenericEmail } from '@/lib/email/dispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Day routing
// ---------------------------------------------------------------------------

type WeekDay = 'tuesday' | 'thursday';

function detectDay(jsDay: number): WeekDay | null {
    if (jsDay === 2) return 'tuesday';
    if (jsDay === 4) return 'thursday';
    return null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

async function loadContext() {
    const db = getAdminFirestore();
    const now = new Date();
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - (now.getDay() - 1));
    mondayThisWeek.setHours(0, 0, 0, 0);

    const [activeOrgsSnap, openTasksSnap, outreachWeekSnap, auditSnap] = await Promise.allSettled([
        db.collection('organizations').where('status', '==', 'active').count().get(),
        db.collection('agent_tasks').where('status', 'in', ['pending', 'in_progress']).count().get(),
        db.collection('ny_outreach_log').where('sentAt', '>=', mondayThisWeek).count().get(),
        db.collection('agent_audit_reports').orderBy('createdAt', 'desc').limit(1).get(),
    ]);

    const scoreboard = buildMartyScoreboard();
    const currentMrr = scoreboard.groups.find(g => g.id === 'revenue')?.metrics.find(m => m.id === 'current_mrr')?.value ?? null;
    const paceVsTarget = currentMrr !== null ? Math.round((currentMrr / TARGET_MRR) * 100) : null;

    return {
        activeOrgs: activeOrgsSnap.status === 'fulfilled' ? activeOrgsSnap.value.data().count : 0,
        openTasks: openTasksSnap.status === 'fulfilled' ? openTasksSnap.value.data().count : 0,
        outreachThisWeek: outreachWeekSnap.status === 'fulfilled' ? outreachWeekSnap.value.data().count : 0,
        lastAuditScore: auditSnap.status === 'fulfilled' && !auditSnap.value.empty
            ? (auditSnap.value.docs[0].data().averageScore ?? null) : null,
        currentMrr,
        paceVsTarget,
        dateStr: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }),
    };
}

// ---------------------------------------------------------------------------
// TUESDAY — Build and Move Day
// ---------------------------------------------------------------------------

interface TuesdaySection { agent: string; title: string; items: string[] }

async function generateTuesdaySection(agent: string, ctx: Awaited<ReturnType<typeof loadContext>>): Promise<TuesdaySection> {
    const prompts: Record<string, string> = {
        leo: `You are Leo, COO. It is Tuesday ${ctx.dateStr} — Build and Move Day. Open tasks: ${ctx.openTasks}. Active orgs: ${ctx.activeOrgs}. Report whether Monday's priorities actually started. List 3 dependency bottlenecks to unblock right now. Format as bullet points, under 25 words each.`,
        jack: `You are Jack, CRO. It is Tuesday ${ctx.dateStr}. Outreach this week: ${ctx.outreachThisWeek}. List 3 specific deal, proposal, or pilot actions to move today. For each: what, with whom, what outcome you're pushing for. Under 25 words each.`,
        craig: `You are Craig, campaign manager. It is Tuesday ${ctx.dateStr}. List 3 campaign or content actions to launch or draft today. Align to pipeline priorities. Include any Deebo-pre-cleared content ready to send. Under 25 words each.`,
        pops: `You are Pops, analytics. It is Tuesday ${ctx.dateStr}. MRR pace: ${ctx.paceVsTarget !== null ? ctx.paceVsTarget + '%' : 'N/A'} of target. Last audit: ${ctx.lastAuditScore ?? 'N/A'}/100. Validate whether current GTM data supports this week's priorities. List 3 signal checks to run today. Under 25 words each.`,
        money_mike: `You are Money Mike, pricing/margin analyst. It is Tuesday ${ctx.dateStr}. Active orgs: ${ctx.activeOrgs}. Validate offer math for any deals in flight. List 2 pricing or ROI items to pressure-test today. Under 25 words each.`,
        day_day: `You are Day Day, SEO. It is Tuesday ${ctx.dateStr}. List 3 SEO or organic growth tasks to publish or optimize today. Tie to current pipeline or brand priorities. Under 25 words each.`,
    };

    const agentTitles: Record<string, string> = {
        leo: "Leo's Blocker Unblock",
        jack: "Jack's Deal Movement",
        craig: "Craig's Campaign Push",
        pops: "Pops' GTM Validation",
        money_mike: "Money Mike's Offer Math",
        day_day: "Day Day's SEO Production",
    };

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompts[agent] ?? `You are ${agent}. It is Tuesday ${ctx.dateStr}. Build and Move Day. List 3 items to execute today. Under 25 words each.`,
            maxTokens: 300,
            caller: `weekly-executive-cadence/tuesday/${agent}`,
        });
        return { agent, title: agentTitles[agent] ?? `${agent} Build Actions`, items: parseBullets(text).slice(0, 4) };
    } catch {
        return { agent, title: agentTitles[agent] ?? `${agent} Actions`, items: [`[${agent}] Build Day: execute top priority for ${ctx.activeOrgs} active orgs`] };
    }
}

// ---------------------------------------------------------------------------
// THURSDAY — Optimization and Proof Day
// ---------------------------------------------------------------------------

interface ThursdaySection { agent: string; title: string; items: string[] }

async function generateThursdaySection(agent: string, ctx: Awaited<ReturnType<typeof loadContext>>): Promise<ThursdaySection> {
    const prompts: Record<string, string> = {
        marty: `You are Marty Benjamins, CEO. It is Thursday ${ctx.dateStr} — Proof Day. MRR pace: ${ctx.paceVsTarget !== null ? ctx.paceVsTarget + '%' : 'N/A'} of $${TARGET_MRR.toLocaleString()} target. Shape this week's narrative: what should be amplified, fixed, or cut next week? 3 items. Under 25 words each.`,
        jack: `You are Jack, CRO. Thursday ${ctx.dateStr}. Push 2 late-stage opportunities toward commitment today. What's the next ask? Who needs to hear what? Under 25 words each.`,
        pops: `You are Pops, analytics. Thursday ${ctx.dateStr}. Package this week's proof in numbers. Audit score: ${ctx.lastAuditScore ?? 'N/A'}/100, orgs: ${ctx.activeOrgs}. List 3 metrics that tell the story. Under 25 words each.`,
        roach: `You are Roach, research librarian. Thursday ${ctx.dateStr}. Turn this week's findings into reusable knowledge. List 3 items to archive: insights, learnings, or unresolved research questions. Under 25 words each.`,
        craig: `You are Craig, campaigns. Thursday ${ctx.dateStr}. Convert strong outcomes into sales proof or campaign case studies. List 2 content items to produce from this week's results. Under 25 words each.`,
        money_mike: `You are Money Mike. Thursday ${ctx.dateStr}. Pressure-test margin quality of this week's growth signals. List 2 economic quality checks on current wins. Under 25 words each.`,
        felisha: `You are Felisha, ops coordinator. Thursday ${ctx.dateStr}. Prepare Friday's executive review packet. List 4 action items: who owns what, any gaps, overdue loops, and what Marty needs to see tomorrow. Under 25 words each.`,
    };

    const agentTitles: Record<string, string> = {
        marty: "Marty's Weekly Narrative",
        jack: "Jack's Close Push",
        pops: "Pops' Proof Pack",
        roach: "Roach's Knowledge Archive",
        craig: "Craig's Case Studies",
        money_mike: "Money Mike's Margin Check",
        felisha: "Felisha's Friday Packet",
    };

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompts[agent] ?? `You are ${agent}. It is Thursday ${ctx.dateStr} — Proof Day. Summarize what worked this week and what to take forward. 3 items. Under 25 words each.`,
            maxTokens: 300,
            caller: `weekly-executive-cadence/thursday/${agent}`,
        });
        return { agent, title: agentTitles[agent] ?? `${agent} Proof Items`, items: parseBullets(text).slice(0, 4) };
    } catch {
        return { agent, title: agentTitles[agent] ?? `${agent} Items`, items: [`[${agent}] Proof Day: surface top win and top learning from this week`] };
    }
}

// ---------------------------------------------------------------------------
// THURSDAY ADD-ON — FFF Audit B2B Lead Nurture
// ---------------------------------------------------------------------------

const FFF_SENDER_EMAIL = 'hello@outreach.bakedbot.ai';
const FFF_SENDER_NAME = 'Martez Benjamins';

async function runFFFLeadNurture(): Promise<{ sent: number; skipped: number; errors: number }> {
    const db = getAdminFirestore();
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;

    const snap = await db.collection('leads')
        .where('source', '==', 'fff_audit')
        .where('status', '==', 'lead')
        .get();

    let sent = 0; let skipped = 0; let errors = 0;

    for (const doc of snap.docs) {
        const lead = doc.data();
        if (!lead.email) { skipped++; continue; }
        // Skip if emailed within the last week
        if (lead.lastEmailed && lead.lastEmailed > oneWeekAgo) { skipped++; continue; }

        try {
            const emailBody = await callClaude({
                model: 'claude-haiku-4-5-20251001',
                userMessage: `You are Craig, BakedBot's campaign manager. Write a short, personal B2B nurture email from Martez Benjamins (CEO of BakedBot AI) to ${lead.contactName || lead.name || 'a dispensary decision-maker'} at ${lead.dispensaryName || lead.company || 'their dispensary'}. They completed a Fit/Function/Finance audit showing interest in BakedBot's AI platform. Focus on ROI proof and invite them to a 20-minute demo. Keep it under 150 words. Conversational tone — no fluff. Output ONLY the email body (no subject, no greeting header, start directly).`,
                maxTokens: 300,
                caller: 'weekly-executive-cadence/fff-nurture',
            });

            const subject = `Following up — ${lead.dispensaryName || lead.company || 'your dispensary'} + BakedBot`;
            const htmlBody = `<div style="font-family:sans-serif;max-width:600px;color:#1a1a1a">${emailBody.replace(/\n/g, '<br>')}<br><br>— Martez<br><span style="color:#666;font-size:12px">BakedBot AI | martez@bakedbot.ai</span></div>`;

            const result = await sendGenericEmail({
                to: lead.email,
                name: lead.contactName || lead.name,
                fromEmail: FFF_SENDER_EMAIL,
                fromName: FFF_SENDER_NAME,
                subject,
                htmlBody,
                textBody: emailBody + '\n\n— Martez\nBakedBot AI | martez@bakedbot.ai',
            });

            if (result.success) {
                await doc.ref.update({
                    lastEmailed: Date.now(),
                    emailCount: (lead.emailCount || 0) + 1,
                    updatedAt: Date.now(),
                });
                logger.info('[fff-nurture] Email sent', { leadId: doc.id, email: lead.email });
                sent++;
            } else {
                logger.warn('[fff-nurture] Send failed', { leadId: doc.id, error: result.error });
                errors++;
            }
        } catch (err) {
            logger.error('[fff-nurture] Error', { leadId: doc.id, error: String(err) });
            errors++;
        }
    }

    return { sent, skipped, errors };
}

// ---------------------------------------------------------------------------
// Slack post
// ---------------------------------------------------------------------------

async function postToSlack(day: WeekDay, sections: Array<{ agent: string; title: string; items: string[] }>, ctx: Awaited<ReturnType<typeof loadContext>>) {
    const meta = {
        tuesday: { emoji: ':hammer_and_wrench:', title: 'Tuesday Build & Move Day', subtitle: 'Leo · Jack · Craig · Pops · Money Mike · Day Day' },
        thursday: { emoji: ':mag:', title: 'Thursday Proof & Optimization Day', subtitle: 'Marty · Jack · Pops · Roach · Craig · Money Mike · Felisha' },
    }[day];

    const sectionBlocks = sections.map(s => ({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${s.title}*\n${s.items.map(i => `• ${i}`).join('\n')}`,
        },
    }));

    try {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: `weekly-executive-cadence/${day}`,
            channelName: 'ceo',
            fallbackText: `${meta.emoji} ${meta.title} — ${ctx.dateStr}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${meta.emoji} *${meta.title}* — ${ctx.dateStr}\n_${meta.subtitle}_${ctx.paceVsTarget !== null ? ` | MRR pace: ${ctx.paceVsTarget}% of target` : ''}`,
                    },
                },
                { type: 'divider' },
                ...sectionBlocks,
            ],
        });
    } catch (e) {
        logger.error('[weekly-executive-cadence] Slack post failed', { day, error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Firestore log
// ---------------------------------------------------------------------------

async function logCadence(day: WeekDay, sections: Array<{ agent: string; title: string; items: string[] }>) {
    try {
        const db = getAdminFirestore();
        await db.collection('executive_cadence_log').add({
            day,
            type: 'weekly',
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items })),
            firedAt: new Date(),
            createdAt: Date.now(),
        });
    } catch (e) {
        logger.warn('[weekly-executive-cadence] Firestore log failed', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: NextRequest) {
    const authError = await requireCronSecret(request, 'weekly-executive-cadence');
    if (authError) return authError;

    const now = new Date();
    const jsDay = now.getDay();
    const day = detectDay(jsDay);

    if (!day) {
        logger.warn('[weekly-executive-cadence] Fired on unexpected day', { jsDay });
        return NextResponse.json({ success: false, error: `Unexpected day: ${jsDay}. Expected Tue(2) or Thu(4).` }, { status: 400 });
    }

    logger.info('[weekly-executive-cadence] Firing', { day });

    try {
        const ctx = await loadContext();

        let sections: Array<{ agent: string; title: string; items: string[] }>;

        if (day === 'tuesday') {
            sections = await Promise.all(
                ['leo', 'jack', 'craig', 'pops', 'money_mike', 'day_day'].map(a => generateTuesdaySection(a, ctx))
            );
        } else {
            sections = await Promise.all(
                ['marty', 'jack', 'pops', 'roach', 'craig', 'money_mike', 'felisha'].map(a => generateThursdaySection(a, ctx))
            );
        }

        const sideEffects: Promise<unknown>[] = [
            postToSlack(day, sections, ctx),
            logCadence(day, sections),
        ];
        if (day === 'thursday') sideEffects.push(runFFFLeadNurture());

        const results = await Promise.allSettled(sideEffects);
        const nurtureResult = day === 'thursday' && results[2].status === 'fulfilled'
            ? results[2].value as { sent: number; skipped: number; errors: number }
            : null;

        return NextResponse.json({ success: true, day, sectionCount: sections.length, nurture: nurtureResult });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[weekly-executive-cadence] Failed', { day, error: msg });
        return NextResponse.json({ success: false, day, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
