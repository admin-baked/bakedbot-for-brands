/**
 * Dispensary Analytics Tools
 *
 * 4 tools for dispensary business intelligence:
 *   1. promotion_scorecard   — pre/during/post GP delta for any date range
 *   2. sku_profitability_view — per-SKU contribution margin (heroes vs. drains)
 *   3. inventory_health_score — aging buckets + $ at risk
 *   4. vendor_scorecard       — per-brand sell-through + margin tier
 *
 * Used by: MoneyMike (all 4), Pops (all 4), Craig (promotion_scorecard only)
 */

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// =============================================================================
// SHARED HELPERS
// =============================================================================

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : n / d;
}

interface RawProduct {
  id: string;
  name: string;
  category: string;
  brandName?: string;
  price: number;
  cost?: number;
  batchCost?: number;
  stockCount?: number;
  salesLast7Days?: number;
  salesLast30Days?: number;
  salesVelocity?: number;
  lastSaleAt?: Timestamp | Date | null;
}

interface RawOrderItem {
  productId: string;
  quantity: number;
  price: number;
  originalPrice?: number;
}

interface RawOrder {
  id: string;
  totalAmount: number;
  items: RawOrderItem[];
  createdAt: Timestamp | Date;
  discountAmount?: number;
}

async function fetchProducts(orgId: string): Promise<RawProduct[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('publicViews')
    .doc('products')
    .collection('items')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RawProduct));
}

async function fetchOrders(orgId: string, startDate: Date, endDate: Date): Promise<RawOrder[]> {
  const db = getAdminFirestore();
  // Orders use brandId (= orgId for single-org tenants)
  const snap = await db
    .collection('orders')
    .where('brandId', '==', orgId)
    .where('createdAt', '>=', Timestamp.fromDate(startDate))
    .where('createdAt', '<=', Timestamp.fromDate(endDate))
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RawOrder));
}

function effectiveCost(p: RawProduct): number | null {
  // cost (Cost of Good) takes priority over batchCost (Wholesale/Batch)
  if (p.cost != null && p.cost > 0) return p.cost;
  if (p.batchCost != null && p.batchCost > 0) return p.batchCost;
  return null;
}

function toDate(v: Timestamp | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof (v as Timestamp).toDate === 'function') return (v as Timestamp).toDate();
  return null;
}

// =============================================================================
// TOOL 1: PROMOTION SCORECARD
// =============================================================================

interface PeriodMetrics {
  label: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  avgBasketSize: number;
  avgUnitsPerTransaction: number;
  totalDiscount: number;
  discountRate: number;
  grossProfit: number;
  grossMarginPct: number;
  transactionsPerDay: number;
}

interface PromotionScorecardResult {
  baseline: PeriodMetrics;
  promo: PeriodMetrics;
  delta: {
    revenueChangePct: number;
    grossProfitChangePct: number;
    basketSizeChangePct: number;
    unitsPerTransactionChangePct: number;
    discountRateDelta: number;
    discountRateGrossMarginImpact: number;
    transactionCountChangePct: number;
  };
  verdict: 'profitable' | 'break_even' | 'margin_negative';
  verdictRationale: string;
  benchmarkComparison: string;
  chartData: Array<{ period: string; revenue: number; grossProfit: number; discountRate: number }>;
}

