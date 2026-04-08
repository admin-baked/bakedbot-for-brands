export const dynamic = 'force-dynamic';
/**
 * FlnnStoned Cannabis — Weekly Competitive Deep Dive
 * POST /api/cron/flnnstoned-competitive-analysis
 *
 * Natural language playbook:
 *   "Research FlnnStoned Cannabis and run a detailed competitive analysis
 *    for Thrive Syracuse. Email the findings to martez@bakedbot.ai."
 *
 * What it does:
 *   1. Pulls latest FlnnStoned menu data from CannMenus / Ezal intel store
 *   2. Compares pricing on shared categories (flower, vape, edibles) vs Thrive
 *   3. Identifies promotions, new products, and pricing gaps
 *   4. Claude synthesizes an executive summary + 3 prioritized action items
 *   5. Sends email to martez@bakedbot.ai with full HTML report
 *   6. Posts a summary card to #thrive-syracuse-pilot Slack
 *
 * Cloud Scheduler:
 *   Schedule: 0 9 * * 1  (Monday 9:00 AM ET)
 *   Time zone: America/New_York
 *   gcloud scheduler jobs create http flnnstoned-competitive-analysis \
 *     --schedule="0 9 * * 1" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/flnnstoned-competitive-analysis" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { JSON_ONLY_SYSTEM_PROMPT } from '@/ai/utils/system-prompts';
import { slackService } from '@/server/services/communications/slack';
import { sendPlaybookEmail } from '@/lib/playbooks/mailjet';
import { requireCronSecret } from '@/server/auth/cron';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { logger } from '@/lib/logger';
import { fetchMenuProducts } from '@/server/agents/adapters/consumer-adapter';

export const maxDuration = 300;

const ORG_ID = 'org_thrive_syracuse';
const REPORT_EMAIL = 'martez@bakedbot.ai';
const SLACK_CHANNEL = '#thrive-syracuse-pilot';

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'flnnstoned-competitive-analysis');
    if (authError) return authError;

    try {
        // 1. Fetch data in parallel
        const [thriveProducts, flnnStonedIntel, latestCiReport] = await Promise.allSettled([
            fetchMenuProducts(ORG_ID),
            fetchFlnnStonedIntel(),
            getLatestCiReport(ORG_ID),
        ]);

        const thrive = thriveProducts.status === 'fulfilled' ? thriveProducts.value : [];
        const flnnStoned = flnnStonedIntel.status === 'fulfilled' ? flnnStonedIntel.value : null;
        const existingCi = latestCiReport.status === 'fulfilled' ? latestCiReport.value : null;

        // 2. Build context for Claude
        const analysisContext = buildAnalysisContext(thrive, flnnStoned, existingCi);

        // 3. Claude Sonnet synthesizes the deep-dive report
        const report = await synthesizeReport(analysisContext);

        // 4–6. Email, Slack, and Firestore in parallel
        await Promise.allSettled([
            sendReportEmail(report),
            postSlackSummary(report),
            saveReportToFirestore(report),
        ]);

        logger.info('[FlnnStonedAnalysis] Report delivered', { to: REPORT_EMAIL });
        return NextResponse.json({ success: true, reportedAt: new Date().toISOString() });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[FlnnStonedAnalysis] Failed', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

interface FlnnStonedIntel {
    name: string;
    products: Array<{ name: string; category: string; price: number; thc?: number }>;
    activeDeals: string[];
    priceOnEighth?: number;
    priceOnHalfOz?: number;
    topCategories: string[];
    lastScraped: string;
}

async function fetchFlnnStonedIntel(): Promise<FlnnStonedIntel | null> {
    try {
        const firestore = getAdminFirestore();
        // Check Ezal's competitor profiles — stored by competitive-intel cron
        const profileSnap = await firestore
            .collection('competitor_profiles')
            .where('orgId', '==', ORG_ID)
            .where('competitorName', '==', 'FlnnStoned Cannabis')
            .orderBy('scrapedAt', 'desc')
            .limit(1)
            .get();

        if (!profileSnap.empty) {
            const data = profileSnap.docs[0].data();
            return {
                name: 'FlnnStoned Cannabis',
                products: (data.products ?? []) as FlnnStonedIntel['products'],
                activeDeals: (data.activeDeals ?? []) as string[],
                priceOnEighth: data.priceOnEighth as number | undefined,
                priceOnHalfOz: data.priceOnHalfOz as number | undefined,
                topCategories: (data.topCategories ?? []) as string[],
                lastScraped: firestoreTimestampToDate(data.scrapedAt)?.toISOString() ?? 'unknown',
            };
        }
    } catch (err) {
        logger.warn('[FlnnStonedAnalysis] Could not fetch stored intel', { error: err });
    }
    return null;
}

async function getLatestCiReport(orgId: string): Promise<Record<string, unknown> | null> {
    try {
        const { getLatestWeeklyReport } = await import('@/server/services/ezal/weekly-intel-report');
        const report = await getLatestWeeklyReport(orgId);
        return report as unknown as Record<string, unknown>;
    } catch (err) {
        logger.warn('[FlnnStonedAnalysis] Could not fetch CI report', { error: err });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Analysis context builder
// ---------------------------------------------------------------------------

interface AnalysisContext {
    thriveProductCount: number;
    thriveCategories: string[];
    thriveFlowerPriceRange: string;
    flnnStoned: FlnnStonedIntel | null;
    recentIntel: string;
}

function buildAnalysisContext(
    thriveProducts: Array<Record<string, unknown>>,
    flnnStoned: FlnnStonedIntel | null,
    ci: Record<string, unknown> | null
): AnalysisContext {
    const categories = [...new Set(thriveProducts.map(p => String(p.category ?? '')).filter(Boolean))];

    const flowerProducts = thriveProducts.filter(p =>
        String(p.category ?? '').toLowerCase().includes('flower')
    );
    const prices = flowerProducts.map(p => Number(p.price ?? 0)).filter(n => n > 0);
    const flowerPriceRange = prices.length
        ? `$${Math.min(...prices)}–$${Math.max(...prices)}`
        : 'unavailable';

    const recentIntelLines: string[] = [];
    if (ci && typeof ci === 'object') {
        const ciAny = ci as Record<string, unknown>;
        const insights = ciAny.insights as Record<string, unknown> | undefined;
        if (insights?.topDeals && Array.isArray(insights.topDeals) && insights.topDeals.length > 0) {
            const deal = insights.topDeals[0] as Record<string, unknown>;
            recentIntelLines.push(`Top deal spotted: ${deal.dealName} at $${deal.price} (${deal.competitorName})`);
        }
        if (insights?.marketTrends && Array.isArray(insights.marketTrends)) {
            recentIntelLines.push(`Market trends: ${(insights.marketTrends as string[]).slice(0, 2).join('; ')}`);
        }
    }

    return {
        thriveProductCount: thriveProducts.length,
        thriveCategories: categories,
        thriveFlowerPriceRange: flowerPriceRange,
        flnnStoned,
        recentIntel: recentIntelLines.join('\n') || 'No recent intel available',
    };
}

// ---------------------------------------------------------------------------
// Claude synthesis
// ---------------------------------------------------------------------------

interface CompetitiveReport {
    executiveSummary: string;
    pricingAnalysis: string;
    opportunityGaps: string[];
    actionItems: string[];
    fullHtml: string;
}

async function synthesizeReport(ctx: AnalysisContext): Promise<CompetitiveReport> {
    const flnnContext = ctx.flnnStoned
        ? `FlnnStoned Cannabis data:
- Products tracked: ${ctx.flnnStoned.products.length}
- Active deals: ${ctx.flnnStoned.activeDeals.join(', ') || 'none detected'}
- 8th price: ${ctx.flnnStoned.priceOnEighth ? `$${ctx.flnnStoned.priceOnEighth}` : 'unknown'}
- Half oz price: ${ctx.flnnStoned.priceOnHalfOz ? `$${ctx.flnnStoned.priceOnHalfOz}` : 'unknown'}
- Top categories: ${ctx.flnnStoned.topCategories.join(', ')}
- Data freshness: ${ctx.flnnStoned.lastScraped}`
        : 'No direct FlnnStoned data available — infer from market intel and known cannabis market patterns for Syracuse, NY.';

    const prompt = `You are Ezal, BakedBot's competitive intelligence agent. Thrive Syracuse is a cannabis dispensary in Syracuse, NY. Your job is to produce a detailed weekly competitive analysis focused specifically on FlnnStoned Cannabis (a local competitor).

THRIVE SYRACUSE CONTEXT:
- Products in inventory: ${ctx.thriveProductCount}
- Product categories: ${ctx.thriveCategories.join(', ')}
- Flower price range: ${ctx.thriveFlowerPriceRange}

${flnnContext}

RECENT MARKET INTEL:
${ctx.recentIntel}

Produce a structured competitive analysis report in JSON with these exact fields:
{
  "executiveSummary": "2-3 sentence executive summary — what matters most this week",
  "pricingAnalysis": "Paragraph comparing Thrive vs FlnnStoned pricing — specific numbers where available",
  "opportunityGaps": ["3-5 specific opportunities where Thrive can gain advantage"],
  "actionItems": ["3 specific, prioritized action items for Thrive management this week"],
  "fullHtml": "Complete HTML email body (tables, bullet points, no <html>/<body> tags) — professional, detailed 400-600 word report"
}

Be specific. Use concrete numbers. No vague platitudes.`;

    const raw = await callClaude({
        systemPrompt: JSON_ONLY_SYSTEM_PROMPT,
        userMessage: prompt,
        model: 'claude-sonnet-4-6',
        maxTokens: 2000,
        caller: 'cron/flnnstoned-competitive-analysis',
    });

    try {
        return JSON.parse(raw) as CompetitiveReport;
    } catch {
        logger.warn('[FlnnStonedAnalysis] JSON parse failed, using fallback');
    }

    // Fallback
    return {
        executiveSummary: 'Weekly FlnnStoned competitive analysis completed.',
        pricingAnalysis: raw.slice(0, 500),
        opportunityGaps: ['Review FlnnStoned pricing on flower', 'Check active promotions', 'Compare edibles selection'],
        actionItems: ['Review FlnnStoned menu this week', 'Adjust flower pricing if needed', 'Launch a competing promo'],
        fullHtml: `<p>${raw.replace(/\n/g, '<br>')}</p>`,
    };
}

// ---------------------------------------------------------------------------
// Email delivery
// ---------------------------------------------------------------------------

async function sendReportEmail(report: CompetitiveReport): Promise<void> {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #1a472a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">🕵️ FlnnStoned Cannabis — Competitive Deep Dive</h1>
    <p style="color: #a8d5b5; margin: 6px 0 0; font-size: 14px;">Weekly Intelligence Report · ${today}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">Executive Summary</h2>
    <p style="margin: 0 0 24px; line-height: 1.6;">${report.executiveSummary}</p>

    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">Pricing Analysis</h2>
    <p style="margin: 0 0 24px; line-height: 1.6;">${report.pricingAnalysis}</p>

    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">Opportunity Gaps</h2>
    <ul style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
      ${report.opportunityGaps.map(g => `<li>${g}</li>`).join('')}
    </ul>

    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">✅ Action Items This Week</h2>
    <ol style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
      ${report.actionItems.map(a => `<li><strong>${a}</strong></li>`).join('')}
    </ol>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    ${report.fullHtml}
  </div>

  <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
    BakedBot AI · Thrive Syracuse · Powered by Ezal Intelligence
  </div>
</div>`;

    await sendPlaybookEmail({
        to: REPORT_EMAIL,
        subject: `🕵️ FlnnStoned Competitive Deep Dive — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        htmlBody,
        playbookId: 'flnnstoned-competitive-deep-dive',
        playbookName: 'FlnnStoned Competitive Deep Dive',
    });
}

// ---------------------------------------------------------------------------
// Slack summary
// ---------------------------------------------------------------------------

async function postSlackSummary(report: CompetitiveReport): Promise<void> {
    try {
        const channelName = SLACK_CHANNEL.replace(/^#/, '');
        const channel = await slackService.findChannelByName(channelName);
        if (!channel) return;

        const actionList = report.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n');
        const blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: '🕵️ FlnnStoned Competitive Deep Dive', emoji: true },
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: report.executiveSummary },
            },
            { type: 'divider' },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*✅ This Week's Action Items*\n${actionList}` },
            },
            {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: '_BakedBot AI · Ezal · Full report sent to martez@bakedbot.ai_' }],
            },
        ];

        await slackService.postMessage(
            channel.id,
            `🕵️ FlnnStoned Competitive Deep Dive — ${report.executiveSummary}`,
            blocks
        );
    } catch (err) {
        logger.warn('[FlnnStonedAnalysis] Slack post failed', { error: err });
    }
}

// ---------------------------------------------------------------------------
// Persist to Firestore for Drive
// ---------------------------------------------------------------------------

async function saveReportToFirestore(report: CompetitiveReport): Promise<void> {
    try {
        const firestore = getAdminFirestore();
        const { Timestamp } = await import('firebase-admin/firestore');
        await firestore.collection('competitive_reports').add({
            orgId: ORG_ID,
            competitor: 'FlnnStoned Cannabis',
            type: 'deep_dive',
            executiveSummary: report.executiveSummary,
            actionItems: report.actionItems,
            opportunityGaps: report.opportunityGaps,
            generatedAt: Timestamp.now(),
            emailedTo: REPORT_EMAIL,
        });
    } catch (err) {
        logger.warn('[FlnnStonedAnalysis] Firestore save failed', { error: err });
    }
}
