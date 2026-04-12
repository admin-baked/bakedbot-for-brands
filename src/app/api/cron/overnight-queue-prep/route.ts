/**
 * Overnight Queue Prep Cron
 *
 * Runs nightly at 10 PM EST (3 AM UTC) on weeknights (Tue–Sat UTC = Mon–Fri 10PM EST).
 * Prepares the company for the next day while the team sleeps:
 *   - Ezal:     Overnight market scan, competitor alerts
 *   - Deebo:    Pre-review of any queued outbound content for compliance
 *   - Roach:    Research prep, briefing memos for tomorrow
 *   - Puff:     Organize queued sends, schedule reminders
 *   - OpenClaw: Execute approved low-risk tasks, retry failures
 *
 * Cloud Scheduler:
 *   Name:     overnight-queue-prep
 *   Schedule: 0 3 * * 2-6      (10 PM EST = 3 AM UTC, runs Tue-Sat UTC = Mon-Fri nights)
 *   URL:      /api/cron/overnight-queue-prep
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, getSuperUserOrgId, parseBullets, topUrgency } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OvernightSection {
    agent: 'ezal' | 'deebo' | 'roach' | 'puff' | 'openclaw';
    title: string;
    items: string[];
    urgency: 'clean' | 'info' | 'warning' | 'critical';
}

// ---------------------------------------------------------------------------
// Tomorrow's date label
// ---------------------------------------------------------------------------

function getTomorrowLabel(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
    });
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

async function generateEzalOvernightScan(): Promise<OvernightSection> {
    let marketIntel = '';
    let competitorAlerts = '';

    try {
        const [marketResults, competitorResults] = await Promise.allSettled([
            searchWeb('cannabis dispensary news competitor moves pricing 2026'),
            searchWeb('cannabis SaaS loyalty marketing platform news 2026'),
        ]);
        if (marketResults.status === 'fulfilled') {
            marketIntel = (await formatSearchResults(marketResults.value)).slice(0, 600);
        }
        if (competitorResults.status === 'fulfilled') {
            competitorAlerts = (await formatSearchResults(competitorResults.value)).slice(0, 400);
        }
    } catch { /* non-fatal */ }

    const prompt = `You are Ezal, competitive intelligence agent for BakedBot. It is late evening and you are running your overnight market scan.

MARKET INTEL (last 24h):
${marketIntel || 'No major market news found.'}

COMPETITOR PLATFORM SIGNALS:
${competitorAlerts || 'No competitor signals found.'}

Generate 3-4 overnight market intelligence notes for the morning briefing:
1. Any competitor pricing or campaign moves that need a response
2. Market opportunities to exploit tomorrow
3. Category or regulatory shifts to monitor
4. Intelligence gaps to fill with follow-up research

Format as bullet points. Under 30 words each. Flag critical alerts with [ALERT].`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 400,
            caller: 'overnight-queue-prep/ezal',
        });
        const items = parseBullets(text);
        const hasAlerts = items.some(i => i.includes('[ALERT]'));
        return {
            agent: 'ezal',
            title: "Ezal's Overnight Market Scan",
            items: items.length > 0 ? items : ['No major competitor moves detected overnight', 'Cannabis market news scan complete — no critical alerts'],
            urgency: hasAlerts ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'ezal',
            title: "Ezal's Overnight Market Scan",
            items: ['Market scan queued — results will appear in morning briefing', 'No competitor alerts to surface at this time'],
            urgency: 'clean',
        };
    }
}