async function computePeriodMetrics(
  orders: RawOrder[],
  productCostMap: Map<string, number | null>,
  label: string,
  startDate: string,
  endDate: string
): Promise<PeriodMetrics> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(daysBetween(start, end), 1);

  let totalRevenue = 0;
  let totalUnits = 0;
  let totalDiscount = 0;
  let grossRevenue = 0; // before discount
  let totalCogs = 0;

  for (const order of orders) {
    totalRevenue += order.totalAmount || 0;
    const orderDiscount = order.discountAmount || 0;
    totalDiscount += orderDiscount;

    for (const item of order.items || []) {
      totalUnits += item.quantity || 0;
      const itemGross = (item.originalPrice ?? item.price) * item.quantity;
      grossRevenue += itemGross;

      const cost = productCostMap.get(item.productId);
      if (cost != null) {
        totalCogs += cost * item.quantity;
      }
    }
  }

  const totalOrders = orders.length;
  const discountRate = pct(totalDiscount, grossRevenue);
  const grossProfit = totalRevenue - totalCogs;
  const grossMarginPct = pct(grossProfit, totalRevenue);

  return {
    label,
    startDate,
    endDate,
    totalRevenue: Math.round(totalRevenue),
    totalOrders,
    totalUnits,
    avgBasketSize: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    avgUnitsPerTransaction: totalOrders ? Math.round((totalUnits / totalOrders) * 10) / 10 : 0,
    totalDiscount: Math.round(totalDiscount),
    discountRate: Math.round(discountRate * 1000) / 1000,
    grossProfit: Math.round(grossProfit),
    grossMarginPct: Math.round(grossMarginPct * 1000) / 1000,
    transactionsPerDay: Math.round((totalOrders / days) * 10) / 10,
  };
}

async function promotionScorecard(
  orgId: string,
  input: {
    startDate: string;
    endDate: string;
    promotionName?: string;
    comparisonStartDate?: string;
    comparisonEndDate?: string;
  }
): Promise<PromotionScorecardResult> {
  logger.info('[analytics-tools] promotion_scorecard', { orgId, ...input });

  const promoStart = new Date(input.startDate);
  const promoEnd = new Date(input.endDate);
  const promoDays = Math.max(daysBetween(promoStart, promoEnd), 1);

  // Default comparison = same-length prior period
  const compStart = input.comparisonStartDate
    ? new Date(input.comparisonStartDate)
    : new Date(promoStart.getTime() - promoDays * 86_400_000);
  const compEnd = input.comparisonEndDate
    ? new Date(input.comparisonEndDate)
    : new Date(promoStart.getTime() - 86_400_000);

  // Fetch all orders covering both periods
  const allOrders = await fetchOrders(orgId, compStart, promoEnd);

  const promoOrders = allOrders.filter(o => {
    const d = toDate(o.createdAt);
    return d && d >= promoStart && d <= promoEnd;
  });
  const compOrders = allOrders.filter(o => {
    const d = toDate(o.createdAt);
    return d && d >= compStart && d <= compEnd;
  });

  // Build cost map from products
  const products = await fetchProducts(orgId);
  const productCostMap = new Map<string, number | null>(
    products.map(p => [p.id, effectiveCost(p)])
  );

  const promo = await computePeriodMetrics(
    promoOrders,
    productCostMap,
    input.promotionName || 'Promo Period',
    input.startDate,
    input.endDate
  );
  const baseline = await computePeriodMetrics(
    compOrders,
    productCostMap,
    'Baseline Period',
    compStart.toISOString().split('T')[0],
    compEnd.toISOString().split('T')[0]
  );

  const revenueChangePct = pct(promo.totalRevenue - baseline.totalRevenue, baseline.totalRevenue || 1);
  const gpChangePct = pct(promo.grossProfit - baseline.grossProfit, Math.abs(baseline.grossProfit) || 1);
  const basketChangePct = pct(promo.avgBasketSize - baseline.avgBasketSize, baseline.avgBasketSize || 1);
  const uptChangePct = pct(
    promo.avgUnitsPerTransaction - baseline.avgUnitsPerTransaction,
    baseline.avgUnitsPerTransaction || 1
  );
  const discountDelta = promo.discountRate - baseline.discountRate;
  const discountGmImpact = discountDelta * -0.4; // elasticity rule

  let verdict: PromotionScorecardResult['verdict'];
  if (gpChangePct > 0.02) verdict = 'profitable';
  else if (gpChangePct >= -0.02) verdict = 'break_even';
  else verdict = 'margin_negative';

  const verdictRationale =
    verdict === 'profitable'
      ? `Gross profit improved ${(gpChangePct * 100).toFixed(1)}% — promotion generated real profit, not just revenue.`
      : verdict === 'break_even'
      ? `Gross profit flat (${(gpChangePct * 100).toFixed(1)}%). Higher volume offset by discount cost — watch cannibalization.`
      : `Gross profit fell ${(Math.abs(gpChangePct) * 100).toFixed(1)}%. Discount cost exceeded incremental revenue. Revisit discount depth.`;

  const NY_TARGET = 0.12; // default — ideally pulled from benchmarks
  const benchmarkComparison =
    promo.discountRate > NY_TARGET
      ? `⚠️ Promo discount rate (${(promo.discountRate * 100).toFixed(1)}%) exceeded market target (${(NY_TARGET * 100).toFixed(0)}%). Each +1% discount = -0.4% GM.`
      : `✅ Discount rate (${(promo.discountRate * 100).toFixed(1)}%) within market target (${(NY_TARGET * 100).toFixed(0)}%).`;

  return {
    baseline,
    promo,
    delta: {
      revenueChangePct: Math.round(revenueChangePct * 1000) / 1000,
      grossProfitChangePct: Math.round(gpChangePct * 1000) / 1000,
      basketSizeChangePct: Math.round(basketChangePct * 1000) / 1000,
      unitsPerTransactionChangePct: Math.round(uptChangePct * 1000) / 1000,
      discountRateDelta: Math.round(discountDelta * 1000) / 1000,
      discountRateGrossMarginImpact: Math.round(discountGmImpact * 1000) / 1000,
      transactionCountChangePct: Math.round(
        pct(promo.totalOrders - baseline.totalOrders, baseline.totalOrders || 1) * 1000
      ) / 1000,
    },
    verdict,
    verdictRationale,
    benchmarkComparison,
    chartData: [
      {
        period: baseline.label,
        revenue: baseline.totalRevenue,
        grossProfit: baseline.grossProfit,
        discountRate: baseline.discountRate,
      },
      {
        period: promo.label,
        revenue: promo.totalRevenue,
        grossProfit: promo.grossProfit,
        discountRate: promo.discountRate,
      },
    ],
  };
}

