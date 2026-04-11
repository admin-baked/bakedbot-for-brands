export const dynamic = 'force-dynamic';
/**
 * Thrive Syracuse Daily Briefing Cron
 * POST /api/cron/thrive-daily-briefing
 *
 * Runs every morning and posts an *actionable* daily briefing to #thrive-syracuse-pilot.
 * Pulls real data from Firestore: customer health, competitor intel, inventory, at-risk list.
 *
 * Cloud Scheduler:
 *   Schedule: 30 8 * * *  (daily 8:30 AM ET)
 *   gcloud scheduler jobs create http thrive-daily-briefing \
 *     --schedule="30 8 * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/thrive-daily-briefing" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAtRiskCustomers, getSegmentSummary, getTodayCheckins } from '@/server/tools/crm-tools';
import { getLatestWeeklyReport } from '@/server/services/ezal/weekly-intel-report';
import { fetchMenuProducts, normalizeProduct } from '@/server/agents/adapters/consumer-adapter';
import { elroySlackService } from '@/server/services/communications/slack';
import { getAdminFirestore } from '@/firebase/admin';
import { callGroqOrClaude } from '@/ai/glm';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import {
    getUpcomingHolidays,
    fetchCompetitorHolidayHours,
    formatHoursForSlack,
    SYRACUSE_COMPETITORS,
    type Holiday,
    type CompetitorHours,
} from '@/server/services/holiday-hours';

export const maxDuration = 300;

const ORG_ID = 'org_thrive_syracuse';
const SLACK_CHANNEL = '#thrive-syracuse-pilot';

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'thrive-daily-briefing');
    if (authError) return authError;

    try {
        // Detect upcoming holidays first — drives whether we fetch competitor hours
        const upcomingHolidays = getUpcomingHolidays(7);
        const nearestHoliday = upcomingHolidays[0] ?? null;

        const [segmentResult, atRiskResult, intelReport, todayCheckins, products, holidayHoursResult, staleOrdersResult] = await Promise.allSettled([
            getSegmentSummary(ORG_ID),
            getAtRiskCustomers(ORG_ID, 5, true),
            getLatestWeeklyReport(ORG_ID),
            getTodayCheckins(ORG_ID),
            fetchMenuProducts(ORG_ID),
            // Only hit Places API if a holiday is within 7 days
            nearestHoliday ? fetchCompetitorHolidayHours(SYRACUSE_COMPETITORS) : Promise.resolve([]),
            loadStaleOrders(ORG_ID),
        ]);

        const segment = segmentResult.status === 'fulfilled' ? segmentResult.value : null;
        const atRisk = atRiskResult.status === 'fulfilled' ? atRiskResult.value : null;
        const intel = intelReport.status === 'fulfilled' ? intelReport.value : null;
        const checkins = todayCheckins.status === 'fulfilled' ? todayCheckins.value : 0;
        const inventory = products.status === 'fulfilled' ? products.value : [];
        const competitorHolidays: CompetitorHours[] = holidayHoursResult.status === 'fulfilled' ? holidayHoursResult.value : [];
        const staleOrders: StaleOrder[] = staleOrdersResult.status === 'fulfilled' ? staleOrdersResult.value : [];

        // Identify discount candidates — slice to 50 before processing to cap iteration cost
        const discountCandidates = identifyDiscountCandidates(inventory.slice(0, 50));

        // Synthesize 3-5 action items using Claude Haiku
        const actionItems = await synthesizeActionItems({
            segment,
            atRisk,
            intel,
            checkins,
            discountCandidates,
            nearestHoliday,
            competitorHolidays,
            staleOrders,
        });

        const blocks = buildBriefingBlocks({
            segment,
            atRisk,
            intel,
            checkins,
            discountCandidates,
            actionItems,
            nearestHoliday,
            competitorHolidays,
            staleOrders,
        });

        // Ensure channel exists and bot is a member before posting
        const channelName = SLACK_CHANNEL.replace(/^#/, '');
        let channelId: string | undefined;
        const existing = await elroySlackService.findChannelByName(channelName);
        if (existing) {
            channelId = existing.id;
        } else {
            const created = await elroySlackService.createChannel(channelName);
            channelId = created?.id;
        }
        if (channelId) {
            await elroySlackService.joinChannel(channelId);
        }

        const fallbackText = `🌿 Thrive Syracuse Daily Briefing — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        const postResult = await elroySlackService.postMessage(channelId ?? SLACK_CHANNEL, fallbackText, blocks);

        if (!postResult.sent) {
            logger.error('[ThriveDailyBriefing] Failed to post to Slack', { error: postResult.error });
            return NextResponse.json({ error: postResult.error }, { status: 500 });
        }

        logger.info('[ThriveDailyBriefing] Posted successfully', { ts: postResult.ts });
        return NextResponse.json({ success: true, ts: postResult.ts, postedAt: new Date().toISOString() });

    } catch (err: any) {
        logger.error('[ThriveDailyBriefing] Failed', { error: err.message });
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

interface StaleOrder {
    orderId: string;
    customerName: string;
    totalPrice: number;
    status: string;
    waitMinutes: number;
    createdAt: Date;
}

/**
 * Load orders that need attention — pending/submitted for 30+ minutes.
 * These are actionable: the owner can follow up or notify the customer.
 */
