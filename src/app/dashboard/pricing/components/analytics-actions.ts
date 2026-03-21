'use server';

/**
 * Analytics Actions for Pricing Dashboard
 *
 * Server actions for fetching competitor pricing and analytics data.
 */

import { getPricingAnalytics, getRulePerformanceData } from '../actions';
import { loadCatalogAnalyticsProducts } from '@/server/services/catalog-analytics-source';
import { getCompetitorPricing } from '@/server/services/ezal/competitor-pricing';

/**
 * Get competitor price alerts - products where our price differs from competitors
 *
 * @param orgId - Organization ID
 * @returns Products with significant price gaps
 */
export async function getCompetitorPriceAlerts(
  orgId: string
): Promise<{
  success: boolean;
  data?: Array<{
    productName: string;
    ourPrice: number;
    competitorAvg: number;
    gap: number;
  }>;
  error?: string;
}> {
  try {
    const products = await loadCatalogAnalyticsProducts(orgId);
    if (products.length === 0) {
      return { success: true, data: [] };
    }

    const alerts: Array<{
      productName: string;
      ourPrice: number;
      competitorAvg: number;
      gap: number;
    }> = [];

    // Check each product against competitors
    for (const product of products.slice(0, 50)) {
      const productName = product.name;
      const ourPrice = product.price;

      if (!productName || ourPrice <= 0) continue;

      // Get competitor pricing for this product
      const competitors = await getCompetitorPricing(productName, orgId);

      if (competitors.length === 0) continue;

      // Calculate average competitor price
      const validPrices = competitors
        .filter((c) => c.price > 0 && c.inStock)
        .map((c) => c.price);

      if (validPrices.length === 0) continue;

      const competitorAvg = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
      const gap = ((ourPrice - competitorAvg) / competitorAvg) * 100;

      // Only include significant gaps (> 5%)
      if (Math.abs(gap) >= 5) {
        alerts.push({
          productName,
          ourPrice,
          competitorAvg: Math.round(competitorAvg * 100) / 100,
          gap: Math.round(gap * 10) / 10,
        });
      }

      // Limit to first 20 products with data to avoid slow queries
      if (alerts.length >= 20) break;
    }

    // Sort by absolute gap (biggest differences first)
    alerts.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    return { success: true, data: alerts.slice(0, 10) };
  } catch (error) {
    console.error('[getCompetitorPriceAlerts] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get daily pricing rule analytics
 *
 * @param orgId - Organization ID
 * @param ruleId - Specific rule ID (optional)
 * @param days - Number of days to analyze
 * @returns Time series data for the rule
 */
export async function getRuleDailyStats(
  orgId: string,
  ruleId?: string,
  days: number = 30
): Promise<{
  success: boolean;
  data?: Array<{
    date: string;
    applications: number;
    revenue: number;
    avgDiscount: number;
  }>;
  error?: string;
  }> {
  try {
    const [seriesResult, analytics] = await Promise.all([
      getRulePerformanceData(orgId, days),
      getPricingAnalytics(orgId),
    ]);

    if (!seriesResult.success || !seriesResult.data) {
      return {
        success: false,
        error: seriesResult.error ?? 'Failed to load pricing series',
      };
    }

    const selectedRule = ruleId
      ? analytics.rulePerformance.find((rule) => rule.ruleId === ruleId)
      : null;
    const avgDiscount = selectedRule?.avgDiscount ?? analytics.overview.avgDiscountPercent;

    const data = seriesResult.data.map((row) => ({
      date: row.date,
      applications: row.applications,
      revenue: row.revenue,
      avgDiscount,
    }));

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get product-level pricing performance
 *
 * @param orgId - Organization ID
 * @param limit - Max products to return
 * @returns Top performing products by dynamic pricing revenue
 */
export async function getTopProductsByPricing(
  orgId: string,
  limit: number = 10
): Promise<{
  success: boolean;
  data?: Array<{
    productId: string;
    productName: string;
    basePrice: number;
    avgDynamicPrice: number;
    timesDiscounted: number;
    estimatedRevenue: number;
  }>;
  error?: string;
  }> {
  try {
    const analytics = await getPricingAnalytics(orgId);
    const products = analytics.productPerformance
      .slice(0, limit)
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        basePrice: product.basePrice,
        avgDynamicPrice: product.avgDynamicPrice,
        timesDiscounted: product.avgDynamicPrice < product.basePrice ? 1 : 0,
        estimatedRevenue: Math.round(product.revenue),
      }));

    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