// =============================================================================
// TOOL 2: SKU PROFITABILITY VIEW
// =============================================================================

interface SkuProfit {
  productId: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  cost: number | null;
  unitsSold: number;
  netRevenue: number;
  grossMarginPct: number;
  contributionMarginPct: number;
  contributionMargin: number;
  actionRecommendation: 'protect' | 'grow' | 'reprice' | 'rationalize';
}

interface SkuProfitabilityResult {
  heroes: SkuProfit[];
  drains: SkuProfit[];
  summary: {
    totalNetRevenue: number;
    totalContributionMargin: number;
    portfolioContribMarginPct: number;
    skuCount: number;
    drainsCount: number;
    drainsTotalRevenuePct: number;
  };
  disclaimer: string;
  benchmarkNote: string;
  chartData: Array<{ name: string; contributionMarginPct: number; revenue: number; isHero: boolean }>;
}

async function skuProfitabilityView(
  orgId: string,
  input: {
    category?: string;
    minContribMarginPct?: number;
    topN?: number;
    lookbackDays?: number;
  }
): Promise<SkuProfitabilityResult> {
  logger.info('[analytics-tools] sku_profitability_view', { orgId, ...input });

  const actualLookbackDays = input.lookbackDays ?? 30;
  const topN = typeof input.topN === 'number' ? input.topN : 20;
  const drainThreshold = input.minContribMarginPct ?? 0.15;
  const STATE_EXCISE = 0.09; // NY default; ideally from benchmarks

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - actualLookbackDays * 86_400_000);

  const [products, orders] = await Promise.all([
    fetchProducts(orgId),
    fetchOrders(orgId, startDate, endDate),
  ]);

  // Build units-sold map from orders
  const unitsSoldMap = new Map<string, number>();
  const discountMap = new Map<string, number>(); // productId → avg discount fraction
  for (const order of orders) {
    for (const item of order.items || []) {
      unitsSoldMap.set(item.productId, (unitsSoldMap.get(item.productId) || 0) + item.quantity);
      if (item.originalPrice && item.originalPrice > item.price) {
        const itemDisc = (item.originalPrice - item.price) / item.originalPrice;
        // simple running average
        const prev = discountMap.get(item.productId) || 0;
        discountMap.set(item.productId, (prev + itemDisc) / 2);
      }
    }
  }

  const filtered = input.category
    ? products.filter(p => p.category?.toLowerCase() === input.category!.toLowerCase())
    : products;

  const skuProfits: SkuProfit[] = filtered.map(p => {
    const cost = effectiveCost(p);
    const unitsSold = unitsSoldMap.get(p.id) || 0;
    const avgDiscountRate = discountMap.get(p.id) || 0;
    const netRevenue = unitsSold * p.price * (1 - avgDiscountRate);
    const cogs = cost != null ? cost * unitsSold : 0;
    const grossProfit = netRevenue - cogs;
    const grossMarginPct = pct(grossProfit, netRevenue);
    const exciseBurden = netRevenue * STATE_EXCISE;
    const contributionMargin = grossProfit - exciseBurden;
    const contributionMarginPct = pct(contributionMargin, netRevenue);

    let actionRecommendation: SkuProfit['actionRecommendation'];
    if (contributionMarginPct >= 0.35) actionRecommendation = 'protect';
    else if (contributionMarginPct >= 0.20) actionRecommendation = 'grow';
    else if (contributionMarginPct >= 0.10) actionRecommendation = 'reprice';
    else actionRecommendation = 'rationalize';

    return {
      productId: p.id,
      name: p.name,
      category: p.category || 'Unknown',
      brand: p.brandName || 'Unknown',
      price: p.price,
      cost,
      unitsSold,
      netRevenue: Math.round(netRevenue),
      grossMarginPct: Math.round(grossMarginPct * 1000) / 1000,
      contributionMarginPct: Math.round(contributionMarginPct * 1000) / 1000,
      contributionMargin: Math.round(contributionMargin),
      actionRecommendation,
    };
  });

  // Sort descending by contributionMarginPct
  skuProfits.sort((a, b) => b.contributionMarginPct - a.contributionMarginPct);

  const heroes = skuProfits.slice(0, topN);
  const drains = skuProfits
    .filter(s => s.contributionMarginPct < drainThreshold)
    .slice(-topN)
    .reverse(); // worst first

  const totalNetRevenue = skuProfits.reduce((s, p) => s + p.netRevenue, 0);
  const totalContributionMargin = skuProfits.reduce((s, p) => s + p.contributionMargin, 0);
  const drainsTotalRevenue = drains.reduce((s, p) => s + p.netRevenue, 0);
  const GM_TARGET = 0.61; // NY target

  return {
    heroes,
    drains,
    summary: {
      totalNetRevenue: Math.round(totalNetRevenue),
      totalContributionMargin: Math.round(totalContributionMargin),
      portfolioContribMarginPct: Math.round(pct(totalContributionMargin, totalNetRevenue) * 1000) / 1000,
      skuCount: skuProfits.length,
      drainsCount: drains.length,
      drainsTotalRevenuePct: Math.round(pct(drainsTotalRevenue, totalNetRevenue) * 1000) / 1000,
    },
    disclaimer:
      '⚠️ This analysis is for business intelligence only, not tax advice. Cannabis businesses are subject to §280E — consult a licensed cannabis CPA for tax planning.',
    benchmarkNote: `Market GM target: ${(GM_TARGET * 100).toFixed(0)}%. Portfolio at ${(pct(totalContributionMargin, totalNetRevenue) * 100).toFixed(1)}%.`,
    chartData: [
      ...heroes.map(s => ({ name: s.name, contributionMarginPct: s.contributionMarginPct, revenue: s.netRevenue, isHero: true })),
      ...drains.map(s => ({ name: s.name, contributionMarginPct: s.contributionMarginPct, revenue: s.netRevenue, isHero: false })),
    ],
  };

}

