export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Agency Newsletter Cron
 *
 * Runs every Monday at 8 AM EST.
 * Generates the Cannabis Marketing Intel Brief via Claude (news + BakedBot feature update),
 * creates a Craig platform campaign targeting all agency leads, and schedules it for immediate send.
 *
 * Learning loop:
 *   1. Reads last 6 run records before generating content — injects performance context into prompts.
 *   2. Generates two subject line variants (A/B) and requests Slack approval before sending.
 *   3. Records the run after campaign creation; upserts the living learning doc.
 *
 * Cloud Scheduler: gcloud scheduler jobs create http agency-newsletter-cron \
 *   --schedule="0 13 * * 1" \
 *   --uri="https://bakedbot.ai/api/cron/agency-newsletter" \
 *   --http-method=POST \
 *   --headers="Authorization=Bearer ${CRON_SECRET}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { upsertLeadAsCustomer, createAndSchedulePlatformCampaign } from '@/server/services/platform-campaign';
import { agencyNewsletterEmail, type NewsletterItem } from '@/server/services/email-templates/agency';
import {
    recordAgentRun,
    upsertAgentLearningDoc,
    getAgentRunHistory,
    requestSlackApproval,
    type AgentRunRecord,
} from '@/server/services/agent-performance';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

const NEWSLETTER_SOURCES = [
    'agency-partner',
    'agency-newsletter',
];

// Latest BakedBot feature — update this each sprint
const CURRENT_FEATURE_UPDATE = {
    title: 'Craig now runs automated weekly retention campaigns',
    description: 'Craig (our marketing AI) can now schedule and send weekly retention email sequences autonomously — compliance-reviewed by Deebo, personalized per customer segment. Dispensary clients on your accounts will see automated campaigns without any manual effort.',
};

// ─── Performance Context ──────────────────────────────────────────────────────

/**
 * Summarises the last N run records into a plain-English sentence that can be
 * injected into Claude prompts so Craig can adapt its tone and content.
 */
function buildPerformanceContext(history: AgentRunRecord[]): string {
    if (history.length === 0) {
        return 'No prior newsletter performance data available yet — generate compelling content to establish a baseline.';
    }

    const openRates = history
        .map(r => r.metrics.openRate)
        .filter((v): v is number => typeof v === 'number');

    const avgOpen = openRates.length > 0
        ? (openRates.reduce((a, b) => a + b, 0) / openRates.length * 100).toFixed(1)
        : null;

    const bestVariant = history.find(r => r.variant && typeof r.metrics.openRate === 'number');

    const parts: string[] = [];
    if (avgOpen) {
        parts.push(`Last ${openRates.length} issue${openRates.length > 1 ? 's' : ''} averaged ${avgOpen}% open rate.`);
    }
    if (bestVariant?.notes) {
        parts.push(`Best performer note: ${bestVariant.notes}.`);
    }

    // Warn Craig if trend is poor
    const latestOpen = openRates[0];
    if (latestOpen !== undefined && latestOpen < 0.20) {
        parts.push('Recent open rates are below 20% — try a more direct or curiosity-driven subject line.');
    } else if (latestOpen !== undefined && latestOpen >= 0.35) {
        parts.push('Recent open rates are strong (≥35%) — maintain current tone and format.');
    }

    return parts.length > 0
        ? parts.join(' ')
        : 'Performance history available but no open rate data yet — focus on value-dense content.';
}

// ─── Content Generation ───────────────────────────────────────────────────────

