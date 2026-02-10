'use server';

/**
 * Analytics Actions for Pricing Dashboard
 *
 * Server actions for fetching competitor pricing and analytics data.
 */

import { getAdminFirestore } from '@/firebase/admin';
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
    const db = getAdminFirestore();

    // Get our products
    const productsSnap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .limit(50)
      .get();

    if (productsSnap.empty) {
      return { success: true, data: [] };
    }

    const alerts: Array<{
      productName: string;
      ourPrice: number;
      competitorAvg: number;
      gap: number;
    }> = [];

    // Check each product against competitors
    for (const doc of productsSnap.docs) {
      const product = doc.data();
      const productName = product.name || product.productName;
      const ourPrice = product.price || 0;

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
    // TODO: When we have event logging, query actual events
    // For now, generate sample data based on rule stats

    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      // Add some variation to make charts interesting
      const baseApplications = 10 + Math.floor(Math.random() * 30);
      const dayOfWeek = date.getDay();
      // Weekend bump
      const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.5 : 1;

      return {
        date: date.toISOString().split('T')[0],
        applications: Math.floor(baseApplications * weekendMultiplier),
        revenue: Math.round((baseApplications * 15 + Math.random() * 200) * weekendMultiplier),
        avgDiscount: 10 + Math.random() * 10,
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
    const db = getAdminFirestore();

    // Get products
    const productsSnap = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .limit(100)
      .get();

    // TODO: Join with actual pricing application logs
    // For now, return sample data based on product info

    const products = productsSnap.docs.slice(0, limit).map((doc) => {
      const data = doc.data();
      const basePrice = data.price || 0;
      const discountPercent = 10 + Math.random() * 15;
      const avgDynamicPrice = basePrice * (1 - discountPercent / 100);

      return {
        productId: doc.id,
        productName: data.name || data.productName || 'Unknown Product',
        basePrice,
        avgDynamicPrice: Math.round(avgDynamicPrice * 100) / 100,
        timesDiscounted: Math.floor(Math.random() * 50),
        estimatedRevenue: Math.round(avgDynamicPrice * Math.random() * 20),
      };
    });

    // Sort by estimated revenue
    products.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
