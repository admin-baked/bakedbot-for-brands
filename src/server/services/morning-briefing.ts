/**
 * Morning Briefing Service
 *
 * Generates a proactive daily AnalyticsBriefing for each org and posts it to
 * the org's dedicated "Daily Briefing" inbox thread as an `analytics_briefing`
 * artifact. Designed to run every morning at 8 AM EST via Cloud Scheduler.
 *
 * Cloud Scheduler job (manual creation):
 *   Name:     morning-briefing
 *   Schedule: 0 13 * * *  (8 AM EST = 1 PM UTC)
 *   URL:      https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/morning-briefing
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { getMarketBenchmarks } from '@/server/services/market-benchmarks';
import { getDispensaryGreenLedgerSummary } from '@/server/services/greenledger';
import { getOutreachStats } from '@/server/services/ny-outreach/outreach-service';
import { getMeetingsForDay, getUpcomingMeetingsToday, getTomorrowsMeetings } from '@/server/services/calendar-digest';
import { getEmailDigest, findSuperUserUid } from '@/server/services/email-digest';
import {
    getContentAnalyticsSignals,
    type ContentAnalyticsSnapshot,
} from '@/server/services/content-engine/analytics-signals';
import { jinaSearch } from '@/server/tools/jina-tools';
import type { AnalyticsBriefing, BriefingMetric, BriefingNewsItem, BriefingMeeting, BriefingEmailDigest } from '@/types/inbox';
import {
    createInboxThreadId,
    createInboxArtifactId,
} from '@/types/inbox';

const PLATFORM_SIGNAL_ORG_IDS = new Set([
    'org_bakedbot_platform',
    'bakedbot_super_admin',
    'bakedbot-internal',
]);

// ============ Internal data loaders (no auth — cron context) ============

interface ProductRow {
    id: string;
    name: string;
    category?: string;
    price?: number;
    cost?: number;
    salesLast30Days?: number;
    salesLast7Days?: number;
    salesVelocity?: number;
    lastSaleAt?: unknown;
    stock?: number;
}

interface OrderRow {
    id: string;
    totalPrice?: number;
    subtotal?: number;
    discountAmount?: number;
    itemCount?: number;
    type?: string;
    createdAt?: unknown;
}

function toDate(val: unknown): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'object' && '_seconds' in (val as Record<string, unknown>)) {
        return new Date((val as { _seconds: number })._seconds * 1000);
    }
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return null;
}

async function loadOrgProducts(orgId: string): Promise<ProductRow[]> {
    const db = getAdminFirestore();
    try {
        const snap = await db
            .collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .limit(500)
            .get();
        if (!snap.empty) {
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRow));
        }
    } catch {
        // fallback
    }
    // Fallback: top-level products collection
    try {
        const snap = await db
            .collection('products')
            .where('orgId', '==', orgId)
            .limit(500)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRow));
    } catch {
        return [];
    }
}

async function loadYesterdayOrders(orgId: string): Promise<OrderRow[]> {
    const db = getAdminFirestore();
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    try {
        const snap = await db
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', yesterdayStart)
            .where('createdAt', '<=', yesterdayEnd)
            .limit(200)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderRow));
    } catch {
        return [];
    }
}

async function loadLast7DaysOrders(orgId: string): Promise<OrderRow[]> {
    const db = getAdminFirestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    try {
        const snap = await db
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', sevenDaysAgo)
            .limit(500)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderRow));
    } catch {
        return [];
    }
}

// ============ Metric builders ============

function orderRevenue(o: OrderRow): number {
    return o.totalPrice ?? o.subtotal ?? 0;
}

function orderDiscount(o: OrderRow): number {
    return o.discountAmount ?? 0;
}

interface GreenLedgerSummaryRow {
    totalCommittedUsd: number;
    activeAdvancesCount: number;
    savedThisMonthUsd: number;
    savedAllTimeUsd: number;
    avgDiscountPct: number;
}

interface OutreachStatsRow {
    totalSent: number;
    totalFailed: number;
    totalBadEmails: number;
}

interface PendingReviewCounts {
    pendingOutreachDrafts: number;
    pendingBlogDrafts: number;
    unenrichedLeads: number;
}

interface PlatformGrowthStats {
    activeCustomers: number;
    estimatedMrr: number;
    newLast30Days: number;
}

interface OutreachFunnel {
    totalLeads: number;
    researched: number;
    sent: number;
    pendingDrafts: number;
    responded: number;
}

/**
 * P1: Load platform-level growth stats (MRR + customer count) from claims.
 * Super-user only — queries cross-org claims collection.
 */