async function fetchCannabisMarketingNews(performanceContext: string): Promise<NewsletterItem[]> {
    const defaultNews: NewsletterItem[] = [
        {
            headline: 'Cannabis retail competition intensifying in NY market',
            summary: 'New York dispensary operators are reporting increased competition as more CAURD licenses activate. Differentiation through retention and loyalty programs is becoming a key success factor.',
        },
        {
            headline: 'Email compliance in cannabis: What dispensaries need to know in 2026',
            summary: 'CAN-SPAM and state-level cannabis marketing regulations continue to evolve. Agencies serving dispensaries need to ensure all campaigns include proper consent documentation and unsubscribe flows.',
        },
        {
            headline: 'Google Business Profile updates affecting dispensary local SEO',
            summary: 'Google has updated its Business Profile policies for cannabis businesses. Dispensaries with complete profiles, regular posts, and review responses are seeing stronger local pack rankings.',
        },
    ];

    try {
        const prompt = `You are generating content for a weekly cannabis marketing newsletter for agency partners (SEO firms, POS consultants, marketing agencies serving cannabis dispensaries).

Performance context from prior issues: ${performanceContext}

Generate exactly 3 cannabis marketing news items for this week. Each should be:
- Relevant to dispensary marketing, retention, SEO, or operations
- Timely and actionable for agency partners
- Professional in tone
- Adapted based on the performance context above

Return ONLY valid JSON in this exact format:
[
  { "headline": "...", "summary": "1-2 sentence summary relevant to agency partners." },
  { "headline": "...", "summary": "1-2 sentence summary." },
  { "headline": "...", "summary": "1-2 sentence summary." }
]`;

        const response = await callClaude({
            userMessage: prompt,
            systemPrompt: 'You generate accurate, professional cannabis industry marketing news summaries. Return only valid JSON arrays.',
            maxTokens: 600,
            caller: 'agency-newsletter',
        });

        const items = JSON.parse(response) as NewsletterItem[];
        if (Array.isArray(items) && items.length > 0) {
            return items.slice(0, 3);
        }
    } catch (e) {
        logger.warn('[AgencyNewsletter] Failed to generate AI news, using defaults', { error: (e as Error).message });
    }

    return defaultNews;
}

async function generateTipOfWeek(performanceContext: string): Promise<string> {
    try {
        const response = await callClaude({
            userMessage: `Generate one concise, actionable tip (2-3 sentences) for cannabis marketing agency partners on how to use AI tools or data to better serve their dispensary clients. Make it specific and practical.\n\nPerformance context: ${performanceContext}`,
            systemPrompt: 'You give practical cannabis marketing advice. Be concise and specific.',
            maxTokens: 150,
            caller: 'agency-newsletter-tip',
        });
        return response.trim();
    } catch {
        return 'When presenting retention data to dispensary clients, lead with dollar impact — not percentages. "We recovered $1,200 in revenue from churned customers this month" lands better than "we improved retention rate by 8%."';
    }
}

// ─── A/B Subject Line Variants ────────────────────────────────────────────────

interface SubjectLineVariants {
    A: string;
    B: string;
}

