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
import { jinaSearch } from '@/server/tools/jina-tools';
import type { AnalyticsBriefing, BriefingMetric, BriefingNewsItem } from '@/types/inbox';
import {
    createInboxThreadId,
    createInboxArtifactId,
} from '@/types/inbox';

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

function buildMetrics(
    yesterdayOrders: OrderRow[],
    last7Orders: OrderRow[],
    products: ProductRow[],
    benchmarks: Awaited<ReturnType<typeof getMarketBenchmarks>>
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
            status: 'warning',
            actionable: 'Reprice or discontinue this SKU',
        });
    } else {
        metrics.push({
            title: 'Top Margin Drain',
            value: 'No drains detected',
            trend: 'flat',
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
        status: atRiskValue > 5000 ? 'warning' : 'good',
        actionable: atRiskValue > 0 ? 'Consider markdown or liquidation' : undefined,
    });

    // 5. Active SKU Count
    const activeSku = products.filter(p => (p.stock ?? 0) > 0).length;
    metrics.push({
        title: 'Active SKU Count',
        value: `${activeSku}`,
        trend: 'flat',
        status: 'good',
    });

    return metrics;
}

// ============ Core generation function ============

export async function generateMorningBriefing(orgId: string): Promise<AnalyticsBriefing> {
    const [benchmarks, products, yesterdayOrders, last7Orders] = await Promise.allSettled([
        getMarketBenchmarks(orgId),
        loadOrgProducts(orgId),
        loadYesterdayOrders(orgId),
        loadLast7DaysOrders(orgId),
    ]);

    const bm = benchmarks.status === 'fulfilled' ? benchmarks.value : await getMarketBenchmarks('');
    const prods = products.status === 'fulfilled' ? products.value : [];
    const yesterdayOrds = yesterdayOrders.status === 'fulfilled' ? yesterdayOrders.value : [];
    const last7Ords = last7Orders.status === 'fulfilled' ? last7Orders.value : [];

    // Build metrics
    const metrics = buildMetrics(yesterdayOrds, last7Ords, prods, bm);

    // Fetch cannabis news (top 3, non-blocking)
    let newsItems: BriefingNewsItem[] = [];
    try {
        const stateCode = bm.context.stateCode || 'NY';
        const results = await jinaSearch(
            `cannabis dispensary industry news ${stateCode} 2026`
        );
        newsItems = results.slice(0, 3).map(r => ({
            headline: r.title,
            source: new URL(r.url).hostname.replace('www.', ''),
            url: r.url,
            relevance: 'medium' as const,
        }));
    } catch {
        // news is non-critical
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
    const licenseLabel = bm.context.licenseType === 'limited' ? 'Limited License' : 'Unlimited';
    const maturityLabel = bm.context.marketMaturity
        ? bm.context.marketMaturity.charAt(0).toUpperCase() + bm.context.marketMaturity.slice(1) + ' Market'
        : 'Developing Market';
    const marketContext = `${bm.context.stateCode || 'US'} ${licenseLabel} | ${maturityLabel}`;

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
    };
}

// ============ Inbox post function ============

export async function postMorningBriefingToInbox(orgId: string): Promise<void> {
    const db = getAdminFirestore();
    const THREADS = 'inbox_threads';
    const ARTIFACTS = 'inbox_artifacts';

    // Generate the briefing
    const briefing = await generateMorningBriefing(orgId);

    // Find or create a dedicated Daily Briefing thread
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
        logger.info('[MorningBriefing] Created new Daily Briefing thread', { orgId, threadId });
    }

    // Create the analytics_briefing artifact
    const artifactId = createInboxArtifactId();
    await db.collection(ARTIFACTS).doc(artifactId).set({
        id: artifactId,
        threadId,
        orgId,
        type: 'analytics_briefing',
        status: 'approved',
        data: briefing,
        rationale: 'Proactive daily briefing generated at 8 AM',
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Update thread: add artifact reference + bump lastActivityAt
    await db.collection(THREADS).doc(threadId).update({
        artifactIds: FieldValue.arrayUnion(artifactId),
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preview: `${briefing.dayOfWeek}'s briefing — ${briefing.urgencyLevel}`,
    });

    logger.info('[MorningBriefing] Posted briefing artifact', {
        orgId,
        threadId,
        artifactId,
        urgencyLevel: briefing.urgencyLevel,
        metricsCount: briefing.metrics.length,
    });
}
