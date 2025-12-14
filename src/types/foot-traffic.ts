// src/types/foot-traffic.ts
/**
 * Foot Traffic System Types
 * Types for geo-smart discovery, drop alerts, and local offers
 */

import { CannMenusProduct } from './cannmenus';

// =============================================================================
// GEOGRAPHIC ZONES
// =============================================================================

/**
 * Geographic zone for targeting foot traffic campaigns
 */
export interface GeoZone {
    id: string;
    name: string;
    description?: string;

    // Geographic boundaries
    zipCodes: string[];
    radiusMiles: number;
    centerLat: number;
    centerLng: number;
    state: string;
    city?: string;

    // Configuration
    priority: number; // Higher = more important (1-10)
    enabled: boolean;

    // Features enabled for this zone
    features: {
        seoPages: boolean;
        dropAlerts: boolean;
        localOffers: boolean;
        geoDiscovery: boolean;
    };

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

/**
 * ZIP code geocoding cache
 */
export interface ZipCodeCache {
    zipCode: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    cachedAt: Date;
}

// =============================================================================
// LOCAL PRODUCT DISCOVERY
// =============================================================================

/**
 * Product with local availability info
 */
export interface LocalProduct {
    // Core product info (from CannMenus)
    id: string;
    name: string;
    brandName: string;
    brandId: number;
    category: string;
    imageUrl: string;
    description?: string;

    // Pricing
    price: number;
    originalPrice?: number;
    isOnSale: boolean;

    // Cannabinoids
    thcPercent?: number | null;
    cbdPercent?: number | null;

    // Local availability
    availability: {
        retailerId: string;
        retailerName: string;
        distance: number; // miles
        address: string;
        city: string;
        state: string;
        inStock: boolean;
        lastUpdated: Date;
    }[];

    // Calculated fields
    nearestDistance: number; // Closest retailer distance
    retailerCount: number; // Number of retailers carrying this product

    // Foot traffic scoring
    footTrafficScore: number; // 0-100
}

/**
 * Discovery request options
 */
export interface DiscoveryOptions {
    lat: number;
    lng: number;
    radiusMiles?: number;
    featuredDispensaryId?: string;
    sponsoredRetailerIds?: string[];
    category?: string;
    brand?: string;
    seasonalKeywords?: string[];
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
    limit?: number;
    sortBy?: 'distance' | 'price' | 'score';
    cityName?: string;
    state?: string;
}


/**
 * Discovery response
 */
export interface DiscoveryResult {
    products: LocalProduct[];
    retailers: RetailerSummary[];
    totalProducts: number;
    searchRadius: number;
    center: { lat: number; lng: number };
}

// =============================================================================
// DROP ALERTS
// =============================================================================

export type DropAlertType =
    | 'restock'           // Product back in stock
    | 'price_drop'        // Price decreased
    | 'competitor_out'    // Competitor is out of stock (opportunity)
    | 'new_product'       // New product from watched brand
    | 'flash_sale';       // Limited time deal

export type AlertChannel = 'sms' | 'email' | 'push';

/**
 * Drop alert configuration (Super Admin)
 */
export interface DropAlertConfig {
    id: string;
    orgId?: string; // null = platform-wide
    geoZoneId?: string; // Specific zone or all

    name: string;
    description?: string;

    // Trigger conditions
    type: DropAlertType;
    priceDropThreshold?: number; // Percentage (e.g., 10 = 10% drop)

    // Targeting
    productIds?: string[]; // Specific products or all if empty
    brandIds?: number[];
    categories?: string[];

    // Notification settings
    channels: AlertChannel[];
    messageTemplate?: string;

    // Status
    enabled: boolean;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;

    // Analytics
    metrics: {
        triggered: number;
        sent: number;
        clicked: number;
        conversions: number;
    };
}

/**
 * User subscription to product alerts
 */
export interface AlertSubscription {
    id: string;
    userId: string;
    productId: string;
    productName: string;
    brandName: string;
    imageUrl?: string;

    // User preferences
    channels: AlertChannel[];
    alertTypes: DropAlertType[];

    // Status
    active: boolean;
    createdAt: Date;

    // Location context
    zipCode?: string;
    notifyRadius?: number; // Only alert if available within X miles
}

/**
 * Alert event (fired when conditions are met)
 */
export interface DropAlertEvent {
    id: string;
    type: DropAlertType;

    // Product info
    productId: string;
    productName: string;
    brandName: string;
    imageUrl?: string;

    // Event details
    oldPrice?: number;
    newPrice?: number;
    retailerId: string;
    retailerName: string;

    // Targeting
    geoZoneId?: string;

    // Status
    status: 'pending' | 'processing' | 'sent' | 'failed';
    recipientCount: number;

    // Timestamps
    detectedAt: Date;
    processedAt?: Date;
}

// =============================================================================
// LOCAL OFFERS
// =============================================================================

export type DiscountType = 'percentage' | 'fixed' | 'bogo' | 'bundle';
export type OfferStatus = 'draft' | 'pending_compliance' | 'approved' | 'rejected' | 'active' | 'expired' | 'paused';

/**
 * AI-generated local offer
 */
export interface LocalOffer {
    id: string;
    orgId?: string;
    geoZoneId: string;

