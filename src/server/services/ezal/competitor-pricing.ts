/**
 * Ezal Competitor Pricing Intelligence
 *
 * Integrates with Ezal agent to monitor competitor prices and market dynamics.
 * Foundation for competitive pricing strategies.
 */

import type { CompetitorPriceData } from '@/types/dynamic-pricing';

// ============ Core Functions ============

/**
 * Get competitor pricing for a specific product
 *
 * @param productName - Name of product to search
 * @param orgId - Organization ID for context
 * @returns Array of competitor price data
 */
export async function getCompetitorPricing(
  productName: string,
  orgId: string
): Promise<CompetitorPriceData[]> {
  try {
    // TODO: Integrate with Ezal agent
    // For now, return mock data structure

    // Future implementation:
    // 1. Call Ezal agent with product search query
    // 2. Ezal scrapes competitor menus in the area
    // 3. Returns structured price data with timestamps
    // 4. Store in Firestore for historical tracking

    const mockCompetitorData: CompetitorPriceData[] = [
      {
        competitorId: 'comp-1',
        competitorName: 'Competitor A',
        productName,
        price: 0, // Will be populated by Ezal
        inStock: true,
        lastChecked: new Date(),
        sellThroughRate: 0,
      },
    ];

    return mockCompetitorData;
  } catch (error) {
    console.error('Error fetching competitor pricing:', error);
    return [];
  }
}

/**
 * Get average competitor price for a product
 */
export async function getAverageCompetitorPrice(
  productName: string,
  orgId: string
): Promise<{ avgPrice: number; lowestPrice: number; highestPrice: number } | null> {
  try {
    const competitors = await getCompetitorPricing(productName, orgId);

    if (competitors.length === 0) {
      return null;
    }

    const prices = competitors.map(c => c.price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);

    return { avgPrice, lowestPrice, highestPrice };
  } catch (error) {
    console.error('Error calculating average competitor price:', error);
    return null;
  }
}

/**
 * Monitor competitor prices and trigger alerts on changes
 *
 * Background job that runs periodically to track competitor price movements
 */
export async function monitorCompetitorPrices(orgId: string): Promise<void> {
  try {
    // TODO: Implement background monitoring
    // 1. Get list of products to monitor
    // 2. Fetch current competitor prices via Ezal
    // 3. Compare to previous prices
    // 4. Trigger alerts on significant changes (>10%)
    // 5. Update pricing rules if auto-adjust is enabled

    console.log('[Ezal] Competitor price monitoring not yet implemented');
  } catch (error) {
    console.error('Error monitoring competitor prices:', error);
  }
}

/**
 * Get competitor pricing trends over time
 */
export async function getCompetitorPriceTrends(
  productName: string,
  orgId: string,
  days: number = 30
): Promise<{ date: Date; avgPrice: number }[]> {
  try {
    // TODO: Query historical price data from Firestore
    // Return time series of average competitor prices

    return [];
  } catch (error) {
    console.error('Error fetching competitor price trends:', error);
    return [];
  }
}

// ============ Integration Helpers ============

/**
 * Check if our price is competitive
 */
export async function isCompetitivePrice(
  productName: string,
  ourPrice: number,
  orgId: string
): Promise<{ isCompetitive: boolean; recommendation: string }> {
  const competitors = await getAverageCompetitorPrice(productName, orgId);

  if (!competitors) {
    return {
      isCompetitive: true,
      recommendation: 'No competitor data available',
    };
  }

  const priceDiff = ourPrice - competitors.avgPrice;
  const percentDiff = (priceDiff / competitors.avgPrice) * 100;

  if (percentDiff < -10) {
    return {
      isCompetitive: true,
      recommendation: `Your price is ${Math.abs(percentDiff).toFixed(0)}% below market average. Consider raising slightly to improve margins.`,
    };
  } else if (percentDiff > 10) {
    return {
      isCompetitive: false,
      recommendation: `Your price is ${percentDiff.toFixed(0)}% above market average. Consider lowering to remain competitive.`,
    };
  } else {
    return {
      isCompetitive: true,
      recommendation: 'Your price is competitive with the market.',
    };
  }
}
