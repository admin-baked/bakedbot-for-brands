/**
 * Executive Proactive Intelligence Check
 *
 * Runs daily at 9 AM EST (2 PM UTC) on weekdays — one hour after the morning briefing.
 * Each executive agent scans their domain and posts proactive recommendations to inbox.
 *
 *   Leo (COO)   → Operational priorities, scheduling, agent coordination
 *   Jack (CRO)  → Revenue opportunities from email/calendar/market search
 *   Glenda (CMO)→ Content opportunities, trending topics, PR signals
 *
 * Cloud Scheduler:
 *   Name:     executive-proactive-check
 *   Schedule: 0 14 * * 1-5    (9 AM EST = 2 PM UTC, weekdays)
 *   URL:      /api/cron/executive-proactive-check
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getMeetingsForDay, getUpcomingMeetingsToday } from '@/server/services/calendar-digest';
import { findSuperUserUid, getEmailDigest } from '@/server/services/email-digest';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { callClaude } from '@/ai/claude';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — Claude calls + search can be slow

const PLATFORM_ORG_ID = 'bakedbot_super_admin';

// ============================================================================
// Types
// ============================================================================

interface ExecDomainBrief {
    agent: 'leo' | 'jack' | 'glenda';
    title: string;
    recommendations: string[];
    urgency: 'clean' | 'info' | 'warning' | 'critical';
}

// ============================================================================
// Context Loader — shared across all exec agents
// ============================================================================

async function loadExecutiveContext() {
    const now = new Date();
    const estHour = parseInt(
        now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false })
    );

    const [meetingsResult, emailResult] = await Promise.allSettled([
        estHour >= 12 ? getUpcomingMeetingsToday() : getMeetingsForDay(now),
        (async () => {
            const uid = await findSuperUserUid();
            if (!uid) return null;
            const sinceMs = Date.now() - 8 * 60 * 60 * 1000; // last 8h
            return getEmailDigest(uid, sinceMs, 10);
        })(),
    ]);

    const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
    const emailDigest = emailResult.status === 'fulfilled' ? emailResult.value : null;

    return { meetings, emailDigest, dateStr: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' }) };
}

// ============================================================================
// Domain Brief Generators — one per exec agent
// ============================================================================

async function generateLeoBrief(ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    const meetingList = ctx.meetings.length > 0
        ? ctx.meetings.map(m => `- ${m.startTime} ${m.title}${m.attendee ? ` (with ${m.attendee})` : ''}`).join('\n')
        : '- No meetings scheduled';

    const emailSummary = ctx.emailDigest
        ? `${ctx.emailDigest.unreadCount} unread emails. Top: ${ctx.emailDigest.topEmails.slice(0, 3).map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ')}`
        : 'Gmail not connected';

    const userMessage = `You are Leo, COO of BakedBot. Today is ${ctx.dateStr}.

CALENDAR:
${meetingList}

EMAIL INBOX:
${emailSummary}

Generate 3-5 proactive operational priorities for today. Be specific and actionable.
Focus on: scheduling gaps, meeting prep needed, agent coordination, workflow bottlenecks.
Format as bullet points. Keep each under 20 words. No fluff.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage,
            maxTokens: 400,
        });

        const recommendations = text.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).map((l: string) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

        return {
            agent: 'leo',
            title: "Leo's Operational Priorities",
            recommendations: recommendations.length > 0 ? recommendations : ['Review today\'s calendar for scheduling conflicts', 'Check agent queue for pending tasks'],
            urgency: ctx.meetings.length > 3 ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'leo',
            title: "Leo's Operational Priorities",
            recommendations: [`${ctx.meetings.length} meetings today — review calendar for prep needs`, emailSummary],
            urgency: 'info',
        };
    }
}

async function generateJackBrief(ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    // Search for NY cannabis opportunities
    let searchSummary = '';
    try {
        const results = await searchWeb('NY cannabis dispensary new licenses partnerships 2026');
        searchSummary = (await formatSearchResults(results)).slice(0, 500);
    } catch { /* non-fatal */ }

    const emailLeads = ctx.emailDigest?.topEmails.filter((e: { subject: string; from: string }) =>
        /partner|collab|proposal|inquiry|interested|brand|dispensary/i.test(e.subject + e.from)
    ) ?? [];

    const salesMeetings = ctx.meetings.filter(m =>
        /demo|discovery|call|meeting|sync/i.test(m.title)
    );

    const userMessage = `You are Jack, CRO of BakedBot. Today is ${ctx.dateStr}.

SALES MEETINGS TODAY: ${salesMeetings.length > 0 ? salesMeetings.map(m => `${m.startTime} ${m.title}`).join(', ') : 'None'}

POTENTIAL LEAD EMAILS: ${emailLeads.length > 0 ? emailLeads.map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ') : 'None flagged'}

MARKET INTEL: ${searchSummary || 'No recent intel'}

Generate 3-4 revenue action items for today. Be specific: who to contact, what deal to push, what opportunity to capture.
Format as bullet points. Under 20 words each. No fluff.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage,
            maxTokens: 400,
        });

        const recommendations = text.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).map((l: string) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

        return {
            agent: 'jack',
            title: "Jack's Revenue Opportunities",
            recommendations: recommendations.length > 0 ? recommendations : ['Review CRM for deals stalled in negotiation stage', 'Follow up on NY dispensary leads from last week'],
            urgency: emailLeads.length > 0 ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'jack',
            title: "Jack's Revenue Opportunities",
            recommendations: [
                emailLeads.length > 0 ? `${emailLeads.length} potential lead email(s) in inbox — review and qualify` : 'Run CRM search for warm prospects to contact today',
                salesMeetings.length > 0 ? `Prep for ${salesMeetings.length} sales meeting(s) today` : 'Identify 3 dispensaries to cold outreach this week',
            ],
            urgency: emailLeads.length > 0 ? 'warning' : 'info',
        };
    }
}

async function generateGlendaBrief(ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    let trendingSummary = '';
    try {
        const results = await searchWeb('cannabis marketing content trends social media 2026');
        trendingSummary = (await formatSearchResults(results)).slice(0, 500);
    } catch { /* non-fatal */ }

    const prEmails = ctx.emailDigest?.topEmails.filter((e: { subject: string; from: string }) =>
        /press|media|journalist|interview|feature|podcast|sponsor|event|summit/i.test(e.subject + e.from)
    ) ?? [];

    const userMessage = `You are Glenda, CMO of BakedBot. Today is ${ctx.dateStr}.