async function generateSubjectLineVariants(
    performanceContext: string,
    weekOf: string,
): Promise<SubjectLineVariants> {
    const defaultA = `Cannabis Marketing Intel — Week of ${weekOf}`;
    const defaultB = `🌿 Your weekly edge: cannabis marketing trends (${weekOf})`;

    try {
        const response = await callClaude({
            userMessage: `Generate exactly 2 subject line variants for a weekly cannabis marketing newsletter sent to agency partners (SEO firms, POS consultants, marketing agencies).

Performance context: ${performanceContext}

Rules:
- Variant A: professional and direct (current baseline approach)
- Variant B: test something meaningfully different based on the performance context (e.g. curiosity hook, emoji, number-led, question format)
- Both must feel trustworthy to B2B marketing professionals
- Max 60 characters each
- Week of: ${weekOf}

Return ONLY valid JSON: { "A": "subject line A", "B": "subject line B" }`,
            systemPrompt: 'You write high-performing B2B email subject lines. Return only valid JSON.',
            maxTokens: 150,
            caller: 'agency-newsletter-subjects',
        });

        const parsed = JSON.parse(response) as SubjectLineVariants;
        if (typeof parsed.A === 'string' && typeof parsed.B === 'string') {
            return parsed;
        }
    } catch (e) {
        logger.warn('[AgencyNewsletter] Subject line generation failed, using defaults', { error: (e as Error).message });
    }

    return { A: defaultA, B: defaultB };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handler(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminFirestore();
        const now = new Date();

        // ── 1. Load prior performance ─────────────────────────────────────────
        const runHistory = await getAgentRunHistory('craig', 'newsletter', 6);
        const performanceContext = buildPerformanceContext(runHistory);
        logger.info('[AgencyNewsletter] Performance context loaded', {
            priorRuns: runHistory.length,
            context: performanceContext.slice(0, 120),
        });

        // ── 2. Get all agency leads ───────────────────────────────────────────
        const leadsSnap = await db.collection('email_leads')
            .where('source', 'in', NEWSLETTER_SOURCES)
            .get();

        if (leadsSnap.empty) {
            logger.info('[AgencyNewsletter] No leads found, skipping');
            return NextResponse.json({ success: true, message: 'No leads', sent: 0 });
        }

        // Upsert all leads as customers and collect IDs
        const customerIds: string[] = await Promise.all(
            leadsSnap.docs.map(async (doc) => {
                const data = doc.data();
                return upsertLeadAsCustomer({
                    email: data.email as string,
                    firstName: (data.contactName as string | undefined)?.split(' ')[0],
                    leadSource: data.source as string,
                });
            })
        );

        // ── 3. Generate newsletter content (performance-aware) ────────────────
        const weekOf = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

        const [newsItems, tipOfWeek, subjectVariants] = await Promise.all([
            fetchCannabisMarketingNews(performanceContext),
            generateTipOfWeek(performanceContext),
            generateSubjectLineVariants(performanceContext, weekOf),
        ]);

        // ── 4. Slack approval gate for A/B subject line selection ─────────────
        const scheduledSendTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        let selectedVariant: 'A' | 'B' = 'A';

        try {
            const approval = await requestSlackApproval({
                agentId: 'craig',
                domain: 'newsletter',
                title: `Agency Newsletter A/B Subject — Week of ${weekOf}`,
                description: 'Craig generated 2 subject line options. Select which to send, or let it time out to use Variant A.',
                variants: [
                    { id: 'A', label: 'Baseline', preview: subjectVariants.A },
                    { id: 'B', label: 'Test variant', preview: subjectVariants.B },
                ],
                scheduledFor: scheduledSendTime,
                approvalTimeoutMs: 120_000, // 2 minutes — cron has a short window
            });

            if (approval.approved && (approval.selectedVariant === 'A' || approval.selectedVariant === 'B')) {
                selectedVariant = approval.selectedVariant;
            }
            logger.info('[AgencyNewsletter] Subject approval result', {
                timedOut: approval.timedOut,
                selectedVariant,
                approved: approval.approved,
            });
        } catch (e) {
            logger.warn('[AgencyNewsletter] Approval gate failed, defaulting to variant A', { error: (e as Error).message });
        }

        const chosenSubject = subjectVariants[selectedVariant];

        // ── 5. Build email and schedule campaign ──────────────────────────────
        const newsletter = agencyNewsletterEmail({
            weekOf,
            featureUpdate: CURRENT_FEATURE_UPDATE,
            newsItems,
            tipOfWeek,
            subject: chosenSubject,
        });

        const campaignId = await createAndSchedulePlatformCampaign({
            name: `Agency Newsletter — Week of ${weekOf}`,
            description: 'Weekly cannabis marketing intel brief for agency partners',
            goal: 'awareness',
            channels: ['email'],
            audience: {
                type: 'custom',
                customFilter: { customerIds },
                estimatedCount: customerIds.length,
            },
            email: newsletter,
            scheduledAt: new Date(Date.now() + 2 * 60 * 1000),
            tags: ['agency-newsletter', 'weekly', 'craig'],
            createdByAgent: 'craig',
        });

        logger.info('[AgencyNewsletter] Newsletter campaign created', {
            campaignId,
            recipientCount: customerIds.length,
            weekOf,
            selectedVariant,
            subject: chosenSubject,
        });

        // ── 6. Write-back: record run + update learning doc (fire-and-forget) ─
        const periodLabel = `week-${now.toISOString().slice(0, 10)}`;

        recordAgentRun({
            agentId: 'craig',
            domain: 'newsletter',
            runAt: Date.now(),
            periodLabel,
            metrics: {
                recipientCount: customerIds.length,
                selectedVariant,
                subjectVariant: selectedVariant,
            },
            variant: selectedVariant,
            notes: `Subject: ${chosenSubject}`,
        }).catch(() => {});

        upsertAgentLearningDoc('craig', 'newsletter', {
            recentMetrics: {
                recipientCount: customerIds.length,
                selectedVariant,
                lastPeriod: periodLabel,
            },
            nextHypothesis: 'test emoji in subject line to measure open rate lift',
        }).catch(() => {});

        logAgentLearning({
            agentId: 'craig',
            action: `newsletter-sent week-of-${weekOf}`,
            result: 'success',
            category: 'newsletter',
            reason: `Sent to ${customerIds.length} recipients. Variant ${selectedVariant} selected. Subject: ${chosenSubject}`,
            nextStep: 'Monitor open/click rates via campaign-monitor cron; write back actuals.',
            metadata: { campaignId, recipientCount: customerIds.length, selectedVariant, periodLabel },
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            campaignId,
            recipientCount: customerIds.length,
            weekOf,
            selectedVariant,
            subject: chosenSubject,
        });
    } catch (e) {
        logger.error('[AgencyNewsletter] Cron failed', { error: (e as Error).message });
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
