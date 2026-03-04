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
import type { BriefingMeeting } from '@/types/inbox';
import { findSuperUserUid, getEmailDigest } from '@/server/services/email-digest';
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';
import { callClaude } from '@/ai/claude';
import { EXEC_CONTEXT_CACHE_DOC } from '@/app/api/cron/executive-context-prewarm/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — Claude calls + search can be slow

// ---------------------------------------------------------------------------
// Resolve the super-user's orgId dynamically at runtime (same logic as
// morning-briefing getActiveOrgIds).  Falls back to 'bakedbot_super_admin'
// if the users collection returns nothing.
// ---------------------------------------------------------------------------
async function getSuperUserOrgId(): Promise<string> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('users')
            .where('role', '==', 'super_user')
            .limit(1)
            .get();
        if (!snap.empty) {
            const data = snap.docs[0].data();
            const orgId = data.orgId || data.currentOrgId;
            if (orgId && typeof orgId === 'string') return orgId;
        }
    } catch { /* fall through */ }
    return 'bakedbot_super_admin';
}

// ============================================================================
// Types
// ============================================================================

interface ExecDomainBrief {
    agent: 'leo' | 'jack' | 'glenda' | 'linus' | 'mike' | 'mrs_parker';
    title: string;
    recommendations: string[];
    urgency: 'clean' | 'info' | 'warning' | 'critical';
}

// ============================================================================
// Context Loader — shared across all exec agents
// ============================================================================

async function loadExecutiveContext() {
    const now = new Date();
    const db = getAdminFirestore();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

    // Read from pre-warm cache first (written at 7:45 AM by executive-context-prewarm cron)
    try {
        const cacheDoc = await db.collection('platform_cache').doc(EXEC_CONTEXT_CACHE_DOC).get();
        if (cacheDoc.exists) {
            const data = cacheDoc.data()!;
            const ageMs = now.getTime() - new Date(data.cachedAt as string).getTime();
            if (ageMs < 4 * 60 * 60 * 1000) { // 4-hour TTL
                const meetings = (data.meetings as Array<Record<string, unknown>> || []).map(m => ({
                    ...m,
                    startTime: m.startTime as string, // keep as string, e.g. "9:00 AM"
                })) as unknown as BriefingMeeting[];
                logger.info('[ExecProactiveCheck] Using pre-warmed context', { ageMinutes: Math.round(ageMs / 60000) });
                return { meetings, emailDigest: data.emailDigest ?? null, dateStr: (data.dateStr as string) || dateStr };
            }
        }
    } catch {
        // cache miss — fall through to live fetch
    }

    // Live fetch fallback
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

    return { meetings, emailDigest, dateStr };
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
    try {
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
        /demo|discovery|call|meeting|sync/i.test(m.title ?? '')
    );

    // Load CRM pipeline counts from Firestore
    const db = getAdminFirestore();
    const [contactsSnap, leadsSnap, sentTodaySnap, pendingDraftsSnap] = await Promise.allSettled([
        db.collection('ny_dispensary_leads').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_outreach_log').where('emailSent', '==', true).count().get(),
        db.collection('ny_outreach_drafts').where('status', '==', 'draft').count().get(),
    ]);
    const totalLeads = contactsSnap.status === 'fulfilled' ? contactsSnap.value.data().count : 0;
    const queueDepth = leadsSnap.status === 'fulfilled' ? leadsSnap.value.data().count : 0;
    const totalSent = sentTodaySnap.status === 'fulfilled' ? sentTodaySnap.value.data().count : 0;
    const pendingDrafts = pendingDraftsSnap.status === 'fulfilled' ? pendingDraftsSnap.value.data().count : 0;

    const userMessage = `You are Jack, CRO of BakedBot. Today is ${ctx.dateStr}.

SALES MEETINGS TODAY: ${salesMeetings.length > 0 ? salesMeetings.map(m => `${m.startTime} ${m.title}`).join(', ') : 'None'}

POTENTIAL LEAD EMAILS: ${emailLeads.length > 0 ? emailLeads.map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ') : 'None flagged'}

MARKET INTEL: ${searchSummary || 'No recent intel'}

NY BIZ DEV PIPELINE:
- Total leads in database: ${totalLeads}
- Leads researched & ready for outreach: ${queueDepth}
- Total outreach emails sent (all time): ${totalSent}
- Drafts pending CEO approval: ${pendingDrafts}

Generate 3-4 revenue action items focused on moving these leads through the pipeline to closed deals.
Flag if pendingDrafts > 0 — CEO needs to approve before emails can send.
Format as bullet points. Under 20 words each. No fluff.`;

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
    } catch (e: unknown) {
        logger.warn('[ExecProactiveCheck] Jack brief failed', { error: String(e) });
        return {
            agent: 'jack',
            title: "Jack's Revenue Opportunities",
            recommendations: [
                'Approve pending outreach drafts in CEO dashboard to unblock pipeline',
                'Follow up on NY dispensary leads from last week',
                'Identify 3 new dispensaries to target this week',
            ],
            urgency: 'info',
        };
    }
}