async function loadStaleOrders(orgId: string): Promise<StaleOrder[]> {
    try {
        const db = getAdminFirestore();
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const snap = await db.collection('orders')
            .where('orgId', '==', orgId)
            .where('status', 'in', ['pending', 'submitted', 'confirmed', 'preparing'])
            .where('createdAt', '>=', todayStart)
            .limit(20)
            .get();

        const stale: StaleOrder[] = [];
        for (const doc of snap.docs) {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
            if (createdAt > thirtyMinAgo) continue; // Not stale yet

            const waitMinutes = Math.round((Date.now() - createdAt.getTime()) / 60000);
            stale.push({
                orderId: doc.id,
                customerName: data.customerName || data.customer?.name || 'Customer',
                totalPrice: data.totalPrice || data.subtotal || 0,
                status: data.status || 'pending',
                waitMinutes,
                createdAt,
            });
        }

        stale.sort((a, b) => b.waitMinutes - a.waitMinutes);
        return stale;
    } catch (error) {
        logger.warn('[ThriveDailyBriefing] Failed to load stale orders', { error: String(error) });
        return [];
    }
}

interface DiscountCandidate {
    name: string;
    category: string;
    price: number;
    reason: string;
}

function identifyDiscountCandidates(products: any[]): DiscountCandidate[] {
    if (!products.length) return [];

    // Flag products that are on sale already (confirm promotions exist) or
    // high-quantity / potentially slow-moving items
    const candidates: DiscountCandidate[] = [];

    for (const p of products) {
        const { name, category, price, stock, onSale } = normalizeProduct(p);

        if (onSale) {
            candidates.push({ name, category, price, reason: 'Active sale — confirm in-store signage' });
        } else if (stock > 20) {
            candidates.push({ name, category, price, reason: `High stock (${stock} units) — consider a flash deal` });
        }

        if (candidates.length >= 5) break;
    }

    return candidates;
}

// ---------------------------------------------------------------------------
// AI synthesis for action items
// ---------------------------------------------------------------------------

interface BriefingData {
    segment: Awaited<ReturnType<typeof getSegmentSummary>> | null;
    atRisk: Awaited<ReturnType<typeof getAtRiskCustomers>> | null;
    intel: Awaited<ReturnType<typeof getLatestWeeklyReport>> | null;
    checkins: number;
    discountCandidates: DiscountCandidate[];
    nearestHoliday: Holiday | null;
    competitorHolidays: CompetitorHours[];
    staleOrders: StaleOrder[];
}

