// src/app/api/smokey/find/route.ts
/**
 * Smokey Find API
 * Find products matching natural language queries with constraints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type {
    SmokeyFindRequest,
    SmokeyFindResponse,
    RankedProduct,
    ParsedQuery,
} from '@/types/smokey-actions';
import { RANKING_WEIGHTS, adjustRatingWithConfidence } from '@/types/smokey-actions';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        const body: SmokeyFindRequest = await request.json();
        const { queryText, context, filters } = body;

        // Parse natural language query
        const parsed = parseQuery(queryText);

        // Merge parsed constraints with explicit filters
        const mergedFilters = {
            ...parsed,
            ...filters,
            category: filters?.category || parsed.category,
            maxPrice: filters?.maxPrice || parsed.priceConstraint?.max,
            maxMinutes: filters?.maxMinutes || parsed.distanceConstraint?.maxMinutes,
            minRating: filters?.minRating || parsed.ratingConstraint?.min,
        };

        const firestore = getAdminFirestore();

        // 1. Get candidate dispensaries
        let dispensaries = await getCandidateDispensaries(
            firestore,
            context.userGeo,
            mergedFilters.maxMinutes
        );

        // Filter by open now if requested
        if (mergedFilters.openNow) {
            dispensaries = dispensaries.filter(d => d.isOpen);
        }

        // 2. Get products from candidate dispensaries
        const products = await getProductsFromDispensaries(
            firestore,
            dispensaries.map(d => d.id),
            mergedFilters
        );

        // 3. Score and rank products
        const rankedProducts = scoreAndRankProducts(products, dispensaries, mergedFilters);

        // 4. Return top 3 + 2 fallbacks
        const results = rankedProducts.slice(0, 3);
        const fallbacks = rankedProducts.slice(3, 5);

        const response: SmokeyFindResponse = {
            success: true,
            results,
            fallbacks,
            queryParsed: parsed,
        };

        return NextResponse.json(response);

    } catch (error: any) {
        logger.error('Smokey find failed:', error);
        return NextResponse.json(
            { success: false, results: [], fallbacks: [], error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Parse natural language query into structured constraints
 */
function parseQuery(queryText: string): ParsedQuery {
    const text = queryText.toLowerCase();
    const parsed: ParsedQuery = { intent: 'find' };

    // Category detection
    const categories = ['flower', 'edibles', 'vapes', 'concentrates', 'pre-rolls', 'tinctures'];
    for (const cat of categories) {
        if (text.includes(cat)) {
            parsed.category = cat;
            break;
        }
    }

    // Effect detection
    const effects = ['relaxing', 'energizing', 'creative', 'sleepy', 'focused', 'uplifting'];
    parsed.effects = effects.filter(e => text.includes(e));

    // Price constraint
    const priceMatch = text.match(/under\s*\$?(\d+)|less\s*than\s*\$?(\d+)|max\s*\$?(\d+)/);
    if (priceMatch) {
        const price = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
        parsed.priceConstraint = { max: price };
    }

    // Distance constraint
    const distanceMatch = text.match(/within\s*(\d+)\s*(minute|min)/);
    if (distanceMatch) {
        parsed.distanceConstraint = { maxMinutes: parseInt(distanceMatch[1]) };
    }

    // Rating constraint
    if (text.match(/\b(best|top|highest|good|great|excellent)(?:[\s-]*rated)?\b/)) {
        parsed.ratingConstraint = { min: 4.0 };
    }

    return parsed;
}

/**
 * Get dispensaries within range
 */
