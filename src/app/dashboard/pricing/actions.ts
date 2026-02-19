'use server';

/**
 * Pricing Dashboard Server Actions
 *
 * Server-side functions for fetching pricing analytics and rule performance data.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { getPricingRules } from '@/app/actions/dynamic-pricing';
import type { DynamicPricingRule, PricingAnalytics } from '@/types/dynamic-pricing';

export interface ScopeProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  cost?: number; // COGS — used to warn when discounting without margin data
}

export interface RuleScope {
  count: number;
  totalProducts: number;
  products: ScopeProduct[];
  hasRuntimeConditions: boolean; // inventory age, time, etc. — can't pre-filter
}

/**
 * Preview which products a pricing rule would affect.
 * Filters by static conditions (categories, productIds).
 * Runtime conditions (inventoryAge, timeRange, etc.) are flagged but not pre-evaluated.
 */
export async function previewRuleScope(
  orgId: string,
  rule: Pick<DynamicPricingRule, 'conditions' | 'priceAdjustment'>
): Promise<{ success: boolean; data?: RuleScope; error?: string }> {
  try {
    const db = getAdminFirestore();
    const baseRef = db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items');

    // Fetch products — apply category filter at query level if possible
    let query: FirebaseFirestore.Query = baseRef;
    const { conditions } = rule;

    const hasRuntimeConditions = !!(
      conditions.inventoryAge ||
      conditions.stockLevel ||
      conditions.stockLevelPercent ||
      conditions.competitorPrice ||
      conditions.timeRange ||
      conditions.daysOfWeek ||
      conditions.trafficLevel
    );

    // If specific product IDs — fetch only those
    if (conditions.productIds && conditions.productIds.length > 0) {
      const docs = await Promise.all(
        conditions.productIds.slice(0, 50).map((id) => baseRef.doc(id).get())
      );
      const products: ScopeProduct[] = docs
        .filter((d) => d.exists)
        .map((d) => {
          const data = d.data()!;
          const price = data.price ?? 0;
          const discountedPrice = applyAdjustment(price, rule.priceAdjustment);
          const discountPercent = price > 0 ? Math.round(((price - discountedPrice) / price) * 100) : 0;
          return {
            id: d.id,
            name: data.name ?? 'Unknown',
            category: data.category ?? '',
            price,
            discountedPrice,
            discountPercent,
            cost: data.cost ?? undefined,
          };
        });
      return {
        success: true,
        data: {
          count: products.length,
          totalProducts: products.length,
          products,
          hasRuntimeConditions,
        },
      };
    }

    // Fetch up to 200 products (enough for counts + preview list)
    const snap = await query.limit(200).get();
    const allProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{ id: string; name: string; category: string; price: number; cost?: number }>;

    // Filter by category if specified
    let filtered = allProducts;
    if (conditions.categories && conditions.categories.length > 0) {
      const cats = conditions.categories.map((c) => c.toLowerCase());
      filtered = allProducts.filter((p) =>
        cats.some((c) => (p.category ?? '').toLowerCase().includes(c))
      );
    }

    const products: ScopeProduct[] = filtered.slice(0, 50).map((p) => {
      const price = p.price ?? 0;
      const discountedPrice = applyAdjustment(price, rule.priceAdjustment);
      const discountPercent = price > 0 ? Math.round(((price - discountedPrice) / price) * 100) : 0;
      return {
        id: p.id,
        name: p.name ?? 'Unknown',
        category: p.category ?? '',
        price,
        discountedPrice,
        discountPercent,
        cost: p.cost ?? undefined,
      };
    });

    return {
      success: true,
      data: {
        count: filtered.length,
        totalProducts: allProducts.length,
        products,
        hasRuntimeConditions,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview rule scope',
    };
  }
}

function applyAdjustment(
  price: number,
  adj: DynamicPricingRule['priceAdjustment']
): number {
  if (price <= 0) return price;
  switch (adj.type) {
    case 'percentage': {
      const discounted = price * (1 - adj.value);
      const floored = adj.minPrice ? Math.max(discounted, adj.minPrice) : discounted;
      return Math.round(floored * 100) / 100;
    }
    case 'fixed_amount': {
      const discounted = price - adj.value;
      const floored = adj.minPrice ? Math.max(discounted, adj.minPrice) : discounted;
      return Math.round(Math.max(floored, 0) * 100) / 100;
    }
    case 'set_price':
      return adj.value;
    default:
      return price;
  }
}

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

/**
 * Get distinct product categories for an org.
 * Used by the "Applies to" scope picker in rule creation.
 */
export async function getProductCategories(
  orgId: string
): Promise<{ success: boolean; categories?: string[]; error?: string }> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .limit(500)
      .get();

    const seen = new Set<string>();
    snap.docs.forEach((d) => {
      const cat = d.data().category as string | undefined;
      if (cat && cat.trim()) seen.add(cat.trim());
    });

    return { success: true, categories: Array.from(seen).sort() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load categories',
    };
  }
}