PR/MEDIA EMAILS: ${prEmails.length > 0 ? prEmails.map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ') : 'None flagged'}

TRENDING CANNABIS MARKETING: ${trendingSummary || 'No recent trends data'}

Generate 3-4 proactive marketing action items for today. Focus on: content to create, PR to respond to, campaigns to launch, trends to capitalize on.
Format as bullet points. Under 20 words each. No fluff.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage,
            maxTokens: 400,
        });

        const recommendations = text.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).map((l: string) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

        return {
            agent: 'glenda',
            title: "Glenda's Marketing Opportunities",
            recommendations: recommendations.length > 0 ? recommendations : ['Publish 1 industry thought-leadership blog post this week', 'Check social engagement metrics and schedule 3 posts'],
            urgency: prEmails.length > 0 ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'glenda',
            title: "Glenda's Marketing Opportunities",
            recommendations: [
                prEmails.length > 0 ? `${prEmails.length} PR/media email(s) in inbox — respond within 24h` : 'Search for trending cannabis topics to create reactive content',
                'Review content calendar for this week and fill any gaps',
            ],
            urgency: prEmails.length > 0 ? 'warning' : 'info',
        };
    }
}

// ============================================================================
// Inbox Poster
// ============================================================================

async function postExecBriefToInbox(orgId: string, briefs: ExecDomainBrief[], ctx: Awaited<ReturnType<typeof loadExecutiveContext>>) {
    const db = getAdminFirestore();

    // Find the daily briefing thread
    const threadsSnap = await db.collection('inbox_threads')
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    if (threadsSnap.empty) {
        logger.warn('[ExecProactiveCheck] No briefing thread found for org', { orgId });
        return;
    }

    const threadId = threadsSnap.docs[0].id;
    const now = new Date();

    // Build artifact data
    const executiveRecommendations = briefs.map(b => ({
        agent: b.agent,
        title: b.title,
        items: b.recommendations,
        urgency: b.urgency,
    }));

    const artifact = {
        type: 'executive_proactive_check',
        data: {
            date: now.toISOString().split('T')[0],
            dateLabel: ctx.dateStr,
            meetings: ctx.meetings,
            emailDigest: ctx.emailDigest ?? undefined,
            executiveRecommendations,
            generatedAt: now.toISOString(),
        },
    };

    const urgencyPriority = { critical: 4, warning: 3, info: 2, clean: 1 };
    const topUrgency = briefs.reduce((top, b) =>
        (urgencyPriority[b.urgency] > urgencyPriority[top]) ? b.urgency : top,
        'clean' as 'clean' | 'info' | 'warning' | 'critical'
    );

    const bulletSummary = briefs.flatMap(b => b.recommendations.slice(0, 2)).slice(0, 6).map(r => `• ${r}`).join('\n');
    const messageBody = `**Executive Intelligence Check — ${ctx.dateStr}**\n\n${bulletSummary}\n\n_Leo, Jack, and Glenda have reviewed calendar, email, and market intel._`;

    await db.collection('inbox_threads').doc(threadId).collection('messages').add({
        role: 'assistant',
        content: messageBody,
        agentId: 'leo',
        artifact,
        createdAt: now,
        metadata: {
            source: 'executive-proactive-check',
            urgency: topUrgency,
        },
    });

    // Update thread preview
    await db.collection('inbox_threads').doc(threadId).update({
        lastMessage: messageBody.slice(0, 120),
        lastMessageAt: now,
        updatedAt: now,
    });

    logger.info('[ExecProactiveCheck] Posted to inbox', { orgId, threadId, briefs: briefs.length });
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'executive-proactive-check');
    if (authError) return authError;

    logger.info('[ExecProactiveCheck] Starting executive intelligence check');

    try {
        // Load shared context (calendar + email)
        const ctx = await loadExecutiveContext();
        logger.info('[ExecProactiveCheck] Context loaded', {
            meetings: ctx.meetings.length,
            emailUnread: ctx.emailDigest?.unreadCount ?? 0,
        });

        // Generate domain briefs in parallel (with independent search queries)
        const [leoBrief, jackBrief, glendaBrief] = await Promise.all([
            generateLeoBrief(ctx),
            generateJackBrief(ctx),
            generateGlendaBrief(ctx),
        ]);

        // Post consolidated brief to inbox
        await postExecBriefToInbox(PLATFORM_ORG_ID, [leoBrief, jackBrief, glendaBrief], ctx);

        logger.info('[ExecProactiveCheck] Completed', {
            leo: leoBrief.recommendations.length,
            jack: jackBrief.recommendations.length,
            glenda: glendaBrief.recommendations.length,
        });

        return NextResponse.json({
            success: true,
            summary: {
                meetings: ctx.meetings.length,
                emailUnread: ctx.emailDigest?.unreadCount ?? 0,
                leoItems: leoBrief.recommendations.length,
                jackItems: jackBrief.recommendations.length,
                glendaItems: glendaBrief.recommendations.length,
            },
        });
    } catch (error) {
        logger.error('[ExecProactiveCheck] Failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
