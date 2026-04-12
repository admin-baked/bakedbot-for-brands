/**
 * Weekly Friday Truth Day Memo Cron
 *
 * Runs every Friday at 4 PM EST (9 PM UTC) — Truth Day.
 * Marty publishes the weekly CEO memo: what moved, what stalled,
 * what broke, and what matters next week.
 * Full executive team contributes domain summaries.
 *
 * Note: The existing marty-weekly-memo runs Monday at 9AM (scoreboard/MRR).
 * This cron is the Friday end-of-week Truth Day CEO narrative memo.
 *
 * Cloud Scheduler:
 *   Name:     weekly-friday-memo
 *   Schedule: 0 21 * * 5      (4 PM EST = 9 PM UTC, Fridays)
 *   URL:      /api/cron/weekly-friday-memo
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { buildMartyScoreboard } from '@/server/services/marty-reporting';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TARGET_MRR = 83333;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FridaySection {
    agent: 'marty' | 'leo' | 'jack' | 'linus' | 'glenda' | 'mike' | 'pops' | 'mrs_parker' | 'ezal';
    title: string;
    items: string[];
}

// ---------------------------------------------------------------------------
// Org resolver
// ---------------------------------------------------------------------------

async function getSuperUserOrgId(): Promise<string> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('users').where('role', '==', 'super_user').limit(1).get();
        if (!snap.empty) {
            const d = snap.docs[0].data();
            const orgId = d.orgId || d.currentOrgId;
            if (orgId && typeof orgId === 'string') return orgId;
        }
    } catch { /* fall through */ }
    return 'bakedbot_super_admin';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

async function loadFridayContext() {
    const db = getAdminFirestore();
    const now = new Date();

    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - (now.getDay() - 1));
    mondayThisWeek.setHours(0, 0, 0, 0);

    const [orgsSnap, leadsReadySnap, outreachThisWeekSnap, completedTasksSnap, errorTasksSnap, auditSnap] = await Promise.allSettled([
        db.collection('organizations').where('status', '==', 'active').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_outreach_log').where('sentAt', '>=', mondayThisWeek).count().get(),
        db.collection('agent_tasks').where('status', '==', 'completed').where('updatedAt', '>=', mondayThisWeek).count().get(),
        db.collection('agent_tasks').where('status', '==', 'failed').where('updatedAt', '>=', mondayThisWeek).count().get(),
        db.collection('agent_audit_reports').orderBy('createdAt', 'desc').limit(1).get(),
    ]);

    const activeOrgs = orgsSnap.status === 'fulfilled' ? orgsSnap.value.data().count : 0;
    const leadsReady = leadsReadySnap.status === 'fulfilled' ? leadsReadySnap.value.data().count : 0;
    const outreachThisWeek = outreachThisWeekSnap.status === 'fulfilled' ? outreachThisWeekSnap.value.data().count : 0;
    const completedTasks = completedTasksSnap.status === 'fulfilled' ? completedTasksSnap.value.data().count : 0;
    const failedTasks = errorTasksSnap.status === 'fulfilled' ? errorTasksSnap.value.data().count : 0;
    const lastAuditScore = auditSnap.status === 'fulfilled' && !auditSnap.value.empty
        ? (auditSnap.value.docs[0].data().averageScore ?? null)
        : null;

    const scoreboard = buildMartyScoreboard();
    const currentMrr = scoreboard.groups.find(g => g.id === 'revenue')?.metrics.find(m => m.id === 'current_mrr')?.value ?? null;
    const paceVsTarget = currentMrr !== null ? Math.round((currentMrr / TARGET_MRR) * 100) : null;

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });

    const weekLabel = `Week of ${mondayThisWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' })}`;

    return {
        dateStr, weekLabel, activeOrgs, leadsReady, outreachThisWeek,
        completedTasks, failedTasks, lastAuditScore, currentMrr, paceVsTarget,
    };
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateMartyCeoMemo(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const mrrLine = ctx.currentMrr !== null
        ? `MRR $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of $${TARGET_MRR.toLocaleString()} target)`
        : 'MRR tracking in progress';

    const prompt = `You are Marty Benjamins, CEO of BakedBot AI. It is Friday ${ctx.dateStr}.

WEEK IN REVIEW (${ctx.weekLabel}):
- Revenue: ${mrrLine}
- Active customers: ${ctx.activeOrgs}
- Pipeline outreach this week: ${ctx.outreachThisWeek} contacts
- Leads still in queue: ${ctx.leadsReady}
- Tasks completed: ${ctx.completedTasks}
- Tasks failed: ${ctx.failedTasks}
- Agent quality score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100` : 'Not available'}

