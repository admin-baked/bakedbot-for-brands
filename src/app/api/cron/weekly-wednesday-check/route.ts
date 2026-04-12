/**
 * Weekly Wednesday Check Cron
 *
 * Runs every Wednesday at 2 PM EST (7 PM UTC) — Inspection Day.
 * Marty asks: "Is the company on track?"
 * Leo runs blocker review. Jack reports stuck deals.
 * Pops delivers midweek KPI checkpoint.
 * Deebo scans for compliance risk from speed.
 *
 * Cloud Scheduler:
 *   Name:     weekly-wednesday-check
 *   Schedule: 0 19 * * 3      (2 PM EST = 7 PM UTC, Wednesdays)
 *   URL:      /api/cron/weekly-wednesday-check
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
export const maxDuration = 240;

const TARGET_MRR = 83333;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InspectionSection {
    agent: 'marty' | 'leo' | 'jack' | 'pops' | 'deebo';
    title: string;
    items: string[];
    verdict: 'on_track' | 'at_risk' | 'off_track';
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

async function loadWednesdayContext() {
    const db = getAdminFirestore();
    const now = new Date();

    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - (now.getDay() - 1));
    mondayThisWeek.setHours(0, 0, 0, 0);

    const [orgsSnap, leadsReadySnap, outreachThisWeekSnap, pendingTasksSnap, auditSnap] = await Promise.allSettled([
        db.collection('organizations').where('status', '==', 'active').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_outreach_log').where('sentAt', '>=', mondayThisWeek).count().get(),
        db.collection('agent_tasks').where('status', 'in', ['pending', 'in_progress']).count().get(),
        db.collection('agent_audit_reports').orderBy('createdAt', 'desc').limit(1).get(),
    ]);

    const activeOrgs = orgsSnap.status === 'fulfilled' ? orgsSnap.value.data().count : 0;
    const leadsReady = leadsReadySnap.status === 'fulfilled' ? leadsReadySnap.value.data().count : 0;
    const outreachThisWeek = outreachThisWeekSnap.status === 'fulfilled' ? outreachThisWeekSnap.value.data().count : 0;
    const openTasks = pendingTasksSnap.status === 'fulfilled' ? pendingTasksSnap.value.data().count : 0;
    const lastAuditScore = auditSnap.status === 'fulfilled' && !auditSnap.value.empty
        ? (auditSnap.value.docs[0].data().averageScore ?? null)
        : null;

    const scoreboard = buildMartyScoreboard();
    const currentMrr = scoreboard.groups.find(g => g.id === 'revenue')?.metrics.find(m => m.id === 'current_mrr')?.value ?? null;
    const paceVsTarget = currentMrr !== null ? Math.round((currentMrr / TARGET_MRR) * 100) : null;

    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });

    return { dateStr, activeOrgs, leadsReady, outreachThisWeek, openTasks, lastAuditScore, currentMrr, paceVsTarget };
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateMartyInspection(ctx: Awaited<ReturnType<typeof loadWednesdayContext>>): Promise<InspectionSection> {
    const mrrLine = ctx.currentMrr !== null
        ? `MRR $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of $${TARGET_MRR.toLocaleString()} target)`
        : 'MRR not yet instrumented';

    const prompt = `You are Marty Benjamins, CEO of BakedBot. It is Wednesday ${ctx.dateStr} — midweek inspection.

COMPANY SNAPSHOT:
- ${mrrLine}
- Active customers: ${ctx.activeOrgs}
- Pipeline: ${ctx.leadsReady} leads still in queue, ${ctx.outreachThisWeek} outreach sent this week
- Open tasks: ${ctx.openTasks} unresolved
- Agent quality score: ${ctx.lastAuditScore !== null ? `${ctx.lastAuditScore}/100` : 'Not available'}

BakedBot Offer Stack ARR Path:
- Need $83,333 MRR for $1M ARR
- 1 Operator Growth account = $3,500-$4,000 MRR
- Need 21-24 Operator Core accounts at $2,500-$3,000 MRR
- Or blended mix across Access + Operator tiers

Ask yourself: Is the company on track to create, protect, or expand revenue THIS week?
Decide if any priorities should be CUT (not doing them) or ESCALATED (needs founder attention now).
Generate 3 specific decisions. Format: [CUT|ESCALATE|ON TRACK] — reason + action. Under 35 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 450,
            caller: 'weekly-wednesday-check/marty',
        });
        const items = text.split('\n')
            .filter(l => l.trim().match(/^\[|^[-•*]/))
            .map(l => l.replace(/^[-•*]\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 3);

        const hasEscalation = items.some(i => i.includes('[ESCALATE]') || i.includes('ESCALATE'));
        const verdict: InspectionSection['verdict'] = hasEscalation ? 'at_risk'
            : ctx.outreachThisWeek === 0 ? 'off_track' : 'on_track';

        return {
            agent: 'marty',
            title: "Marty's Midweek Assessment",
            items: items.length > 0 ? items : [
                `[${ctx.outreachThisWeek > 0 ? 'ON TRACK' : 'ESCALATE'}] Pipeline: ${ctx.outreachThisWeek} outreach sent this week — ${ctx.outreachThisWeek === 0 ? 'zero movement, Jack must explain' : 'moving'}`,
                `[${ctx.openTasks > 10 ? 'AT RISK' : 'ON TRACK'}] Operations: ${ctx.openTasks} open tasks — ${ctx.openTasks > 10 ? 'too many unresolved, Leo review needed' : 'manageable'}`,
                ctx.paceVsTarget !== null ? `[${ctx.paceVsTarget < 30 ? 'ESCALATE' : 'ON TRACK'}] Revenue: ${ctx.paceVsTarget}% of MRR target — ${ctx.paceVsTarget < 30 ? 'pace critically low, intervention needed' : 'on pace'}` : '[ON TRACK] MRR not yet instrumented — focus on first Operator conversion',
            ],
            verdict: ctx.outreachThisWeek === 0 ? 'off_track' : 'on_track',
        };
    } catch {
        return {
            agent: 'marty',
            title: "Marty's Midweek Assessment",
            items: [
                `Pipeline movement: ${ctx.outreachThisWeek} outreach this week — ${ctx.outreachThisWeek === 0 ? '[ESCALATE] zero movement is unacceptable' : 'ok'}`,
                `Tasks: ${ctx.openTasks} open — ${ctx.openTasks > 15 ? 'too many, Leo cut the list' : 'manageable'}`,
                'Revenue: focus on converting one lead to Operator Core this week',
            ],
            verdict: ctx.outreachThisWeek === 0 ? 'off_track' : 'on_track',
        };
    }
}

async function generateLeoBlockerReview(ctx: Awaited<ReturnType<typeof loadWednesdayContext>>): Promise<InspectionSection> {
    const db = getAdminFirestore();
    const blockedSnap = await db.collection('agent_tasks')
        .where('status', '==', 'blocked')
        .limit(10)
        .get().catch(() => null);
    const blockedTasks = blockedSnap ? blockedSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

    const items: string[] = [];
    if (blockedTasks.length > 0) {
        items.push(`${blockedTasks.length} task(s) explicitly blocked — need owner action to unblock`);
        const blockedTitles = blockedTasks.slice(0, 3).map((t: Record<string, unknown>) => t.title || t.id).join(', ');
        items.push(`Blocked: ${blockedTitles}`);
    } else {
        items.push('No explicitly blocked tasks — review in-progress tasks for hidden blockers');
    }
    items.push(`${ctx.openTasks} total open tasks — verify each has an active owner`);
    if (ctx.outreachThisWeek === 0) {
        items.push('[BLOCKER] Zero pipeline outreach this week — investigate and unblock immediately');
    }

    return {
        agent: 'leo',
        title: "Leo's Blocker Review",
        items,
        verdict: blockedTasks.length > 3 ? 'at_risk' : 'on_track',
    };
}

async function generateJackStuckDeals(ctx: Awaited<ReturnType<typeof loadWednesdayContext>>): Promise<InspectionSection> {
    const db = getAdminFirestore();
    const staleLeadsSnap = await db.collection('ny_dispensary_leads')
        .where('outreachSent', '==', true)
        .where('status', '==', 'researched')
        .orderBy('outreachSentAt', 'asc')
        .limit(5)
        .get().catch(() => null);

    const staleLeads = staleLeadsSnap ? staleLeadsSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const items: string[] = [];

    if (ctx.outreachThisWeek === 0) {
        items.push('[CRITICAL] No outreach sent this week — pipeline is frozen');
        items.push(`${ctx.leadsReady} leads ready in queue — need immediate action`);
    } else {
        items.push(`${ctx.outreachThisWeek} outreach sent this week — verify response rates`);
    }

    if (staleLeads.length > 0) {
        items.push(`${staleLeads.length} lead(s) with outreach sent but no status update — follow up needed`);
    }

    items.push(`${ctx.leadsReady} leads still uncontacted — prioritize top 3 for remainder of week`);

    return {
        agent: 'jack',
        title: "Jack's Pipeline Status",
        items,
        verdict: ctx.outreachThisWeek === 0 ? 'off_track' : ctx.leadsReady > 10 ? 'at_risk' : 'on_track',
    };
}

async function generatePopsKpiCheckpoint(ctx: Awaited<ReturnType<typeof loadWednesdayContext>>): Promise<InspectionSection> {
    const items: string[] = [];

    const mrrNote = ctx.currentMrr !== null
        ? `MRR: $${ctx.currentMrr.toLocaleString()} — ${ctx.paceVsTarget}% of $${TARGET_MRR.toLocaleString()} ARR target`
        : 'MRR: Tracking pending — operator billing not yet instrumented';

    items.push(mrrNote);
    items.push(`Customer base: ${ctx.activeOrgs} active organizations`);
    items.push(`Pipeline velocity: ${ctx.outreachThisWeek} new outreach contacts this week`);

    if (ctx.lastAuditScore !== null) {
        const grade = ctx.lastAuditScore >= 90 ? 'A' : ctx.lastAuditScore >= 80 ? 'B' : ctx.lastAuditScore >= 70 ? 'C' : 'D';
        items.push(`Agent quality: ${ctx.lastAuditScore}/100 (Grade ${grade}) — ${ctx.lastAuditScore < 80 ? 'coaching needed' : 'healthy'}`);
    } else {
        items.push('Agent quality: Run daily-response-audit to get current score');
    }

    const verdict: InspectionSection['verdict'] = ctx.paceVsTarget !== null && ctx.paceVsTarget < 20 ? 'off_track'
        : ctx.outreachThisWeek === 0 ? 'at_risk'
        : 'on_track';

    return { agent: 'pops', title: "Pops' Midweek KPI Snapshot", items, verdict };
}

async function generateDeeboMidweekScan(): Promise<InspectionSection> {
    const db = getAdminFirestore();
    const [complianceQueueSnap, pendingCampaignsSnap] = await Promise.allSettled([
        db.collection('compliance_queue').where('status', '==', 'pending_review').count().get(),
        db.collection('campaigns').where('status', '==', 'pending_compliance').count().get(),
    ]);

    const queueCount = complianceQueueSnap.status === 'fulfilled' ? complianceQueueSnap.value.data().count : 0;
    const campaignCount = pendingCampaignsSnap.status === 'fulfilled' ? pendingCampaignsSnap.value.data().count : 0;
    const totalRisk = queueCount + campaignCount;

    const items: string[] = [];
    if (totalRisk === 0) {
        items.push('Compliance queue clear — no speed-created risk detected this week');
        items.push('All outbound content reviewed or pre-cleared');
    } else {
        if (queueCount > 0) items.push(`${queueCount} item(s) pending compliance review — block until cleared`);
        if (campaignCount > 0) items.push(`${campaignCount} campaign(s) in compliance hold — must be reviewed before launch`);
        items.push('Deebo gate active: no regulated content sends until approved');
    }
    items.push('Mid-week reminder: all cannabis marketing claims must pass compliance before distribution');

    return {
        agent: 'deebo',
        title: "Deebo's Compliance Check",
        items,
        verdict: totalRisk > 3 ? 'at_risk' : 'on_track',
    };
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postWednesdayCheckToInbox(
    orgId: string,
    sections: InspectionSection[],
    ctx: Awaited<ReturnType<typeof loadWednesdayContext>>
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
            assignedAgents: ['marty', 'leo', 'jack', 'pops', 'deebo'],
            artifactIds: [], messages: [],
            metadata: { isBriefingThread: true },
            createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
        });
    } else {
        threadId = threadsSnap.docs[0].id;
    }

    const now = new Date();
    const martyItems = sections.find(s => s.agent === 'marty')?.items ?? [];
    const verdicts = sections.map(s => s.verdict);
    const worstVerdict = verdicts.includes('off_track') ? 'off_track'
        : verdicts.includes('at_risk') ? 'at_risk' : 'on_track';

    const verdictEmoji = worstVerdict === 'off_track' ? '🔴' : worstVerdict === 'at_risk' ? '🟡' : '🟢';
    const verdictLabel = worstVerdict === 'off_track' ? 'OFF TRACK' : worstVerdict === 'at_risk' ? 'AT RISK' : 'ON TRACK';

    const martySummary = martyItems.map(i => `• ${i}`).join('\n');
    const otherBullets = sections
        .filter(s => s.agent !== 'marty')
        .flatMap(s => s.items.slice(0, 1))
        .map(i => `• ${i}`)
        .join('\n');

    const body = `**Wednesday Inspection — ${ctx.dateStr}** ${verdictEmoji} ${verdictLabel}\n\n**Marty's Assessment:**\n${martySummary}\n\n**Executive Reports:**\n${otherBullets}`;

    const artifact = {
        type: 'weekly_wednesday_check',
        data: {
            date: now.toISOString().split('T')[0],
            dateLabel: ctx.dateStr,
            overallVerdict: worstVerdict,
            currentMrr: ctx.currentMrr,
            paceVsTarget: ctx.paceVsTarget,
            outreachThisWeek: ctx.outreachThisWeek,
            openTasks: ctx.openTasks,
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items, verdict: s.verdict })),
            generatedAt: now.toISOString(),
        },
    };

    const urgency = worstVerdict === 'off_track' ? 'critical' : worstVerdict === 'at_risk' ? 'warning' : 'info';

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'marty',
        artifact,
        createdAt: now,
        metadata: { source: 'weekly-wednesday-check', urgency },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[WeeklyWednesdayCheck] Posted to inbox', { orgId, threadId, verdict: worstVerdict });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'weekly-wednesday-check');
    if (authError) return authError;

    logger.info('[WeeklyWednesdayCheck] Starting Wednesday inspection');

    try {
        const ctx = await loadWednesdayContext();

        const [martySection, leoSection, jackSection, popsSection, deeboSection] = await Promise.all([
            generateMartyInspection(ctx),
            generateLeoBlockerReview(ctx),
            generateJackStuckDeals(ctx),
            generatePopsKpiCheckpoint(ctx),
            generateDeeboMidweekScan(),
        ]);

        const orgId = await getSuperUserOrgId();
        await postWednesdayCheckToInbox(orgId, [martySection, leoSection, jackSection, popsSection, deeboSection], ctx);

        return NextResponse.json({
            success: true,
            summary: {
                verdict: martySection.verdict,
                outreachThisWeek: ctx.outreachThisWeek,
                openTasks: ctx.openTasks,
                paceVsTarget: ctx.paceVsTarget,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[WeeklyWednesdayCheck] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
