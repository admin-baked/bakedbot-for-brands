'use server';

/**
 * Pricing Dashboard Server Actions
 *
 * Server-side functions for fetching pricing analytics and rule performance data.
 * These actions intentionally reuse the shared catalog analytics source so the
 * pricing dashboard and proactive workflows read the same normalized product truth.
 */

import { getPricingRules } from '@/app/actions/dynamic-pricing';
import { logger } from '@/lib/logger';
import {
  loadCatalogAnalyticsProducts,
  toAnalyticsDate,
  type CatalogAnalyticsProduct,
} from '@/server/services/catalog-analytics-source';
import type { DynamicPricingRule, PricingAnalytics } from '@/types/dynamic-pricing';

const DEFAULT_LOOKBACK_DAYS = 30;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ScopeProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  cost?: number;
}

export interface RuleScope {
  count: number;
  totalProducts: number;
  products: ScopeProduct[];
  hasRuntimeConditions: boolean;
}

type PricingSeriesRow = { date: string; revenue: number; applications: number };

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeToken(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value.trim().toLowerCase();
}

function getCategoryToken(product: CatalogAnalyticsProduct): string {
  return normalizeToken(product.category) ?? 'other';
}

function getBasePrice(product: CatalogAnalyticsProduct): number {
  return product.originalPrice != null && product.originalPrice > 0
    ? product.originalPrice
    : product.price;
}

function getProductDiscountPercent(product: CatalogAnalyticsProduct): number {
  const basePrice = getBasePrice(product);
  if (basePrice <= 0 || product.price >= basePrice) {
    return 0;
  }

  return ((basePrice - product.price) / basePrice) * 100;
}

function deriveDailyUnits(product: CatalogAnalyticsProduct): number {
  if (product.salesLast7Days > 0) {
    return product.salesLast7Days / 7;
  }

  if (product.salesVelocity > 0) {
    return product.salesVelocity;
  }

  if (product.salesLast30Days > 0) {
    return product.salesLast30Days / 30;
  }

  return 0;
}

function hasRuntimeConditions(conditions: DynamicPricingRule['conditions']): boolean {
  return Boolean(
    conditions.inventoryAge ||
    conditions.stockLevel ||
    conditions.stockLevelPercent ||
    conditions.competitorPrice ||
    conditions.timeRange ||
    conditions.daysOfWeek ||
    conditions.trafficLevel ||
    conditions.customerTier ||
    conditions.dateRange
  );
}

function matchesStaticConditions(
  product: CatalogAnalyticsProduct,
  conditions: DynamicPricingRule['conditions'],
): boolean {
  if (conditions.productIds && conditions.productIds.length > 0) {
    const allowedIds = new Set(
      conditions.productIds
        .map((value) => normalizeToken(value))
        .filter((value): value is string => Boolean(value)),
    );
    const productIds = [
      normalizeToken(product.id),
      normalizeToken(product.externalId),
      normalizeToken(product.skuId),
    ].filter((value): value is string => Boolean(value));

    if (!productIds.some((value) => allowedIds.has(value))) {
      return false;
    }
  }

  if (conditions.categories && conditions.categories.length > 0) {
    const category = getCategoryToken(product);
    const matchesCategory = conditions.categories.some((candidate) => {
      const token = normalizeToken(candidate);
      if (!token) {
        return false;
      }

      return category === token || category.includes(token);
    });

    if (!matchesCategory) {
      return false;
    }
  }

  return true;
}

function buildScopeProducts(
  products: CatalogAnalyticsProduct[],
  rule: Pick<DynamicPricingRule, 'conditions' | 'priceAdjustment'>,
): ScopeProduct[] {
  return products
    .filter((product) => matchesStaticConditions(product, rule.conditions))
    .slice(0, 50)
    .map((product) => {
      const price = product.price;
      const discountedPrice = applyAdjustment(price, rule.priceAdjustment);
      const discountPercent = price > 0
        ? roundPercent(((price - discountedPrice) / price) * 100)
        : 0;

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        price: roundCurrency(price),
        discountedPrice,
        discountPercent,
        cost: product.cost,
      };
    });
}

function getPricingStartDate(
  product: CatalogAnalyticsProduct,
  fallbackDate: Date,
): Date {
  const parsed = toAnalyticsDate(product.dynamicPricingUpdatedAt);
  return parsed ?? fallbackDate;
}

function getRevenueImpact(product: CatalogAnalyticsProduct): number {
  return product.salesLast30Days * (product.price - getBasePrice(product));
}

function getMarginImpact(product: CatalogAnalyticsProduct): number {
  if (product.cost == null) {
    return 0;
  }

  const basePrice = getBasePrice(product);
  return product.salesLast30Days * ((product.price - product.cost) - (basePrice - product.cost));
}

