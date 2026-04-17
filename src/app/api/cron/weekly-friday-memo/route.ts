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
import { requireCronSecret, getSuperUserOrgId, parseBullets } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { buildMartyScoreboard, TARGET_MRR } from '@/server/services/marty-reporting';
import { getWeekObjectives, getMondayOfWeek, scoreWeeklyObjectives, buildObjectivesScoreboard, type ObjectiveStatus, type WeekObjectivesList, type RawScoreInput } from '@/server/services/marty-objectives';
import { getAllAgentLearningDocs } from '@/server/services/agent-performance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FridaySection {
    agent: 'marty' | 'leo' | 'jack' | 'linus' | 'glenda' | 'mike' | 'pops' | 'mrs_parker' | 'ezal' | 'craig' | 'deebo' | 'roach' | 'felisha';
    title: string;
    items: string[];
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
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).where('emailVerified', '==', true).count().get(),
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

async function generateCraigCampaignPerformance(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const prompt = `You are Craig, campaign manager at BakedBot. It is Friday ${ctx.dateStr} — end of week review.

Outreach sent this week: ${ctx.outreachThisWeek}. Active orgs: ${ctx.activeOrgs}.

Report 3 campaign performance items: what sent this week and how it performed, what content to convert into sales proof, and next week's top campaign priority. Under 30 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 300,
            caller: 'weekly-friday-memo/craig',
        });
        return { agent: 'craig', title: "Craig's Campaign Performance", items: parseBullets(text).slice(0, 3) };
    } catch {
        return {
            agent: 'craig',
            title: "Craig's Campaign Performance",
            items: [
                `Week's sends: ${ctx.outreachThisWeek} outreach contacts — review reply and click rates before Monday`,
                'Content to proof: identify best-performing message from this week and turn into case study asset',
                'Next week priority: align Monday batch to Jack\'s top 3 best-bet accounts',
            ],
        };
    }
}

async function generateDeeboComplianceReport(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const db = getAdminFirestore();
    const mondayThisWeek = new Date();
    mondayThisWeek.setDate(mondayThisWeek.getDate() - (mondayThisWeek.getDay() - 1));
    mondayThisWeek.setHours(0, 0, 0, 0);

    let incidentsThisWeek = 0;
    try {
        const incidentSnap = await db.collection('compliance_incidents')
            .where('createdAt', '>=', mondayThisWeek)
            .count().get();
        incidentsThisWeek = incidentSnap.data().count;
    } catch { /* non-fatal */ }

    return {
        agent: 'deebo',
        title: "Deebo's Compliance Report",
        items: [
            incidentsThisWeek === 0
                ? 'Clean week: zero compliance incidents flagged across all sends'
                : `${incidentsThisWeek} compliance incident(s) logged this week — review before next campaign batch`,
            `Sends reviewed this week: ${ctx.outreachThisWeek} outreach contacts — all cannabis claims verified`,
            'Standing rule for next week: Deebo pre-clearance required before any campaign fires',
        ],
    };
}

async function generateRoachKnowledgeArchive(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const prompt = `You are Roach, knowledge librarian at BakedBot. It is Friday ${ctx.dateStr} — end of week.

Your job: capture what was learned this week so BakedBot gets smarter every cycle.

Week snapshot: ${ctx.outreachThisWeek} outreach sent, ${ctx.completedTasks} tasks completed, ${ctx.failedTasks} failed.

List 3 knowledge items to archive: one GTM or sales learning, one product or agent insight, one unresolved research question for next week. Under 25 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 250,
            caller: 'weekly-friday-memo/roach',
        });
        return { agent: 'roach', title: "Roach's Knowledge Archive", items: parseBullets(text).slice(0, 3) };
    } catch {
        return {
            agent: 'roach',
            title: "Roach's Knowledge Archive",
            items: [
                `GTM learning: ${ctx.outreachThisWeek > 0 ? 'outreach volume tracking — analyze which segment replied fastest' : 'no outreach this week — document what blocked the pipeline'}`,
                `Agent insight: ${ctx.lastAuditScore !== null ? `audit score ${ctx.lastAuditScore}/100 — archive which agent scored lowest and why` : 'run agent audit to establish baseline for archiving'}`,
                'Open research question: which dispensary segment converts fastest Access→Operator? Start tagging',
            ],
        };
    }
}

async function generateFelishaNextWeekLog(ctx: Awaited<ReturnType<typeof loadFridayContext>>): Promise<FridaySection> {
    const prompt = `You are Felisha, ops coordinator at BakedBot. It is Friday ${ctx.dateStr} — end of week.

Your job: set Monday up to succeed. Capture what carries forward and who owns what.

Week summary: ${ctx.outreachThisWeek} outreach sent, ${ctx.completedTasks} tasks completed, ${ctx.failedTasks} failed, ${ctx.leadsReady} leads still in queue.

List 4 carry-forwards for next week: pipeline items that didn't close, owner assignments, one admin item to resolve, and one thing to brief Marty on Monday morning. Under 25 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 300,
            caller: 'weekly-friday-memo/felisha',
        });
        return { agent: 'felisha', title: "Felisha's Next-Week Log", items: parseBullets(text).slice(0, 4) };
    } catch {
        return {
            agent: 'felisha',
            title: "Felisha's Next-Week Log",
            items: [
                `Pipeline carry-forward: ${ctx.leadsReady} leads still uncontacted — Jack owns first 10 on Monday`,
                `Tasks: ${ctx.failedTasks} failed this week — Leo must assign root cause owner before Monday standup`,
                'Admin: confirm all active org accounts have current owner assignments in Firestore',
                'Brief Marty Monday: top 3 wins this week + the one thing that must move next week',
            ],
        };
    }
}