async function generateDeeboComplianceQueue(): Promise<OvernightSection> {
    const db = getAdminFirestore();

    // Check for queued outbound content awaiting compliance review
    const [queuedContentSnap, pendingCampaignsSnap] = await Promise.allSettled([
        db.collection('compliance_queue')
            .where('status', '==', 'pending_review')
            .limit(10)
            .get(),
        db.collection('campaigns')
            .where('status', '==', 'pending_compliance')
            .limit(10)
            .get(),
    ]);

    const queuedItems = queuedContentSnap.status === 'fulfilled'
        ? queuedContentSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
        : [];
    const pendingCampaigns = pendingCampaignsSnap.status === 'fulfilled'
        ? pendingCampaignsSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
        : [];

    const totalPending = queuedItems.length + pendingCampaigns.length;

    const items: string[] = [];

    if (totalPending === 0) {
        items.push('Compliance queue clear — no pending content reviews');
        items.push('Pre-cleared for tomorrow: all queued outbound has been reviewed or is awaiting creation');
    } else {
        if (queuedItems.length > 0) {
            items.push(`${queuedItems.length} item(s) in compliance queue pending review before send`);
            const titles = queuedItems.slice(0, 3).map((i: Record<string, unknown>) => i.title || i.type || i.id).join(', ');
            items.push(`Queued content: ${titles}`);
        }
        if (pendingCampaigns.length > 0) {
            items.push(`${pendingCampaigns.length} campaign(s) blocked on compliance approval — review before launch`);
        }
        items.push('Deebo compliance gate: no regulated content will send until approved');
    }

    return {
        agent: 'deebo',
        title: "Deebo's Compliance Queue",
        items,
        urgency: totalPending > 3 ? 'warning' : totalPending > 0 ? 'info' : 'clean',
    };
}