async function loadPlatformGrowthStats(): Promise<PlatformGrowthStats> {
    const db = getAdminFirestore();
    try {
        const [activeClaimsSnap, newClaimsSnap] = await Promise.allSettled([
            db.collection('claims').where('status', 'in', ['active', 'verified', 'pending_verification']).get(),
            db.collection('claims')
                .where('status', 'in', ['active', 'verified', 'pending_verification'])
                .where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                .get(),
        ]);
        const activeClaims = activeClaimsSnap.status === 'fulfilled' ? activeClaimsSnap.value.docs : [];
        const newClaims = newClaimsSnap.status === 'fulfilled' ? newClaimsSnap.value.docs : [];
        const estimatedMrr = activeClaims.reduce((sum, d) => {
            const price = d.data().planPrice as number | undefined;
            return sum + (typeof price === 'number' ? price : 0);
        }, 0);
        return {
            activeCustomers: activeClaims.length,
            estimatedMrr,
            newLast30Days: newClaims.length,
        };
    } catch {
        return { activeCustomers: 0, estimatedMrr: 0, newLast30Days: 0 };
    }
}

/**
 * P4: Load NY outreach funnel counts — stages from discovery to response.
 */
async function loadOutreachFunnel(): Promise<OutreachFunnel> {
    const db = getAdminFirestore();
    const [totalSnap, researchedSnap, sentSnap, draftsSnap, respondedSnap] = await Promise.allSettled([
        db.collection('ny_dispensary_leads').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'researched').where('outreachSent', '==', false).count().get(),
        db.collection('ny_dispensary_leads').where('outreachSent', '==', true).count().get(),
        db.collection('ny_outreach_drafts').where('status', '==', 'draft').count().get(),
        db.collection('ny_dispensary_leads').where('status', '==', 'responded').count().get(),
    ]);
    return {
        totalLeads: totalSnap.status === 'fulfilled' ? totalSnap.value.data().count : 0,
        researched: researchedSnap.status === 'fulfilled' ? researchedSnap.value.data().count : 0,
        sent: sentSnap.status === 'fulfilled' ? sentSnap.value.data().count : 0,
        pendingDrafts: draftsSnap.status === 'fulfilled' ? draftsSnap.value.data().count : 0,
        responded: respondedSnap.status === 'fulfilled' ? respondedSnap.value.data().count : 0,
    };
}

/**
 * Load today's meetings from BakedBot + Google Calendar.
 */
async function loadTodaysMeetings(): Promise<BriefingMeeting[]> {
    try {
        const items = await getMeetingsForDay(new Date());
        return items.map(m => ({
            title: m.title,
            startTime: m.startTime,
            source: m.source,
            attendee: m.attendee,
            profileSlug: m.profileSlug,
        }));
    } catch {
        return [];
    }
}

/**
 * Load email digest for the super user (overnight emails since midnight).
 */
async function loadEmailDigest(sinceMs?: number): Promise<BriefingEmailDigest | null> {
    try {
        const uid = await findSuperUserUid();
        if (!uid) return null;
        const since = sinceMs ?? (() => {
            const midnight = new Date();
            midnight.setHours(0, 0, 0, 0);
            return midnight.getTime();
        })();
        const digest = await getEmailDigest(uid, since);
        if (!digest) return null;
        return {
            unreadCount: digest.unreadCount,
            topEmails: digest.topEmails,
            checkedAt: digest.checkedAt,
        };
    } catch {
        return null;
    }
}