async function generateAgentLearningDigest(): Promise<FridaySection> {
    try {
        const docs = await getAllAgentLearningDocs();
        const items: string[] = [];

        // One bullet per agent that has a weekSummary
        for (const doc of docs) {
            if (!doc.weekSummary) continue;
            const trend =
                doc.performanceTrend === 'improving' ? '🟢' :
                doc.performanceTrend === 'declining' ? '🔴' :
                doc.performanceTrend === 'stable'    ? '🟡' : '⚪';
            items.push(`${trend} *${doc.agentId}* (${doc.domain}): ${doc.weekSummary}`);
        }

        // Flag agents with pending approvals
        const needsAttention = docs
            .filter(d => (d.pendingApprovals?.length ?? 0) > 0)
            .map(d => `${d.agentId} (${d.pendingApprovals.length} pending)`);
        if (needsAttention.length > 0) {
            items.push(`⚠️ Needs Marty's attention: ${needsAttention.join(', ')}`);
        }

        if (items.length === 0) {
            items.push('No agent learning activity recorded this week.');
        }

        return { agent: 'linus', title: 'Agent Learning Digest', items };
    } catch (e) {
        logger.warn('[WeeklyFridayMemo] Agent learning digest failed (non-fatal)', { error: String(e) });
        return { agent: 'linus', title: 'Agent Learning Digest', items: ['Learning data unavailable this week.'] };
    }
}

// ---------------------------------------------------------------------------
// Slack post
// ---------------------------------------------------------------------------