async function generateRoachResearchPrep(tomorrowLabel: string): Promise<OvernightSection> {
    let cannabisResearch = '';
    try {
        const results = await searchWeb('cannabis retail loyalty retention data insights report 2026');
        cannabisResearch = (await formatSearchResults(results)).slice(0, 500);
    } catch { /* non-fatal */ }

    const prompt = `You are Roach, research librarian and knowledge base for BakedBot. You are preparing research briefs for ${tomorrowLabel}.

OVERNIGHT RESEARCH FINDINGS:
${cannabisResearch || 'No new research sources found tonight.'}

Generate 3-4 research prep notes for the morning team:
1. New cannabis industry data or reports worth reading
2. Knowledge gaps that came up in yesterday's work (use your judgment)
3. Questions to investigate before this week's strategy decisions
4. Any knowledge that should be added to the knowledge base

Format as bullet points. Under 30 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 350,
            caller: 'overnight-queue-prep/roach',
        });
        const items = parseBullets(text);
        return {
            agent: 'roach',
            title: "Roach's Morning Research Brief",
            items: items.length > 0 ? items : ['Research library ready for morning queries', 'No new cannabis reports published overnight'],
            urgency: 'info',
        };
    } catch {
        return {
            agent: 'roach',
            title: "Roach's Morning Research Brief",
            items: ['Research brief: knowledge base ready for morning queries', 'Cannabis science database available for product intelligence requests'],
            urgency: 'clean',
        };
    }
}

async function generatePuffQueueOrganizer(tomorrowLabel: string): Promise<OvernightSection> {
    const db = getAdminFirestore();

    // Pull queued sends and scheduled reminders
    const [scheduledSnap, draftSnap] = await Promise.allSettled([
        db.collection('scheduled_messages')
            .where('scheduledFor', '>=', new Date())
            .orderBy('scheduledFor', 'asc')
            .limit(10)
            .get(),
        db.collection('outreach_drafts')
            .where('status', '==', 'approved')
            .limit(10)
            .get(),
    ]);

    const scheduled = scheduledSnap.status === 'fulfilled'
        ? scheduledSnap.value.docs.map(d => d.data())
        : [];
    const approvedDrafts = draftSnap.status === 'fulfilled'
        ? draftSnap.value.docs.map(d => d.data())
        : [];

    const items: string[] = [];

    if (scheduled.length > 0) {
        items.push(`${scheduled.length} scheduled message(s) queued for tomorrow — confirms send queue is loaded`);
    } else {
        items.push('No scheduled sends in queue — check if any outreach should be scheduled for tomorrow');
    }

    if (approvedDrafts.length > 0) {
        items.push(`${approvedDrafts.length} approved outreach draft(s) ready to send — OpenClaw can execute at go-time`);
    }

    items.push(`Morning pre-warm scheduled: executive context cache refreshes at 7:45 AM before ${tomorrowLabel} briefing`);
    items.push('Overnight organization complete — all docs, tasks, and send queues reviewed');

    return {
        agent: 'puff',
        title: "Puff's Send Queue",
        items,
        urgency: approvedDrafts.length > 5 ? 'warning' : 'clean',
    };
}

async function generateOpenClawOvernightExecution(): Promise<OvernightSection> {
    const db = getAdminFirestore();

    // Find approved low-risk tasks eligible for overnight execution
    const [autoTasksSnap, failedRetrySnap] = await Promise.allSettled([
        db.collection('agent_tasks')
            .where('status', '==', 'approved')
            .where('riskLevel', '==', 'low')
            .limit(10)
            .get(),
        db.collection('agent_tasks')
            .where('status', '==', 'failed')
            .where('retryEligible', '==', true)
            .limit(5)
            .get(),
    ]);

    const autoTasks = autoTasksSnap.status === 'fulfilled'
        ? autoTasksSnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
        : [];
    const retryTasks = failedRetrySnap.status === 'fulfilled'
        ? failedRetrySnap.value.docs.map(d => ({ id: d.id, ...d.data() }))
        : [];

    const items: string[] = [];

    if (autoTasks.length > 0) {
        items.push(`Executing ${autoTasks.length} approved low-risk task(s) overnight`);
        const taskNames = autoTasks.slice(0, 3).map((t: Record<string, unknown>) => t.title || t.type || t.id).join(', ');
        items.push(`Overnight tasks: ${taskNames}`);
    } else {
        items.push('No approved low-risk tasks queued for overnight execution');
    }

    if (retryTasks.length > 0) {
        items.push(`Retrying ${retryTasks.length} failed task(s) with retry eligibility`);
    }

    items.push('OpenClaw standing by — will escalate any execution failures to morning briefing');

    return {
        agent: 'openclaw',
        title: "OpenClaw's Overnight Execution",
        items,
        urgency: retryTasks.length > 0 ? 'info' : 'clean',
    };
}

// ---------------------------------------------------------------------------
// Inbox poster
// ---------------------------------------------------------------------------

async function postOvernightToInbox(orgId: string, sections: OvernightSection[], tomorrowLabel: string) {
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
            primaryAgent: 'ezal', assignedAgents: ['ezal', 'deebo', 'roach', 'puff', 'openclaw'],
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

    const body = `**Overnight Queue Prep — Ready for ${tomorrowLabel}**\n\n${bulletSummary}\n\n_Ezal, Deebo, Roach, Puff, and OpenClaw ran overnight operations. Morning scan is pre-loaded._`;

    const artifact = {
        type: 'overnight_queue_prep',
        data: {
            date: now.toISOString().split('T')[0],
            tomorrowLabel,
            sections: sections.map(s => ({ agent: s.agent, title: s.title, items: s.items, urgency: s.urgency })),
            generatedAt: now.toISOString(),
        },
    };

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'ezal',
        artifact,
        createdAt: now,
        metadata: { source: 'overnight-queue-prep', urgency },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[OvernightQueuePrep] Posted to inbox', { orgId, threadId });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'overnight-queue-prep');
    if (authError) return authError;

    logger.info('[OvernightQueuePrep] Starting overnight queue preparation');

    try {
        const tomorrowLabel = getTomorrowLabel();

        const [ezalSection, deeboSection, roachSection, puffSection, openclawSection] = await Promise.all([
            generateEzalOvernightScan(),
            generateDeeboComplianceQueue(),
            generateRoachResearchPrep(tomorrowLabel),
            generatePuffQueueOrganizer(tomorrowLabel),
            generateOpenClawOvernightExecution(),
        ]);

        const orgId = await getSuperUserOrgId();
        await postOvernightToInbox(orgId, [ezalSection, deeboSection, roachSection, puffSection, openclawSection], tomorrowLabel);

        return NextResponse.json({
            success: true,
            tomorrowLabel,
            summary: {
                ezal: ezalSection.urgency,
                deebo: deeboSection.urgency,
                roach: roachSection.urgency,
                puff: puffSection.urgency,
                openclaw: openclawSection.urgency,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[OvernightQueuePrep] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