async function loadContentAnalyticsSnapshotForBriefing(orgId: string): Promise<ContentAnalyticsSnapshot | null> {
    if (!PLATFORM_SIGNAL_ORG_IDS.has(orgId)) {
        return null;
    }

    try {
        const uid = await findSuperUserUid();
        return await getContentAnalyticsSignals(uid || undefined);
    } catch (error) {
        logger.warn('[MorningBriefing] Failed to load content analytics snapshot', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

/**
 * Load counts of items awaiting super user review.
 * Added to the morning briefing so the inbox artifact surfaces actionable items.
 */
async function loadPendingCounts(): Promise<PendingReviewCounts> {
    const db = getAdminFirestore();
    const [draftsSnap, blogSnap, leadsSnap] = await Promise.all([
        db.collection('ny_outreach_drafts').where('status', '==', 'draft').count().get(),
        db.collection('blog_posts').where('status', '==', 'draft').count().get(),
        db.collection('ny_dispensary_leads').where('enriched', '==', false).count().get(),
    ]);
    return {
        pendingOutreachDrafts: draftsSnap.data().count,
        pendingBlogDrafts: blogSnap.data().count,
        unenrichedLeads: leadsSnap.data().count,
    };
}

function buildMetrics(
    yesterdayOrders: OrderRow[],
    last7Orders: OrderRow[],
    products: ProductRow[],
    benchmarks: Awaited<ReturnType<typeof getMarketBenchmarks>>,
    greenledger?: GreenLedgerSummaryRow | null,
    outreachStats?: OutreachStatsRow | null,
    pendingCounts?: PendingReviewCounts | null,
    platformGrowth?: PlatformGrowthStats | null,
    outreachFunnel?: OutreachFunnel | null,
    contentAnalytics?: ContentAnalyticsSnapshot | null,
): BriefingMetric[] {
    const metrics: BriefingMetric[] = [];

    // 1. Net Sales Yesterday
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + orderRevenue(o), 0);
    const avgDailyRevenue7d =
        last7Orders.reduce((sum, o) => sum + orderRevenue(o), 0) / 7;
    let netSalesTrend: 'up' | 'down' | 'flat' = 'flat';
    if (avgDailyRevenue7d > 0) {
        const delta = yesterdayRevenue - avgDailyRevenue7d;
        if (delta > avgDailyRevenue7d * 0.05) netSalesTrend = 'up';
        else if (delta < -avgDailyRevenue7d * 0.05) netSalesTrend = 'down';
    }
    metrics.push({
        title: 'Net Sales Yesterday',
        value: `$${Math.round(yesterdayRevenue).toLocaleString()}`,
        trend: netSalesTrend,
        vsLabel: 'vs. 7-day avg',
        status: 'good',
        actionable: netSalesTrend === 'down' ? 'Review peak hour performance' : undefined,
    });

    // 2. Discount Rate (7-day avg)
    const totalRevenue7d = last7Orders.reduce((sum, o) => sum + orderRevenue(o), 0);
    const totalDiscount7d = last7Orders.reduce((sum, o) => sum + orderDiscount(o), 0);
    const discountRate7d = totalRevenue7d > 0 ? totalDiscount7d / totalRevenue7d : 0;
    const target = benchmarks.financial.discountRateTarget;
    let discountStatus: BriefingMetric['status'] = 'good';
    if (discountRate7d > target + 0.05) discountStatus = 'critical';
    else if (discountRate7d > target - 0.03) discountStatus = 'warning';
    metrics.push({
        title: 'Discount Rate (7-day avg)',
        value: `${(discountRate7d * 100).toFixed(1)}%`,
        trend: discountRate7d > target ? 'up' : 'down',
        vsLabel: `vs. ${(target * 100).toFixed(0)}% market target`,
        status: discountStatus,
        actionable:
            discountStatus !== 'good'
                ? `Target is ${(target * 100).toFixed(0)}% — ask Pops for a discount audit`
                : undefined,
    });

    // 3. Top Margin Drain
    const marginDrains = products
        .filter(p => {
            if (!p.price || !p.cost) return false;
            const margin = (p.price - p.cost) / p.price;
            return margin < 0.15 && (p.salesLast30Days ?? 0) > 0;
        })
        .sort((a, b) => (b.salesLast30Days ?? 0) - (a.salesLast30Days ?? 0));
    if (marginDrains.length > 0) {
        const worst = marginDrains[0];
        const margin = worst.price && worst.cost
            ? ((worst.price - worst.cost) / worst.price * 100).toFixed(0)
            : '?';
        metrics.push({
            title: 'Top Margin Drain',
            value: worst.name ? `${worst.name} (${margin}% margin)` : 'Unknown SKU',
            trend: 'down',
            vsLabel: '<15% margin threshold',
            status: 'warning',
            actionable: 'Reprice or discontinue this SKU',
        });
    } else {
        metrics.push({
            title: 'Top Margin Drain',
            value: 'No drains detected',
            trend: 'flat',
            vsLabel: '30-day lookback',
            status: 'good',
        });
    }

    // 4. Inventory At Risk (60+ days no sale)
    const now = Date.now();
    const atRisk = products.filter(p => {
        const lastSale = toDate(p.lastSaleAt);
        if (!lastSale) return (p.stock ?? 0) > 0;
        const days = (now - lastSale.getTime()) / 86_400_000;
        return days > 60 && (p.stock ?? 0) > 0;
    });
    const atRiskValue = atRisk.reduce((sum, p) => sum + (p.price ?? 0) * (p.stock ?? 1), 0);
    metrics.push({
        title: 'Inventory At Risk',
        value: `$${Math.round(atRiskValue).toLocaleString()} (${atRisk.length} SKUs)`,
        trend: atRiskValue > 0 ? 'down' : 'flat',
        vsLabel: '60+ days no sale',
        status: atRiskValue > 5000 ? 'warning' : 'good',
        actionable: atRiskValue > 0 ? 'Consider markdown or liquidation' : undefined,
    });

    // 5. Active SKU Count
    const activeSku = products.filter(p => (p.stock ?? 0) > 0).length;
    metrics.push({
        title: 'Active SKU Count',
        value: `${activeSku}`,
        trend: 'flat',
        vsLabel: 'in stock',
        status: 'good',
    });

    // 6. GreenLedger Advance Savings (if active)
    if (greenledger && greenledger.activeAdvancesCount > 0) {
        const lowBalance = greenledger.totalCommittedUsd < 500 && greenledger.activeAdvancesCount > 0;
        metrics.push({
            title: 'GreenLedger Savings',
            value: `$${Math.round(greenledger.savedThisMonthUsd).toLocaleString()} this month`,
            trend: 'up',
            vsLabel: `${greenledger.activeAdvancesCount} active advance${greenledger.activeAdvancesCount > 1 ? 's' : ''} · avg ${greenledger.avgDiscountPct.toFixed(0)}% off`,
            status: lowBalance ? 'warning' : 'good',
            actionable: lowBalance
                ? `⚡ Low escrow balance ($${Math.round(greenledger.totalCommittedUsd).toLocaleString()} remaining) — top up to keep discounts active`
                : undefined,
        });
    }

    // 7. NY Outreach Pipeline (super user only — shown when stats exist)
    if (outreachStats && (outreachStats.totalSent > 0 || outreachStats.totalFailed > 0)) {
        const hasFailures = outreachStats.totalFailed > 0 || outreachStats.totalBadEmails > 0;
        metrics.push({
            title: 'NY Outreach (24h)',
            value: `${outreachStats.totalSent} sent`,
            trend: outreachStats.totalSent > 0 ? 'up' : 'flat',
            vsLabel: `${outreachStats.totalBadEmails} bad emails · ${outreachStats.totalFailed} failed`,
            status: hasFailures ? 'warning' : 'good',
            actionable: hasFailures
                ? 'Check outreach digest for delivery issues'
                : undefined,
        });
    }

    // 8. Pending Review Items — surface actionable queue to super user each morning
    if (pendingCounts && (pendingCounts.pendingOutreachDrafts > 0 || pendingCounts.pendingBlogDrafts > 0)) {
        const items: string[] = [];
        if (pendingCounts.pendingOutreachDrafts > 0) {
            items.push(`${pendingCounts.pendingOutreachDrafts} outreach draft${pendingCounts.pendingOutreachDrafts !== 1 ? 's' : ''}`);
        }
        if (pendingCounts.pendingBlogDrafts > 0) {
            items.push(`${pendingCounts.pendingBlogDrafts} blog draft${pendingCounts.pendingBlogDrafts !== 1 ? 's' : ''}`);
        }
        const leadsNote = pendingCounts.unenrichedLeads > 0
            ? ` · ${pendingCounts.unenrichedLeads} leads need enrichment`
            : '';
        metrics.push({
            title: 'Action Required Today',
            value: items.join(' · '),
            trend: 'flat',
            vsLabel: `awaiting review${leadsNote}`,
            status: 'warning',
            actionable: 'Open Outreach and Content tabs to review and approve',
        });
    }

    // P1 — 9. Platform Growth (MRR + customer count) — super user only
    if (platformGrowth && (platformGrowth.activeCustomers > 0 || platformGrowth.estimatedMrr > 0)) {
        const mrrLabel = platformGrowth.estimatedMrr > 0
            ? `$${Math.round(platformGrowth.estimatedMrr).toLocaleString()}/mo`
            : 'Calculating…';
        const arrLabel = platformGrowth.estimatedMrr > 0
            ? ` · ARR $${Math.round(platformGrowth.estimatedMrr * 12 / 1000).toLocaleString()}k`
            : '';
        const newLabel = platformGrowth.newLast30Days > 0
            ? ` · +${platformGrowth.newLast30Days} new (30d)`
            : '';
        const toGoalPct = platformGrowth.estimatedMrr > 0
            ? Math.min(100, (platformGrowth.estimatedMrr / 833_333 * 100)).toFixed(1) // $10M ARR = $833k MRR
            : null;
        metrics.push({
            title: 'Platform MRR',
            value: mrrLabel,
            trend: platformGrowth.newLast30Days > 0 ? 'up' : 'flat',
            vsLabel: `${platformGrowth.activeCustomers} active customers${arrLabel}${newLabel}`,
            status: 'good',
            actionable: toGoalPct !== null
                ? `${toGoalPct}% to $10M ARR goal — need $${Math.round((833_333 - platformGrowth.estimatedMrr) / 1000).toLocaleString()}k more MRR`
                : undefined,
        });
    }

    if (contentAnalytics) {
        if (!contentAnalytics.gaConnected && !contentAnalytics.gscConnected) {
            metrics.push({
                title: 'Growth Signals',
                value: 'GA + GSC disconnected',
                trend: 'flat',
                vsLabel: 'content engine lacks live search data',
                status: 'warning',
                actionable: 'Reconnect Google Analytics and Search Console in Settings',
            });
        } else {
            metrics.push({
                title: 'Content Sessions (28-day)',
                value: contentAnalytics.kpis.blogSessions28d !== null
                    ? `${contentAnalytics.kpis.blogSessions28d.toLocaleString()} blog sessions`
                    : 'GA not connected',
                trend: contentAnalytics.kpis.blogSessions28d && contentAnalytics.kpis.blogSessions28d > 0 ? 'up' : 'flat',
                vsLabel: contentAnalytics.kpis.sessions28d !== null
                    ? `${contentAnalytics.kpis.sessions28d.toLocaleString()} total sessions`
                    : 'Google Analytics signal',
                status: contentAnalytics.gaConnected ? 'good' : 'warning',
                actionable: !contentAnalytics.gaConnected
                    ? 'Connect Google Analytics in Settings'
                    : contentAnalytics.topContentPages[0]
                    ? `Refresh ${contentAnalytics.topContentPages[0].path} while it is already earning traffic`
                    : undefined,
            });

            metrics.push({
                title: 'Search Visibility (28-day)',
                value: contentAnalytics.kpis.impressions28d !== null
                    ? `${contentAnalytics.kpis.impressions28d.toLocaleString()} impressions`
                    : 'GSC not connected',
                trend: contentAnalytics.kpis.avgPosition28d !== null && contentAnalytics.kpis.avgPosition28d <= 10 ? 'up' : 'flat',
                vsLabel: contentAnalytics.kpis.clicks28d !== null
                    ? `${contentAnalytics.kpis.clicks28d.toLocaleString()} clicks · CTR ${(contentAnalytics.kpis.ctr28d ?? 0).toFixed(2)}% · avg pos ${(contentAnalytics.kpis.avgPosition28d ?? 0).toFixed(1)}`
                    : 'Search Console signal',
                status: !contentAnalytics.gscConnected
                    ? 'warning'
                    : contentAnalytics.kpis.avgPosition28d !== null && contentAnalytics.kpis.avgPosition28d <= 15
                    ? 'good'
                    : 'warning',
                actionable: !contentAnalytics.gscConnected
                    ? 'Connect Search Console in Settings'
                    : contentAnalytics.topQueries[0]
                    ? `Create or refresh content for "${contentAnalytics.topQueries[0].query}"`
                    : undefined,
            });

            const prioritySignal = contentAnalytics.recommendations[0];
            if (prioritySignal) {
                metrics.push({
                    title: 'Content Priority',
                    value: prioritySignal.topic.length > 48
                        ? `${prioritySignal.topic.slice(0, 45)}...`
                        : prioritySignal.topic,
                    trend: prioritySignal.source === 'search_console' ? 'up' : 'flat',
                    vsLabel: prioritySignal.supportingMetric,
                    status: prioritySignal.source === 'competitive_intel' ? 'warning' : 'good',
                    actionable: `Open Content Engine and generate a ${prioritySignal.contentType} draft`,
                });
            }
        }
    }

    // P4 — 10. Outreach Conversion Funnel — super user only
    if (outreachFunnel && outreachFunnel.totalLeads > 0) {
        const conversionRate = outreachFunnel.sent > 0 && outreachFunnel.totalLeads > 0
            ? ((outreachFunnel.sent / outreachFunnel.totalLeads) * 100).toFixed(1)
            : '0';
        const responseRate = outreachFunnel.sent > 0 && outreachFunnel.responded > 0
            ? ` · ${((outreachFunnel.responded / outreachFunnel.sent) * 100).toFixed(1)}% reply rate`
            : '';
        const hasPendingDrafts = outreachFunnel.pendingDrafts > 0;
        metrics.push({
            title: 'NY Outreach Funnel',
            value: `${outreachFunnel.totalLeads.toLocaleString()} leads → ${outreachFunnel.sent} sent`,
            trend: outreachFunnel.sent > 0 ? 'up' : 'flat',
            vsLabel: `${outreachFunnel.researched} ready · ${conversionRate}% contacted${responseRate}`,
            status: hasPendingDrafts ? 'warning' : 'good',
            actionable: hasPendingDrafts
                ? `${outreachFunnel.pendingDrafts} draft${outreachFunnel.pendingDrafts !== 1 ? 's' : ''} awaiting approval — approve to advance pipeline`
                : outreachFunnel.researched > 10
                ? `${outreachFunnel.researched} researched leads ready — run outreach to advance pipeline`
                : undefined,
        });
    }

    return metrics;
}

// ============ Core generation function ============

export async function generateMorningBriefing(orgId: string): Promise<AnalyticsBriefing> {
    const [benchmarks, products, yesterdayOrders, last7Orders, greenledgerSummary, outreachStatsResult, pendingCountsResult, meetingsResult, emailDigestResult, platformGrowthResult, outreachFunnelResult, contentAnalyticsResult] = await Promise.allSettled([
        getMarketBenchmarks(orgId),
        loadOrgProducts(orgId),
        loadYesterdayOrders(orgId),
        loadLast7DaysOrders(orgId),
        getDispensaryGreenLedgerSummary(orgId),
        getOutreachStats(Date.now() - 24 * 60 * 60 * 1000),
        loadPendingCounts(),
        loadTodaysMeetings(),
        loadEmailDigest(), // emails since midnight
        loadPlatformGrowthStats(), // P1: MRR + customer count
        loadOutreachFunnel(),      // P4: outreach pipeline funnel
        loadContentAnalyticsSnapshotForBriefing(orgId),
    ]);

    const bm = benchmarks.status === 'fulfilled' ? benchmarks.value : await getMarketBenchmarks('');
    const prods = products.status === 'fulfilled' ? products.value : [];
    const yesterdayOrds = yesterdayOrders.status === 'fulfilled' ? yesterdayOrders.value : [];
    const last7Ords = last7Orders.status === 'fulfilled' ? last7Orders.value : [];
    const glSummary = greenledgerSummary.status === 'fulfilled' ? greenledgerSummary.value : null;
    const outreachStats = outreachStatsResult.status === 'fulfilled' ? outreachStatsResult.value : null;
    const pendingCounts = pendingCountsResult.status === 'fulfilled' ? pendingCountsResult.value : null;
    const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
    const emailDigest = emailDigestResult.status === 'fulfilled' ? emailDigestResult.value : null;
    const platformGrowth = platformGrowthResult.status === 'fulfilled' ? platformGrowthResult.value : null;
    const outreachFunnel = outreachFunnelResult.status === 'fulfilled' ? outreachFunnelResult.value : null;
    const contentAnalytics = contentAnalyticsResult.status === 'fulfilled' ? contentAnalyticsResult.value : null;

    // Build metrics
    const metrics = buildMetrics(yesterdayOrds, last7Ords, prods, bm, glSummary, outreachStats, pendingCounts, platformGrowth, outreachFunnel, contentAnalytics);

    // Read industry news from pre-warmed cache (written at 5:30 AM by industry-pulse-refresh cron)
    let newsItems: BriefingNewsItem[] = [];
    try {
        const db = getAdminFirestore();
        const cacheDoc = await db.collection('platform_cache').doc('news_ideas_default').get();
        if (cacheDoc.exists) {
            const cached = cacheDoc.data()!;
            const results = (cached.results || []) as Array<{ title: string; url: string }>;
            newsItems = results.slice(0, 5).map(r => ({
                headline: r.title,
                source: new URL(r.url).hostname.replace('www.', ''),
                url: r.url,
                relevance: 'high' as const, // Claude-analyzed angles, higher signal than raw search
            }));
        }
    } catch {
        // cache miss — fall back to live Jina search
    }
    if (newsItems.length === 0) {
        try {
            const stateCode = bm.context.stateCode || 'NY';
            const results = await jinaSearch(`cannabis dispensary industry news ${stateCode} 2026`);
            newsItems = results.slice(0, 5).map(r => ({
                headline: r.title,
                source: new URL(r.url).hostname.replace('www.', ''),
                url: r.url,
                relevance: 'medium' as const,
            }));
        } catch {
            // news is non-critical
        }
    }

    // Determine urgency level
    const hasCritical = metrics.some(m => m.status === 'critical');
    const hasWarning = metrics.some(m => m.status === 'warning');
    let urgencyLevel: AnalyticsBriefing['urgencyLevel'] = 'clean';
    if (hasCritical) urgencyLevel = 'critical';
    else if (hasWarning) urgencyLevel = 'warning';
    else if (newsItems.some(n => n.relevance === 'high')) urgencyLevel = 'info';

    // Top alert if discount rate is 5%+ above target
    const discountMetric = metrics.find(m => m.title === 'Discount Rate (7-day avg)');
    let topAlert: string | undefined;
    if (discountMetric?.status === 'critical') {
        const target = bm.financial.discountRateTarget;
        const current = parseFloat(discountMetric.value) / 100;
        const gpImpact = ((current - target) * 0.4 * 100).toFixed(1);
        topAlert = `⚠️ Discount rate ${discountMetric.value} is above your ${(target * 100).toFixed(0)}% market target — ~${gpImpact}% est. gross margin impact`;
    }

    // Market context string
    const marketContext = PLATFORM_SIGNAL_ORG_IDS.has(orgId)
        ? 'BakedBot Platform | Cannabis Tech AI'
        : (() => {
            const licenseLabel = bm.context.licenseType === 'limited' ? 'Limited License' : 'Unlimited';
            const maturityLabel = bm.context.marketMaturity
                ? bm.context.marketMaturity.charAt(0).toUpperCase() + bm.context.marketMaturity.slice(1) + ' Market'
                : 'Developing Market';
            return `${bm.context.stateCode || 'US'} ${licenseLabel} | ${maturityLabel}`;
        })();

    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
        date: now.toISOString().split('T')[0],
        dayOfWeek: dayNames[now.getDay()],
        metrics,
        newsItems,
        urgencyLevel,
        topAlert,
        marketContext,
        meetings: meetings.length > 0 ? meetings : undefined,
        emailDigest: emailDigest ?? undefined,
        pulseType: 'morning',
    };
}

// ============ Day Pulse (midday / evening) ============

/**
 * Generate a lighter midday or evening pulse briefing.
 * Midday: remaining meetings today + emails since morning + pending review.
 * Evening: tomorrow's meetings preview + end-of-day email roundup.
 */
export async function generateDayPulse(pulseType: 'midday' | 'evening'): Promise<AnalyticsBriefing> {
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Email window: midday = last 6h; evening = last 8h
    const emailSinceMs = pulseType === 'midday'
        ? now.getTime() - 6 * 60 * 60 * 1000
        : now.getTime() - 8 * 60 * 60 * 1000;

    const [meetingsResult, emailDigestResult, pendingCountsResult] = await Promise.allSettled([
        pulseType === 'midday' ? getUpcomingMeetingsToday() : getTomorrowsMeetings(),
        loadEmailDigest(emailSinceMs),
        loadPendingCounts(),
    ]);

    const rawMeetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
    const emailDigest = emailDigestResult.status === 'fulfilled' ? emailDigestResult.value : null;
    const pendingCounts = pendingCountsResult.status === 'fulfilled' ? pendingCountsResult.value : null;

    const meetings: BriefingMeeting[] = rawMeetings.map(m => ({
        title: m.title,
        startTime: m.startTime,
        source: m.source,
        attendee: m.attendee,
        profileSlug: m.profileSlug,
    }));

    // Lightweight metrics — only pending review items
    const metrics: BriefingMetric[] = [];
    if (pendingCounts && (pendingCounts.pendingOutreachDrafts > 0 || pendingCounts.pendingBlogDrafts > 0)) {
        const items: string[] = [];
        if (pendingCounts.pendingOutreachDrafts > 0) items.push(`${pendingCounts.pendingOutreachDrafts} outreach draft${pendingCounts.pendingOutreachDrafts !== 1 ? 's' : ''}`);
        if (pendingCounts.pendingBlogDrafts > 0) items.push(`${pendingCounts.pendingBlogDrafts} blog draft${pendingCounts.pendingBlogDrafts !== 1 ? 's' : ''}`);
        metrics.push({
            title: 'Pending Review',
            value: items.join(' · '),
            trend: 'flat',
            vsLabel: 'awaiting your approval',
            status: 'warning',
            actionable: 'Open Outreach and Content tabs to review and approve',
        });
    }

    const contextLabels = {
        midday: 'Midday Check-In',
        evening: "Tomorrow's Preview",
    };

    return {
        date: now.toISOString().split('T')[0],
        dayOfWeek: dayNames[now.getDay()],
        metrics,
        newsItems: [],
        urgencyLevel: metrics.length > 0 ? 'warning' : 'clean',
        marketContext: contextLabels[pulseType],
        meetings: meetings.length > 0 ? meetings : undefined,
        emailDigest: emailDigest ?? undefined,
        pulseType,
    };
}

// ============ Inbox post functions ============

/**
 * Post any AnalyticsBriefing to the org's Daily Briefing thread.
 * Used by midday-pulse and evening-pulse crons.
 */
export async function postPulseToInbox(orgId: string, briefing: AnalyticsBriefing): Promise<void> {
    const db = getAdminFirestore();
    const THREADS = 'inbox_threads';
    const ARTIFACTS = 'inbox_artifacts';

    let threadId: string;
    const existing = await db
        .collection(THREADS)
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    if (!existing.empty) {
        threadId = existing.docs[0].id;
    } else {
        threadId = createInboxThreadId();
        await db.collection(THREADS).doc(threadId).set({
            id: threadId,
            orgId,
            userId: 'system',
            type: 'analytics',
            status: 'active',
            title: '📊 Daily Briefing',
            preview: 'Proactive daily analytics briefing',
            primaryAgent: 'pops',
            assignedAgents: ['pops'],
            artifactIds: [],
            messages: [],
            metadata: { isBriefingThread: true },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    const pulseLabels = { morning: 'morning briefing', midday: 'midday check-in', evening: 'evening preview' };
    const pulseLabel = pulseLabels[briefing.pulseType ?? 'morning'];

    const artifactId = createInboxArtifactId();
    await db.collection(ARTIFACTS).doc(artifactId).set({
        id: artifactId,
        threadId,
        orgId,
        type: 'analytics_briefing',
        status: 'approved',
        data: briefing,
        rationale: `Proactive ${pulseLabel} generated automatically`,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(THREADS).doc(threadId).update({
        artifactIds: FieldValue.arrayUnion(artifactId),
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preview: `${briefing.dayOfWeek} ${pulseLabel} — ${briefing.urgencyLevel}`,
    });

    logger.info('[Briefing] Posted pulse to inbox', {
        orgId,
        threadId,
        artifactId,
        pulseType: briefing.pulseType,
        urgencyLevel: briefing.urgencyLevel,
    });
}

export async function postMorningBriefingToInbox(orgId: string): Promise<void> {
    const briefing = await generateMorningBriefing(orgId);
    await postPulseToInbox(orgId, briefing);
    logger.info('[MorningBriefing] Posted morning briefing', {
        orgId,
        urgencyLevel: briefing.urgencyLevel,
        metricsCount: briefing.metrics.length,
        meetings: briefing.meetings?.length ?? 0,
        emailUnread: briefing.emailDigest?.unreadCount ?? 0,
    });
}