// =============================================================================
// TOOL 3: INVENTORY HEALTH SCORE
// =============================================================================

interface InventoryItem {
  productId: string;
  name: string;
  category: string;
  brand: string;
  daysSinceLastSale: number;
  currentStock: number;
  velocity: number;
  weeksOfCover: number;
  dollarValue: number;
}

interface InventoryBucket {
  skuCount: number;
  dollarValue: number;
  items: InventoryItem[];
}

interface InventoryHealthResult {
  buckets: {
    healthy: InventoryBucket;
    watch: InventoryBucket;
    action: InventoryBucket;
    liquidate: InventoryBucket;
  };
  totalSkuCount: number;
  totalDollarAtRisk: number;
  topAgingItems: InventoryItem[];
  actionRules: {
    watch: string;
    action: string;
    liquidate: string;
  };
  chartData: Array<{ bucket: string; skuCount: number; dollarValue: number; color: string }>;
}

async function inventoryHealthScore(
  orgId: string,
  input: { category?: string }
): Promise<InventoryHealthResult> {
  logger.info('[analytics-tools] inventory_health_score', { orgId, ...input });

  const now = new Date();
  const lookback90Start = new Date(now.getTime() - 90 * 86_400_000);
  const lookback7Start = new Date(now.getTime() - 7 * 86_400_000);

  const [products, orders90, orders7] = await Promise.all([
    fetchProducts(orgId),
    fetchOrders(orgId, lookback90Start, now),
    fetchOrders(orgId, lookback7Start, now),
  ]);

  // Build last-sale date map (most recent order containing productId in 90d)
  const lastSaleMap = new Map<string, Date>();
  for (const order of orders90) {
    const orderDate = toDate(order.createdAt);
    if (!orderDate) continue;
    for (const item of order.items || []) {
      const prev = lastSaleMap.get(item.productId);
      if (!prev || orderDate > prev) {
        lastSaleMap.set(item.productId, orderDate);
      }
    }
  }

  // Build 7-day units sold map for velocity
  const units7Map = new Map<string, number>();
  for (const order of orders7) {
    for (const item of order.items || []) {
      units7Map.set(item.productId, (units7Map.get(item.productId) || 0) + item.quantity);
    }
  }

  const filtered = input.category
    ? products.filter(p => p.category?.toLowerCase() === input.category!.toLowerCase())
    : products;

  const items: InventoryItem[] = filtered.map(p => {
    const lastSale = lastSaleMap.get(p.id) || (toDate(p.lastSaleAt) ?? null);
    const daysSince = lastSale ? daysBetween(lastSale, now) : 91; // no sale = bucket as 90+
    const currentStock = p.stockCount ?? 0;
    const units7 = units7Map.get(p.id) || 0;
    const velocity = units7 / 7; // units/day
    const weeksOfCover = velocity > 0 ? currentStock / (velocity * 7) : Infinity;
    const cost = effectiveCost(p) ?? 0;
    const dollarValue = currentStock * cost;

    return {
      productId: p.id,
      name: p.name,
      category: p.category || 'Unknown',
      brand: p.brandName || 'Unknown',
      daysSinceLastSale: daysSince,
      currentStock,
      velocity: Math.round(velocity * 100) / 100,
      weeksOfCover: isFinite(weeksOfCover) ? Math.round(weeksOfCover * 10) / 10 : 999,
      dollarValue: Math.round(dollarValue),
    };
  });

  const makeBucket = (list: InventoryItem[]): InventoryBucket => ({
    skuCount: list.length,
    dollarValue: Math.round(list.reduce((s, i) => s + i.dollarValue, 0)),
    items: list,
  });

  const healthy: InventoryItem[] = [];
  const watch: InventoryItem[] = [];
  const action: InventoryItem[] = [];
  const liquidate: InventoryItem[] = [];

  for (const item of items) {
    if (item.daysSinceLastSale <= 30) healthy.push(item);
    else if (item.daysSinceLastSale <= 60) watch.push(item);
    else if (item.daysSinceLastSale <= 90) action.push(item);
    else liquidate.push(item);
  }

  const totalAtRisk =
    watch.reduce((s, i) => s + i.dollarValue, 0) +
    action.reduce((s, i) => s + i.dollarValue, 0) +
    liquidate.reduce((s, i) => s + i.dollarValue, 0);

  // Worst 5 by daysSinceLastSale × dollarValue (aging × inventory value)
  const topAgingItems = [...watch, ...action, ...liquidate]
    .sort((a, b) => b.daysSinceLastSale * b.dollarValue - a.daysSinceLastSale * a.dollarValue)
    .slice(0, 5);

  return {
    buckets: {
      healthy: makeBucket(healthy),
      watch: makeBucket(watch),
      action: makeBucket(action),
      liquidate: makeBucket(liquidate),
    },
    totalSkuCount: items.length,
    totalDollarAtRisk: Math.round(totalAtRisk),
    topAgingItems,
    actionRules: {
      watch: 'Eligible for targeted promotion (segment-specific). Do NOT run blanket discount — costs too much GM for unneeded velocity.',
      action: 'Markdown recommended (10-20%). Isolate from main promotion calendar. Coordinate with Money Mike on margin floor.',
      liquidate: 'Vendor swap, bundle with fast-mover, or flag for destruction review. STOP reordering until cleared.',
    },
    chartData: [
      { bucket: 'Healthy (0-30d)', skuCount: healthy.length, dollarValue: makeBucket(healthy).dollarValue, color: '#22c55e' },
      { bucket: 'Watch (31-60d)', skuCount: watch.length, dollarValue: makeBucket(watch).dollarValue, color: '#eab308' },
      { bucket: 'Action (61-90d)', skuCount: action.length, dollarValue: makeBucket(action).dollarValue, color: '#f97316' },
      { bucket: 'Liquidate (90d+)', skuCount: liquidate.length, dollarValue: makeBucket(liquidate).dollarValue, color: '#ef4444' },
    ],
  };
}

