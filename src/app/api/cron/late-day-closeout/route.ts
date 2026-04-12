/**
 * Late-Day Closeout Cron
 *
 * Runs daily at 6 PM EST (11 PM UTC) on weekdays.
 * Leo, Felisha, Pops, and OpenClaw close out the operational day:
 *   - Leo:      What moved today, what's still blocked
 *   - Felisha:  Capture action items, update open loops
 *   - Pops:     End-of-day KPI snapshot
 *   - OpenClaw: Queue follow-ups and tomorrow's prep tasks
 *
 * Cloud Scheduler:
 *   Name:     late-day-closeout
 *   Schedule: 0 23 * * 1-5      (6 PM EST = 11 PM UTC, weekdays)
 *   URL:      /api/cron/late-day-closeout
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, getSuperUserOrgId, parseBullets, topUrgency } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { EXEC_CONTEXT_CACHE_DOC } from '@/app/api/cron/executive-context-prewarm/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 240;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloseoutSection {
    agent: 'leo' | 'felisha' | 'pops' | 'openclaw';
    title: string;
    items: string[];
    urgency: 'clean' | 'info' | 'warning' | 'critical';
}

// ---------------------------------------------------------------------------
// Org resolver
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Context — reuse pre-warmed exec context if available
// ---------------------------------------------------------------------------

async function loadCloseoutContext() {
    const db = getAdminFirestore();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });

    // Pull today's agent telemetry for task completion counts
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [telemetrySnap, pendingTasksSnap, cacheDoc] = await Promise.allSettled([
        db.collection('agent_telemetry')
            .where('createdAt', '>=', todayStart)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get(),
        db.collection('agent_tasks')
            .where('status', 'in', ['pending', 'in_progress'])
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get(),
        db.collection('platform_cache').doc(EXEC_CONTEXT_CACHE_DOC).get(),
    ]);

    const telemetry = telemetrySnap.status === 'fulfilled'
        ? telemetrySnap.value.docs.map(d => d.data())
        : [];

    const pendingTasks = pendingTasksSnap.status === 'fulfilled'
        ? pendingTasksSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
        : [];

    // Count completions and errors from telemetry
    const completedCount = telemetry.filter(t => t.status === 'completed' || t.outcome === 'success').length;
    const errorCount = telemetry.filter(t => t.status === 'error' || t.outcome === 'error').length;
    const agentActivity = telemetry.reduce((acc: Record<string, number>, t) => {
        const agent = t.agentId || t.agent || 'unknown';
        acc[agent] = (acc[agent] || 0) + 1;
        return acc;
    }, {});

    // Pull cached email data from pre-warm
    let emailSummary = 'Email digest not available';
    if (cacheDoc.status === 'fulfilled' && cacheDoc.value.exists) {
        const data = cacheDoc.value.data()!;
        const digest = data.emailDigest as { unreadCount?: number; topEmails?: Array<{ subject: string }> } | null;
        if (digest?.unreadCount !== undefined) {
            emailSummary = `${digest.unreadCount} unread today. Top subjects: ${(digest.topEmails ?? []).slice(0, 3).map(e => `"${e.subject}"`).join(', ')}`;
        }
    }

    return { dateStr, completedCount, errorCount, agentActivity, pendingTasks, emailSummary };
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateLeoCloseout(ctx: Awaited<ReturnType<typeof loadCloseoutContext>>): Promise<CloseoutSection> {
    const pendingList = ctx.pendingTasks.slice(0, 5).map((t: Record<string, unknown>) =>
        `- ${t.title || t.description || t.id} (${t.status || 'open'})`
    ).join('\n') || '- No open tasks in tracker';

    const activityList = Object.entries(ctx.agentActivity)
        .map(([agent, count]) => `${agent}: ${count} actions`).join(', ') || 'No agent activity logged';

    const prompt = `You are Leo, COO of BakedBot. It is end of day ${ctx.dateStr}.

TODAY'S ACTIVITY:
- Actions completed: ${ctx.completedCount}
- Errors/failures: ${ctx.errorCount}
- Agent activity: ${activityList}

OPEN TASKS (still pending):
${pendingList}

EMAIL TODAY: ${ctx.emailSummary}

Generate 3-4 concise end-of-day operational notes. For each:
1. What moved today (be specific if you have data)
2. What's still blocked and needs tomorrow's attention
3. Any handoffs or dependencies to flag

Format as bullet points. Under 25 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 350,
            caller: 'late-day-closeout/leo',
        });
        const items = parseBullets(text);
        return {
            agent: 'leo',
            title: "Leo's Day Close",
            items: items.length > 0 ? items : ['Review open tasks for tomorrow prioritization', `${ctx.pendingTasks.length} tasks still open — assign owners before EOD`],
            urgency: ctx.errorCount > 3 ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'leo',
            title: "Leo's Day Close",
            items: [`${ctx.completedCount} actions completed today`, `${ctx.pendingTasks.length} tasks still open`, ctx.errorCount > 0 ? `${ctx.errorCount} errors need review` : 'No critical errors'],
            urgency: ctx.errorCount > 0 ? 'warning' : 'clean',
        };
    }
}

async function generateFelishaCloseout(ctx: Awaited<ReturnType<typeof loadCloseoutContext>>): Promise<CloseoutSection> {
    const pendingList = ctx.pendingTasks.slice(0, 8).map((t: Record<string, unknown>) => {
        const owner = t.assignedTo || t.owner || 'unassigned';
        const deadline = t.deadline || t.dueDate || 'no deadline';
        return `- ${t.title || t.id}: owner=${owner}, deadline=${deadline}`;
    }).join('\n') || '- No open tasks';

    const prompt = `You are Felisha, Operations Coordinator for BakedBot. End of day ${ctx.dateStr}.

OPEN TASK TRACKER (${ctx.pendingTasks.length} open items):
${pendingList}

Your job: surface the top action items that need owner assignment or deadlines.
Generate 3-4 action tracking notes:
1. Tasks missing owners (flag specifically)
2. Tasks past due or at risk
3. Follow-ups to queue for tomorrow
4. Any loops that closed today worth logging

Be specific. Format as bullet points, under 25 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 300,
            caller: 'late-day-closeout/felisha',
        });
        const items = parseBullets(text);
        return {
            agent: 'felisha',
            title: "Felisha's Action Tracker",
            items: items.length > 0 ? items : ['Update task owners for all open items before tomorrow morning', 'Log any decisions made today into the tracker'],
            urgency: ctx.pendingTasks.some((t: Record<string, unknown>) => !t.assignedTo && !t.owner) ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'felisha',
            title: "Felisha's Action Tracker",
            items: [`${ctx.pendingTasks.length} open tasks — verify each has an owner and deadline`, 'Queue follow-up reminders for tomorrow morning'],
            urgency: 'info',
        };
    }
}

async function generatePopsCloseout(ctx: Awaited<ReturnType<typeof loadCloseoutContext>>): Promise<CloseoutSection> {
    const db = getAdminFirestore();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Pull today's org/customer signals
    const [newCustomersSnap, activeOrgsSnap] = await Promise.allSettled([
        db.collection('customers')
            .where('createdAt', '>=', todayStart)
            .count().get(),
        db.collection('organizations')
            .where('status', '==', 'active')
            .count().get(),
    ]);

    const newCustomers = newCustomersSnap.status === 'fulfilled' ? newCustomersSnap.value.data().count : null;
    const activeOrgs = activeOrgsSnap.status === 'fulfilled' ? activeOrgsSnap.value.data().count : null;

    const items: string[] = [];

    if (newCustomers !== null) items.push(`New customers captured today: ${newCustomers}`);
    if (activeOrgs !== null) items.push(`Active organizations: ${activeOrgs}`);
    items.push(`Agent actions completed: ${ctx.completedCount}`);
    if (ctx.errorCount > 0) items.push(`System errors today: ${ctx.errorCount} — review agent_telemetry`);

    return {
        agent: 'pops',
        title: "Pops' End-of-Day KPI Snapshot",
        items: items.length > 0 ? items : ['KPI snapshot: no data sources available yet — check instrumentation'],
        urgency: ctx.errorCount > 5 ? 'warning' : 'clean',
    };
}

async function generateOpenClawCloseout(ctx: Awaited<ReturnType<typeof loadCloseoutContext>>): Promise<CloseoutSection> {
    const prompt = `You are OpenClaw, the autonomous execution agent for BakedBot. End of day ${ctx.dateStr}.

TODAY'S SUMMARY:
- ${ctx.completedCount} tasks completed by agents
- ${ctx.pendingTasks.length} tasks still open
- ${ctx.errorCount} errors logged

Your job: queue tomorrow's follow-up tasks and prep work.
Generate 3-4 specific follow-up actions to queue for tomorrow morning:
1. Any incomplete items that should auto-retry
2. Reminders to send
3. Research or data-gathering tasks to run overnight
4. Low-risk operational tasks to execute before the team wakes up

Format as bullet points, actionable, under 25 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 300,
            caller: 'late-day-closeout/openclaw',
        });
        const items = parseBullets(text);
        return {
            agent: 'openclaw',
            title: "OpenClaw's Tomorrow Queue",
            items: items.length > 0 ? items : ['Queue morning briefing pre-warm for 7:45 AM', 'Retry any failed agent tasks from today'],
            urgency: 'info',
        };
    } catch {
        return {
            agent: 'openclaw',
            title: "OpenClaw's Tomorrow Queue",
            items: ['Queue follow-ups for any unanswered outreach from today', 'Pre-warm executive context for 7:45 AM morning scan'],
            urgency: 'info',
        };
    }
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postCloseoutToInbox(orgId: string, sections: CloseoutSection[], dateStr: string) {
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
            primaryAgent: 'leo', assignedAgents: ['leo', 'felisha', 'pops', 'openclaw'],
            artifactIds: [], messages: [],
            metadata: { isBriefingThread: true },
            createdAt: new Date(), updatedAt: new Date(), lastActivityAt: new Date(),
        });
    } else {
        threadId = threadsSnap.docs[0].id;
    }

    const now = new Date();
    const urgency = topUrgency(sections.map(s => s.urgency));

    const bulletSummary = sections
        .flatMap(s => s.items.slice(0, 2))
        .slice(0, 6)
        .map(i => `• ${i}`)
        .join('\n');

    const body = `**Late-Day Closeout — ${dateStr}**\n\n${bulletSummary}\n\n_Leo, Felisha, Pops, and OpenClaw have closed out today's operations and queued tomorrow._`;

    const artifact = {
        type: 'late_day_closeout',
        data: {
            date: now.toISOString().split('T')[0],
            dateLabel: dateStr,
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items, urgency: s.urgency })),
            generatedAt: now.toISOString(),
        },
    };

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'leo',
        artifact,
        createdAt: now,
        metadata: { source: 'late-day-closeout', urgency },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[LatedayCloseout] Posted to inbox', { orgId, threadId, sections: sections.length });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'late-day-closeout');
    if (authError) return authError;

    logger.info('[LatedayCloseout] Starting late-day closeout');

    try {
        const ctx = await loadCloseoutContext();

        const [leoSection, felishaSection, popsSection, openclawSection] = await Promise.all([
            generateLeoCloseout(ctx),
            generateFelishaCloseout(ctx),
            generatePopsCloseout(ctx),
            generateOpenClawCloseout(ctx),
        ]);

        const orgId = await getSuperUserOrgId();
        await postCloseoutToInbox(orgId, [leoSection, felishaSection, popsSection, openclawSection], ctx.dateStr);

        return NextResponse.json({
            success: true,
            summary: {
                completedToday: ctx.completedCount,
                openTasks: ctx.pendingTasks.length,
                errors: ctx.errorCount,
                sections: 4,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[LatedayCloseout] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