async function generateLinusBrief(_ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    let techSummary = '';
    try {
        const results = await searchWeb('cannabis SaaS POS integrations technology stack 2026');
        techSummary = (await formatSearchResults(results)).slice(0, 500);
    } catch { /* non-fatal */ }

    const userMessage = `You are Linus, CTO of BakedBot. You scan the cannabis tech landscape for engineering intelligence.

MARKET TECH INTEL: ${techSummary || 'No recent tech intel'}

Generate 3-4 proactive engineering action items. Focus on: new POS integrations to build, AI/LLM cost changes, security advisories, platform risks, Firebase or infrastructure updates.
Format as bullet points. Under 20 words each. No fluff.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage,
            maxTokens: 400,
        });

        const recommendations = text.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).map((l: string) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

        return {
            agent: 'linus',
            title: "Linus's Engineering Intelligence",
            recommendations: recommendations.length > 0 ? recommendations : ['Run build health check — verify all cron endpoints are responding', 'Check Firestore index usage for cost anomalies'],
            urgency: 'info',
        };
    } catch {
        return {
            agent: 'linus',
            title: "Linus's Engineering Intelligence",
            recommendations: ['Review Firebase App Hosting for any pending rollouts', 'Check agent telemetry for cost spikes in the last 24h'],
            urgency: 'info',
        };
    }
}

async function generateMikeBrief(ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    let financeSummary = '';
    try {
        const results = await searchWeb('cannabis industry funding investment financial 2026');
        financeSummary = (await formatSearchResults(results)).slice(0, 500);
    } catch { /* non-fatal */ }

    const investorEmails = ctx.emailDigest?.topEmails.filter((e: { subject: string; from: string }) =>
        /investor|fund|vc|capital|audit|due.diligence|invoice|payment|subscription/i.test(e.subject + e.from)
    ) ?? [];

    const userMessage = `You are Mike, CFO of BakedBot. Today is ${ctx.dateStr}.

FINANCIAL EMAIL SIGNALS: ${investorEmails.length > 0 ? investorEmails.map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ') : 'None flagged'}

CANNABIS FINANCIAL NEWS: ${financeSummary || 'No recent financial intel'}

Generate 3-4 proactive financial action items for today. Focus on: investor outreach, burn rate review, MRR opportunities, fundraising signals.
Format as bullet points. Under 20 words each. No fluff.`;

    try {
        const text = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage,
            maxTokens: 400,
        });

        const recommendations = text.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('•')).map((l: string) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);

        return {
            agent: 'mike',
            title: "Mike's Financial Intelligence",
            recommendations: recommendations.length > 0 ? recommendations : ['Review this week\'s MRR against burn rate target', 'Check outstanding AR for any overdue invoices'],
            urgency: investorEmails.length > 0 ? 'warning' : 'info',
        };
    } catch {
        return {
            agent: 'mike',
            title: "Mike's Financial Intelligence",
            recommendations: [
                investorEmails.length > 0 ? `${investorEmails.length} financial email(s) in inbox — review and prioritize` : 'Review monthly burn rate and runway estimate',
                'Check CRM for any subscription cancellations to triage with Mrs. Parker',
            ],
            urgency: investorEmails.length > 0 ? 'warning' : 'info',
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

async function generateMrsParkerBrief(ctx: Awaited<ReturnType<typeof loadExecutiveContext>>): Promise<ExecDomainBrief> {
    try {
        const db = getAdminFirestore();

        // Query for retention signals
        const [orgsSnap, recentOrgsSnap] = await Promise.allSettled([
            db.collection('organizations').where('status', '==', 'active').count().get(),
            // New orgs in last 30 days (use createdAt field)
            db.collection('organizations').where('status', '==', 'active')
              .where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).count().get(),
        ]);

        const totalOrgs = orgsSnap.status === 'fulfilled' ? orgsSnap.value.data().count : 0;
        const newOrgsLast30Days = recentOrgsSnap.status === 'fulfilled' ? recentOrgsSnap.value.data().count : 0;

        // Filter retention signals from email
        const retentionEmails = ctx.emailDigest?.topEmails.filter((e: { subject: string; from: string }) =>
            /cancel|pause|downgrade|unhappy|frustrated|issue|problem|complaint|refund|churn/i.test(e.subject + e.from)
        ) ?? [];

        const prompt = `You are Mrs. Parker, Customer Success & Retention lead for BakedBot AI, a cannabis industry SaaS platform targeting $10M ARR.

CUSTOMER DATA:
- Active customer organizations: ${totalOrgs}
- New customers in last 30 days: ${newOrgsLast30Days}
- Retention-risk emails today: ${retentionEmails.length > 0 ? retentionEmails.map((e: { subject: string; from: string }) => `"${e.subject}" from ${e.from}`).join('; ') : 'None flagged'}
- Upcoming meetings: ${ctx.meetings.length > 0 ? ctx.meetings.map(m => m.title).join(', ') : 'None'}

Generate 3-4 customer success action items. Focus on:
1. Any churn/cancellation risk signals from email → immediate action
2. New customer onboarding health (30-day cohort)
3. Upsell/expansion opportunities with existing customers
4. Retention campaigns to run this week

Be specific and actionable. Format as a JSON array of strings.`;

        const raw = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            userMessage: prompt,
            maxTokens: 300,
        });

        let items: string[] = [];
        try {
            const match = raw.match(/\[[\s\S]*\]/);
            items = match ? JSON.parse(match[0]) : [raw];
        } catch {
            items = [raw];
        }

        const urgency = retentionEmails.length > 0 ? 'warning' : 'info';

        return {
            agent: 'mrs_parker',
            title: "Mrs. Parker's Retention Priorities",
            recommendations: items.slice(0, 4),
            urgency,
        };
    } catch (e: unknown) {
        logger.warn('[ExecProactiveCheck] Mrs. Parker brief failed', { error: String(e) });
        return {
            agent: 'mrs_parker',
            title: "Mrs. Parker's Retention Priorities",
            recommendations: [
                'Active customers: check for 30-day churn risk',
                'Run win-back sequence for recently churned accounts',
                'Schedule QBR calls for top 3 accounts this week',
            ],
            urgency: 'info',
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

    let threadId: string;
    if (threadsSnap.empty) {
        // Create the briefing thread on first run (same pattern as morning-briefing)
        const newRef = db.collection('inbox_threads').doc();
        threadId = newRef.id;
        await newRef.set({
            id: threadId,
            orgId,
            userId: 'system',
            type: 'analytics',
            status: 'active',
            title: '📊 Daily Briefing',
            preview: 'Executive intelligence briefing',
            primaryAgent: 'leo',
            assignedAgents: ['leo', 'jack', 'glenda', 'linus', 'mike'],
            artifactIds: [],
            messages: [],
            metadata: { isBriefingThread: true },
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivityAt: new Date(),
        });
        logger.info('[ExecProactiveCheck] Created briefing thread', { orgId, threadId });
    } else {
        threadId = threadsSnap.docs[0].id;
    }
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
            emailDigest: ctx.emailDigest ?? null,
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
    const messageBody = `**Executive Intelligence Check — ${ctx.dateStr}**\n\n${bulletSummary}\n\n_Leo, Jack, Glenda, Linus, Mike, and Mrs. Parker have reviewed calendar, email, and market intel._`;

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
        const [leoBrief, jackBrief, glendaBrief, linusBrief, mikeBrief, mrsParkerBrief] = await Promise.all([
            generateLeoBrief(ctx),
            generateJackBrief(ctx),
            generateGlendaBrief(ctx),
            generateLinusBrief(ctx),
            generateMikeBrief(ctx),
            generateMrsParkerBrief(ctx),
        ]);

        // Post consolidated brief to inbox (resolve orgId at runtime)
        const platformOrgId = await getSuperUserOrgId();
        await postExecBriefToInbox(platformOrgId, [leoBrief, jackBrief, glendaBrief, linusBrief, mikeBrief, mrsParkerBrief], ctx);

        logger.info('[ExecProactiveCheck] Completed', {
            leo: leoBrief.recommendations.length,
            jack: jackBrief.recommendations.length,
            glenda: glendaBrief.recommendations.length,
            linus: linusBrief.recommendations.length,
            mike: mikeBrief.recommendations.length,
            mrsParker: mrsParkerBrief.recommendations.length,
        });

        return NextResponse.json({
            success: true,
            summary: {
                meetings: ctx.meetings.length,
                emailUnread: ctx.emailDigest?.unreadCount ?? 0,
                leoItems: leoBrief.recommendations.length,
                jackItems: jackBrief.recommendations.length,
                glendaItems: glendaBrief.recommendations.length,
                linusItems: linusBrief.recommendations.length,
                mikeItems: mikeBrief.recommendations.length,
                mrsParkerItems: mrsParkerBrief.recommendations.length,
            },
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('[ExecProactiveCheck] Failed', {
            error: err.message,
            stack: err.stack?.split('\n').slice(0, 5).join(' | '),
        });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
