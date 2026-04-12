/**
 * Weekly Monday Command Cron
 *
 * Runs every Monday at 7 AM EST (12 PM UTC).
 * Sets the week: Marty reviews MRR pace, sets top 3 company priorities,
 * Leo converts them into an execution map, Jack reviews pipeline,
 * Linus reviews tech readiness, Glenda sets narrative priorities,
 * Mike reviews economics. Posts a unified "Command Day" memo to CEO inbox.
 *
 * Cloud Scheduler:
 *   Name:     weekly-monday-command
 *   Schedule: 0 12 * * 1      (7 AM EST = 12 PM UTC, Mondays)
 *   URL:      /api/cron/weekly-monday-command
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, getSuperUserOrgId, parseBullets } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { buildMartyScoreboard, TARGET_MRR } from '@/server/services/marty-reporting';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommandSection {
    agent: 'marty' | 'leo' | 'jack' | 'linus' | 'glenda' | 'mike';
    title: string;
    items: string[];
    priority: 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// Live metrics from Firestore
// ---------------------------------------------------------------------------

async function loadWeeklyCommandContext() {
    const db = getAdminFirestore();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const [orgsSnap, leadsSnap, outreachSnap, auditSnap] = await Promise.allSettled([
        db.collection('organizations').where('status', '==', 'active').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_outreach_log').where('emailSent', '==', true).count().get(),
        db.collection('agent_audit_reports').orderBy('createdAt', 'desc').limit(1).get(),
    ]);

    const activeOrgs = orgsSnap.status === 'fulfilled' ? orgsSnap.value.data().count : 0;
    const queuedLeads = leadsSnap.status === 'fulfilled' ? leadsSnap.value.data().count : 0;
    const totalOutreachSent = outreachSnap.status === 'fulfilled' ? outreachSnap.value.data().count : 0;
    const lastAuditScore = auditSnap.status === 'fulfilled' && !auditSnap.value.empty
        ? (auditSnap.value.docs[0].data().averageScore ?? null)
        : null;

    // Build scoreboard for ARR pacing
    const scoreboard = buildMartyScoreboard();
    const currentMrr = scoreboard.groups.find(g => g.id === 'revenue')?.metrics.find(m => m.id === 'current_mrr')?.value ?? null;
    const paceVsTarget = currentMrr !== null
        ? Math.round((currentMrr / TARGET_MRR) * 100)
        : null;

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });

    return { dateStr, activeOrgs, queuedLeads, totalOutreachSent, lastAuditScore, currentMrr, paceVsTarget };
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateMartyCommand(ctx: Awaited<ReturnType<typeof loadWeeklyCommandContext>>): Promise<CommandSection> {
    const mrrStatus = ctx.currentMrr !== null
        ? `Current MRR: $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of $${TARGET_MRR.toLocaleString()} target)`
        : 'MRR not yet instrumented — using proxy metrics';

    const prompt = `You are Marty Benjamins, CEO of BakedBot AI. Today is Monday ${ctx.dateStr} — Command Day.

COMPANY METRICS:
- ${mrrStatus}
- Active customer organizations: ${ctx.activeOrgs}
- Pipeline: ${ctx.queuedLeads} leads ready for outreach, ${ctx.totalOutreachSent} total outreach sent
- Last agent audit score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100` : 'Not yet available'}

BakedBot OFFER STACK (for ARR planning):
- Free Check-In: $0/mo (wedge)
- Access Intel: $149/mo
- Access Retention: $499-$899/mo
- Operator Core: $2,500-$3,000 MRR
- Operator Growth: $3,500-$4,000 MRR
- Enterprise: $5,000+ MRR custom
- TARGET: $1,000,000 ARR ($83,333 MRR)

As CEO, set the top 3 company priorities for this week. Be specific and outcome-oriented.
Each priority must have: what the goal is, who owns it, and how we'll know it moved.
Format as numbered list (1. 2. 3.). Under 40 words per priority.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 500,
            caller: 'weekly-monday-command/marty',
        });
        const items = parseBullets(text);
        return {
            agent: 'marty',
            title: "Marty's Top 3 Weekly Priorities",
            items: items.length > 0 ? items.slice(0, 3) : [
                `Revenue: ${ctx.currentMrr !== null ? `Current MRR $${ctx.currentMrr.toLocaleString()} — push ${ctx.queuedLeads} leads toward first paid Operator account` : 'Instrument MRR tracking and identify first Operator conversion target'}`,
                `Pipeline: Convert ${ctx.queuedLeads} researched leads to active outreach — Jack owns, Puff executes sends`,
                `Product: Agent audit at ${ctx.lastAuditScore ?? '?'}/100 — coach weakest agent this week via deliberative pipeline`,
            ],
            priority: ctx.paceVsTarget !== null && ctx.paceVsTarget < 50 ? 'high' : 'medium',
        };
    } catch {
        return {
            agent: 'marty',
            title: "Marty's Top 3 Weekly Priorities",
            items: [
                'Revenue: Close first Operator account this week — Jack owns pipeline, Mrs. Parker owns retention health',
                `Pipeline: ${ctx.queuedLeads} leads queued — move to active outreach today`,
                'Product: Run agent quality audit and deliver coaching patch to weakest performer',
            ],
            priority: 'high',
        };
    }
}

async function generateLeoExecutionMap(ctx: Awaited<ReturnType<typeof loadWeeklyCommandContext>>): Promise<CommandSection> {
    const prompt = `You are Leo, COO of BakedBot. It is Monday ${ctx.dateStr} — you are building the weekly execution map.

COMPANY CONTEXT:
- Active orgs: ${ctx.activeOrgs}
- Pipeline leads ready: ${ctx.queuedLeads}
- Outreach sent total: ${ctx.totalOutreachSent}

Generate 4 operational execution items for this week:
1. Owner assignments (who owns what)
2. Critical dependencies to unblock
3. Agent coordination priorities (which agents need to hand off to whom)
4. Risk of execution slippage (what could fall through the cracks)

Format as bullet points with [OWNER: name] tags. Under 30 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 400,
            caller: 'weekly-monday-command/leo',
        });
        const items = parseBullets(text);
        return {
            agent: 'leo',
            title: "Leo's Weekly Execution Map",
            items: items.length > 0 ? items : [
                `[OWNER: Jack] Pipeline: move ${ctx.queuedLeads} leads to active outreach by Wednesday`,
                '[OWNER: Linus] Build health: verify all cron jobs are healthy before midweek check',
                '[OWNER: Craig] Campaigns: align this week\'s sends to Jack\'s outreach priorities',
                '[OWNER: Mrs. Parker] Retention: identify any churn-risk accounts among active orgs',
            ],
            priority: 'high',
        };
    } catch {
        return {
            agent: 'leo',
            title: "Leo's Weekly Execution Map",
            items: [
                `[OWNER: Jack] Close ${ctx.queuedLeads} leads pipeline gap — outreach by Wednesday`,
                '[OWNER: Linus] Tech readiness review — confirm no onboarding blockers',
                '[OWNER: Mrs. Parker] Account health pass on all active organizations',
                '[OWNER: Craig] Content calendar: align sends to pipeline priorities',
            ],
            priority: 'medium',
        };
    }
}

async function generateJackPipelineReview(ctx: Awaited<ReturnType<typeof loadWeeklyCommandContext>>): Promise<CommandSection> {
    const items = [
        ctx.queuedLeads > 0
            ? `${ctx.queuedLeads} leads researched and ready — prioritize top 5 for outreach today`
            : 'Pipeline queue empty — identify and research new dispensary targets today',
        `Total outreach sent: ${ctx.totalOutreachSent} — review response rates and follow-up cadence`,
        'Flag any proposals aging > 3 days without response — escalate to Marty',
        'Identify top pilot candidate this week — who is closest to paid Operator?',
    ];
    return {
        agent: 'jack',
        title: "Jack's Pipeline Review",
        items,
        priority: ctx.queuedLeads === 0 ? 'high' : 'medium',
    };
}

async function generateLinusTechReadiness(): Promise<CommandSection> {
    const db = getAdminFirestore();
    let buildStatus = 'Unknown';

    try {
        // Check for recent deploy or build status in Firestore
        const deploysSnap = await db.collection('deploy_logs')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (!deploysSnap.empty) {
            const deploy = deploysSnap.docs[0].data();
            buildStatus = deploy.status || 'Unknown';
        }
    } catch { /* non-fatal */ }

    return {
        agent: 'linus',
        title: "Linus's Tech Readiness",
        items: [
            `Build status: ${buildStatus} — run check:types if any changes landed over weekend`,
            'Review any onboarding blockers: bugs that prevent new customers from activating',
            'Check cron health: all 5 daily windows should be firing correctly this week',
            'Agent telemetry: review error rates from last 7 days and flag regressions',
        ],
        priority: buildStatus === 'failed' ? 'high' : 'low',
    };
}

