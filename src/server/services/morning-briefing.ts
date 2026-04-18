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
import {
    formatSlowMoverMetricValue,
    getSlowMoverMetric,
} from '@/lib/slow-mover-metrics';
import { loadSlowMoverInsight, type SlowMoverInsight } from '@/server/services/slow-mover-insight';
import {
    computeCohortData,
    getLastCohortReportDate,
    postCohortReportToInbox,
} from '@/server/actions/cohort-analytics';
import { getMeetingsForDay, getUpcomingMeetingsToday, getTomorrowsMeetings } from '@/server/services/calendar-digest';
import { getEmailDigest, findSuperUserUid } from '@/server/services/email-digest';
import {
    getContentAnalyticsSignals,
    type ContentAnalyticsSnapshot,
} from '@/server/services/content-engine/analytics-signals';
import { jinaSearch } from '@/server/tools/jina-tools';
import {
    createOrReuseProactiveTask,
    attachProactiveTaskEvidence,
    linkTaskToInbox,
    transitionProactiveTask,
} from '@/server/services/proactive-task-service';
import { appendProactiveEvent } from '@/server/services/proactive-event-log';
import {
    listOpenCommitments,
    resolveCommitment,
    upsertCommitment,
} from '@/server/services/proactive-commitment-service';
import { recordProactiveOutcome } from '@/server/services/proactive-outcome-service';
import {
    getResolvedProactiveSnoozeHours,
    isProactiveWorkflowEnabled,
} from '@/server/services/proactive-settings';
import type {
    AnalyticsBriefing,
    BriefingMetric,
    BriefingNewsItem,
    BriefingMeeting,
    BriefingEmailDigest,
    InboxArtifactProactiveMetadata,
} from '@/types/inbox';
import type { ProactiveSeverity } from '@/types/proactive';
import {
    createInboxThreadId,
    createInboxArtifactId,
} from '@/types/inbox';
import {
    loadCatalogAnalyticsProducts,
    toAnalyticsDate,
    type CatalogAnalyticsProduct,
} from '@/server/services/catalog-analytics-source';
import { ANALYTICS_ORDER_STATUSES } from '@/app/dashboard/orders/order-utils';

const PLATFORM_SIGNAL_ORG_IDS = new Set([
    'org_bakedbot_platform',
    'bakedbot_super_admin',
    'bakedbot-internal',
]);

// ============ Internal data loaders (no auth — cron context) ============

type ProductRow = CatalogAnalyticsProduct;

interface OrderRow {
    id: string;
    orgId?: string;
    brandId?: string;
    // Top-level fields (some order sources)
    totalPrice?: number;
    subtotal?: number;
    discountAmount?: number;
    // Nested totals (Alleaves POS sync writes here)
    totals?: { total?: number; subtotal?: number; discount?: number; tax?: number };
    itemCount?: number;
    type?: string;
    status?: string;
    createdAt?: unknown;
}


async function loadOrgProducts(orgId: string): Promise<ProductRow[]> {
    return loadCatalogAnalyticsProducts(orgId);
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const normalized = trimmed.replace(/[^0-9.-]/g, '');
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
    const parsed = toFiniteNumber(value);
    return parsed == null ? fallback : Math.max(parsed, 0);
}