// =============================================================================
// TOOL 4: VENDOR SCORECARD
// =============================================================================

interface VendorScore {
  vendorName: string;
  skuCount: number;
  unitsSold: number;
  revenue: number;
  avgContribMarginPct: number;
  sellThroughScore: number;
  underperformingSkuPct: number;
  overallScore: number;
  tier: 'star' | 'solid' | 'watch' | 'review';
  recommendation: string;
}

interface VendorScorecardResult {
  vendors: VendorScore[];
  summary: {
    starVendors: string[];
    reviewVendors: string[];
    portfolioSellThroughAvg: number;
    portfolioMarginAvg: number;
  };
  chartData: Array<{ vendor: string; sellThroughScore: number; marginScore: number; overallScore: number }>;
}

async function vendorScorecard(
  orgId: string,
  input: { lookbackDays?: number }
): Promise<VendorScorecardResult> {
  logger.info('[analytics-tools] vendor_scorecard', { orgId, ...input });

  const lookbackDays = input.lookbackDays ?? 30;
  const STATE_EXCISE = 0.09;
  const DRAIN_THRESHOLD = 0.15;
  const now = new Date();
  const startDate = new Date(now.getTime() - lookbackDays * 86_400_000);

  const [products, orders] = await Promise.all([
    fetchProducts(orgId),
    fetchOrders(orgId, startDate, now),
  ]);

  // Build units sold map
  const unitsSoldMap = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items || []) {
      unitsSoldMap.set(item.productId, (unitsSoldMap.get(item.productId) || 0) + item.quantity);
    }
  }

  // Group products by vendor (brandName)
  const vendorMap = new Map<string, RawProduct[]>();
  for (const p of products) {
    const vendor = p.brandName || 'Unknown';
    const list = vendorMap.get(vendor) || [];
    list.push(p);
    vendorMap.set(vendor, list);
  }

  const vendorScores: VendorScore[] = [];

  for (const [vendorName, vendorProducts] of vendorMap.entries()) {
    const skuCount = vendorProducts.length;
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalInventory = 0;
    let contribMarginSum = 0;
    let contribMarginCount = 0;
    let underperformingCount = 0;

    for (const p of vendorProducts) {
      const units = unitsSoldMap.get(p.id) || 0;
      totalUnitsSold += units;
      totalRevenue += units * p.price;
      totalInventory += p.stockCount ?? 0;

      if (p.price > 0) {
        const cost = effectiveCost(p);
        const netRev = units * p.price;
        const cogs = cost != null ? cost * units : 0;
        const gp = netRev - cogs;
        const excise = netRev * STATE_EXCISE;
        const cm = gp - excise;
        const cmPct = pct(cm, netRev);

        if (units > 0) {
          contribMarginSum += cmPct;
          contribMarginCount++;
          if (cmPct < DRAIN_THRESHOLD) underperformingCount++;
        }
      }
    }

    const avgContribMarginPct = contribMarginCount > 0 ? pct(contribMarginSum, contribMarginCount) : 0;
    const sellThroughScore = pct(totalUnitsSold, Math.max(totalInventory, 1));
    const underperformingSkuPct = contribMarginCount > 0 ? pct(underperformingCount, contribMarginCount) : 0;

    // Composite score: sellThrough 40% + margin 40% + (1 - underperforming) 20%
    // Normalize margin: use 0-1 scale anchored on 0.61 GM target
    const marginScore = Math.min(avgContribMarginPct / 0.61, 1.0);
    const overallScore =
      sellThroughScore * 0.4 + marginScore * 0.4 + (1 - underperformingSkuPct) * 0.2;

    vendorScores.push({
      vendorName,
      skuCount,
      unitsSold: totalUnitsSold,
      revenue: Math.round(totalRevenue),
      avgContribMarginPct: Math.round(avgContribMarginPct * 1000) / 1000,
      sellThroughScore: Math.round(sellThroughScore * 1000) / 1000,
      underperformingSkuPct: Math.round(underperformingSkuPct * 1000) / 1000,
      overallScore: Math.round(overallScore * 1000) / 1000,
      tier: 'solid', // placeholder — assigned below
      recommendation: '', // assigned below
    });
  }

  // Sort descending by overallScore
  vendorScores.sort((a, b) => b.overallScore - a.overallScore);

  // Assign tiers: top 25% = star, 50-75% = solid, 25-50% = watch, bottom 25% = review
  const n = vendorScores.length;
  vendorScores.forEach((v, i) => {
    const rank = i / Math.max(n - 1, 1);
    if (rank <= 0.25) v.tier = 'star';
    else if (rank <= 0.5) v.tier = 'solid';
    else if (rank <= 0.75) v.tier = 'watch';
    else v.tier = 'review';

    v.recommendation =
      v.tier === 'star'
        ? `Prioritize shelf space and inventory depth. Negotiate volume pricing.`
        : v.tier === 'solid'
        ? `Maintain current assortment. Monitor margin trend quarterly.`
        : v.tier === 'watch'
        ? `Review SKU mix. Rationalize underperformers before next order cycle.`
        : `Renegotiate terms or reduce to core SKUs only. Evaluate replacement.`;
  });

  const starVendors = vendorScores.filter(v => v.tier === 'star').map(v => v.vendorName);
  const reviewVendors = vendorScores.filter(v => v.tier === 'review').map(v => v.vendorName);
  const portSellThrough =
    vendorScores.length > 0
      ? pct(vendorScores.reduce((s, v) => s + v.sellThroughScore, 0), vendorScores.length)
      : 0;
  const portMargin =
    vendorScores.length > 0
      ? pct(vendorScores.reduce((s, v) => s + v.avgContribMarginPct, 0), vendorScores.length)
      : 0;

  return {
    vendors: vendorScores,
    summary: {
      starVendors,
      reviewVendors,
      portfolioSellThroughAvg: Math.round(portSellThrough * 1000) / 1000,
      portfolioMarginAvg: Math.round(portMargin * 1000) / 1000,
    },
    chartData: vendorScores.map(v => ({
      vendor: v.vendorName,
      sellThroughScore: v.sellThroughScore,
      marginScore: Math.min(v.avgContribMarginPct / 0.61, 1.0),
      overallScore: v.overallScore,
    })),
  };
}

