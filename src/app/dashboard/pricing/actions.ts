'use server';

/**
 * Pricing Dashboard Server Actions
 *
 * Server-side functions for fetching pricing analytics and rule performance data.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getPricingRules } from '@/app/actions/dynamic-pricing';
import type { PricingAnalytics } from '@/types/dynamic-pricing';

/**
 * Get comprehensive pricing analytics for an organization
 *
 * @param orgId - Organization ID
 * @returns Analytics data with overview and performance metrics
 */
export async function getPricingAnalytics(orgId: string): Promise<PricingAnalytics> {
  try {
    const db = getAdminFirestore();

    // Get all pricing rules
    const rulesResult = await getPricingRules(orgId);
    const rules = rulesResult.data || [];

    // Get product count
    const productsSnap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .count()
      .get();

    const totalProducts = productsSnap.data().count;

    // Calculate active rules
    const activeRules = rules.filter((r) => r.active);

    // Calculate products with dynamic pricing
    // (For now, estimate based on conditions - would need actual calculation in production)
    let productsWithPricing = 0;
    activeRules.forEach((rule) => {
      if (rule.conditions.productIds) {
        productsWithPricing += rule.conditions.productIds.length;
      } else if (rule.conditions.categories) {
        // Estimate: each category has ~10 products on average
        productsWithPricing += rule.conditions.categories.length * 10;
      } else {
        // Rule applies to all products
        productsWithPricing = totalProducts;
      }
    });

    // Cap at total products
    productsWithPricing = Math.min(productsWithPricing, totalProducts);

    // Calculate average discount
    let totalDiscount = 0;
    let discountCount = 0;

    activeRules.forEach((rule) => {
      if (rule.priceAdjustment.type === 'percentage') {
        totalDiscount += rule.priceAdjustment.value * 100;
        discountCount++;
      }
    });

    const avgDiscountPercent =
      discountCount > 0 ? totalDiscount / discountCount : 0;

    // Calculate revenue impact (aggregate from rule stats)
    const totalRevenue = rules.reduce(
      (sum, rule) => sum + (rule.revenueImpact || 0),
      0
    );

    // Build rule performance data
    const rulePerformance = rules.map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      timesApplied: rule.timesApplied || 0,
      avgDiscount:
        rule.priceAdjustment.type === 'percentage'
          ? rule.priceAdjustment.value * 100
          : 0,
      conversionRate: rule.avgConversionRate || 0,
      revenue: rule.revenueImpact || 0,
    }));

    // Sort by revenue impact
    rulePerformance.sort((a, b) => b.revenue - a.revenue);

    return {
      orgId,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      },
      overview: {
        totalProducts,
        productsWithDynamicPricing: productsWithPricing,
        avgDiscountPercent,
        totalRevenue,
        revenueImpact: totalRevenue, // vs baseline (would calculate in production)
        marginImpact: 0, // Would calculate with COGS data
      },
      rulePerformance,
      productPerformance: [], // TODO: Implement product-level analytics
    };
  } catch (error) {
    console.error('[getPricingAnalytics] Error:', error);

    // Return empty analytics on error
    return {
      orgId,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
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
 * Get rule performance data for charts
 *
 * @param orgId - Organization ID
 * @param days - Number of days to analyze (default: 30)
 * @returns Time-series performance data
 */
export async function getRulePerformanceData(
  orgId: string,
  days: number = 30
): Promise<{
  success: boolean;
  data?: Array<{ date: string; revenue: number; applications: number }>;
  error?: string;
}> {
  try {
    // TODO: Implement time-series analytics
    // Would query application logs/events from Firestore
    // Group by date and aggregate metrics

    // Mock data for now
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        revenue: Math.random() * 1000,
        applications: Math.floor(Math.random() * 50),
      };
    });

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
