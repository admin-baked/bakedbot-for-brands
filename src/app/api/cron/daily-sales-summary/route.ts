/**
 * Daily Sales Summary
 * POST /api/cron/daily-sales-summary
 *
 * Natural language playbook:
 *   "Daily Summary of Previous Sales and Highlights"
 *
 * What it does (runs at 8 PM ET daily):
 *   1. Pulls today's orders from Alleaves / Firestore
 *   2. Computes: total revenue, units sold, top 5 products, avg transaction,
 *      new vs returning customers, peak sales hour
 *   3. Compares vs prior day (% change)
 *   4. Claude synthesizes highlights + tomorrow's recommended promotions
 *   5. Emails Thrive manager (martez@bakedbot.ai) + posts to Slack
 *   6. Writes a dashboard inbox artifact for the briefing panel
 *
 * Cloud Scheduler:
 *   Schedule: 0 20 * * *  (8:00 PM ET daily)
 *   Time zone: America/New_York
 *   gcloud scheduler jobs create http daily-sales-summary \
 *     --schedule="0 20 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/daily-sales-summary" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { callClaude } from '@/ai/claude';
import { slackService } from '@/server/services/communications/slack';
import { sendPlaybookEmail } from '@/lib/playbooks/mailjet';
import { requireCronSecret } from '@/server/auth/cron';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { logger } from '@/lib/logger';

export const maxDuration = 180;

const ORG_ID = 'org_thrive_syracuse';
const REPORT_EMAIL = 'martez@bakedbot.ai';
const SLACK_CHANNEL = '#thrive-syracuse-pilot';

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'daily-sales-summary');
    if (authError) return authError;

    try {
        const [todayData, yesterdayData] = await Promise.all([
            fetchDaySalesData(ORG_ID, 0),
            fetchDaySalesData(ORG_ID, 1),
        ]);

        const highlights = await synthesizeHighlights(todayData, yesterdayData);

        await Promise.allSettled([
            sendSummaryEmail(highlights, todayData),
            postSlackSummary(highlights, todayData),
            saveDashboardArtifact(highlights, todayData),
        ]);

        logger.info('[DailySalesSummary] Delivered', {
            revenue: todayData.totalRevenue,
            orders: todayData.orderCount,
        });

        return NextResponse.json({
            success: true,
            revenue: todayData.totalRevenue,
            orders: todayData.orderCount,
            postedAt: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('[DailySalesSummary] Failed', { error: message });
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

// ---------------------------------------------------------------------------
// Sales data fetcher
// ---------------------------------------------------------------------------

interface DaySalesData {
    date: Date;
    totalRevenue: number;
    orderCount: number;
    avgTransactionValue: number;
    topProducts: Array<{ name: string; category: string; units: number; revenue: number }>;
    newCustomers: number;
    returningCustomers: number;
    peakHour: string;
}

async function fetchDaySalesData(orgId: string, daysAgo: number): Promise<DaySalesData> {
    const firestore = getAdminFirestore();

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    targetDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const ordersSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(targetDate))
        .where('createdAt', '<=', Timestamp.fromDate(endDate))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    const orders = ordersSnap.docs.map(d => d.data());
    const totalRevenue = orders.reduce((sum, o) => sum + ((o.totalAmount ?? o.total ?? 0) as number), 0);
    const avgTransactionValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Product rollup
    const productMap = new Map<string, { name: string; category: string; units: number; revenue: number }>();
    for (const order of orders) {
        const items = (order.items ?? order.lineItems ?? []) as Array<Record<string, unknown>>;
        for (const item of items) {
            const name = String(item.name ?? item.productName ?? 'Unknown');
            const category = String(item.category ?? 'Other');
            const units = Number(item.quantity ?? item.qty ?? 1);
            const revenue = Number(item.totalPrice ?? item.price ?? 0) * units;
            const existing = productMap.get(name);
            if (existing) {
                existing.units += units;
                existing.revenue += revenue;
            } else {
                productMap.set(name, { name, category, units, revenue });
            }
        }
    }
    const topProducts = [...productMap.values()]
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);

    // Customer segmentation (new vs returning) — single query with field projection
    const customerIds = orders.map(o => String(o.customerId ?? o.userId ?? '')).filter(Boolean);
    const uniqueCustomers = [...new Set(customerIds)];
    const priorSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '<', Timestamp.fromDate(targetDate))
        .select('customerId')
        .get();
    const priorCustomerIds = new Set(
        priorSnap.docs.map(d => String(d.data().customerId ?? '')).filter(Boolean)
    );
    const newCustomers = uniqueCustomers.filter(id => !priorCustomerIds.has(id)).length;
    const returningCustomers = uniqueCustomers.filter(id => priorCustomerIds.has(id)).length;

    // Peak hour
    const hourlyRevenue: Record<number, number> = {};
    for (const order of orders) {
        const orderDate = firestoreTimestampToDate(order.createdAt);
        if (!orderDate) continue;
        const hour = orderDate.getHours();
        hourlyRevenue[hour] = (hourlyRevenue[hour] ?? 0) + ((order.totalAmount ?? order.total ?? 0) as number);
    }
    const peakHourNum = Object.entries(hourlyRevenue).sort(([, a], [, b]) => b - a)[0]?.[0];
    const peakHour = peakHourNum
        ? new Date(2000, 0, 1, Number(peakHourNum)).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
        : 'N/A';

    return {
        date: targetDate,
        totalRevenue,
        orderCount: orders.length,
        avgTransactionValue,
        topProducts,
        newCustomers,
        returningCustomers,
        peakHour,
    };
}

// ---------------------------------------------------------------------------
// AI synthesis
// ---------------------------------------------------------------------------

interface SalesHighlights {
    headlineStat: string;
    revenueChange: string;
    keyHighlights: string[];
    tomorrowRecommendations: string[];
    sentiment: 'great' | 'good' | 'flat' | 'slow';
}

async function synthesizeHighlights(
    today: DaySalesData,
    yesterday: DaySalesData
): Promise<SalesHighlights> {
    const pctNum = yesterday.totalRevenue > 0
        ? (today.totalRevenue - yesterday.totalRevenue) / yesterday.totalRevenue * 100
        : 0;
    const pctChange = yesterday.totalRevenue > 0 ? pctNum.toFixed(1) : 'N/A';

    const prompt = `You are Pops, BakedBot's analytics agent for Thrive Syracuse dispensary.

TODAY'S SALES DATA:
- Total revenue: $${today.totalRevenue.toFixed(2)}
- Orders: ${today.orderCount}
- Avg transaction: $${today.avgTransactionValue.toFixed(2)}
- New customers: ${today.newCustomers}, Returning: ${today.returningCustomers}
- Peak hour: ${today.peakHour}
- Top products: ${today.topProducts.map(p => `${p.name} (${p.units} units, $${p.revenue.toFixed(0)})`).join(', ')}

YESTERDAY:
- Total revenue: $${yesterday.totalRevenue.toFixed(2)} (${pctChange}% change)
- Orders: ${yesterday.orderCount}

Produce a JSON summary:
{
  "headlineStat": "One punchy headline number (e.g. '$1,240 in sales today — best Tuesday this month')",
  "revenueChange": "Revenue vs yesterday in plain English (e.g. 'Up 18% from yesterday')",
  "keyHighlights": ["3-4 specific highlights worth noting"],
  "tomorrowRecommendations": ["2-3 specific action items for tomorrow based on today's data"],
  "sentiment": "great | good | flat | slow"
}`;

    try {
        const raw = await callClaude({
            systemPrompt: 'Respond with ONLY valid JSON. No markdown code blocks. No explanation.',
            userMessage: prompt,
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 600,
        });
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as SalesHighlights;
    } catch {
        logger.warn('[DailySalesSummary] AI synthesis failed, using fallback');
    }

    return {
        headlineStat: `$${today.totalRevenue.toFixed(0)} in sales today — ${today.orderCount} orders`,
        revenueChange: yesterday.totalRevenue > 0
            ? `${pctNum >= 0 ? 'Up' : 'Down'} ${Math.abs(pctNum).toFixed(1)}% from yesterday`
            : 'First day on record',
        keyHighlights: [
            `Top seller: ${today.topProducts[0]?.name ?? 'N/A'} (${today.topProducts[0]?.units ?? 0} units)`,
            `${today.newCustomers} new customers, ${today.returningCustomers} returning`,
            `Peak hour: ${today.peakHour}`,
        ],
        tomorrowRecommendations: ['Review slow movers for a flash deal', 'Follow up with new customers via SMS'],
        sentiment: pctNum > 10 ? 'great' : pctNum > 0 ? 'good' : pctNum > -10 ? 'flat' : 'slow',
    };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

const SENTIMENT_EMOJI: Record<SalesHighlights['sentiment'], string> = {
    great: '🚀',
    good: '✅',
    flat: '📊',
    slow: '⚠️',
};

async function sendSummaryEmail(
    highlights: SalesHighlights,
    today: DaySalesData,
): Promise<void> {
    const dateLabel = today.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const emoji = SENTIMENT_EMOJI[highlights.sentiment];

    const topProductRows = today.topProducts
        .map((p, i) => `
          <tr style="background: ${i % 2 === 0 ? '#fff' : '#f9fafb'};">
            <td style="padding: 8px 12px;">${p.name}</td>
            <td style="padding: 8px 12px; color: #6b7280;">${p.category}</td>
            <td style="padding: 8px 12px; text-align: right;">${p.units}</td>
            <td style="padding: 8px 12px; text-align: right;">$${p.revenue.toFixed(0)}</td>
          </tr>`)
        .join('');

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #1a472a; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 20px;">${emoji} Thrive Syracuse — Daily Sales Summary</h1>
    <p style="color: #a8d5b5; margin: 6px 0 0; font-size: 14px;">${dateLabel}</p>
  </div>

  <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">

    <div style="background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb; text-align: center;">
      <h2 style="margin: 0 0 8px; font-size: 28px; color: #1a472a;">$${today.totalRevenue.toFixed(0)}</h2>
      <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">Total Revenue · ${today.orderCount} orders · Avg $${today.avgTransactionValue.toFixed(0)}</p>
      <p style="margin: 0; font-size: 14px; color: ${highlights.sentiment === 'slow' ? '#dc2626' : '#059669'};">${highlights.revenueChange} · Peak at ${today.peakHour}</p>
    </div>

    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">Highlights</h2>
    <ul style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
      ${highlights.keyHighlights.map(h => `<li>${h}</li>`).join('')}
    </ul>

    <h2 style="font-size: 16px; margin: 0 0 12px; color: #1a472a;">Top 5 Products Today</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 8px 12px; text-align: left;">Product</th>
          <th style="padding: 8px 12px; text-align: left;">Category</th>
          <th style="padding: 8px 12px; text-align: right;">Units</th>
          <th style="padding: 8px 12px; text-align: right;">Revenue</th>
        </tr>
      </thead>
      <tbody>${topProductRows}</tbody>
    </table>

    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h2 style="font-size: 15px; margin: 0 0 10px; color: #065f46;">Tomorrow's Recommended Actions</h2>
      <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
        ${highlights.tomorrowRecommendations.map(r => `<li>${r}</li>`).join('')}
      </ol>
    </div>

  </div>

  <div style="background: #f3f4f6; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
    BakedBot AI · Thrive Syracuse · Pops Analytics Agent
  </div>
</div>`;

    await sendPlaybookEmail({
        to: REPORT_EMAIL,
        subject: `${emoji} Thrive Daily Sales — $${today.totalRevenue.toFixed(0)} · ${highlights.revenueChange}`,
        htmlBody,
        playbookId: 'daily-sales-highlights',
        playbookName: 'Daily Sales Highlights',
    });
}

async function postSlackSummary(highlights: SalesHighlights, today: DaySalesData): Promise<void> {
    try {
        const channelName = SLACK_CHANNEL.replace(/^#/, '');
        const channel = await slackService.findChannelByName(channelName);
        if (!channel) return;

        const emoji = SENTIMENT_EMOJI[highlights.sentiment];
        const blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Daily Sales Summary`, emoji: true },
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Revenue*\n$${today.totalRevenue.toFixed(0)}` },
                    { type: 'mrkdwn', text: `*Orders*\n${today.orderCount}` },
                    { type: 'mrkdwn', text: `*Avg Transaction*\n$${today.avgTransactionValue.toFixed(0)}` },
                    { type: 'mrkdwn', text: `*Peak Hour*\n${today.peakHour}` },
                ],
            },
            { type: 'divider' },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Highlights*\n${highlights.keyHighlights.map(h => `• ${h}`).join('\n')}\n\n*Tomorrow*\n${highlights.tomorrowRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
                },
            },
            {
                type: 'context',
                elements: [{ type: 'mrkdwn', text: '_BakedBot AI · Pops Analytics · Full report emailed to martez@bakedbot.ai_' }],
            },
        ];

        await slackService.postMessage(channel.id, highlights.headlineStat, blocks);
    } catch (err) {
        logger.warn('[DailySalesSummary] Slack post failed', { error: err });
    }
}

async function saveDashboardArtifact(highlights: SalesHighlights, today: DaySalesData): Promise<void> {
    try {
        const firestore = getAdminFirestore();
        await firestore.collection('inbox_artifacts').add({
            orgId: ORG_ID,
            type: 'daily_sales_summary',
            title: 'Daily Sales Summary',
            data: {
                date: today.date.toISOString(),
                totalRevenue: today.totalRevenue,
                orderCount: today.orderCount,
                avgTransactionValue: today.avgTransactionValue,
                topProducts: today.topProducts,
                newCustomers: today.newCustomers,
                returningCustomers: today.returningCustomers,
                peakHour: today.peakHour,
                headlineStat: highlights.headlineStat,
                revenueChange: highlights.revenueChange,
                keyHighlights: highlights.keyHighlights,
                tomorrowRecommendations: highlights.tomorrowRecommendations,
                sentiment: highlights.sentiment,
                generatedAt: new Date().toISOString(),
            },
            createdAt: Timestamp.now(),
            read: false,
        });
    } catch (err) {
        logger.warn('[DailySalesSummary] Dashboard artifact save failed', { error: err });
    }
}