    // Offer details
    title: string;
    description: string;
    shortDescription?: string; // For SMS

    // Discount
    discountType: DiscountType;
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;

    // Targeting
    productIds?: string[];
    brandIds?: number[];
    categories?: string[];

    // Validity
    validFrom: Date;
    validUntil: Date;
    usageLimit?: number;
    perUserLimit?: number;

    // Compliance
    complianceStatus: 'pending' | 'approved' | 'rejected';
    complianceNotes?: string;
    complianceCheckedAt?: Date;
    complianceCheckedBy?: string;

    // Generation info
    generatedBy: 'ai' | 'manual';
    aiReasoning?: string; // Why AI created this offer

    // Status
    status: OfferStatus;

    // Code
    promoCode?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;

    // Analytics
    metrics: {
        impressions: number;
        clicks: number;
        redemptions: number;
        revenue: number;
    };
}

/**
 * Request for AI offer generation
 */
export interface GenerateOfferRequest {
    geoZoneId: string;
    targetCategory?: string;
    targetBrand?: string;
    discountBudget?: number; // Max discount to offer
    goal: 'clear_inventory' | 'compete_on_price' | 'drive_traffic' | 'new_customer';
}

// =============================================================================
// SEO PAGES
// =============================================================================

/**
 * Product summary for SEO pages
 */
export interface ProductSummary {
    id: string;
    name: string;
    brandName: string;
    category: string;
    price: number;
    imageUrl: string;
    thcPercent?: number | null;
    retailerCount: number;
}

/**
 * Deal summary for SEO pages
 */
export interface DealSummary {
    productId: string;
    productName: string;
    brandName: string;
    originalPrice: number;
    salePrice: number;
    discountPercent: number;
    retailerName: string;
    expiresAt?: Date;
}

/**
 * Retailer summary for SEO pages
 */
export interface RetailerSummary {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    distance?: number | null;
    productCount?: number | null;
    phone?: string | null;
    website?: string | null;
    hours?: string | null;
    lat?: number | null;
    lng?: number | null;
}

/**
 * Raw data snapshot from CannMenus
 */
export interface CannMenusSnapshot {
    id: string;
    zipCode: string;
    fetchedAt: Date;
    dispensaries: RetailerSummary[];
    products: LocalProduct[];
    aggregates: {
        categoryBreakdown: { category: string; count: number }[];
        totalProducts: number;
        totalDispensaries: number;
    };
    sourceVersion: 'v1';
}

/**
 * Cached SEO page content
 */
export interface LocalSEOPage {
    id: string; // Same as zipCode
    zipCode: string;
    city: string;
    state: string;

    // Featured Dispensary
    featuredDispensaryId?: string | null;
    featuredDispensaryName?: string | null;

    // Data Source Reference
    dataSnapshotRef?: string;

    // Generated content
    content: {
        title: string;
        metaDescription: string;
        h1: string;
        introText: string;
        topStrains: ProductSummary[];
        topDeals: DealSummary[];
        nearbyRetailers: RetailerSummary[];
        categoryBreakdown: { category: string; count: number }[];
    };

    // Structured data for Google
    structuredData: {
        localBusiness: object;
        products: object[];
        breadcrumb: object;
    };

    // Refresh schedule
    lastRefreshed: Date;
    nextRefresh: Date;
    refreshFrequency: 'hourly' | 'daily' | 'weekly';

    // Status
    published: boolean;

    // Metrics
    metrics: {
        pageViews: number;
        uniqueVisitors: number;
        bounceRate: number;
        avgTimeOnPage: number;
    };
}


// =============================================================================
// FOOT TRAFFIC ANALYTICS
// =============================================================================

/**
 * Overall foot traffic metrics
 */
export interface FootTrafficMetrics {
    period: 'day' | 'week' | 'month';
    startDate: Date;
    endDate: Date;

    // SEO metrics
    seo: {
        totalPages: number;
        totalPageViews: number;
        topZipCodes: { zipCode: string; views: number }[];
    };

    // Alert metrics
    alerts: {
        configured: number;
        triggered: number;
        sent: number;
        conversionRate: number;
    };

    // Offer metrics
    offers: {
        active: number;
        totalImpressions: number;
        totalRedemptions: number;
        revenueGenerated: number;
    };

    // Discovery metrics
    discovery: {
        searchesPerformed: number;
        productsViewed: number;
        retailerClicks: number;
    };
}

// =============================================================================
// SUPER ADMIN CONFIGURATION
// =============================================================================

/**
 * Platform-wide foot traffic settings
 */
export interface FootTrafficSettings {
    // Global toggles
    enabled: boolean;
    seoEnabled: boolean;
    alertsEnabled: boolean;
    offersEnabled: boolean;
    discoveryEnabled: boolean;

    // Default values
    defaultRadiusMiles: number;
    defaultAlertChannels: AlertChannel[];

    // Rate limits
    maxAlertsPerUserPerDay: number;
    maxOffersPerZonePerDay: number;

    // SEO settings
    seoRefreshFrequency: 'hourly' | 'daily' | 'weekly';
    minRetailersForSeoPage: number;

    // AI settings
    aiOfferGenerationEnabled: boolean;
    requireComplianceApproval: boolean;

    updatedAt: Date;
    updatedBy: string;
}