function normalizeOrderStatus(status: unknown): string {
    return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function hasAllowedAnalyticsStatus(order: OrderRow): boolean {
    const normalized = normalizeOrderStatus(order.status);
    return normalized
        ? ANALYTICS_ORDER_STATUSES.includes(normalized as (typeof ANALYTICS_ORDER_STATUSES)[number])
        : true;
}

async function queryOrdersByField(
    orgId: string,
    field: 'brandId' | 'orgId',
): Promise<OrderRow[]> {
    const db = getAdminFirestore();

    try {
        const snap = await db
            .collection('orders')
            .where(field, '==', orgId)
            .where('status', 'in', [...ANALYTICS_ORDER_STATUSES])
            .orderBy('createdAt', 'desc')
            .limit(500)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderRow));
    } catch (error) {
        logger.warn('[MorningBriefing] Primary orders query failed, retrying without status filter', {
            orgId,
            field,
            error: String(error),
        });

        try {
            const snap = await db
                .collection('orders')
                .where(field, '==', orgId)
                .orderBy('createdAt', 'desc')
                .limit(500)
                .get();
            return snap.docs
                .map(d => ({ id: d.id, ...d.data() } as OrderRow))
                .filter(hasAllowedAnalyticsStatus);
        } catch (fallbackError) {
            logger.warn('[MorningBriefing] Orders fallback query failed', {
                orgId,
                field,
                error: String(fallbackError),
            });
            return [];
        }
    }
}

async function loadOrdersInRange(orgId: string, start: Date, end?: Date): Promise<OrderRow[]> {
    const byBrand = await queryOrdersByField(orgId, 'brandId');
    const orders = byBrand.length > 0 ? byBrand : await queryOrdersByField(orgId, 'orgId');

    if (byBrand.length === 0 && orders.length > 0) {
        logger.info('[MorningBriefing] Orders fallback query by orgId used', {
            orgId,
            count: orders.length,
        });
    }

    return orders.filter((order) => {
        const createdAt = toAnalyticsDate(order.createdAt);
        if (!createdAt) {
            return false;
        }

        if (createdAt < start) {
            return false;
        }

        if (end && createdAt > end) {
            return false;
        }

        return true;
    });
}

async function loadYesterdayOrders(orgId: string): Promise<OrderRow[]> {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    try {
        return await loadOrdersInRange(orgId, yesterdayStart, yesterdayEnd);
    } catch (err) {
        logger.warn('[MorningBriefing] loadYesterdayOrders failed', { orgId, error: String(err) });
        return [];
    }
}

async function loadLast7DaysOrders(orgId: string): Promise<OrderRow[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    try {
        return await loadOrdersInRange(orgId, sevenDaysAgo);
    } catch (err) {
        logger.warn('[MorningBriefing] loadLast7DaysOrders failed', { orgId, error: String(err) });
        return [];
    }
}

// ============ Metric builders ============

function orderRevenue(o: OrderRow): number {
    // Alleaves POS sync writes revenue under totals.total; other sources use top-level totalPrice/subtotal
    return toNonNegativeNumber(o.totalPrice ?? o.subtotal ?? o.totals?.total ?? o.totals?.subtotal);
}

