export const dynamic = 'force-dynamic';

/**
 * Agency Newsletter Cron
 *
 * Runs every Monday at 8 AM EST.
 * Generates the Cannabis Marketing Intel Brief via Claude (news + BakedBot feature update),
 * creates a Craig platform campaign targeting all agency leads, and schedules it for immediate send.
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

const NEWSLETTER_SOURCES = [
    'agency-partner',
    'agency-newsletter',
];

// Latest BakedBot feature — update this each sprint
const CURRENT_FEATURE_UPDATE = {
    title: 'Craig now runs automated weekly retention campaigns',
    description: 'Craig (our marketing AI) can now schedule and send weekly retention email sequences autonomously — compliance-reviewed by Deebo, personalized per customer segment. Dispensary clients on your accounts will see automated campaigns without any manual effort.',
};

async function fetchCannabisMarketingNews(): Promise<NewsletterItem[]> {
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

Generate exactly 3 cannabis marketing news items for this week. Each should be:
- Relevant to dispensary marketing, retention, SEO, or operations
- Timely and actionable for agency partners
- Professional in tone

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

async function generateTipOfWeek(): Promise<string> {
    try {
        const response = await callClaude({
            userMessage: 'Generate one concise, actionable tip (2-3 sentences) for cannabis marketing agency partners on how to use AI tools or data to better serve their dispensary clients. Make it specific and practical.',
            systemPrompt: 'You give practical cannabis marketing advice. Be concise and specific.',
            maxTokens: 150,
            caller: 'agency-newsletter-tip',
        });
        return response.trim();
    } catch {
        return 'When presenting retention data to dispensary clients, lead with dollar impact — not percentages. "We recovered $1,200 in revenue from churned customers this month" lands better than "we improved retention rate by 8%."';
    }
}

async function handler(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminFirestore();
        const now = new Date();

        // Get all agency leads (partners + newsletter subscribers)
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

        // Generate newsletter content
        const [newsItems, tipOfWeek] = await Promise.all([
            fetchCannabisMarketingNews(),
            generateTipOfWeek(),
        ]);

        const weekOf = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
        const newsletter = agencyNewsletterEmail({
            weekOf,
            featureUpdate: CURRENT_FEATURE_UPDATE,
            newsItems,
            tipOfWeek,
        });

        // Create Craig platform campaign targeting all agency leads
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
            scheduledAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min from now
            tags: ['agency-newsletter', 'weekly', 'craig'],
            createdByAgent: 'craig',
        });

        logger.info('[AgencyNewsletter] Newsletter campaign created', {
            campaignId,
            recipientCount: customerIds.length,
            weekOf,
        });

        return NextResponse.json({
            success: true,
            campaignId,
            recipientCount: customerIds.length,
            weekOf,
        });
    } catch (e) {
        logger.error('[AgencyNewsletter] Cron failed', { error: (e as Error).message });
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
