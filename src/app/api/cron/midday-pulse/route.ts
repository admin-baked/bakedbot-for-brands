/**
 * Midday Pulse Cron
 *
 * Runs daily at 12 PM EST (5 PM UTC) on weekdays.
 * Posts a midday briefing to the Daily Briefing inbox thread with:
 *   - Remaining meetings for today (afternoon agenda)
 *   - Emails received since this morning
 *   - Pending review items (outreach drafts, blog drafts)
 *   - Leo: task progress check (what's moved since morning)
 *   - Jack: pipeline movement (deals, outreach, proposals)
 *   - Glenda: content/campaign momentum
 *
 * Cloud Scheduler:
 *   Name:     midday-pulse
 *   Schedule: 0 17 * * 1-5    (12 PM EST = 5 PM UTC, weekdays)
 *   URL:      /api/cron/midday-pulse
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret, getSuperUserOrgId } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { generateDayPulse, postPulseToInbox } from '@/server/services/morning-briefing';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Executive Movement Check — Leo, Jack, Glenda midday progress
// ---------------------------------------------------------------------------

interface MovementNote {
    agent: 'leo' | 'jack' | 'glenda';
    note: string;
}

async function generateExecutiveMovementNotes(dateStr: string): Promise<MovementNote[]> {
    const db = getAdminFirestore();
    // 8 AM EST as UTC: EST = UTC-5, so 8 AM EST = 13:00 UTC
    const now8amEst = new Date();
    now8amEst.setUTCHours(13, 0, 0, 0);
    const morningCutoff = now8amEst > new Date() ? new Date(now8amEst.getTime() - 86400000) : now8amEst;

    const [outreachSnap, taskProgressSnap, campaignSnap] = await Promise.allSettled([
        db.collection('ny_outreach_log')
            .where('sentAt', '>=', morningCutoff)
            .count().get(),
        db.collection('agent_tasks')
            .where('status', '==', 'completed')
            .where('updatedAt', '>=', morningCutoff)
            .count().get(),
        db.collection('campaigns')
            .where('status', '==', 'active')
            .count().get(),
    ]);

    const outreachSinceMorning = outreachSnap.status === 'fulfilled' ? outreachSnap.value.data().count : 0;
    const tasksDone = taskProgressSnap.status === 'fulfilled' ? taskProgressSnap.value.data().count : 0;
    const activeCampaigns = campaignSnap.status === 'fulfilled' ? campaignSnap.value.data().count : 0;

    const prompt = `Three executives checking in at midday ${dateStr}. Each gives ONE sentence.
Leo (COO): ${tasksDone} tasks completed since morning. What's the single most important thing to unblock this afternoon?
Jack (CRO): ${outreachSinceMorning} new outreach contacts sent this morning. What's the afternoon pipeline focus?
Glenda (CMO): ${activeCampaigns} active campaigns running. What's the one content or campaign action to push this afternoon?

Format as:
LEO: [single sentence]
JACK: [single sentence]
GLENDA: [single sentence]

Be specific, direct, no fluff. Under 20 words each.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 200,
            caller: 'midday-pulse/exec-movement',
        });

        const notes: MovementNote[] = [];
        const leoMatch = text.match(/LEO:\s*(.+)/i);
        const jackMatch = text.match(/JACK:\s*(.+)/i);
        const glendaMatch = text.match(/GLENDA:\s*(.+)/i);

        if (leoMatch?.[1]) notes.push({ agent: 'leo', note: leoMatch[1].trim() });
        if (jackMatch?.[1]) notes.push({ agent: 'jack', note: jackMatch[1].trim() });
        if (glendaMatch?.[1]) notes.push({ agent: 'glenda', note: glendaMatch[1].trim() });

        if (notes.length === 0) {
            // Fallback if parsing failed
            notes.push({ agent: 'leo', note: `${tasksDone} tasks completed this morning — confirm afternoon priorities are clear` });
            notes.push({ agent: 'jack', note: `${outreachSinceMorning} outreach sent — follow up on any warm replies before EOD` });
            notes.push({ agent: 'glenda', note: `${activeCampaigns} campaigns active — check engagement and optimize top performer` });
        }
        return notes;
    } catch {
        return [
            { agent: 'leo', note: `${tasksDone} tasks completed this morning — keep momentum through afternoon` },
            { agent: 'jack', note: `${outreachSinceMorning} outreach sent today — prioritize follow-up on warm responses` },
            { agent: 'glenda', note: `${activeCampaigns} active campaigns — push one content piece before EOD` },
        ];
    }
}

async function appendMovementNotesToThread(orgId: string, notes: MovementNote[], dateStr: string) {
    const db = getAdminFirestore();
    const threadsSnap = await db.collection('inbox_threads')
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    if (threadsSnap.empty) return; // Thread created by morning-briefing — skip if not yet created

    const threadId = threadsSnap.docs[0].id;
    const now = new Date();

    const notesText = notes.map(n => `**${n.agent.toUpperCase()}:** ${n.note}`).join('\n');
    const body = `**Midday Movement Check — ${dateStr}**\n\n${notesText}\n\n_Leo, Jack, and Glenda checked in on afternoon priorities._`;

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: body,
        agentId: 'leo',
        createdAt: now,
        metadata: { source: 'midday-pulse-movement', urgency: 'info' },
    });

    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: body.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'midday-pulse');
    if (authError) return authError;

    logger.info('[MiddayPulse] Generating midday check-in');

    try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
        });

        // Run existing pulse + executive movement check + org resolution in parallel
        const [pulse, movementNotes, orgId] = await Promise.all([
            generateDayPulse('midday'),
            generateExecutiveMovementNotes(dateStr),
            getSuperUserOrgId(),
        ]);

        // Post standard pulse, then append executive notes
        await postPulseToInbox(orgId, pulse);
        await appendMovementNotesToThread(orgId, movementNotes, dateStr).catch(err => {
            // Non-fatal — standard pulse already posted
            logger.warn('[MiddayPulse] Movement notes post failed', { error: String(err) });
        });

        logger.info('[MiddayPulse] Posted to inbox', {
            meetings: pulse.meetings?.length ?? 0,
            emailUnread: pulse.emailDigest?.unreadCount ?? 0,
            pendingMetrics: pulse.metrics.length,
            movementNotes: movementNotes.length,
        });

        return NextResponse.json({
            success: true,
            summary: {
                pulseType: 'midday',
                meetings: pulse.meetings?.length ?? 0,
                emailUnread: pulse.emailDigest?.unreadCount ?? 0,
                topEmailSubjects: pulse.emailDigest?.topEmails.slice(0, 3).map(e => e.subject) ?? [],
                pendingReview: pulse.metrics.length > 0 ? pulse.metrics[0].value : 'None',
                movementNotes: movementNotes.map(n => ({ agent: n.agent, note: n.note })),
            },
        });
    } catch (error) {
        logger.error('[MiddayPulse] Failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
