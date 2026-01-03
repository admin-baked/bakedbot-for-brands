// src/server/services/availability-orchestrator.ts
/**
 * Multi-Source Availability Orchestrator
 * Uses a fallback chain to check product availability:
 * 1. CannMenus API (primary - real-time inventory)
 * 2. Weedmaps page scraping (fallback via Ezal)
 * 3. Dispensary website direct scraping (last resort)
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { searchNearbyRetailers } from '@/lib/cannmenus-api';
import { logger } from '@/lib/logger';

// Types for availability data
export interface AvailabilityResult {
    productId: string;
    productName?: string;
    retailerId: string;
    retailerName: string;
    source: 'cannmenus' | 'weedmaps' | 'leafly' | 'website' | 'cache' | 'unknown';
    inStock: boolean;
    price?: number;
    salePrice?: number;
    lastVerified: Date;
    confidence: number; // 0-1, how confident we are in this data
}

export interface AvailabilityCheckRequest {
    productId: string;
    productName: string;
    brandName?: string;
    retailerId: string;
    retailerName?: string;
    retailerAddress?: string;
    weedmapsUrl?: string;
    websiteUrl?: string;
}

// =============================================================================
// LAYER 1: CANNMENUS (Primary Source)
// =============================================================================

/**
 * Check CannMenus for product availability
 * This is the most reliable source when the retailer is connected
 */
async function checkCannMenus(
    productId: string,
    productName: string,
    retailerId: string
): Promise<AvailabilityResult | null> {
    try {
        // Check if we have CannMenus data for this retailer+product combo
        const { firestore } = await createServerClient();

        // Look for cached availability
        const availabilityRef = firestore
            .collection('availability')
            .where('retailer_id', '==', retailerId)
            .where('product_id', '==', productId)
            .limit(1);

        const snapshot = await availabilityRef.get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0].data();
            const lastSeen = doc.last_seen_at?.toDate() || new Date(0);
            const ageMinutes = (Date.now() - lastSeen.getTime()) / 1000 / 60;

            // If data is less than 30 minutes old, use cache
            if (ageMinutes < 30) {
                return {
                    productId,
                    productName,
                    retailerId,
                    retailerName: doc.retailer_name || 'Unknown',
                    source: 'cannmenus',
                    inStock: doc.in_stock ?? true,
                    price: doc.price,
                    salePrice: doc.sale_price,
                    lastVerified: lastSeen,
                    confidence: 0.95,
                };
            }
        }

        // Try to fetch fresh data from CannMenus API
        // For now, return null to fall through to next source
        // In production, this would call the CannMenus products API with retailer filter

        logger.info('[Availability] CannMenus cache miss or stale:', { productId, retailerId });
        return null;

    } catch (error) {
        logger.warn('[Availability] CannMenus check failed:', { productId, retailerId, error });
        return null;
    }
}

// =============================================================================
// LAYER 2: WEEDMAPS SCRAPING (Ezal Agent)
// =============================================================================

/**
 * Build Weedmaps search URL for a dispensary's product
 */
function buildWeedmapsUrl(retailerName: string, productName: string, state: string = 'california'): string {
    const cleanRetailer = retailerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanProduct = encodeURIComponent(productName);
    return `https://weedmaps.com/dispensaries/${cleanRetailer}?search=${cleanProduct}`;
}

/**
 * Check Weedmaps for product availability via page scraping
 * Uses Ezal's web scraping capabilities
 */
