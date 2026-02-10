/**
 * Ezal Competitor Pricing Intelligence
 *
 * Integrates with Ezal discovery pipeline to monitor competitor prices.
 * Queries real data from products_competitive collection.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { CompetitorPriceData } from '@/types/dynamic-pricing';
import type { CompetitiveProduct, Competitor, PricePoint } from '@/types/ezal-discovery';

const COLLECTION_PRODUCTS = 'products_competitive';
const COLLECTION_COMPETITORS = 'competitors';
const COLLECTION_PRICE_POINTS = 'price_points_competitive';

// Cache for competitor name lookups (TTL: 10 min)
const competitorNameCache = new Map<string, { name: string; expiry: number }>();
const CACHE_TTL = 10 * 60 * 1000;

// ============ Core Functions ============

/**
 * Get competitor pricing for a specific product by name matching
 *
 * Searches products_competitive for matches based on:
 * - Exact product name match
 * - Normalized fuzzy matching (lowercase, alphanumeric)
 *
 * @param productName - Name of product to search
 * @param orgId - Organization ID (tenant) for context
 * @returns Array of competitor price data from real Ezal discoveries
 */
export async function getCompetitorPricing(
  productName: string,
  orgId: string
): Promise<CompetitorPriceData[]> {
  try {
    const { firestore } = await createServerClient();

    // Normalize product name for fuzzy matching
    const normalizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Query competitive products for this tenant
    const competitiveProductsSnap = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection(COLLECTION_PRODUCTS)
      .where('inStock', '==', true)
      .limit(500)
      .get();

    if (competitiveProductsSnap.empty) {
      logger.debug('[Ezal Pricing] No competitive products found', { orgId });
      return [];
    }

    // Find matching products
    const matches: CompetitorPriceData[] = [];

    for (const doc of competitiveProductsSnap.docs) {
      const product = doc.data() as CompetitiveProduct;
      const productNormalized = product.productName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Match on normalized name (contains or exact)
      const isMatch =
        productNormalized === normalizedName ||
        productNormalized.includes(normalizedName) ||
        normalizedName.includes(productNormalized);

      if (isMatch) {
        // Get competitor name (with caching)
        const competitorName = await getCachedCompetitorName(
          firestore,
          orgId,
          product.competitorId
        );

        // Get price history for this product
        const priceHistory = await getProductPriceHistory(
          firestore,
          orgId,
          doc.id,
          7 // Last 7 days
        );

        matches.push({
          competitorId: product.competitorId,
          competitorName,
          productName: product.productName,
          price: product.priceCurrent,
          inStock: product.inStock,
          lastChecked: product.lastSeenAt instanceof Date
            ? product.lastSeenAt
            : (product.lastSeenAt as FirebaseFirestore.Timestamp)?.toDate?.() || new Date(),
          priceHistory: priceHistory.map(pp => ({
            date: pp.capturedAt instanceof Date
              ? pp.capturedAt
              : (pp.capturedAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() || new Date(),
            price: pp.price,
          })),
          sellThroughRate: undefined, // Would need sales data
        });
      }
    }

    logger.info('[Ezal Pricing] Found competitor prices', {
      orgId,
      productName,
      matchCount: matches.length,
    });

    return matches;
  } catch (error) {
    logger.error('[Ezal Pricing] Error fetching competitor pricing', {
      productName,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Get cached competitor name by ID
 */
async function getCachedCompetitorName(
  firestore: FirebaseFirestore.Firestore,
  orgId: string,
  competitorId: string
): Promise<string> {
  const cacheKey = `${orgId}:${competitorId}`;
  const cached = competitorNameCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.name;
  }

  // Fetch from Firestore
  const competitorDoc = await firestore
    .collection('tenants')
    .doc(orgId)
    .collection(COLLECTION_COMPETITORS)
    .doc(competitorId)
    .get();

  const name = competitorDoc.exists
    ? (competitorDoc.data() as Competitor).name
    : `Competitor ${competitorId.slice(0, 6)}`;

  competitorNameCache.set(cacheKey, { name, expiry: Date.now() + CACHE_TTL });
  return name;
}

/**
 * Get price history for a competitive product
 */
async function getProductPriceHistory(
  firestore: FirebaseFirestore.Firestore,
  orgId: string,
  productId: string,
  days: number
): Promise<PricePoint[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const snapshot = await firestore
    .collection('tenants')
    .doc(orgId)
    .collection(COLLECTION_PRICE_POINTS)
    .where('productRef', '==', `tenants/${orgId}/${COLLECTION_PRODUCTS}/${productId}`)
    .where('capturedAt', '>=', cutoff)
    .orderBy('capturedAt', 'asc')
    .limit(50)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PricePoint[];
}

/**
 * Get average competitor price for a product
 *
 * Returns aggregated statistics from real competitive product data
 */
export async function getAverageCompetitorPrice(
  productName: string,
  orgId: string
): Promise<{
  avgPrice: number;
  lowestPrice: number;
  highestPrice: number;
  competitorCount: number;
  freshness: 'fresh' | 'stale' | 'very_stale';
} | null> {
  try {
    const competitors = await getCompetitorPricing(productName, orgId);

    if (competitors.length === 0) {
      return null;
    }

    // Filter to valid prices only
    const validPrices = competitors
      .filter(c => c.price > 0 && c.inStock)
      .map(c => c.price);

    if (validPrices.length === 0) {
      return null;
    }

    const avgPrice = validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length;
    const lowestPrice = Math.min(...validPrices);
    const highestPrice = Math.max(...validPrices);

    // Determine data freshness based on lastChecked times
    const now = Date.now();
    const maxAge = Math.max(
      ...competitors.map(c => now - c.lastChecked.getTime())
    );
    const hoursSinceUpdate = maxAge / (1000 * 60 * 60);

    let freshness: 'fresh' | 'stale' | 'very_stale' = 'fresh';
    if (hoursSinceUpdate > 48) {
      freshness = 'very_stale';
    } else if (hoursSinceUpdate > 12) {
      freshness = 'stale';
    }

    return {
      avgPrice: Math.round(avgPrice * 100) / 100,
      lowestPrice,
      highestPrice,
      competitorCount: competitors.length,
      freshness,
    };
  } catch (error) {
    logger.error('[Ezal Pricing] Error calculating average competitor price', {
      productName,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Monitor competitor prices and detect significant changes
 *
 * Returns recent price movements that may require action
 */
export async function monitorCompetitorPrices(
  orgId: string,
  thresholdPercent: number = 10
): Promise<{
  alerts: {
    productName: string;
    brandName: string;
    competitorName: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  lastCheck: Date;
}> {
  try {
    const { firestore } = await createServerClient();

    // Query recent insights for price changes
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24); // Last 24 hours

    const insightsSnap = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('insights_ezal')
      .where('type', 'in', ['price_drop', 'price_increase'])
      .where('dismissed', '==', false)
      .where('createdAt', '>=', cutoff)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const alerts = insightsSnap.docs
      .map(doc => {
        const data = doc.data();
        const changePercent = Math.abs(data.deltaPercentage || 0);

        // Only include alerts above threshold
        if (changePercent < thresholdPercent) return null;

        return {
          productName: data.competitorProductId || 'Unknown',
          brandName: data.brandName || 'Unknown',
          competitorName: data.competitorId || 'Unknown',
          oldPrice: data.previousValue as number || 0,
          newPrice: data.currentValue as number || 0,
          changePercent,
          severity: data.severity as 'low' | 'medium' | 'high' | 'critical',
        };
      })
      .filter((alert): alert is NonNullable<typeof alert> => alert !== null);

    logger.info('[Ezal Pricing] Competitor price monitoring complete', {
      orgId,
      alertCount: alerts.length,
    });

    return {
      alerts,
      lastCheck: new Date(),
    };
  } catch (error) {
    logger.error('[Ezal Pricing] Error monitoring competitor prices', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { alerts: [], lastCheck: new Date() };
  }
}

/**
 * Get competitor pricing trends over time
 *
 * Aggregates price history into daily averages
 */
export async function getCompetitorPriceTrends(
  productName: string,
  orgId: string,
  days: number = 30
): Promise<{ date: Date; avgPrice: number; minPrice: number; maxPrice: number }[]> {
  try {
    const { firestore } = await createServerClient();

    // First find matching products
    const competitors = await getCompetitorPricing(productName, orgId);

    if (competitors.length === 0) {
      return [];
    }

    // Aggregate price history by date
    const pricesByDate = new Map<string, number[]>();

    for (const competitor of competitors) {
      if (competitor.priceHistory) {
        for (const point of competitor.priceHistory) {
          const dateKey = point.date.toISOString().split('T')[0];
          const existing = pricesByDate.get(dateKey) || [];
          existing.push(point.price);
          pricesByDate.set(dateKey, existing);
        }
      }
    }

    // Convert to trend array
    const trends = Array.from(pricesByDate.entries())
      .map(([dateStr, prices]) => ({
        date: new Date(dateStr),
        avgPrice: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return trends;
  } catch (error) {
    logger.error('[Ezal Pricing] Error fetching competitor price trends', {
      productName,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ============ Integration Helpers ============

/**
 * Check if our price is competitive
 *
 * Returns detailed analysis with actionable recommendations
 */
export async function isCompetitivePrice(
  productName: string,
  ourPrice: number,
  orgId: string
): Promise<{
  isCompetitive: boolean;
  recommendation: string;
  details: {
    ourPrice: number;
    marketAvg: number;
    lowestPrice: number;
    highestPrice: number;
    percentDiff: number;
    competitorCount: number;
    dataFreshness: 'fresh' | 'stale' | 'very_stale';
  } | null;
}> {
  const competitors = await getAverageCompetitorPrice(productName, orgId);

  if (!competitors) {
    return {
      isCompetitive: true,
      recommendation: 'No competitor data available. Consider setting up Ezal discovery for this product.',
      details: null,
    };
  }

  const priceDiff = ourPrice - competitors.avgPrice;
  const percentDiff = (priceDiff / competitors.avgPrice) * 100;

  const details = {
    ourPrice,
    marketAvg: competitors.avgPrice,
    lowestPrice: competitors.lowestPrice,
    highestPrice: competitors.highestPrice,
    percentDiff: Math.round(percentDiff * 10) / 10,
    competitorCount: competitors.competitorCount,
    dataFreshness: competitors.freshness,
  };

  // Add freshness warning if data is old
  const freshnessWarning = competitors.freshness === 'very_stale'
    ? ' (Data is >48h old - consider triggering a fresh discovery)'
    : competitors.freshness === 'stale'
    ? ' (Data is >12h old)'
    : '';

  if (percentDiff < -15) {
    return {
      isCompetitive: true,
      recommendation: `Your price is ${Math.abs(percentDiff).toFixed(0)}% below market average ($${competitors.avgPrice.toFixed(2)}). You may be leaving money on the table - consider raising price.${freshnessWarning}`,
      details,
    };
  } else if (percentDiff < -5) {
    return {
      isCompetitive: true,
      recommendation: `Your price is ${Math.abs(percentDiff).toFixed(0)}% below market average. Good competitive positioning.${freshnessWarning}`,
      details,
    };
  } else if (percentDiff > 15) {
    return {
      isCompetitive: false,
      recommendation: `Your price is ${percentDiff.toFixed(0)}% above market average ($${competitors.avgPrice.toFixed(2)}). Lowest competitor: $${competitors.lowestPrice.toFixed(2)}. Consider a significant discount to compete.${freshnessWarning}`,
      details,
    };
  } else if (percentDiff > 5) {
    return {
      isCompetitive: false,
      recommendation: `Your price is ${percentDiff.toFixed(0)}% above market average. Consider a small discount or value-add to justify the premium.${freshnessWarning}`,
      details,
    };
  } else {
    return {
      isCompetitive: true,
      recommendation: `Your price is within 5% of market average ($${competitors.avgPrice.toFixed(2)}). Well positioned.${freshnessWarning}`,
      details,
    };
  }
}

/**
 * Get competitor pricing for a product by product ID (using product name lookup)
 *
 * This is the integration point for the dynamic pricing engine
 */
export async function getCompetitorPricingForProduct(
  productId: string,
  orgId: string
): Promise<{
  avgPrice: number;
  lowestPrice: number;
  highestPrice: number;
  competitorCount: number;
} | null> {
  try {
    const { firestore } = await createServerClient();

    // Get the product name from our catalog
    const productDoc = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .doc(productId)
      .get();

    if (!productDoc.exists) {
      logger.debug('[Ezal Pricing] Product not found for competitor lookup', { productId, orgId });
      return null;
    }

    const productName = productDoc.data()?.name || productDoc.data()?.productName;
    if (!productName) {
      return null;
    }

    return await getAverageCompetitorPrice(productName, orgId);
  } catch (error) {
    logger.error('[Ezal Pricing] Error getting competitor pricing for product', {
      productId,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