BakedBot Offer Stack:
- Path to $1M ARR: $2,500-$4,000 MRR per Operator account
- Need ~21-33 Operator accounts (or blended Access + Operator mix)
- Wedge: Free Check-In → Access Retention ($499-$899) → Operator Core ($2,500-$3,000) → Operator Growth ($3,500-$4,000)

Write the weekly CEO memo. Speak in first person as Marty.
Tell the truth about:
1. What moved this week (specific wins or real progress)
2. What stalled (honest about blockers or missed targets)
3. What broke (systems, pipelines, execution failures)
4. What matters most next week (top 2 focus areas)

Tone: honest, direct, no corporate fluff. This is internal. Write it like you'd say it in a real all-hands.
Format: 4 short numbered paragraphs. 40-60 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 600,
            caller: 'weekly-friday-memo/marty',
        });
        // Split into paragraphs
        const paragraphs = text.split('\n')
            .filter(l => l.trim().length > 20)
            .map(l => l.trim())
            .filter(Boolean)
            .slice(0, 4);
        return {
            agent: 'marty',
            title: `CEO Memo — ${ctx.weekLabel}`,
            items: paragraphs.length > 0 ? paragraphs : [
                `What moved: ${ctx.outreachThisWeek} outreach contacts this week, ${ctx.completedTasks} tasks completed.`,
                `What stalled: ${ctx.leadsReady} leads still sitting in queue — pipeline velocity needs to improve.`,
                `What broke: ${ctx.failedTasks} failed tasks this week — Linus and Leo need to review error patterns.`,
                `Next week: First Operator account conversion is the only goal that matters.`,
            ],
        };
    } catch {
        return {
            agent: 'marty',
            title: `CEO Memo — ${ctx.weekLabel}`,
            items: [
                `Week ${ctx.weekLabel}: ${ctx.outreachThisWeek} pipeline contacts, ${ctx.completedTasks} tasks completed, ${ctx.activeOrgs} active orgs.`,
                `Stalled: ${ctx.leadsReady} leads untouched — unacceptable if this number is > 0 on Friday.`,
                `Revenue pace: ${ctx.paceVsTarget !== null ? `${ctx.paceVsTarget}% of MRR target` : 'not yet measured'}. Need $83K MRR for $1M ARR.`,
                `Next week: close one deal or move one pilot to paid. That is the only metric that matters.`,
            ],
        };
    }
}

async function generateLeoExecutionSummary(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    return {
        agent: 'leo',
        title: "Leo's Execution Summary",
        items: [
            `Tasks completed this week: ${ctx.completedTasks}`,
            `Tasks failed this week: ${ctx.failedTasks}${ctx.failedTasks > 0 ? ' — review failure root causes before Monday' : ''}`,
            `Open loops: ${ctx.leadsReady} pipeline leads not yet contacted — carry to next week priority list`,
            'Unresolved blockers must be logged before EOD and assigned to Monday\'s execution map',
        ],
    };
}

async function generateJackRevenueReport(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    return {
        agent: 'jack',
        title: "Jack's Revenue Report",
        items: [
            `Pipeline outreach this week: ${ctx.outreachThisWeek} contacts sent`,
            `Leads remaining in queue: ${ctx.leadsReady} — carry-forward to next week`,
            `Active customers: ${ctx.activeOrgs} organizations — identify which are expansion-ready`,
            'Next week\'s best bets: identify top 3 accounts closest to Operator Core conversion',
        ],
    };
}

async function generateLinusShippingReport(): Promise<FridaySection> {
    const db = getAdminFirestore();
    let lastBuildStatus = 'Unknown';
    let lastDeployDate = 'Unknown';

    try {
        const deploysSnap = await db.collection('deploy_logs')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (!deploysSnap.empty) {
            const d = deploysSnap.docs[0].data();
            lastBuildStatus = d.status || 'Unknown';
            lastDeployDate = d.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown';
        }
    } catch { /* non-fatal */ }

    return {
        agent: 'linus',
        title: "Linus's Technical Report",
        items: [
            `Last build: ${lastBuildStatus} (${lastDeployDate})`,
            'Remaining technical threats: review any open issues that could block onboarding next week',
            'Infrastructure: all 5 daily cron windows should be running — verify in Cloud Scheduler',
            'Next week: no new features without passing agent audit score improvement first',
        ],
    };
}

async function generateGlendaDemandSummary(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    return {
        agent: 'glenda',
        title: "Glenda's Demand Summary",
        items: [
            'Proof amplification: identify one customer outcome from this week to publish as social proof',
            'Messaging: homepage should clearly reflect Access vs Operator two-track structure',
            'Content: Day Day\'s SEO content pipeline — review what ranked or moved this week',
            'Next week: Craig to brief on campaign sends aligned to Jack\'s top 3 best bets',
        ],
    };
}