function buildRulePerformance(
  rules: DynamicPricingRule[],
  products: CatalogAnalyticsProduct[],
): PricingAnalytics['rulePerformance'] {
  return rules
    .map((rule) => {
      const scopedProducts = products.filter((product) => matchesStaticConditions(product, rule.conditions));
      const activeScopedProducts = scopedProducts.filter((product) => product.dynamicPricingApplied);
      const scopedDiscounts = activeScopedProducts
        .map(getProductDiscountPercent)
        .filter((value) => value > 0);
      const derivedRevenue = activeScopedProducts.reduce((sum, product) => sum + getRevenueImpact(product), 0);
      const derivedApplications = activeScopedProducts.length;

      let avgDiscount = 0;
      if (scopedDiscounts.length > 0) {
        avgDiscount = scopedDiscounts.reduce((sum, value) => sum + value, 0) / scopedDiscounts.length;
      } else if (rule.priceAdjustment.type === 'percentage') {
        avgDiscount = rule.priceAdjustment.value * 100;
      } else if (rule.priceAdjustment.type === 'fixed_amount' && scopedProducts.length > 0) {
        const averageBasePrice = scopedProducts.reduce((sum, product) => sum + product.price, 0) / scopedProducts.length;
        avgDiscount = averageBasePrice > 0 ? (rule.priceAdjustment.value / averageBasePrice) * 100 : 0;
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        timesApplied: Math.max(rule.timesApplied ?? 0, derivedApplications),
        avgDiscount: roundPercent(avgDiscount),
        conversionRate: roundPercent(rule.avgConversionRate ?? 0),
        revenue: roundCurrency((rule.revenueImpact ?? 0) || derivedRevenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function buildProductPerformance(
  products: CatalogAnalyticsProduct[],
): PricingAnalytics['productPerformance'] {
  return products
    .filter((product) => product.dynamicPricingApplied || product.salesLast30Days > 0)
    .map((product) => ({
      productId: product.id,
      productName: product.name,
      basePrice: roundCurrency(getBasePrice(product)),
      avgDynamicPrice: roundCurrency(product.price),
      unitsSold: product.salesLast30Days,
      revenue: roundCurrency(product.salesLast30Days * product.price),
      marginPercent: product.cost != null && product.price > 0
        ? roundPercent(((product.price - product.cost) / product.price) * 100)
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 25);
}

function buildPricingSeries(
  products: CatalogAnalyticsProduct[],
  days: number,
): PricingSeriesRow[] {
  const safeDays = Math.max(1, Math.min(days, 90));
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (safeDays - 1));

  const rows = new Map<string, PricingSeriesRow>();
  for (let i = 0; i < safeDays; i++) {
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    const key = current.toISOString().split('T')[0];
    rows.set(key, { date: key, revenue: 0, applications: 0 });
  }

  for (const product of products.filter((entry) => entry.dynamicPricingApplied)) {
    const pricingStart = getPricingStartDate(product, startDate);
    const effectiveStart = pricingStart > endDate ? null : (pricingStart < startDate ? startDate : pricingStart);
    if (!effectiveStart) {
      continue;
    }

    const startKey = effectiveStart.toISOString().split('T')[0];
    const startRow = rows.get(startKey);
    if (startRow) {
      startRow.applications += 1;
    }

    const dailyRevenue = deriveDailyUnits(product) * product.price;
    if (dailyRevenue <= 0) {
      continue;
    }

    const rollingCursor = new Date(effectiveStart);
    while (rollingCursor <= endDate) {
      const key = rollingCursor.toISOString().split('T')[0];
      const row = rows.get(key);
      if (row) {
        row.revenue += dailyRevenue;
      }
      rollingCursor.setDate(rollingCursor.getDate() + 1);
    }
  }

  return Array.from(rows.values()).map((row) => ({
    date: row.date,
    revenue: roundCurrency(row.revenue),
    applications: row.applications,
  }));
}

/**
 * Preview which products a pricing rule would affect.
 * Filters by static conditions only and flags runtime-only conditions separately.
 */
export async function previewRuleScope(
  orgId: string,
  rule: Pick<DynamicPricingRule, 'conditions' | 'priceAdjustment'>,
): Promise<{ success: boolean; data?: RuleScope; error?: string }> {
  try {
    const products = await loadCatalogAnalyticsProducts(orgId);
    const filteredProducts = products.filter((product) => matchesStaticConditions(product, rule.conditions));

    return {
      success: true,
      data: {
        count: filteredProducts.length,
        totalProducts: products.length,
        products: buildScopeProducts(products, rule),
        hasRuntimeConditions: hasRuntimeConditions(rule.conditions),
      },
    };
  } catch (error) {
    logger.error('[pricing-actions] Failed to preview rule scope', {
      orgId,
      error: String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview rule scope',
    };
  }
}

function applyAdjustment(
  price: number,
  adjustment: DynamicPricingRule['priceAdjustment'],
): number {
  if (price <= 0) {
    return price;
  }

  switch (adjustment.type) {
    case 'percentage': {
      const discounted = price * (1 - adjustment.value);
      const floored = adjustment.minPrice != null ? Math.max(discounted, adjustment.minPrice) : discounted;
      return roundCurrency(floored);
    }
    case 'fixed_amount': {
      const discounted = price - adjustment.value;
      const floored = adjustment.minPrice != null ? Math.max(discounted, adjustment.minPrice) : discounted;
      return roundCurrency(Math.max(floored, 0));
    }
    case 'set_price':
      return roundCurrency(adjustment.value);
    default:
      return roundCurrency(price);
  }
}

/**
 * Get comprehensive pricing analytics for an organization.
 */
export async function getPricingAnalytics(orgId: string): Promise<PricingAnalytics> {
  const dateRange = {
    start: new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * MILLIS_PER_DAY),
    end: new Date(),
  };

  try {
    const [rulesResult, products] = await Promise.all([
      getPricingRules(orgId),
      loadCatalogAnalyticsProducts(orgId),
    ]);
    const rules = rulesResult.data ?? [];
    const activeRules = rules.filter((rule) => rule.active);
    const pricedProducts = products.filter((product) => product.dynamicPricingApplied);
    const productsWithDiscount = pricedProducts.filter((product) => getProductDiscountPercent(product) > 0);

    const avgDiscountPercent = productsWithDiscount.length > 0
      ? productsWithDiscount.reduce((sum, product) => sum + getProductDiscountPercent(product), 0) / productsWithDiscount.length
      : 0;

    const totalRevenue = products.reduce((sum, product) => sum + (product.salesLast30Days * product.price), 0);
    const revenueImpact = pricedProducts.reduce((sum, product) => sum + getRevenueImpact(product), 0);
    const marginImpact = pricedProducts.reduce((sum, product) => sum + getMarginImpact(product), 0);
    const productPerformance = buildProductPerformance(products);
    const rulePerformance = buildRulePerformance(activeRules, products);

    logger.info('[pricing-actions] Computed pricing analytics', {
      orgId,
      totalProducts: products.length,
      productsWithDynamicPricing: pricedProducts.length,
      activeRules: activeRules.length,
      revenueImpact: roundCurrency(revenueImpact),
    });

    return {
      orgId,
      dateRange,
      overview: {
        totalProducts: products.length,
        productsWithDynamicPricing: pricedProducts.length,
        avgDiscountPercent: roundPercent(avgDiscountPercent),
        totalRevenue: roundCurrency(totalRevenue),
        revenueImpact: roundCurrency(revenueImpact),
        marginImpact: roundCurrency(marginImpact),
      },
      rulePerformance,
      productPerformance,
    };
  } catch (error) {
    logger.error('[pricing-actions] Failed to compute pricing analytics', {
      orgId,
      error: String(error),
    });

    return {
      orgId,
      dateRange,
      overview: {
        totalProducts: 0,
        productsWithDynamicPricing: 0,
        avgDiscountPercent: 0,
        totalRevenue: 0,
        revenueImpact: 0,
        marginImpact: 0,
      },
      rulePerformance: [],
      productPerformance: [],
    };
  }
}

/**
 * Get time-series pricing performance data for charts.
 * Revenue is the estimated daily revenue of products currently under dynamic pricing,
 * and applications are product pricing updates observed on each day.
 */
export async function getRulePerformanceData(
  orgId: string,
  days: number = DEFAULT_LOOKBACK_DAYS,
): Promise<{
  success: boolean;
  data?: Array<{ date: string; revenue: number; applications: number }>;
  error?: string;
}> {
  try {
    const products = await loadCatalogAnalyticsProducts(orgId);
    const data = buildPricingSeries(products, days);

    logger.info('[pricing-actions] Built pricing performance series', {
      orgId,
      days,
      pricedProducts: products.filter((product) => product.dynamicPricingApplied).length,
    });

    return { success: true, data };
  } catch (error) {
    logger.error('[pricing-actions] Failed to build pricing performance series', {
      orgId,
      days,
      error: String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get distinct product categories for an org.
 * Used by the "Applies to" scope picker in rule creation.
 */
export async function getProductCategories(
  orgId: string,
): Promise<{ success: boolean; categories?: string[]; error?: string }> {
  try {
    const products = await loadCatalogAnalyticsProducts(orgId);
    const categories = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return { success: true, categories };
  } catch (error) {
    logger.error('[pricing-actions] Failed to load pricing categories', {
      orgId,
      error: String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load categories',
    };
  }
}
