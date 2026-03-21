'use server';

/**
 * dispensary-analytics.ts
 *
 * Server actions for dashboard analytics widgets.
 * Computes products, orders, and menu analytics from Firestore data.
 * Used by Phase 6 analytics tab components.
 */

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getMarketBenchmarks } from '@/server/services/market-benchmarks';
import { loadCatalogAnalyticsProducts, toAnalyticsDate, type CatalogAnalyticsProduct } from '@/server/services/catalog-analytics-source';
import type { MarketBenchmarks } from '@/types/market-benchmarks';
import { logger } from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Shared result wrapper
// ─────────────────────────────────────────────────────────────────────────────

interface ActionResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

type AnalyticsActor = {
    uid: string;
    role?: string;
    orgId?: string;
    currentOrgId?: string;
    brandId?: string;
};

function getActorOrgId(user: AnalyticsActor): string | null {
    return user.currentOrgId || user.orgId || user.brandId || null;
}

function isValidOrgId(orgId: string): boolean {
    return !!orgId && !orgId.includes('/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Data interfaces (exported for component use)
// ─────────────────────────────────────────────────────────────────────────────

export interface SkuProfit {
    productId: string;
    name: string;
    category: string;
    revenue: number;
    contributionMarginPct: number;
    actionRecommendation: 'reprice' | 'rationalize' | 'promote' | 'protect';
}

export interface ProductsAnalyticsData {
    velocityData: Array<{ date: string; [category: string]: number | string }>;
    marginDrains: SkuProfit[];
    agingData: Array<{ bucket: string; skuCount: number; dollarValue: number; color: string }>;
    categoryMix: Array<{ name: string; revenue: number; pct: number }>;
    priceTierData: Array<{ tier: 'Value' | 'Mid' | 'Premium'; skuCount: number; revenue: number }>;
    benchmarks: Pick<MarketBenchmarks, 'financial' | 'context'>;
    generatedAt: string;
}

export interface OrdersAnalyticsData {
    basketSizeTrend: Array<{ date: string; avgBasket: number }>;
    uptTrend: Array<{ date: string; avgUnitsPerTransaction: number }>;
    discountRateTrend: Array<{ date: string; discountRate: number }>;
    peakHourHeatmap: Array<{ hour: number; dayOfWeek: number; transactionCount: number }>;
    onlineVsInStoreSplit: Array<{ name: string; value: number }>;
    promoLiftData?: Array<{ period: string; revenue: number; grossProfit: number }>;
    industryDiscountBenchmark: number;
    marketDiscountTarget: number;
    generatedAt: string;
}

export interface MenuAnalyticsData {
    categoryPerformance: Array<{
        category: string;
        revenue: number;
        marginPct: number;
        velocity: number;
        daysOnHand: number;
        skuCount: number;
    }>;
    skuRationalizationFlags: Array<{
        productId: string;
        name: string;
        category: string;
        daysSinceLastSale: number;
        velocity: number;
        action: 'markdown' | 'liquidate';
        estimatedAtRisk: number;
    }>;
    priceTierDistribution: Array<{
        tier: string;
        minPrice: number;
        maxPrice: number;
        skuCount: number;
        revenuePct: number;
    }>;
    generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify org access
// ─────────────────────────────────────────────────────────────────────────────

async function verifyOrgAccess(orgId: string): Promise<void> {
    if (!isValidOrgId(orgId)) {
        throw new Error('Forbidden: invalid org context');
    }

    const user = await requireUser([
        'brand', 'brand_admin', 'dispensary', 'dispensary_admin', 'super_user', 'super_admin',
    ]);
    if (user.role !== 'super_user' && user.role !== 'super_admin') {
        const userOrgId = getActorOrgId(user as AnalyticsActor);
        if (userOrgId !== orgId) {
            throw new Error('Forbidden: org mismatch');
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: load products from tenant catalog
// ─────────────────────────────────────────────────────────────────────────────

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

function toLookupToken(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return undefined;
    }

    return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: load orders from last 30 days
// ─────────────────────────────────────────────────────────────────────────────

interface RawOrder {
    id: string;
    createdAt?: unknown;
    total?: unknown;
    subtotal?: unknown;
    discountAmount?: unknown;
    totals?: {
        total?: unknown;
        subtotal?: unknown;
        discount?: unknown;
    };
    coupon?: {
        discount?: unknown;
    };
    items?: Array<{ qty?: unknown; quantity?: unknown; price?: unknown; name?: string }>;
    source?: string;
    type?: string;
    channel?: string;
    mode?: string;
    status?: string;
}

const ANALYTICS_ORDER_STATUSES = ['submitted', 'confirmed', 'ready', 'completed'];

async function queryOrdersByField(
    field: 'brandId' | 'orgId',
    orgId: string,
): Promise<RawOrder[]> {
    const db = getAdminFirestore();

    try {
        const snap = await db.collection('orders')
            .where(field, '==', orgId)
            .where('status', 'in', ANALYTICS_ORDER_STATUSES)
            .limit(2000)
            .get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawOrder));
    } catch (error) {
        logger.warn('[dispensary-analytics] Order query failed, retrying without status filter', {
            orgId,
            field,
            error: String(error),
        });

        const fallback = await db.collection('orders')
            .where(field, '==', orgId)
            .limit(2000)
            .get()
            .catch((fallbackError) => {
                logger.error('[dispensary-analytics] Order fallback query failed', {
                    orgId,
                    field,
                    error: String(fallbackError),
                });
                return null;
            });

        if (!fallback) return [];

        return fallback.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as RawOrder))
            .filter((order) => {
                const status = toLookupToken(order.status);
                return status ? ANALYTICS_ORDER_STATUSES.includes(status) : true;
            });
    }
}

async function loadOrders(orgId: string, lookbackDays = 30): Promise<RawOrder[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);

    const byBrand = await queryOrdersByField('brandId', orgId);
    const orders = byBrand.length > 0 ? byBrand : await queryOrdersByField('orgId', orgId);

    if (byBrand.length === 0 && orders.length > 0) {
        logger.info('[dispensary-analytics] Orders fallback query by orgId used', {
            orgId,
            count: orders.length,
        });
    }

    return orders.filter((order) => {
        const ts = toAnalyticsDate(order.createdAt);
        return ts ? ts >= cutoff : true;
    });
}

function daysSince(val: unknown): number {
    const d = toAnalyticsDate(val);
    if (!d) return 999;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function getOrderTotal(order: RawOrder): number {
    return toNonNegativeNumber(order.total ?? order.totals?.total ?? order.subtotal ?? order.totals?.subtotal);
}

function getOrderDiscount(order: RawOrder): number {
    return toNonNegativeNumber(order.discountAmount ?? order.totals?.discount ?? order.coupon?.discount);
}

function getOrderUnits(order: RawOrder): number {
    const units = order.items?.reduce((sum, item) => {
        return sum + toNonNegativeNumber(item.qty ?? item.quantity, 1);
    }, 0) ?? 0;

    return units > 0 ? units : 1;
}

function isOnlineOrder(order: RawOrder): boolean {
    const channel = toLookupToken(order.source ?? order.type ?? order.channel ?? order.mode);
    return channel === 'online' || channel === 'web' || channel === 'ecommerce';
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: derive a 30-day revenue run-rate series from snapshot data
// ─────────────────────────────────────────────────────────────────────────────

function buildVelocitySeries(
    products: CatalogAnalyticsProduct[],
    days = 30,
): Array<{ date: string; [category: string]: number | string }> {
    // Use actual 7-day and 30-day run rates to derive a deterministic trend.
    const catMap: Record<string, { olderDailyRevenue: number; recentDailyRevenue: number }> = {};
    for (const p of products) {
        const cat = normalizeCat(p.category);
        const recentDailyUnits = p.salesLast7Days > 0
            ? p.salesLast7Days / 7
            : p.salesVelocity > 0
                ? p.salesVelocity
                : p.salesLast30Days / 30;
        const priorWindowUnits = Math.max(p.salesLast30Days - p.salesLast7Days, 0);
        const priorWindowDays = p.salesLast7Days > 0 ? 23 : 30;
        const olderDailyUnits = priorWindowUnits > 0
            ? priorWindowUnits / priorWindowDays
            : recentDailyUnits;

        if (!catMap[cat]) {
            catMap[cat] = { olderDailyRevenue: 0, recentDailyRevenue: 0 };
        }

        catMap[cat].olderDailyRevenue += olderDailyUnits * p.price;
        catMap[cat].recentDailyRevenue += recentDailyUnits * p.price;
    }

    const topCats = Object.entries(catMap)
        .sort((a, b) => b[1].recentDailyRevenue - a[1].recentDailyRevenue)
        .slice(0, 3)
        .map(([cat]) => cat);

    const series: Array<{ date: string; [k: string]: number | string }> = [];
    const denominator = Math.max(days - 1, 1);
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const row: { date: string; [k: string]: number | string } = { date: dateStr };
        for (const cat of topCats) {
            const base = catMap[cat];
            const progress = (days - 1 - i) / denominator;
            const runRate = (base.olderDailyRevenue * (1 - progress)) + (base.recentDailyRevenue * progress);
            row[cat] = Math.round(runRate);
        }
        series.push(row);
    }
    return series;
}

function normalizeCat(cat: string): string {
    if (!cat) return 'Other';
    const c = cat.toLowerCase();
    if (c.includes('flower') || c.includes('bud')) return 'Flower';
    if (c.includes('vape') || c.includes('cartridge') || c.includes('cart')) return 'Vape';
    if (c.includes('edible') || c.includes('gummy') || c.includes('chocolate')) return 'Edibles';
    if (c.includes('pre-roll') || c.includes('preroll') || c.includes('joint')) return 'Pre-Rolls';
    if (c.includes('concentrate') || c.includes('wax') || c.includes('shatter') || c.includes('dab')) return 'Concentrates';
    if (c.includes('tincture') || c.includes('oil') || c.includes('capsule')) return 'Tinctures';
    if (c.includes('topical') || c.includes('cream') || c.includes('lotion')) return 'Topicals';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6A-1: getProductsAnalytics
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductsAnalytics(
    orgId: string,
): Promise<ActionResult<ProductsAnalyticsData>> {
    try {
        await verifyOrgAccess(orgId);

        const [products, benchmarks] = await Promise.all([
            loadCatalogAnalyticsProducts(orgId),
            getMarketBenchmarks(orgId).catch(() => null),
        ]);

        // Velocity chart (top 3 categories, derived from 7-day and 30-day run rates)
        const velocityData = buildVelocitySeries(products);

        // Margin drains — top-revenue SKUs with contributionMarginPct < 0.15
        const marginDrains: SkuProfit[] = products
            .filter(p => p.cost != null && p.price > 0)
            .map(p => {
                const revenue = (p.salesLast30Days ?? 0) * p.price;
                const cogs = (p.salesLast30Days ?? 0) * (p.cost ?? 0);
                const grossProfit = revenue - cogs;
                const contributionMarginPct = revenue > 0 ? grossProfit / revenue : 0;
                const action: SkuProfit['actionRecommendation'] =
                    contributionMarginPct < 0.05 ? 'rationalize' : 'reprice';
                return { productId: p.id, name: p.name, category: normalizeCat(p.category), revenue, contributionMarginPct, actionRecommendation: action };
            })
            .filter(s => s.contributionMarginPct < 0.15 && s.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Inventory aging by daysSinceLastSale
        const agingBuckets = [
            { label: '0-30 days', max: 30, color: '#22c55e' },
            { label: '31-60 days', max: 60, color: '#eab308' },
            { label: '61-90 days', max: 90, color: '#f97316' },
            { label: '90+ days', max: Infinity, color: '#ef4444' },
        ];
        const agingData = agingBuckets.map(b => {
            const inBucket = products.filter(p => {
                const days = daysSince(p.lastSaleAt);
                const prev = agingBuckets[agingBuckets.indexOf(b) - 1]?.max ?? 0;
                return days > prev && days <= b.max;
            });
            return {
                bucket: b.label,
                skuCount: inBucket.length,
                dollarValue: Math.round(inBucket.reduce((s, p) => s + p.price * (p.stock ?? 1), 0)),
                color: b.color,
            };
        });

        // Category mix by revenue
        const catRevMap: Record<string, number> = {};
        for (const p of products) {
            const cat = normalizeCat(p.category);
            catRevMap[cat] = (catRevMap[cat] ?? 0) + (p.salesLast30Days ?? 0) * p.price;
        }
        const totalRev = Object.values(catRevMap).reduce((s, v) => s + v, 0);
        const categoryMix = Object.entries(catRevMap)
            .map(([name, revenue]) => ({ name, revenue: Math.round(revenue), pct: totalRev > 0 ? revenue / totalRev : 0 }))
            .sort((a, b) => b.revenue - a.revenue);

        // Price tier distribution
        const tiers: ProductsAnalyticsData['priceTierData'] = [
            { tier: 'Value', skuCount: 0, revenue: 0 },
            { tier: 'Mid', skuCount: 0, revenue: 0 },
            { tier: 'Premium', skuCount: 0, revenue: 0 },
        ];
        for (const p of products) {
            const rev = (p.salesLast30Days ?? 0) * p.price;
            if (p.price < 20) { tiers[0].skuCount++; tiers[0].revenue += rev; }
            else if (p.price < 50) { tiers[1].skuCount++; tiers[1].revenue += rev; }
            else { tiers[2].skuCount++; tiers[2].revenue += rev; }
        }

        return {
            success: true,
            data: {
                velocityData,
                marginDrains,
                agingData,
                categoryMix,
                priceTierData: tiers,
                benchmarks: benchmarks
                    ? { financial: benchmarks.financial, context: benchmarks.context }
                    : { financial: { discountRateNationalAvg: 0.219, discountRateTarget: 0.12, grossMarginTarget: 0.48, shrinkTarget: 0.02, discountElasticity: -0.4, accessoriesMarginNote: 'Accessories typically carry 60-80% margins' }, context: { state: 'NY', stateCode: 'NY', licenseType: 'limited', marketMaturity: 'developing', competitionDensity: 'high', notes: 'NY limited license market, high competition' } },
                generatedAt: new Date().toISOString(),
            },
        };
    } catch (err) {
        logger.error('[dispensary-analytics] getProductsAnalytics error', { orgId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6A-2: getOrdersAnalytics
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrdersAnalytics(
    orgId: string,
): Promise<ActionResult<OrdersAnalyticsData>> {
    try {
        await verifyOrgAccess(orgId);

        const [orders, benchmarks] = await Promise.all([
            loadOrders(orgId, 30).catch(() => [] as RawOrder[]),
            getMarketBenchmarks(orgId).catch(() => null),
        ]);

        const industryDiscountBenchmark = benchmarks?.financial?.discountRateNationalAvg ?? 0.219;
        // Market-adjusted target: tighter in high-competition markets
        const marketDiscountTarget = benchmarks?.context?.competitionDensity === 'high'
            ? industryDiscountBenchmark * 0.55
            : industryDiscountBenchmark * 0.65;

        // Build day buckets for last 30 days
        const dayMap: Record<string, { totalBasket: number; totalUnits: number; totalDiscount: number; totalSales: number; orderCount: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dayMap[key] = { totalBasket: 0, totalUnits: 0, totalDiscount: 0, totalSales: 0, orderCount: 0 };
        }

        // Peak hour heatmap
        const heatmap: Record<string, number> = {};
        let onlineCount = 0;
        let inStoreCount = 0;

        for (const o of orders) {
            const ts = toAnalyticsDate(o.createdAt);
            if (!ts) continue;
            const key = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dayMap[key]) {
                const total = getOrderTotal(o);
                const units = getOrderUnits(o);
                const discount = getOrderDiscount(o);
                dayMap[key].totalBasket += total;
                dayMap[key].totalUnits += units;
                dayMap[key].totalDiscount += discount;
                dayMap[key].totalSales += total;
                dayMap[key].orderCount++;
            }

            // Heatmap
            const hour = ts.getHours();
            const dow = ts.getDay();
            const hk = `${hour}-${dow}`;
            heatmap[hk] = (heatmap[hk] ?? 0) + 1;

            // Online vs in-store
            if (isOnlineOrder(o)) onlineCount++;
            else inStoreCount++;
        }

        const basketSizeTrend = Object.entries(dayMap).map(([date, d]) => ({
            date,
            avgBasket: d.orderCount > 0 ? Math.round((d.totalBasket / d.orderCount) * 100) / 100 : 0,
        }));

        const uptTrend = Object.entries(dayMap).map(([date, d]) => ({
            date,
            avgUnitsPerTransaction: d.orderCount > 0 ? Math.round((d.totalUnits / d.orderCount) * 10) / 10 : 0,
        }));

        const discountRateTrend = Object.entries(dayMap).map(([date, d]) => ({
            date,
            discountRate: d.totalSales > 0 ? Math.round((d.totalDiscount / d.totalSales) * 1000) / 1000 : 0,
        }));

        // Build heatmap array (hours 6-23, days 0-6)
        const peakHourHeatmap: OrdersAnalyticsData['peakHourHeatmap'] = [];
        for (let hour = 6; hour <= 23; hour++) {
            for (let dow = 0; dow <= 6; dow++) {
                peakHourHeatmap.push({
                    hour,
                    dayOfWeek: dow,
                    transactionCount: heatmap[`${hour}-${dow}`] ?? 0,
                });
            }
        }

        const onlineVsInStoreSplit = [
            { name: 'Online', value: onlineCount },
            { name: 'In-Store', value: inStoreCount || Math.max(orders.length - onlineCount, 0) },
        ];

        return {
            success: true,
            data: {
                basketSizeTrend,
                uptTrend,
                discountRateTrend,
                peakHourHeatmap,
                onlineVsInStoreSplit,
                industryDiscountBenchmark,
                marketDiscountTarget,
                generatedAt: new Date().toISOString(),
            },
        };
    } catch (err) {
        logger.error('[dispensary-analytics] getOrdersAnalytics error', { orgId, error: String(err) });
        return { success: false, error: String(err) };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6A-3: getMenuAnalytics
// ─────────────────────────────────────────────────────────────────────────────

export async function getMenuAnalytics(
    orgId: string,
): Promise<ActionResult<MenuAnalyticsData>> {
    try {
        await verifyOrgAccess(orgId);

        const products = await loadCatalogAnalyticsProducts(orgId);

        // Category performance
        interface CatAgg { revenue: number; gpSum: number; units: number; stock: number; skuCount: number; }
        const catAgg: Record<string, CatAgg> = {};
        for (const p of products) {
            const cat = normalizeCat(p.category);
            if (!catAgg[cat]) catAgg[cat] = { revenue: 0, gpSum: 0, units: 0, stock: 0, skuCount: 0 };
            const soldUnits = p.salesLast30Days ?? 0;
            const revenue = soldUnits * p.price;
            const gp = p.cost != null ? revenue - soldUnits * p.cost : revenue * 0.48;
            catAgg[cat].revenue += revenue;
            catAgg[cat].gpSum += gp;
            catAgg[cat].units += soldUnits;
            catAgg[cat].stock += p.stock ?? 0;
            catAgg[cat].skuCount++;
        }

        const categoryPerformance = Object.entries(catAgg)
            .map(([category, a]) => ({
                category,
                revenue: Math.round(a.revenue),
                marginPct: a.revenue > 0 ? Math.round((a.gpSum / a.revenue) * 100) / 100 : 0,
                velocity: Math.round((a.units / 30) * 10) / 10,
                daysOnHand: a.units > 0 ? Math.round(a.stock / (a.units / 30)) : 999,
                skuCount: a.skuCount,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        // SKU rationalization flags — slow-moving: no sale in 21+ days, velocity < 0.1
        const skuRationalizationFlags = products
            .filter(p => {
                const days = daysSince(p.lastSaleAt);
                const velocity = p.salesVelocity ?? (p.salesLast7Days != null ? p.salesLast7Days / 7 : 0);
                return days > 21 && velocity < 0.1 && (p.stock ?? 0) > 0;
            })
            .map(p => {
                const days = daysSince(p.lastSaleAt);
                const velocity = p.salesVelocity ?? 0;
                const action: 'markdown' | 'liquidate' = days > 60 ? 'liquidate' : 'markdown';
                const estimatedAtRisk = p.price * (p.stock ?? 1);
                return {
                    productId: p.id,
                    name: p.name,
                    category: normalizeCat(p.category),
                    daysSinceLastSale: days,
                    velocity,
                    action,
                    estimatedAtRisk: Math.round(estimatedAtRisk),
                };
            })
            .sort((a, b) => b.estimatedAtRisk - a.estimatedAtRisk)
            .slice(0, 15);

        // Price tier distribution
        const tierDefs = [
            { tier: 'Value', minPrice: 0, maxPrice: 19.99 },
            { tier: 'Mid', minPrice: 20, maxPrice: 49.99 },
            { tier: 'Premium', minPrice: 50, maxPrice: Infinity },
        ];
        const totalRevAll = Object.values(catAgg).reduce((s, a) => s + a.revenue, 0);
        let totalTierRev = 0;
        const tierGroups = tierDefs.map(t => {
            const inTier = products.filter(p => p.price >= t.minPrice && p.price <= t.maxPrice);
            const rev = inTier.reduce((s, p) => s + (p.salesLast30Days ?? 0) * p.price, 0);
            totalTierRev += rev;
            return { ...t, skuCount: inTier.length, rev };
        });
        const priceTierDistribution = tierGroups.map(t => ({
            tier: t.tier,
            minPrice: t.minPrice,
            maxPrice: t.maxPrice === Infinity ? 999 : t.maxPrice,
            skuCount: t.skuCount,
            revenuePct: totalRevAll > 0 ? Math.round((t.rev / totalRevAll) * 100) / 100 : 0,
        }));

        return {
            success: true,
            data: {
                categoryPerformance,
                skuRationalizationFlags,
                priceTierDistribution,
                generatedAt: new Date().toISOString(),
            },
        };
    } catch (err) {
        logger.error('[dispensary-analytics] getMenuAnalytics error', { orgId, error: String(err) });
        return { success: false, error: String(err) };
    }
}