async function generateMikeFinanceSummary(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const mrrLine = ctx.currentMrr !== null
        ? `$${ctx.currentMrr.toLocaleString()} MRR (${ctx.paceVsTarget}% of $${TARGET_MRR.toLocaleString()} target)`
        : 'MRR tracking pending';
    return {
        agent: 'mike',
        title: "Mike's Finance Summary",
        items: [
            `Revenue: ${mrrLine}`,
            'Operator pricing discipline: all Operator Core deals should be $2,500-$3,000 MRR minimum',
            'Check for billing leakage: any active orgs not on billing that should be',
            'Next week economics: $1 of new MRR is worth $12 ARR — track every new account added',
        ],
    };
}

async function generatePopsKpiPack(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const grade = ctx.lastAuditScore !== null
        ? (ctx.lastAuditScore >= 90 ? 'A' : ctx.lastAuditScore >= 80 ? 'B' : ctx.lastAuditScore >= 70 ? 'C' : 'D')
        : 'N/A';
    return {
        agent: 'pops',
        title: "Pops' Weekly KPI Pack",
        items: [
            `Active organizations: ${ctx.activeOrgs}`,
            `Pipeline outreach sent: ${ctx.outreachThisWeek} this week`,
            `Agent quality score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100 (Grade ${grade})` : 'Not available — run daily-response-audit'}`,
            `Tasks: ${ctx.completedTasks} completed, ${ctx.failedTasks} failed (${ctx.completedTasks + ctx.failedTasks > 0 ? Math.round((ctx.completedTasks / (ctx.completedTasks + ctx.failedTasks)) * 100) : 0}% success rate)`,
        ],
    };
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postFridayMemoToInbox(
    orgId: string,
    sections: FridaySection[],
    ctx: Awaited<ReturnType<typeof loadFridayContext>>
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
            assignedAgents: ['marty', 'leo', 'jack', 'linus', 'glenda', 'mike', 'pops'],
            artifactIds: [], messages: [],
            metadata: { isBriefingThread: true },
            createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
        });
    } else {
        threadId = threadsSnap.docs[0].id;
    }

    const now = new Date();
    const ceoMemo = sections.find(s => s.agent === 'marty');
    const memoText = ceoMemo?.items.join('\n\n') ?? 'Weekly CEO memo unavailable.';

    const mrrLine = ctx.currentMrr !== null
        ? `MRR: $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of target)`
        : 'MRR: Tracking in progress';

    const execBullets = sections
        .filter(s => s.agent !== 'marty')
        .map(s => `**${s.title.split("'s")[0]}:** ${s.items[0]}`)
        .join('\n');

    const body = `**Friday CEO Memo — ${ctx.weekLabel}**\n\n📊 ${mrrLine}\n\n${memoText}\n\n---\n**Executive Summaries:**\n${execBullets}`;

    const artifact = {
        type: 'weekly_friday_memo',
        data: {
            date: now.toISOString().split('T')[0],
            dateLabel: ctx.dateStr,
            weekLabel: ctx.weekLabel,
            currentMrr: ctx.currentMrr,
            paceVsTarget: ctx.paceVsTarget,
            targetMrr: TARGET_MRR,
            outreachThisWeek: ctx.outreachThisWeek,
            completedTasks: ctx.completedTasks,
            failedTasks: ctx.failedTasks,
            lastAuditScore: ctx.lastAuditScore,
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items })),
            generatedAt: now.toISOString(),
        },
    };

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'marty',
        artifact,
        createdAt: now,
        metadata: { source: 'weekly-friday-memo', urgency: 'info' },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[WeeklyFridayMemo] Posted to inbox', { orgId, threadId, weekLabel: ctx.weekLabel });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'weekly-friday-memo');
    if (authError) return authError;

    logger.info('[WeeklyFridayMemo] Generating Friday Truth Day CEO memo');

    try {
        const ctx = await loadFridayContext();

        const [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection, popsSection] = await Promise.all([
            generateMartyCeoMemo(ctx),
            generateLeoExecutionSummary(ctx),
            generateJackRevenueReport(ctx),
            generateLinusShippingReport(),
            generateGlendaDemandSummary(ctx),
            generateMikeFinanceSummary(ctx),
            generatePopsKpiPack(ctx),
        ]);

        const orgId = await getSuperUserOrgId();
        await postFridayMemoToInbox(orgId, [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection, popsSection], ctx);

        return NextResponse.json({
            success: true,
            summary: {
                weekLabel: ctx.weekLabel,
                currentMrr: ctx.currentMrr,
                paceVsTarget: ctx.paceVsTarget,
                outreachThisWeek: ctx.outreachThisWeek,
                completedTasks: ctx.completedTasks,
                failedTasks: ctx.failedTasks,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[WeeklyFridayMemo] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
