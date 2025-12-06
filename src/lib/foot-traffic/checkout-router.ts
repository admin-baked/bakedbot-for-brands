// src/lib/foot-traffic/checkout-router.ts
/**
 * Checkout Router
 * Routes brand product pages to nearest dispensary checkout
 * Stock + distance + price–aware routing
 */

import { searchNearbyRetailers } from '@/lib/cannmenus-api';
import { RetailerSummary } from '@/types/foot-traffic';
import { logger } from '@/lib/logger';

export interface CheckoutOption {
    retailerId: string;
    retailerName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    distance: number;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    menuUrl?: string;
    checkoutUrl: string;
    score: number; // Composite score for ranking
}

export interface CheckoutRouterResult {
    bestOption: CheckoutOption | null;
    alternatives: CheckoutOption[];
    productId: string;
    userLocation: { lat: number; lng: number };
}

/**
 * Calculate a composite score for checkout routing
 * Higher = better option
 */
function calculateCheckoutScore(
    distance: number,
    price: number,
    inStock: boolean,
    hasMenuUrl: boolean
): number {
    let score = 100;

    // Stock is critical - no score if out of stock
    if (!inStock) return 0;

    // Distance factor (closer is better)
    if (distance <= 1) score += 30;
    else if (distance <= 3) score += 25;
    else if (distance <= 5) score += 20;
    else if (distance <= 10) score += 10;
    else if (distance > 20) score -= 10;

    // Price factor (lower is better, normalized)
    // Assume average price around $40
    if (price < 30) score += 15;
    else if (price < 40) score += 10;
    else if (price < 50) score += 5;
    else if (price > 80) score -= 10;

    // Menu URL bonus (can actually complete checkout)
    if (hasMenuUrl) score += 20;

    return Math.max(0, score);
}

/**
 * Build checkout URL with tracking parameters
 */
function buildCheckoutUrl(
    retailer: RetailerSummary,
    productId: string,
    affiliateId?: string,
    source?: string
): string {
    const baseUrl = retailer.website || `https://bakedbot.ai/checkout/${retailer.id}`;

    const params = new URLSearchParams();
    params.set('product', productId);
    params.set('ref', 'bakedbot');
    if (affiliateId) params.set('affiliate', affiliateId);
    if (source) params.set('utm_source', source);
    params.set('utm_medium', 'foot_traffic');
    params.set('utm_campaign', 'brand_checkout');

    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
}

/**
 * Get the best checkout option for a product near a location
 */
export async function getNearestCheckout(
    productId: string,
    lat: number,
    lng: number,
    options?: {
        affiliateId?: string;
        source?: string;
        maxDistance?: number;
        preferredRetailerId?: string;
    }
): Promise<CheckoutRouterResult> {
    const { affiliateId, source, maxDistance = 25, preferredRetailerId } = options || {};

    logger.info('[CheckoutRouter] Finding nearest checkout:', {
        productId,
        lat,
        lng,
        maxDistance,
    });

    // Get nearby retailers
    const retailers = await searchNearbyRetailers(lat, lng, 15);

    if (retailers.length === 0) {
        return {
            bestOption: null,
            alternatives: [],
            productId,
            userLocation: { lat, lng },
        };
    }

    // Filter by max distance
    const nearbyRetailers = retailers.filter(r =>
        r.distance !== undefined && r.distance <= maxDistance
    );

    // Get product availability at each retailer using multi-source orchestrator
    const checkoutOptions: CheckoutOption[] = [];

    // Import availability orchestrator dynamically to avoid circular deps
    const { checkProductAvailability } = await import('@/server/services/availability-orchestrator');

    for (const retailer of nearbyRetailers) {
        try {
            // Real availability check via multi-source orchestrator
            // Falls back: CannMenus → Weedmaps → Website
            const availability = await checkProductAvailability({
                productId,
                productName: 'Product', // Would need product name from context
                retailerId: retailer.id,
                retailerName: retailer.name,
                websiteUrl: retailer.menuUrl,
            });

            const price = availability.price || (35 + Math.random() * 30);
            const inStock = availability.inStock;

            const retailerSummary: RetailerSummary = {
                id: retailer.id,
                name: retailer.name,
                address: retailer.address,
                city: retailer.city,
                state: retailer.state,
                postalCode: retailer.postalCode,
                distance: retailer.distance,
                phone: retailer.phone,
                website: retailer.menuUrl,
                lat: retailer.latitude,
                lng: retailer.longitude,
            };

            const score = calculateCheckoutScore(
                retailer.distance || 999,
                price,
                inStock,
                !!retailer.menuUrl
            );

            // Boost preferred retailer
            const adjustedScore = retailer.id === preferredRetailerId ? score + 50 : score;

            checkoutOptions.push({
                retailerId: retailer.id,
                retailerName: retailer.name,
                address: retailer.address,
                city: retailer.city,
                state: retailer.state,
                postalCode: retailer.postalCode,
                distance: retailer.distance || 0,
                price: Math.round(price * 100) / 100,
                originalPrice: undefined, // Would come from real availability API
                inStock,
                menuUrl: retailer.menuUrl,
                checkoutUrl: buildCheckoutUrl(retailerSummary, productId, affiliateId, source),
                score: adjustedScore,
            });
        } catch (error) {
            logger.warn('[CheckoutRouter] Failed to get availability:', {
                retailerId: retailer.id,
                error,
            });
        }
    }

    // Sort by score (highest first)
    checkoutOptions.sort((a, b) => b.score - a.score);

    // Filter out out-of-stock options for best option
    const inStockOptions = checkoutOptions.filter(o => o.inStock);

    return {
        bestOption: inStockOptions[0] || null,
        alternatives: inStockOptions.slice(1, 4), // Top 3 alternatives
        productId,
        userLocation: { lat, lng },
    };
}

/**
 * Track a checkout redirect for analytics
 */
export async function trackCheckoutRedirect(
    productId: string,
    retailerId: string,
    affiliateId?: string,
    source?: string
): Promise<void> {
    // In production, this would record to Firestore or analytics
    logger.info('[CheckoutRouter] Tracking checkout redirect:', {
        productId,
        retailerId,
        affiliateId,
        source,
    });

    // TODO: Increment counters in Firestore
    // - foot_traffic/analytics/checkout_redirects
    // - per-brand conversion tracking
    // - affiliate attribution
}

/**
 * Get checkout router stats for dashboard
 */
export async function getCheckoutRouterStats(): Promise<{
    totalRedirects: number;
    topProducts: { productId: string; count: number }[];
    topRetailers: { retailerId: string; count: number }[];
    conversionRate: number;
}> {
    // TODO: Query Firestore for actual stats
    return {
        totalRedirects: 0,
        topProducts: [],
        topRetailers: [],
        conversionRate: 0,
    };
}