// =============================================================================
// TOOL DEFINITIONS (for agent toolsDef arrays)
// =============================================================================

export const dispensaryAnalyticsToolDefs = [
  {
    name: 'promotion_scorecard',
    description: `Measure the financial impact of any promotion or date range.
Computes pre/during/post gross profit delta, basket size change, discount rate impact,
and applies the -0.4% GM elasticity rule to every discount rate increase.
Returns a verdict: 'profitable', 'break_even', or 'margin_negative'.
Use before recommending new promotions and when reviewing past campaigns.`,
    schema: z.object({
      startDate: z.string().describe("Promo start date 'YYYY-MM-DD'"),
      endDate: z.string().describe("Promo end date 'YYYY-MM-DD'"),
      promotionName: z.string().optional().describe('Label for this promotion'),
      comparisonStartDate: z.string().optional().describe('Comparison period start (defaults to same-length prior period)'),
      comparisonEndDate: z.string().optional().describe('Comparison period end'),
    }),
  },
  {
    name: 'sku_profitability_view',
    description: `Per-SKU contribution margin analysis. Identifies hero products (high margin) and
drains (low/negative margin after excise tax). Applies state excise tax to compute true contribution margin.
Returns top N heroes, bottom drains, and portfolio-level margin vs. market target.
Use when asked "which products are killing our margins" or "SKU profitability".`,
    schema: z.object({
      category: z.string().optional().describe('Filter to one product category'),
      minContribMarginPct: z.number().optional().describe('Threshold for "drain" classification (default 0.15)'),
      topN: z.number().default(20).describe('Number of heroes/drains to return'),
      lookbackDays: z.number().default(30).describe('Days of order history to use for units-sold'),
    }),
  },
  {
    name: 'inventory_health_score',
    description: `Buckets every SKU by days-since-last-sale into four aging tiers:
healthy (0-30d), watch (31-60d), action needed (61-90d), liquidate (90d+).
Computes $ at risk per tier and identifies the worst 5 aging items by value × age.
Use when asked about slow-moving inventory, dead stock, or reorder decisions.`,
    schema: z.object({
      category: z.string().optional().describe('Filter to one product category'),
    }),
  },
  {
    name: 'vendor_scorecard',
    description: `Scores every brand/vendor by sell-through rate and average contribution margin.
Classifies vendors as star, solid, watch, or review. Identifies which vendors to prioritize
for shelf space, renegotiate, or rationalize. Use for buy-side decisions and vendor conversations.`,
    schema: z.object({
      lookbackDays: z.number().default(30).describe('Days of sales history to evaluate'),
    }),
  },
];