async function checkWeedmaps(
    request: AvailabilityCheckRequest
): Promise<AvailabilityResult | null> {
    try {
        // If we have a direct Weedmaps URL, use that
        const weedmapsUrl = request.weedmapsUrl ||
            buildWeedmapsUrl(request.retailerName || 'unknown', request.productName);

        logger.info('[Availability] Checking Weedmaps:', { url: weedmapsUrl });

        // Fetch the page content
        const response = await fetch(weedmapsUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            // Short timeout for scraping
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            logger.warn('[Availability] Weedmaps returned non-OK:', { status: response.status });
            return null;
        }

        const html = await response.text();

        // Parse for product availability signals
        // This is a simplified parser - in production, use proper HTML parsing
        const lowerHtml = html.toLowerCase();
        const productNameLower = request.productName.toLowerCase();

        // Check if product is mentioned on the page
        const productFound = lowerHtml.includes(productNameLower) ||
            lowerHtml.includes(productNameLower.replace(/ /g, '-'));

        if (!productFound) {
            return null;
        }

        // Look for stock indicators
        const inStock = !lowerHtml.includes('out of stock') &&
            !lowerHtml.includes('sold out') &&
            !lowerHtml.includes('unavailable');

        // Try to extract price (very basic regex)
        let price: number | undefined;
        const priceMatch = html.match(/\$(\d+\.?\d*)/);
        if (priceMatch) {
            price = parseFloat(priceMatch[1]);
        }

        return {
            productId: request.productId,
            productName: request.productName,
            retailerId: request.retailerId,
            retailerName: request.retailerName || 'Unknown',
            source: 'weedmaps',
            inStock,
            price,
            lastVerified: new Date(),
            confidence: 0.7, // Lower confidence for discovered data
        };

    } catch (error) {
        logger.warn('[Availability] Weedmaps discovery failed:', {
            productId: request.productId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

// =============================================================================
// LAYER 2.5: LEAFLY SCRAPING
// =============================================================================

/**
 * Build Leafly dispensary URL for a product search
 */
function buildLeaflyUrl(retailerName: string, productName: string): string {
    const cleanRetailer = retailerName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const cleanProduct = encodeURIComponent(productName);
    return `https://www.leafly.com/dispensary-info/${cleanRetailer}?q=${cleanProduct}`;
}

/**
 * Check Leafly for product availability via page scraping
 * Layer 2.5: Between Weedmaps (70%) and direct website (50%)
 */
async function checkLeafly(
    request: AvailabilityCheckRequest
): Promise<AvailabilityResult | null> {
    try {
        const leaflyUrl = buildLeaflyUrl(
            request.retailerName || 'unknown',
            request.productName
        );

        logger.info('[Availability] Checking Leafly:', { url: leaflyUrl });

        const response = await fetch(leaflyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            logger.warn('[Availability] Leafly returned non-OK:', { status: response.status });
            return null;
        }

        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        const productNameLower = request.productName.toLowerCase();

        // Check if product is mentioned on the page
        const productFound = lowerHtml.includes(productNameLower) ||
            lowerHtml.includes(productNameLower.replace(/ /g, '-'));

        if (!productFound) {
            return null;
        }

        // Look for stock indicators on Leafly
        const inStock = !lowerHtml.includes('out of stock') &&
            !lowerHtml.includes('sold out') &&
            !lowerHtml.includes('currently unavailable');

        // Try to extract price
        let price: number | undefined;
        const priceMatch = html.match(/\$([\d]+\.?\d*)/);
        if (priceMatch) {
            price = parseFloat(priceMatch[1]);
        }

        return {
            productId: request.productId,
            productName: request.productName,
            retailerId: request.retailerId,
            retailerName: request.retailerName || 'Unknown',
            source: 'leafly',
            inStock,
            price,
            lastVerified: new Date(),
            confidence: 0.75, // Between Weedmaps (0.7) and CannMenus (0.95)
        };

    } catch (error) {
        logger.warn('[Availability] Leafly discovery failed:', {
            productId: request.productId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

// =============================================================================
// LAYER 3: DIRECT WEBSITE SCRAPING
// =============================================================================

/**
 * Check dispensary's own website for product availability
 * Last resort when other sources fail
 */
async function checkWebsite(
    request: AvailabilityCheckRequest
): Promise<AvailabilityResult | null> {
    if (!request.websiteUrl) {
        return null;
    }

    try {
        // Build search URL if possible
        const searchUrl = new URL(request.websiteUrl);
        searchUrl.searchParams.set('search', request.productName);

        logger.info('[Availability] Checking dispensary website:', { url: searchUrl.toString() });

        const response = await fetch(searchUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        const productNameLower = request.productName.toLowerCase();

        // Check if product exists
        const productFound = lowerHtml.includes(productNameLower);

        if (!productFound) {
            return {
                productId: request.productId,
                productName: request.productName,
                retailerId: request.retailerId,
                retailerName: request.retailerName || 'Unknown',
                source: 'website',
                inStock: false,
                lastVerified: new Date(),
                confidence: 0.5, // Lowest confidence
            };
        }

        // Basic availability detection
        const inStock = !lowerHtml.includes('out of stock') &&
            !lowerHtml.includes('sold out');

        return {
            productId: request.productId,
            productName: request.productName,
            retailerId: request.retailerId,
            retailerName: request.retailerName || 'Unknown',
            source: 'website',
            inStock,
            lastVerified: new Date(),
            confidence: 0.5,
        };

    } catch (error) {
        logger.warn('[Availability] Website discovery failed:', {
            url: request.websiteUrl,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}

// =============================================================================
// ORCHESTRATOR
// =============================================================================

/**
 * Main orchestrator - tries sources in priority order
 */
export async function checkProductAvailability(
    request: AvailabilityCheckRequest
): Promise<AvailabilityResult> {
    const startTime = Date.now();

    // Layer 1: Try CannMenus first (fastest, most reliable)
    const cannmenusResult = await checkCannMenus(
        request.productId,
        request.productName,
        request.retailerId
    );

    if (cannmenusResult) {
        logger.info('[Availability] Found in CannMenus:', {
            productId: request.productId,
            ms: Date.now() - startTime
        });
        return cannmenusResult;
    }

    // Layer 2: Try Weedmaps scraping
    const weedmapsResult = await checkWeedmaps(request);

    if (weedmapsResult) {
        // Cache the result for future lookups
        await cacheAvailability(weedmapsResult);
        logger.info('[Availability] Found on Weedmaps:', {
            productId: request.productId,
            ms: Date.now() - startTime
        });
        return weedmapsResult;
    }

    // Layer 2.5: Try Leafly scraping
    const leaflyResult = await checkLeafly(request);

    if (leaflyResult) {
        await cacheAvailability(leaflyResult);
        logger.info('[Availability] Found on Leafly:', {
            productId: request.productId,
            ms: Date.now() - startTime
        });
        return leaflyResult;
    }

    // Layer 3: Try direct website scraping
    const websiteResult = await checkWebsite(request);

    if (websiteResult) {
        await cacheAvailability(websiteResult);
        logger.info('[Availability] Found on website:', {
            productId: request.productId,
            ms: Date.now() - startTime
        });
        return websiteResult;
    }

    // Fallback: Return unknown but optimistic
    logger.warn('[Availability] All sources failed, returning optimistic default:', {
        productId: request.productId,
        ms: Date.now() - startTime
    });

    return {
        productId: request.productId,
        productName: request.productName,
        retailerId: request.retailerId,
        retailerName: request.retailerName || 'Unknown',
        source: 'unknown',
        inStock: true, // Optimistic - don't block sales
        lastVerified: new Date(),
        confidence: 0.2,
    };
}

/**
 * Cache availability result for future lookups
 */
async function cacheAvailability(result: AvailabilityResult): Promise<void> {
    try {
        const { firestore } = await createServerClient();

        const cacheKey = `${result.retailerId}_${result.productId}`;
        await firestore.collection('availability_cache').doc(cacheKey).set({
            ...result,
            lastVerified: new Date(),
            createdAt: new Date(),
        }, { merge: true });

    } catch (error) {
        logger.warn('[Availability] Failed to cache result:', error instanceof Error ? error : new Error(String(error)));
    }
}

/**
 * Batch check availability for multiple products at a retailer
 */
export async function batchCheckAvailability(
    requests: AvailabilityCheckRequest[]
): Promise<AvailabilityResult[]> {
    // Process in parallel with concurrency limit
    const results: AvailabilityResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(req => checkProductAvailability(req))
        );
        results.push(...batchResults);
    }

    return results;
}

/**
 * Get availability stats for monitoring
 */
export async function getAvailabilityStats(): Promise<{
    totalChecks: number;
    bySource: Record<string, number>;
    avgConfidence: number;
}> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('availability_cache')
        .limit(1000)
        .get();

    const bySource: Record<string, number> = {};
    let totalConfidence = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        bySource[data.source] = (bySource[data.source] || 0) + 1;
        totalConfidence += data.confidence || 0;
    });

    return {
        totalChecks: snapshot.size,
        bySource,
        avgConfidence: snapshot.size > 0 ? totalConfidence / snapshot.size : 0,
    };
}