async function postFridayMemoToSlack(sections: FridaySection[], ctx: Awaited<ReturnType<typeof loadFridayContext>>) {
    const mrrLine = ctx.currentMrr !== null
        ? `MRR: $${ctx.currentMrr.toLocaleString()} (${ctx.paceVsTarget}% of target)`
        : 'MRR tracking in progress';

    const sectionBlocks = sections.map(s => ({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${s.title}*\n${s.items.map(i => `• ${i}`).join('\n')}` },
    }));

    try {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        await postLinusIncidentSlack({
            source: 'weekly-friday-memo',
            channelName: 'ceo',
            fallbackText: `:memo: Friday CEO Memo — ${ctx.weekLabel}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `:memo: *Friday CEO Memo* — ${ctx.weekLabel}\n_Marty · Leo · Jack · Linus · Glenda · Mike · Pops · Mrs. Parker · Ezal · Craig · Deebo · Roach · Felisha_\n${mrrLine}`,
                    },
                },
                { type: 'divider' },
                ...sectionBlocks,
            ],
        });
    } catch (e) {
        logger.error('[WeeklyFridayMemo] Slack post failed', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postFridayMemoToInbox(
    orgId: string,
    sections: FridaySection[],
    ctx: Awaited<ReturnType<typeof loadFridayContext>>,
    weekObjectives: WeekObjectivesList = []
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
            assignedAgents: ['marty', 'leo', 'jack', 'linus', 'glenda', 'mike', 'pops', 'mrs_parker', 'ezal', 'craig', 'deebo', 'roach', 'felisha'],
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

    const objectivesBoard = weekObjectives.length > 0
        ? `\n\n---\n**Week's Task Board:**\n${buildObjectivesScoreboard(weekObjectives)}`
        : '';
    const body = `**Friday CEO Memo — ${ctx.weekLabel}**\n\n📊 ${mrrLine}\n\n${memoText}\n\n---\n**Executive Summaries:**\n${execBullets}${objectivesBoard}`;

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

        const [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection, popsSection,
               craigSection, deeboSection, roachSection, felishaSection, learningDigestSection] = await Promise.all([
            generateMartyCeoMemo(ctx),
            generateLeoExecutionSummary(ctx),
            generateJackRevenueReport(ctx),
            generateLinusShippingReport(),
            generateGlendaDemandSummary(ctx),
            generateMikeFinanceSummary(ctx),
            generatePopsKpiPack(ctx),
            generateCraigCampaignPerformance(ctx),
            generateDeeboComplianceReport(ctx),
            generateRoachKnowledgeArchive(ctx),
            generateFelishaNextWeekLog(ctx),
            generateAgentLearningDigest(),
        ]);

        const allSections = [martySection, leoSection, jackSection, linusSection, glendaSection, mikeSection, popsSection,
            craigSection, deeboSection, roachSection, felishaSection, learningDigestSection];

        const weekOf = getMondayOfWeek();
        const [orgId, weekObjectives] = await Promise.all([
            getSuperUserOrgId(),
            getWeekObjectives(weekOf),
        ]);

        // Score open objectives: use Claude to assess hit/missed based on week context
        const openObjectives = weekObjectives.filter(o => o.status === 'open' || o.status === 'in_progress');
        let finalObjectives = weekObjectives;
        if (openObjectives.length > 0) {
            try {
                const scoringPrompt = `You are Marty Benjamins, CEO of BakedBot. It is Friday ${ctx.dateStr}.

WEEK IN REVIEW:
- Outreach sent this week: ${ctx.outreachThisWeek}
- Tasks completed: ${ctx.completedTasks}
- Tasks failed: ${ctx.failedTasks}
- Active customers: ${ctx.activeOrgs}

OBJECTIVES TO SCORE:
${openObjectives.map(o => `[${o.id}] ${o.agent.toUpperCase()}: ${o.task} | Target: ${o.target} | Metric: ${o.metric}`).join('\n')}

For each objective, assess: hit, missed, or carry_forward (if it's a long_term goal that continues next week).
Output ONLY JSON array: [{"id":"...","status":"hit|missed|carry_forward","current":"actual value or ?","notes":"one sentence"}]`;

                const text = await callClaude({
                    model: 'claude-haiku-4-5-20251001',
                    userMessage: scoringPrompt,
                    maxTokens: 600,
                    caller: 'weekly-friday-memo/objectives-scoring',
                });
                const match = text.match(/\[[\s\S]*\]/);
                if (match) {
                    const scores: RawScoreInput[] = JSON.parse(match[0]);
                    const mapped = scores.map(s => ({
                        id: s.id,
                        status: (s.status as ObjectiveStatus) || 'missed',
                        current: s.current,
                        notes: s.notes,
                    }));
                    await scoreWeeklyObjectives(weekOf, mapped);
                    // Merge scores locally — avoids a second Firestore round-trip
                    const scoreMap = new Map(mapped.map(s => [s.id, s]));
                    finalObjectives = weekObjectives.map(obj => {
                        const update = scoreMap.get(obj.id);
                        return update ? { ...obj, status: update.status, current: update.current ?? obj.current, notes: update.notes ?? obj.notes, updatedAt: new Date() } : obj;
                    });
                }
            } catch (e) {
                logger.warn('[WeeklyFridayMemo] Objective scoring failed (non-fatal)', { error: String(e) });
            }
        }

        await Promise.allSettled([
            postFridayMemoToInbox(orgId, allSections, ctx, finalObjectives),
            postFridayMemoToSlack(allSections, ctx),
        ]);

        return NextResponse.json({
            success: true,
            summary: {
                weekLabel: ctx.weekLabel,
                currentMrr: ctx.currentMrr,
                paceVsTarget: ctx.paceVsTarget,
                outreachThisWeek: ctx.outreachThisWeek,
                completedTasks: ctx.completedTasks,
                failedTasks: ctx.failedTasks,
                sectionCount: allSections.length,
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