// =============================================================================
// TOOL IMPLEMENTATIONS FACTORY
// =============================================================================

export function makeAnalyticsToolsImpl(orgId: string) {
  return {
    async promotion_scorecard(input: {
      startDate: string;
      endDate: string;
      promotionName?: string;
      comparisonStartDate?: string;
      comparisonEndDate?: string;
    }) {
      return promotionScorecard(orgId, input);
    },

    async sku_profitability_view(input: {
      category?: string;
      minContribMarginPct?: number;
      topN?: number;
      lookbackDays?: number;
    }) {
      return skuProfitabilityView(orgId, input);
    },

    async inventory_health_score(input: { category?: string }) {
      return inventoryHealthScore(orgId, input);
    },

    async vendor_scorecard(input: { lookbackDays?: number }) {
      return vendorScorecard(orgId, input);
    },
  };
}

// =============================================================================
// TOOL EXECUTOR (for agent harness dispatch)
// =============================================================================

export async function executeDispensaryAnalyticsTool(
  orgId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const impl = makeAnalyticsToolsImpl(orgId);

  switch (toolName) {
    case 'promotion_scorecard':
      return impl.promotion_scorecard(args as Parameters<typeof impl.promotion_scorecard>[0]);

    case 'sku_profitability_view':
      return impl.sku_profitability_view(args as Parameters<typeof impl.sku_profitability_view>[0]);

    case 'inventory_health_score':
      return impl.inventory_health_score(args as Parameters<typeof impl.inventory_health_score>[0]);

    case 'vendor_scorecard':
      return impl.vendor_scorecard(args as Parameters<typeof impl.vendor_scorecard>[0]);

    default:
      throw new Error(`Unknown dispensary analytics tool: ${toolName}`);
  }
}