function orderDiscount(o: OrderRow): number {
    // Alleaves POS sync writes discount under totals.discount
    return toNonNegativeNumber(o.discountAmount ?? o.totals?.discount);
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
    isPlatformOrg: boolean = false,
    slowMovers?: SlowMoverInsight | null,
): BriefingMetric[] {
    const metrics: BriefingMetric[] = [];
    const hasTrackedOrderHistory = yesterdayOrders.length > 0 || last7Orders.length > 0;
    const activeProducts = products.filter(product => (product.stock ?? 0) > 0);
    const activeCategoryCount = new Set(
        activeProducts
            .map(product => product.category)
            .filter((category): category is string => typeof category === 'string' && category.trim().length > 0)
    ).size;

    // 1. Net Sales Yesterday
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + orderRevenue(o), 0);
    const avgDailyRevenue7d =
        last7Orders.reduce((sum, o) => sum + orderRevenue(o), 0) / 7;
    if (!hasTrackedOrderHistory) {
        metrics.push({
            title: 'Net Sales Yesterday',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: 'recent sales history is not backfilled yet',
            status: 'warning',
            actionable: 'Verify Firestore order sync or run the sales backfill before reading revenue trends',
        });
    } else {
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
            status: netSalesTrend === 'down' ? 'warning' : 'good',
            actionable: netSalesTrend === 'down' ? 'Review peak hour performance' : undefined,
        });
    }

    // 2. Discount Rate (7-day avg)
    const totalRevenue7d = last7Orders.reduce((sum, o) => sum + orderRevenue(o), 0);
    const totalDiscount7d = last7Orders.reduce((sum, o) => sum + orderDiscount(o), 0);
    const discountRate7d = totalRevenue7d > 0 ? totalDiscount7d / totalRevenue7d : 0;
    const target = benchmarks.financial.discountRateTarget;
    if (!hasTrackedOrderHistory || totalRevenue7d <= 0) {
        metrics.push({
            title: 'Discount Rate (7-day avg)',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: `need order totals to compare against the ${(target * 100).toFixed(0)}% market target`,
            status: 'warning',
            actionable: 'Backfill recent orders before auditing discount performance',
        });
    } else {
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
    }

    // 3. Top Margin Drain
    const marginVisibleProducts = products.filter(product => product.price > 0 && typeof product.cost === 'number');
    const marginDrains = marginVisibleProducts
        .filter(p => {
            if (!p.price || typeof p.cost !== 'number') return false;
            const margin = (p.price - p.cost) / p.price;
            return margin < 0.15 && (p.salesLast30Days ?? 0) > 0;
        })
        .sort((a, b) => (b.salesLast30Days ?? 0) - (a.salesLast30Days ?? 0));
    if (marginVisibleProducts.length === 0) {
        metrics.push({
            title: 'Top Margin Drain',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: 'cost data is not synced for the current catalog',
            status: 'warning',
            actionable: 'Sync landed cost data before using margin alerts',
        });
    } else if (marginDrains.length > 0) {
        const worst = marginDrains[0];
        const margin = worst.price && typeof worst.cost === 'number'
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

    // 4. Inventory At Risk — prefer deliberative pipeline result (cross-checked against Alleaves sales
    //    history) over the lastSaleAt field which POS sync does not write.
    if (slowMovers && slowMovers.totalValueAtRisk > 0) {
        const defaultMetric = getSlowMoverMetric(
            slowMovers.metricBundle,
            slowMovers.metricBundle?.defaultMetricId,
        );
        const metricValue = defaultMetric
            ? formatSlowMoverMetricValue(defaultMetric)
            : `$${Math.round(slowMovers.totalValueAtRisk).toLocaleString()}`;
        const metricOptions = slowMovers.metricBundle?.metrics.map((metric) => ({
            id: metric.id,
            label: metric.shortLabel,
            value: formatSlowMoverMetricValue(metric),
            tooltipText: metric.description,
            ...(metric.coverage?.note ? { coverageNote: metric.coverage.note } : {}),
            isDefault: metric.id === slowMovers.metricBundle?.defaultMetricId,
        }));

        metrics.push({
            title: 'Inventory At Risk',
            value: metricValue,
            trend: 'down',
            vsLabel: slowMovers.metricBundle?.summaryLine ?? 'slow-moving inventory · deliberative audit',
            status: slowMovers.totalValueAtRisk > 5000 ? 'warning' : 'good',
            actionable: 'Consider markdown or bundle deals — ask Elroy for the full list',
            ...(defaultMetric
                ? {
                    tooltipText: [
                        defaultMetric.description,
                        slowMovers.metricBundle?.metrics.find((metric) => metric.id === 'cost_basis')?.coverage?.note,
                    ].filter(Boolean).join(' '),
                  }
                : {}),
            ...(metricOptions && metricOptions.length > 0 ? { metricOptions } : {}),
        });
    } else {
    const now = Date.now();
    const inventoryAgeCandidates = activeProducts
        .map(product => ({ product, lastSale: toAnalyticsDate(product.lastSaleAt) }))
        .filter((entry): entry is { product: ProductRow; lastSale: Date } => entry.lastSale instanceof Date);
    if (inventoryAgeCandidates.length === 0) {
        metrics.push({
            title: 'Inventory At Risk',
            value: 'Unavailable',
            trend: 'flat',
            vsLabel: 'last-sale history is missing for in-stock SKUs',
            status: 'warning',
            actionable: 'Sync sell-through history before aging inventory decisions',
        });
    } else {
        const atRisk = inventoryAgeCandidates.filter(({ product, lastSale }) => {
            const days = (now - lastSale.getTime()) / 86_400_000;
            return days > 60 && (product.stock ?? 0) > 0;
        });
        const atRiskValue = atRisk.reduce((sum, { product }) => sum + (product.price ?? 0) * (product.stock ?? 1), 0);
        metrics.push({
            title: 'Inventory At Risk',
            value: `$${Math.round(atRiskValue).toLocaleString()} (${atRisk.length} SKUs)`,
            trend: atRiskValue > 0 ? 'down' : 'flat',
            vsLabel: '60+ days no sale',
            status: atRiskValue > 5000 ? 'warning' : 'good',
            actionable: atRiskValue > 0 ? 'Consider markdown or liquidation' : undefined,
        });
    }
    } // end slow-movers else

    // 5. Active SKU Count
    const activeSku = activeProducts.length;
    metrics.push({
        title: 'Active SKU Count',
        value: `${activeSku}`,
        trend: 'flat',
        vsLabel: activeCategoryCount > 0 ? `${activeCategoryCount} categories in stock` : 'in stock',
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
    if (isPlatformOrg && outreachStats && (outreachStats.totalSent > 0 || outreachStats.totalFailed > 0)) {
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
    if (isPlatformOrg && pendingCounts && (pendingCounts.pendingOutreachDrafts > 0 || pendingCounts.pendingBlogDrafts > 0)) {
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
    if (isPlatformOrg && platformGrowth && (platformGrowth.activeCustomers > 0 || platformGrowth.estimatedMrr > 0)) {
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

    if (isPlatformOrg && contentAnalytics) {
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
    if (isPlatformOrg && outreachFunnel && outreachFunnel.totalLeads > 0) {
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
    const [benchmarks, products, yesterdayOrders, last7Orders, greenledgerSummary, outreachStatsResult, pendingCountsResult, meetingsResult, emailDigestResult, platformGrowthResult, outreachFunnelResult, contentAnalyticsResult, slowMoversResult] = await Promise.allSettled([
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
        loadSlowMoverInsight(orgId), // deliberative inventory audit pipeline
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
    const slowMovers = slowMoversResult.status === 'fulfilled' ? slowMoversResult.value : null;

    // Build metrics
    const metrics = buildMetrics(
        yesterdayOrds,
        last7Ords,
        prods,
        bm,
        glSummary,
        outreachStats,
        pendingCounts,
        platformGrowth,
        outreachFunnel,
        contentAnalytics,
        PLATFORM_SIGNAL_ORG_IDS.has(orgId),
        slowMovers,
    );

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

function getDailyHealthSeverity(briefing: AnalyticsBriefing): ProactiveSeverity {
    switch (briefing.urgencyLevel) {
        case 'critical':
            return 'critical';
        case 'warning':
            return 'high';
        case 'info':
            return 'medium';
        default:
            return 'low';
    }
}

function buildDailyHealthEvidence(briefing: AnalyticsBriefing): Array<{ label: string; value: string }> {
    return [
        { label: 'Urgency', value: briefing.urgencyLevel },
        { label: 'Metrics reviewed', value: String(briefing.metrics.length) },
        { label: 'Actionable items', value: String(briefing.metrics.filter((metric) => metric.status !== 'good').length) },
        { label: 'News items', value: String(briefing.newsItems.length) },
    ];
}

function getDailyHealthSummary(briefing: AnalyticsBriefing): string {
    const actionItems = briefing.metrics.filter((metric) => metric.status !== 'good').length;
    if (actionItems === 0) {
        return `${briefing.dayOfWeek}'s daily dispensary health check is clear.`;
    }
    return `${briefing.dayOfWeek}'s daily dispensary health check surfaced ${actionItems} item${actionItems === 1 ? '' : 's'} needing follow-up.`;
}

function serializeBriefingForArtifact(briefing: AnalyticsBriefing): AnalyticsBriefing {
    const metrics = briefing.metrics.map((metric) => ({
        title: metric.title,
        value: metric.value,
        trend: metric.trend,
        vsLabel: metric.vsLabel,
        status: metric.status,
        ...(metric.actionable ? { actionable: metric.actionable } : {}),
        ...(metric.tooltipText ? { tooltipText: metric.tooltipText } : {}),
        ...(metric.metricOptions
            ? {
                metricOptions: metric.metricOptions.map((option) => ({
                    id: option.id,
                    label: option.label,
                    value: option.value,
                    ...(option.tooltipText ? { tooltipText: option.tooltipText } : {}),
                    ...(option.coverageNote ? { coverageNote: option.coverageNote } : {}),
                    ...(option.isDefault ? { isDefault: option.isDefault } : {}),
                })),
              }
            : {}),
    }));

    const newsItems = briefing.newsItems.map((item) => ({
        headline: item.headline,
        source: item.source,
        relevance: item.relevance,
        ...(item.url ? { url: item.url } : {}),
    }));

    const meetings = briefing.meetings?.map((meeting) => ({
        title: meeting.title,
        startTime: meeting.startTime,
        source: meeting.source,
        ...(meeting.attendee ? { attendee: meeting.attendee } : {}),
        ...(meeting.profileSlug ? { profileSlug: meeting.profileSlug } : {}),
    }));

    const emailDigest = briefing.emailDigest
        ? {
            unreadCount: briefing.emailDigest.unreadCount,
            checkedAt: briefing.emailDigest.checkedAt,
            topEmails: briefing.emailDigest.topEmails.map((item) => ({
                from: item.from,
                subject: item.subject,
            })),
        }
        : undefined;

    return {
        date: briefing.date,
        dayOfWeek: briefing.dayOfWeek,
        metrics,
        newsItems,
        urgencyLevel: briefing.urgencyLevel,
        marketContext: briefing.marketContext,
        ...(briefing.topAlert ? { topAlert: briefing.topAlert } : {}),
        ...(meetings && meetings.length > 0 ? { meetings } : {}),
        ...(emailDigest ? { emailDigest } : {}),
        ...(briefing.pulseType ? { pulseType: briefing.pulseType } : {}),
    };
}

async function findExistingBriefingArtifactId(
    threadId: string,
    briefing: AnalyticsBriefing,
): Promise<string | null> {
    const db = getAdminFirestore();
    const targetPulseType = briefing.pulseType ?? 'morning';

    const existing = await db
        .collection('inbox_artifacts')
        .where('threadId', '==', threadId)
        .where('type', '==', 'analytics_briefing')
        .limit(20)
        .get();

    const match = existing.docs.find((doc) => {
        const data = doc.data().data as Partial<AnalyticsBriefing> | undefined;
        const pulseType = data?.pulseType ?? 'morning';
        return data?.date === briefing.date && pulseType === targetPulseType;
    });

    return match?.id ?? null;
}

/**
 * Post any AnalyticsBriefing to the org's Daily Briefing thread.
 * Used by midday-pulse and evening-pulse crons.
 */
export async function postPulseToInbox(
    orgId: string,
    briefing: AnalyticsBriefing,
    options?: {
        proactive?: InboxArtifactProactiveMetadata;
        existingThreadId?: string;
        existingArtifactId?: string;
        threadMetadata?: Record<string, unknown>;
    }
): Promise<{ threadId: string; artifactId: string }> {
    const db = getAdminFirestore();
    const THREADS = 'inbox_threads';
    const ARTIFACTS = 'inbox_artifacts';

    let threadId: string | null = null;
    if (options?.existingThreadId) {
        const existingThread = await db.collection(THREADS).doc(options.existingThreadId).get();
        if (existingThread.exists) {
            threadId = options.existingThreadId;
        }
    }

    if (!threadId) {
        const existing = await db
            .collection(THREADS)
            .where('orgId', '==', orgId)
            .where('metadata.isBriefingThread', '==', true)
            .limit(1)
            .get();

        if (!existing.empty) {
            threadId = existing.docs[0].id;
        }
    }

    if (!threadId) {
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
            metadata: {
                isBriefingThread: true,
                ...(options?.threadMetadata ?? {}),
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    } else if (options?.threadMetadata) {
        await db.collection(THREADS).doc(threadId).set({
            metadata: {
                isBriefingThread: true,
                ...options.threadMetadata,
            },
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    const pulseLabels = { morning: 'morning briefing', midday: 'midday check-in', evening: 'evening preview' };
    const pulseLabel = pulseLabels[briefing.pulseType ?? 'morning'];

    if (!threadId) {
        throw new Error('Daily briefing thread could not be resolved');
    }

    const existingArtifactId = options?.existingArtifactId ?? await findExistingBriefingArtifactId(threadId, briefing);
    const artifactId = existingArtifactId ?? createInboxArtifactId();
    const artifactPayload: Record<string, unknown> = {
        id: artifactId,
        threadId,
        orgId,
        type: 'analytics_briefing',
        status: 'approved',
        data: serializeBriefingForArtifact(briefing),
        rationale: `Proactive ${pulseLabel} generated automatically`,
        createdBy: 'system',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (options?.proactive) {
        artifactPayload.proactive = options.proactive;
    }

    if (existingArtifactId) {
        await db.collection(ARTIFACTS).doc(artifactId).set(artifactPayload, { merge: true });
    } else {
        await db.collection(ARTIFACTS).doc(artifactId).set({
            ...artifactPayload,
            createdAt: FieldValue.serverTimestamp(),
        });
    }

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

    return { threadId, artifactId };
}

export async function postMorningBriefingToInbox(orgId: string): Promise<{
    orgId: string;
    threadId: string;
    artifactId: string;
    taskId?: string;
    workflowEnabled: boolean;
}> {
    const briefing = await generateMorningBriefing(orgId);
    const workflowEnabled = await isProactiveWorkflowEnabled(orgId, 'daily_dispensary_health');
    let taskId: string | undefined;
    let proactiveMetadata: InboxArtifactProactiveMetadata | undefined;
    let existingThreadId: string | undefined;
    let existingArtifactId: string | undefined;

    if (workflowEnabled) {
        const severity = getDailyHealthSeverity(briefing);
        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'daily_dispensary_health',
            agentKey: 'pops',
            title: `${briefing.dayOfWeek} daily dispensary health`,
            summary: getDailyHealthSummary(briefing),
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `daily_dispensary_health:${orgId}:${briefing.date}`,
            dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
            createdBy: 'system',
        });

        task = await transitionProactiveTask(task.id, 'triaged', 'briefing_generated').catch(() => task);
        task = await transitionProactiveTask(task.id, 'investigating', 'briefing_ready_for_delivery').catch(() => task);

        taskId = task.id;
        existingThreadId = task.threadId;
        existingArtifactId = task.artifactId;
        proactiveMetadata = {
            taskId: task.id,
            workflowKey: 'daily_dispensary_health',
            severity,
            evidence: buildDailyHealthEvidence(briefing),
            nextActionLabel: briefing.urgencyLevel === 'clean' ? 'Briefing posted' : 'Review briefing',
        };
    }

    const { threadId, artifactId } = await postPulseToInbox(orgId, briefing, {
        proactive: proactiveMetadata,
        existingThreadId,
        existingArtifactId,
        threadMetadata: workflowEnabled
            ? {
                proactiveWorkflowKey: 'daily_dispensary_health',
                isProactiveThread: true,
            }
            : undefined,
    });

    if (workflowEnabled && taskId) {
        await linkTaskToInbox(taskId, { threadId, artifactId });

        await attachProactiveTaskEvidence(taskId, {
            taskId,
            tenantId: orgId,
            evidenceType: 'daily_health_briefing',
            refId: artifactId,
            payload: {
                date: briefing.date,
                urgencyLevel: briefing.urgencyLevel,
                topAlert: briefing.topAlert ?? null,
                metrics: briefing.metrics.map((metric) => ({
                    title: metric.title,
                    status: metric.status,
                    actionable: metric.actionable ?? null,
                })),
            },
        });

        await appendProactiveEvent({
            tenantId: orgId,
            organizationId: orgId,
            taskId,
            actorType: 'system',
            eventType: 'daily_dispensary_health.briefing_posted',
            businessObjectType: 'organization',
            businessObjectId: orgId,
            payload: {
                threadId,
                artifactId,
                urgencyLevel: briefing.urgencyLevel,
            },
        });

        const openCommitments = await listOpenCommitments({
            tenantId: orgId,
            organizationId: orgId,
            taskId,
        });
        const commitmentTitle = `Review ${briefing.dayOfWeek} daily health briefing`;

        if (briefing.urgencyLevel === 'warning' || briefing.urgencyLevel === 'critical') {
            const snoozeHours = await getResolvedProactiveSnoozeHours(orgId);
            await upsertCommitment({
                tenantId: orgId,
                organizationId: orgId,
                taskId,
                commitmentType: 'follow_up',
                title: commitmentTitle,
                dueAt: new Date(Date.now() + snoozeHours * 60 * 60 * 1000),
                payload: {
                    threadId,
                    artifactId,
                    urgencyLevel: briefing.urgencyLevel,
                },
            });
        } else {
            for (const commitment of openCommitments) {
                await resolveCommitment(commitment.id, 'resolved').catch(() => undefined);
            }
        }

        await transitionProactiveTask(taskId, 'executing', 'briefing_delivery_started').catch(() => undefined);
        await transitionProactiveTask(taskId, 'executed', 'briefing_delivered').catch(() => undefined);
        await transitionProactiveTask(taskId, 'resolved', 'daily_health_loop_written_back').catch(() => undefined);

        await recordProactiveOutcome({
            tenantId: orgId,
            organizationId: orgId,
            taskId,
            workflowKey: 'daily_dispensary_health',
            outcomeType: 'executed',
            payload: {
                threadId,
                artifactId,
                urgencyLevel: briefing.urgencyLevel,
            },
        });
    }

    logger.info('[MorningBriefing] Posted morning briefing', {
        orgId,
        taskId,
        threadId,
        artifactId,
        workflowEnabled,
        urgencyLevel: briefing.urgencyLevel,
        metricsCount: briefing.metrics.length,
        meetings: briefing.meetings?.length ?? 0,
        emailUnread: briefing.emailDigest?.unreadCount ?? 0,
    });

    // Weekly cohort report — emit if not posted in the last 7 days
    try {
        const lastPosted = await getLastCohortReportDate(orgId);
        const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
        if (!lastPosted || lastPosted < sevenDaysAgo) {
            const cohortData = await computeCohortData(orgId, 90);
            if (cohortData.totalCustomers > 0) {
                await postCohortReportToInbox(orgId, cohortData);
                logger.info('[MorningBriefing] Posted weekly cohort report', {
                    orgId,
                    totalCustomers: cohortData.totalCustomers,
                    repeatRate: cohortData.repeatCustomerRate,
                });
            }
        }
    } catch (cohortErr) {
        // Non-blocking — briefing always succeeds even if cohort fails
        logger.warn('[MorningBriefing] Cohort report failed (non-blocking)', {
            orgId,
            error: String(cohortErr),
        });
    }
    return {
        orgId,
        threadId,
        artifactId,
        taskId,
        workflowEnabled,
    };
}