async function synthesizeActionItems(data: BriefingData): Promise<string[]> {
    try {
        const contextLines: string[] = [
            `Today's checkins so far: ${data.checkins}`,
        ];

        if (data.segment) {
            contextLines.push(`Customer segment summary: ${data.segment.summary}`);
        }

        if (data.atRisk?.customers.length) {
            const names = data.atRisk.customers.slice(0, 3).map((c: any) => c.name ?? c.displayName ?? 'Customer').join(', ');
            contextLines.push(`At-risk customers needing outreach: ${names}`);
        }

        if (data.intel?.insights.recommendations.length) {
            contextLines.push(`Competitor intel recommendations: ${data.intel.insights.recommendations.slice(0, 3).join('; ')}`);
        }

        if (data.intel?.insights.topDeals.length) {
            const deal = data.intel.insights.topDeals[0];
            contextLines.push(`Top competitor deal spotted: ${deal.dealName} at $${deal.price} (${deal.competitorName})`);
        }

        if (data.discountCandidates.length) {
            const c = data.discountCandidates[0];
            contextLines.push(`Discount opportunity: ${c.name} — ${c.reason}`);
        }

        if (data.staleOrders.length) {
            const oldest = data.staleOrders[0];
            contextLines.push(`${data.staleOrders.length} order(s) waiting 30+ min — oldest: ${oldest.customerName} (${oldest.waitMinutes} min, $${Math.round(oldest.totalPrice)})`);
        }

        if (data.nearestHoliday) {
            const h = data.nearestHoliday;
            const urgency = h.daysUntil === 0 ? 'today' : h.daysUntil === 1 ? 'tomorrow' : `in ${h.daysUntil} days`;
            contextLines.push(`Upcoming holiday: ${h.name} ${urgency}${h.likelyHoursChange ? ' — hours change expected' : ''}`);
        }

        const prompt = `You are a retail operations advisor for Thrive Syracuse, a cannabis dispensary.
Based on the following store data for today, write exactly 4 short, specific, actionable items for the store manager.
Each item should be a single sentence starting with an action verb. No fluff.

Data:
${contextLines.join('\n')}

Respond with ONLY a JSON array of 4 strings. Example format: ["Action 1", "Action 2", "Action 3", "Action 4"]`;

        const raw = (await callGroqOrClaude({ userMessage: prompt, maxTokens: 300, caller: 'cron/thrive-daily-briefing' })).trim();

        // Parse the JSON array
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) return parsed.map(String).slice(0, 5);
        }
    } catch (err: any) {
        logger.warn('[ThriveDailyBriefing] Action item synthesis failed', { error: err.message });
    }

    // Fallback to static items if AI synthesis fails
    return [
        'Check in with at-risk customers via SMS before the afternoon rush',
        'Review competitor deals and match any pricing gaps on top-selling SKUs',
        'Confirm current promotions are live on the menu and POS',
        'Follow up on pending loyalty sign-ups from the tablet kiosk',
    ];
}

// ---------------------------------------------------------------------------
// Block Kit builder
// ---------------------------------------------------------------------------