async function generateGlendaNarrativePlan(): Promise<CommandSection> {
    return {
        agent: 'glenda',
        title: "Glenda's Narrative Priorities",
        items: [
            'Offer Stack messaging: ensure homepage reflects Access vs Operator two-track model',
            'Proof content: identify one customer win from last week to amplify as case study',
            'Day Day: queue 3 SEO content pieces aligned to "capture more customers" positioning',
            'Craig: brief on this week\'s campaign sends — align to Jack\'s pipeline outreach',
        ],
        priority: 'medium',
    };
}

async function generateMikeEconomicsReview(ctx: Awaited<ReturnType<typeof loadWeeklyCommandContext>>): Promise<CommandSection> {
    const mrrNote = ctx.currentMrr !== null
        ? `Current MRR $${ctx.currentMrr.toLocaleString()} vs target $${TARGET_MRR.toLocaleString()} (${ctx.paceVsTarget}%)`
        : 'MRR not yet instrumented';

    return {
        agent: 'mike',
        title: "Mike's Economics Review",
        items: [
            mrrNote,
            ctx.paceVsTarget !== null && ctx.paceVsTarget < 30
                ? 'CRITICAL: MRR significantly below target — review burn rate and runway immediately'
                : 'Review burn rate vs MRR growth pace — are we on track to reach $83K MRR?',
            'Pricing discipline: confirm Operator Core ($2,500-$3,000) is being sold at target, not discounted',
            'Check for any outstanding invoices or subscription gaps in active org billing',
        ],
        priority: ctx.paceVsTarget !== null && ctx.paceVsTarget < 30 ? 'high' : 'medium',
    };
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postMondayCommandToInbox(
    orgId: string,
    sections: CommandSection[],
    ctx: Awaited<ReturnType<typeof loadWeeklyCommandContext>>
) {
    const db = getAdminFirestore();

    const threadsSnap = await db.collection('inbox_threads')
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    let threadId: string;
    if (threadsSnap.empty) {
        const ref = db.collection('inbox_threads').doc();
        threadId = ref.id;
        await ref.set({
            id: threadId, orgId, userId: 'system', type: 'analytics', status: 'active',
            title: '📊 Daily Briefing', preview: 'Executive intelligence briefing',
            primaryAgent: 'marty',
            assignedAgents: ['marty', 'leo', 'jack', 'linus', 'glenda', 'mike'],
            artifactIds: [], messages: [],
            metadata: { isBriefingThread: true },
            createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
        });
    } else {
        threadId = threadsSnap.docs[0].id;
    }

    const now = new Date();
    const priorities = sections.find(s => s.agent === 'marty')?.items ?? [];
    const prioritySummary = priorities.map((p, i) => `${i + 1}. ${p}`).join('\n');

    const allBullets = sections
        .filter(s => s.agent !== 'marty')
        .flatMap(s => s.items.slice(0, 2))
        .slice(0, 6)
        .map(i => `• ${i}`)
        .join('\n');

    const mrrLine = ctx.currentMrr !== null
        ? `MRR: $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of target)`
        : 'MRR: Tracking in progress';

    const body = `**Monday Command Day — ${ctx.dateStr}**\n\n📊 ${mrrLine}\n\n**Top 3 Priorities This Week:**\n${prioritySummary}\n\n**Executive Assignments:**\n${allBullets}\n\n_Marty, Leo, Jack, Linus, Glenda, and Mike have set this week's operating board._`;

    const artifact = {
        type: 'weekly_monday_command',
        data: {
            date: now.toISOString().split('T')[0],
            dateLabel: ctx.dateStr,
            currentMrr: ctx.currentMrr,
            paceVsTarget: ctx.paceVsTarget,
            targetMrr: TARGET_MRR,
            weeklyPriorities: priorities,
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items, priority: s.priority })),
            generatedAt: now.toISOString(),
        },
    };

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'marty',
        artifact,
        createdAt: now,
        metadata: { source: 'weekly-monday-command', urgency: 'info' },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[WeeklyMondayCommand] Posted to inbox', { orgId, threadId, priorities: priorities.length });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'weekly-monday-command');
    if (authError) return authError;

    logger.info('[WeeklyMondayCommand] Starting Monday command session');

    try {
        const ctx = await loadWeeklyCommandContext();

        const [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection] = await Promise.all([
            generateMartyCommand(ctx),
            generateLeoExecutionMap(ctx),
            generateJackPipelineReview(ctx),
            generateLinusTechReadiness(),
            generateGlendaNarrativePlan(),
            generateMikeEconomicsReview(ctx),
        ]);

        const orgId = await getSuperUserOrgId();
        await postMondayCommandToInbox(
            orgId,
            [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection],
            ctx
        );

        return NextResponse.json({
            success: true,
            summary: {
                date: ctx.dateStr,
                currentMrr: ctx.currentMrr,
                paceVsTarget: ctx.paceVsTarget,
                priorities: martySection.items.length,
                activeOrgs: ctx.activeOrgs,
                queuedLeads: ctx.queuedLeads,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[WeeklyMondayCommand] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