async function getCandidateDispensaries(
    firestore: FirebaseFirestore.Firestore,
    userGeo?: { lat: number; lng: number },
    maxMinutes?: number
): Promise<Array<{ id: string; name: string; distance?: number; isOpen?: boolean; googleRating?: number; reviewCount?: number }>> {
    // For MVP, get dispensaries and calculate distance client-side
    // TODO: Integrate Routes API for actual travel time

    const snapshot = await firestore.collection('dispensaries')
        .limit(50)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        let distance: number | undefined;

        if (userGeo && data.lat && data.lon) {
            distance = calculateDistance(userGeo.lat, userGeo.lng, data.lat, data.lon);
        }

        return {
            id: doc.id,
            name: data.name,
            distance,
            isOpen: data.google?.currentOpeningHours?.openNow,
            googleRating: data.googleRating,
            reviewCount: data.googleReviewCount,
        };
    }).filter(d => {
        if (maxMinutes && d.distance !== undefined) {
            // Rough estimate: 30mph average = 0.5 miles per minute
            const estimatedMinutes = d.distance / 0.5;
            return estimatedMinutes <= maxMinutes;
        }
        return true;
    });
}

/**
 * Get products from dispensaries matching filters
 */
async function getProductsFromDispensaries(
    firestore: FirebaseFirestore.Firestore,
    dispensaryIds: string[],
    filters: any
): Promise<Array<{ productId: string; productName: string; brandName?: string; category: string; price: number; dispId: string; dispensaryName: string; imageUrl?: string }>> {
    if (dispensaryIds.length === 0) return [];

    // Query products - in production would use product index
    const products: any[] = [];

    for (const dispId of dispensaryIds.slice(0, 10)) {
        const snapshot = await firestore.collection('dispensaries').doc(dispId)
            .collection('products')
            .limit(20)
            .get();

        const dispensaryDoc = await firestore.collection('dispensaries').doc(dispId).get();
        const dispensaryName = dispensaryDoc.data()?.name || 'Unknown';

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Apply filters
            if (filters.category && data.category?.toLowerCase() !== filters.category) continue;
            if (filters.maxPrice && data.price > filters.maxPrice) continue;

            products.push({
                productId: doc.id,
                productName: data.name,
                brandName: data.brand,
                category: data.category || 'other',
                price: data.price || 0,
                dispId,
                dispensaryName,
                imageUrl: data.imageUrl,
            });
        }
    }

    return products;
}

/**
 * Score and rank products
 */
function scoreAndRankProducts(
    products: any[],
    dispensaries: any[],
    filters: any
): RankedProduct[] {
    const dispMap = new Map(dispensaries.map(d => [d.id, d]));

    const scored = products.map(product => {
        const disp = dispMap.get(product.dispId);
        const reasons: string[] = [];
        let score = 0;

        // Google rating score (Bayesian adjusted)
        if (disp?.googleRating && disp?.reviewCount) {
            const adjRating = adjustRatingWithConfidence(disp.googleRating, disp.reviewCount);
            score += (adjRating / 5) * RANKING_WEIGHTS.googleRating;
            if (disp.googleRating >= 4.5) {
                reasons.push(`Highly rated (${disp.googleRating}★)`);
            }
        }

        // Distance score
        if (disp?.distance !== undefined) {
            const distScore = Math.max(0, 1 - (disp.distance / 20)); // 20 miles = 0 score
            score += distScore * RANKING_WEIGHTS.distance;
            if (disp.distance < 5) {
                reasons.push(`Very close (${disp.distance.toFixed(1)} mi)`);
            }
        }

        // Price score (lower is better)
        if (product.price > 0) {
            const priceScore = Math.max(0, 1 - (product.price / 100)); // $100 = 0 score
            score += priceScore * RANKING_WEIGHTS.price;
            if (product.price < 30) {
                reasons.push(`Great price ($${product.price})`);
            }
        }

        // Open now bonus
        if (disp?.isOpen) {
            score += 0.1;
            reasons.push('Open now');
        }

        return {
            ...product,
            distanceMinutes: disp?.distance ? Math.round(disp.distance * 2) : undefined,
            distanceMiles: disp?.distance,
            googleRating: disp?.googleRating,
            isOpen: disp?.isOpen,
            score,
            reasons: reasons.slice(0, 3),
        };
    });

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}