function buildBriefingBlocks(data: BriefingData & { actionItems: string[] }): any[] {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const blocks: any[] = [];

    // Header
    blocks.push({
        type: 'header',
        text: { type: 'plain_text', text: `🌿 Thrive Daily Briefing — ${today}`, emoji: true },
    });
    blocks.push({ type: 'divider' });

    // 📊 Store Pulse
    const checkinText = data.checkins > 0
        ? `*${data.checkins}* check-in${data.checkins !== 1 ? 's' : ''} so far today`
        : 'No check-ins logged yet today';

    let segmentText = 'Customer data loading...';
    if (data.segment?.summary) {
        // Extract key numbers from summary string
        const atRiskMatch = data.segment.summary.match(/(\d+)\s+at[- ]risk/i);
        const activeMatch = data.segment.summary.match(/(\d+)\s+(?:active|champion)/i);
        const parts: string[] = [];
        if (activeMatch) parts.push(`*${activeMatch[1]}* active customers`);
        if (atRiskMatch) parts.push(`*${atRiskMatch[1]}* at risk`);
        segmentText = parts.length ? parts.join(' · ') : 'Customer data available';
    }

    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*📊 Store Pulse*\n${checkinText}\n${segmentText}`,
        },
    });

    // 👥 Retention Watch
    if (data.atRisk?.customers.length) {
        const customerList = data.atRisk.customers.slice(0, 5).map((c: any) => {
            const name = c.name ?? c.displayName ?? 'Customer';
            const days = c.daysSinceLastVisit ?? c.daysSincePurchase ?? '?';
            const ltv = c.lifetimeValue ?? c.totalSpent ?? 0;
            return `• *${name}* — ${days}d inactive · $${Math.round(ltv)} LTV`;
        }).join('\n');

        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*👥 Win-Back Targets (top ${Math.min(5, data.atRisk.customers.length)})*\n${customerList}`,
            },
        });
    }

    // 🏷️ Discount Opportunities
    if (data.discountCandidates.length) {
        const dealList = data.discountCandidates.map(c =>
            `• *${c.name}* (${c.category}) — $${c.price} · ${c.reason}`
        ).join('\n');

        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*🏷️ Discount Opportunities*\n${dealList}` },
        });
    }

    // ⏰ Orders Needing Attention (stale 30+ min)
    if (data.staleOrders.length > 0) {
        const orderList = data.staleOrders.slice(0, 5).map(o =>
            `• *${o.customerName}* — $${Math.round(o.totalPrice)} · ${o.status} · waiting ${o.waitMinutes} min`
        ).join('\n');

        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*⏰ Orders Needing Attention (${data.staleOrders.length})*\n${orderList}`,
            },
        });
    }

    // 🕵️ Competitor Intel
    if (data.intel) {
        const intelLines: string[] = [];

        if (data.intel.insights.topDeals.length) {
            const deal = data.intel.insights.topDeals[0];
            intelLines.push(`• Best competitor deal: *${deal.dealName}* at $${deal.price} — ${deal.competitorName}`);
        }

        if (data.intel.insights.pricingGaps.length) {
            for (const gap of data.intel.insights.pricingGaps.slice(0, 2)) {
                intelLines.push(`• ${gap.category}: we are *${gap.marketPosition}* market avg · ${gap.opportunity}`);
            }
        }

        if (data.intel.insights.marketTrends.length) {
            intelLines.push(`• Trend: ${data.intel.insights.marketTrends[0]}`);
        }

        if (intelLines.length) {
            const ageHours = Math.round((Date.now() - new Date(data.intel.generatedAt).getTime()) / 3_600_000);
            const freshness = ageHours < 24 ? 'fresh' : `${Math.floor(ageHours / 24)}d old`;

            blocks.push({ type: 'divider' });
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🕵️ Competitor Intel* _(${freshness})_\n${intelLines.join('\n')}`,
                },
            });
        }
    }

    // ✅ Manager Action Items
    if (data.actionItems.length) {
        const actions = data.actionItems.map((item, i) => `${i + 1}. ${item}`).join('\n');
        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*✅ Today's Action Items*\n${actions}` },
        });
    }

    // 🎉 Holiday Hours Watch (only when a holiday is within 7 days)
    if (data.nearestHoliday) {
        const h = data.nearestHoliday;
        const emoji = h.trafficImpact === 'high' ? '🎉' : '📅';
        const urgency = h.daysUntil === 0 ? 'TODAY' : h.daysUntil === 1 ? 'tomorrow' : `in ${h.daysUntil} days`;

        const headerLine = `*${emoji} Holiday Hours Watch — ${h.name} (${urgency})*`;
        const tipLine = h.likelyHoursChange
            ? `_${h.name} often causes hours changes — confirm your hours on Weedmaps & Google._`
            : `_${h.name} is typically a normal operating day._`;

        let competitorSection = '';
        if (data.competitorHolidays.length > 0) {
            competitorSection = '\n\n*Nearby competitors:*\n' + formatHoursForSlack(data.competitorHolidays, h);
        }

        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${headerLine}\n${tipLine}${competitorSection}`,
            },
        });
    }

    // Footer
    blocks.push({ type: 'divider' });
    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: `_Uncle Elroy · Thrive Syracuse · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}_`,
        }],
    });

    return blocks;
}
