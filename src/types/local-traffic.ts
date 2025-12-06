/**
 * Geo-Smart Product Discovery & Local Traffic System
 * Phase 1 & 2 Traffic Generation Features
 */

// ============================================
// GEO-DETECTION & LOCATION
// ============================================

export type GeoDetectionMethod = 'ip' | 'zip_code' | 'gps' | 'manual' | 'browser';

export interface CustomerLocation {
    // Detection
    detectionMethod: GeoDetectionMethod;
    detectedAt: Date;
    confidence: number; // 0-100

    // Coordinates
    latitude?: number;
    longitude?: number;

    // Address components
    zipCode: string;
    city: string;
    state: string;
    county?: string;
    neighborhood?: string;

    // Compliance
    isLegalMarket: boolean;
    marketType?: 'recreational' | 'medical' | 'both';
    complianceRules?: string[];
}

export interface NearbyDispensary {
    id: string;
    name: string;

    // Location
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;

    // Distance
    distanceMiles: number;
    drivingMinutes?: number;
    walkingMinutes?: number;

    // Status
    isOpen: boolean;
    openUntil?: string;
    nextOpenAt?: string;

    // Inventory summary
    hasProductInStock?: boolean;
    matchingProductCount?: number;

    // Partner status
    isPartner: boolean;
    partnerTier?: 'basic' | 'premium' | 'enterprise';
}

// ============================================
// SMOKEY LOCAL MODE
// ============================================

export interface LocalProductRecommendation {
    id: string;

    // Product
    productId: string;
    productName: string;
    brandName: string;
    category: string;

    // Availability
    nearestDispensary: NearbyDispensary;
    otherLocations: NearbyDispensary[];
    totalLocationsInStock: number;

    // Pricing
    price: number;
    originalPrice?: number;
    discountPercent?: number;

    // Display
    availabilityMessage: string; // "Available 0.4 miles away at Green Valley"
    urgencyMessage?: string; // "Only 3 left!" or "Low stock"

    // Ranking
    relevanceScore: number;
    popularityScore: number;
    localDemandScore: number;
}

export interface LocalSearchContext {
    sessionId: string;
    customerId?: string;

    // Location
    location: CustomerLocation;
    searchRadius: number; // miles

    // Query
    query?: string;
    category?: string;
    effect?: string;
    priceRange?: { min: number; max: number };

    // Results
    recommendations: LocalProductRecommendation[];
    nearbyDispensaries: NearbyDispensary[];

    // Compliance
    complianceFiltersApplied: string[];

    createdAt: Date;
}

// ============================================
// NEIGHBORHOOD BUDTENDER PAGES (SEO)
// ============================================

export interface NeighborhoodPage {
    id: string;
    slug: string; // e.g., "los-angeles-90210-cannabis"

    // Location
    zipCode: string;
    city: string;
    state: string;
    neighborhood?: string;

    // SEO
    title: string;
    metaDescription: string;
    h1: string;
    canonicalUrl: string;

    // Schema markup
    localBusinessSchema: Record<string, unknown>;
    productSchema: Record<string, unknown>[];
    breadcrumbSchema: Record<string, unknown>;

    // Content sections
    content: {
        intro: string;
        topStrains: NeighborhoodProductSection;
        currentDeals: NeighborhoodProductSection;
        nearbyDispensaries: NearbyDispensary[];
        localFaq: { question: string; answer: string }[];
    };

    // Refresh
    lastRefreshed: Date;
    nextRefreshAt: Date;
    refreshFrequency: 'hourly' | 'daily' | 'weekly';

    // Performance
    pageViews30d: number;
    clickThroughRate: number;
    conversionRate: number;

    // Status
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

export interface NeighborhoodProductSection {
    title: string;
    products: {
        productId: string;
        name: string;
        brand: string;
        category: string;
        price: number;
        dispensary: string;
        inStock: boolean;
        rating?: number;
    }[];
    lastUpdated: Date;
}

export interface NeighborhoodPageConfig {
    // Generation
    autoGenerateForZipCodes: boolean;
    priorityZipCodes: string[];
    excludeZipCodes: string[];

    // Content
    minProductsToPublish: number;
    maxProductsPerSection: number;
    includeCompetitorPricing: boolean;

    // SEO
    titleTemplate: string; // "{City} Cannabis Dispensaries | {Zip}"
    metaTemplate: string;

    // Refresh
    defaultRefreshFrequency: 'hourly' | 'daily' | 'weekly';

    orgId: string;
}

// ============================================
// PRODUCT DROP ALERTS
// ============================================

export type DropAlertType =
    | 'back_in_stock'
    | 'new_product'
    | 'price_drop'
    | 'competitor_price_drop'
    | 'limited_release'
    | 'flash_sale';

export interface DropAlert {
    id: string;
    type: DropAlertType;

    // Product
    productId: string;
    productName: string;
    brandName: string;
    category: string;
    imageUrl?: string;

    // Location
    dispensaryId: string;
    dispensaryName: string;
    zipCodes: string[]; // Target zip codes

