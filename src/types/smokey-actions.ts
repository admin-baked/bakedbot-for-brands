/**
 * Smokey Actions Types
 * Types for actionable Smokey endpoints
 */

// ============== Page Context ==============

export interface BakedBotContext {
    pageType: 'shop' | 'dispensary' | 'brand' | 'product' | 'city' | 'zip';
    dispId?: string;
    brandId?: string;
    productKey?: string;
    google?: { placeId?: string };
    userGeo?: { lat: number; lng: number };
    jurisdiction?: { state: string; city?: string };
}

// ============== /api/smokey/find ==============

export interface SmokeyFindRequest {
    queryText: string;
    context: BakedBotContext;
    filters?: SmokeyFindFilters;
}

export interface SmokeyFindFilters {
    category?: string;
    maxPrice?: number;
    minRating?: number;
    maxMinutes?: number;
    effects?: string[];
    openNow?: boolean;
}

export interface SmokeyFindResponse {
    success: boolean;
    results: RankedProduct[];
    fallbacks: RankedProduct[];
    queryParsed?: ParsedQuery;
    error?: string;
}

export interface RankedProduct {
    productId: string;
    productName: string;
    brandName?: string;
    category: string;
    price: number;
    dispId: string;
    dispensaryName: string;
    distanceMinutes?: number;
    distanceMiles?: number;
    googleRating?: number;
    bbRating?: number;
    isOpen?: boolean;
    imageUrl?: string;
    score: number;
    reasons: string[];
}

export interface ParsedQuery {
    intent: 'find' | 'compare' | 'recommend';
    category?: string;
    effects?: string[];
    priceConstraint?: { min?: number; max?: number };
    distanceConstraint?: { maxMinutes?: number };
    ratingConstraint?: { min?: number };
}

// ============== /api/smokey/alert ==============

export type AlertType = 'inStock' | 'priceDrop' | 'openNowWithin' | 'newDrop' | 'restock';
export type AlertScope = 'dispensary' | 'brand' | 'product';
export type AlertStatus = 'active' | 'paused' | 'deleted';

export interface Alert {
    id: string;
    userId: string;
    type: AlertType;
    scope: AlertScope;
    dispId?: string;
    brandId?: string;
    productKey?: string;
    constraints: AlertConstraints;
    status: AlertStatus;
    createdAt: Date;
    lastTriggeredAt?: Date;
    cooldownMinutes: number;
    channels: AlertChannels;
}

export interface AlertConstraints {
    maxPrice?: number;
    minRating?: number;
    maxMinutes?: number;
    category?: string;
    effects?: string[];
}

export interface AlertChannels {
    email: boolean;
    sms: boolean;
    push: boolean;
}

export interface CreateAlertRequest {
    type: AlertType;
    scope: AlertScope;
    dispId?: string;
    brandId?: string;
    productKey?: string;
    constraints?: AlertConstraints;
    channels?: Partial<AlertChannels>;
}

export interface CreateAlertResponse {
    success: boolean;
    alertId?: string;
    status?: AlertStatus;
    error?: string;
}

// ============== /api/smokey/cart ==============

export interface DraftCart {
    id: string;
    userId: string;
    dispId: string;
    items: DraftCartItem[];
    handoff: CartHandoff;
    status: 'created' | 'notified' | 'expired' | 'checkedOutUnknown';
    createdAt: Date;
    expiresAt: Date;
}

export interface DraftCartItem {
    productId: string;
    productName: string;
    qty: number;
    unitPriceSnapshot: number;
}

export interface CartHandoff {
    type: 'deepLink' | 'prefilledUrl' | 'partnerCartApi';
    url: string;
    partnerId?: string;
}

export interface PrepareCartRequest {
    dispId: string;
    items: { productId: string; qty: number }[];
    handoffType?: 'deepLink' | 'prefilledUrl';
}

export interface PrepareCartResponse {
    success: boolean;
    draftCartId?: string;
    handoffUrl?: string;
    expiresAt?: Date;
    error?: string;
}

// ============== Ranking Configuration ==============

export const RANKING_WEIGHTS = {
    googleRating: 0.25,
    bbRating: 0.30,
    distance: 0.20,
    price: 0.15,
    freshness: 0.10,
} as const;

// Bayesian confidence adjustment
export const RATING_CONFIDENCE = {
    globalMean: 4.0,
    k: 100, // Weight for prior
} as const;

/**
 * Adjust rating with Bayesian confidence
 * Prevents "4.9 with 7 reviews" from dominating "4.7 with 2,400 reviews"
 */
export function adjustRatingWithConfidence(rating: number, reviewCount: number): number {
    const { globalMean, k } = RATING_CONFIDENCE;
    return (rating * reviewCount + globalMean * k) / (reviewCount + k);
}