    // Alert details
    headline: string;
    message: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';

    // Pricing
    currentPrice: number;
    previousPrice?: number;
    competitorPrice?: number;
    savingsAmount?: number;
    savingsPercent?: number;

    // Availability
    quantityAvailable?: number;
    estimatedSelloutTime?: Date;

    // Targeting
    targetSegments: string[];
    targetRadius: number; // miles

    // Delivery
    channels: ('sms' | 'email' | 'push' | 'in_app')[];
    sentCount: number;
    openCount: number;
    clickCount: number;
    conversionCount: number;

    // Status
    status: 'pending' | 'sending' | 'sent' | 'expired';
    scheduledFor?: Date;
    sentAt?: Date;
    expiresAt: Date;

    createdAt: Date;
    createdBy: 'system' | 'user';
}

export interface DropAlertSubscription {
    id: string;
    customerId: string;

    // What to track
    productIds?: string[];
    brandIds?: string[];
    categories?: string[];

    // Where
    zipCodes: string[];
    radiusMiles: number;

    // When to notify
    notifyOn: DropAlertType[];

    // How to notify
    channels: {
        sms: boolean;
        email: boolean;
        push: boolean;
    };

    // Preferences
    maxAlertsPerDay: number;
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string;   // "08:00"

    status: 'active' | 'paused';
    createdAt: Date;
}

export interface InventoryChangeEvent {
    id: string;
    eventType: 'restock' | 'new_product' | 'price_change' | 'low_stock' | 'out_of_stock';

    // Product
    productId: string;
    productName: string;
    dispensaryId: string;

    // Change details
    previousValue?: number | string;
    newValue: number | string;
    changePercent?: number;

    // Processing
    processedForAlerts: boolean;
    alertsGenerated: number;

    detectedAt: Date;
}

// ============================================
// DYNAMIC LOCAL OFFERS
// ============================================

export interface LocalOffer {
    id: string;

    // Offer details
    title: string;
    description: string;
    terms: string;

    // Type
    offerType: 'percent_off' | 'dollar_off' | 'bogo' | 'bundle' | 'free_item';
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;

    // Products
    applicableProducts: 'all' | 'category' | 'brand' | 'specific';
    productIds?: string[];
    categoryIds?: string[];
    brandIds?: string[];

    // Geo-targeting
    targetZipCodes: string[];
    targetRadius: number;
    targetNeighborhoods?: string[];

    // AI-generation context
    generatedBy: 'ai' | 'user';
    generationReason?: string; // "Competitor running 20% off in this zip"
    demandSignals?: {
        searchVolume: number;
        competitorActivity: string;
        inventoryLevel: string;
    };

    // Compliance
    complianceStatus: 'pending' | 'approved' | 'rejected';
    complianceNotes?: string;
    checkedBy: 'deebo' | 'human';

    // Coupon
    couponCode?: string;
    couponUrl?: string;
    qrCodeUrl?: string;

    // Performance
    impressions: number;
    claims: number;
    redemptions: number;
    revenue: number;

    // Status
    status: 'draft' | 'pending_compliance' | 'active' | 'paused' | 'expired';
    startDate: Date;
    endDate: Date;

    // Dispensary
    dispensaryId: string;
    orgId: string;

    createdAt: Date;
    updatedAt: Date;
}

export interface LocalOfferGeneration {
    id: string;

    // Context
    zipCode: string;
    dispensaryId: string;

    // AI analysis
    competitorOffers: {
        dispensary: string;
        offer: string;
        discount: number;
    }[];
    demandGaps: {
        category: string;
        searchVolume: number;
        inventoryLevel: number;
    }[];
    recommendedActions: string[];

    // Generated offer
    suggestedOffer: Partial<LocalOffer>;
    confidence: number;
    estimatedImpact: {
        additionalFootTraffic: number;
        projectedRevenue: number;
        roi: number;
    };

    // Status
    status: 'generated' | 'reviewed' | 'deployed' | 'rejected';
    reviewedBy?: string;
    deployedOfferId?: string;

    createdAt: Date;
}

// ============================================
// PLAYBOOK INTEGRATION
// ============================================

export const TRAFFIC_PLAYBOOK_TEMPLATES = {
    dropAlerts: {
        name: 'Product Drop Alert Engine',
        description: 'Auto-notify customers when products restock or prices drop',
        agents: ['pops', 'ezal', 'craig', 'smokey'],
        triggers: ['inventory.restock', 'inventory.price_change', 'competitor.price_drop']
    },
    localOffers: {
        name: 'Dynamic Local Offers',
        description: 'AI-generated hyperlocal promotions based on demand and competition',
        agents: ['smokey', 'craig', 'deebo'],
        triggers: ['schedule.daily', 'competitor.new_deal']
    },
    neighborhoodSeo: {
        name: 'Neighborhood SEO Refresh',
        description: 'Daily refresh of local landing pages with fresh inventory',
        agents: ['pops', 'craig'],
        triggers: ['schedule.daily']
    }
};
