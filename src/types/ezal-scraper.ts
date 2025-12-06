// src/types/ezal-scraper.ts
/**
 * Ezal Competitive Menu Scraper Types
 * Multi-tenant scraper architecture for competitive intelligence
 */

// =============================================================================
// COMPETITOR & SOURCE CONFIGURATION
// =============================================================================

export type CompetitorType = 'dispensary' | 'marketplace' | 'delivery';
export type SourceType = 'html' | 'json_api';
export type SourceKind = 'menu' | 'deal_page' | 'store_locator' | 'product_detail';

export interface Competitor {
    id: string;
    tenantId: string;
    name: string;
    type: CompetitorType;
    state: string;
    city: string;
    zip: string;
    primaryDomain: string;
    brandsFocus: string[]; // Brands this competitor is known to carry
    active: boolean;
    lat?: number;
    lng?: number;
    weedmapsSlug?: string;
    leaflySlug?: string;
    dutchieSlug?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DataSource {
    id: string;
    tenantId: string;
    competitorId: string;
    kind: SourceKind;
    sourceType: SourceType;
    baseUrl: string;
    frequencyMinutes: number;
    robotsAllowed: boolean;
    parserProfileId: string;
    timezone: string;
    priority: number; // 1-10, higher = more important
    lastScrapeAt: Date | null;
    nextDueAt: Date | null;
    active: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// SCRAPE JOBS & RUNS
// =============================================================================

export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';
export type RunStatus = 'success' | 'partial' | 'error' | 'timeout';

export interface ScrapeJob {
    id: string;
    tenantId: string;
    sourceId: string;
    competitorId: string;
    scheduledFor: Date;
    status: JobStatus;
    runId: string | null;
    createdBy: 'scheduler' | 'manual' | 'ezal';
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    errorMessage: string | null;
}

export interface ScrapeRun {
    id: string;
    tenantId: string;
    sourceId: string;
    competitorId: string;
    jobId: string;
    startedAt: Date;
    finishedAt: Date | null;
    status: RunStatus;
    httpStatus: number | null;
    snapshotPath: string; // gs://bucket/path/to/snapshot.html
    contentType: string;
    contentHash: string; // MD5 hash to detect duplicates
    numProductsParsed: number;
    numProductsChanged: number;
    numProductsNew: number;
    durationMs: number;
    errorMessage: string | null;
    metadata?: Record<string, any>;
}

// =============================================================================
// COMPETITIVE PRODUCTS & PRICING
// =============================================================================

export type ProductCategory =
    | 'flower'
    | 'pre_roll'
    | 'vape'
    | 'edible'
    | 'concentrate'
    | 'topical'
    | 'tincture'
    | 'accessory'
    | 'other';

export type StrainType = 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';

export interface CompetitiveProduct {
    id: string;
    tenantId: string;
    competitorId: string;
    externalProductId: string; // ID from source system
    brandName: string;
    productName: string;
    category: ProductCategory;
    strainType: StrainType;
    thcPct: number | null;
    cbdPct: number | null;
    priceCurrent: number;
    priceRegular: number | null; // Non-sale price
    inStock: boolean;
    lastSeenAt: Date;
    firstSeenAt: Date;
    lastRunId: string;
    metadata: {
        strain?: string;
        sizeGrams?: number;
        sizeUnit?: string;
        imageUrl?: string;
        description?: string;
        effects?: string[];
        terpenes?: string[];
    };
}

export interface PricePoint {
    id: string;
    tenantId: string;
    productRef: string; // Reference to CompetitiveProduct
    competitorId: string;
    price: number;
    regularPrice: number | null;
    isPromo: boolean;
    capturedAt: Date;
    runId: string;
}

// =============================================================================
// INSIGHTS & DIFFS
// =============================================================================

export type InsightType =
    | 'price_drop'
    | 'price_increase'
    | 'price_gap'
    | 'out_of_stock'
    | 'back_in_stock'
    | 'new_product'
    | 'discontinued';

export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EzalInsight {
    id: string;
    tenantId: string;
    type: InsightType;
    brandName: string;
    ourProductId?: string; // If matched to our catalog
    competitorId: string;
    competitorProductId: string;
    previousValue?: number | boolean;
    currentValue: number | boolean;
    deltaPercentage?: number;
    deltaAbsolute?: number;
    severity: InsightSeverity;
    jurisdiction: string;
    createdAt: Date;
    consumedBy: string[]; // Agents that have processed this
    actionTaken?: string;
    dismissed: boolean;
}

// =============================================================================
// PARSER PROFILES
// =============================================================================

export interface ParserProfile {
    id: string;
    name: string;
    version: number;
    sourceType: SourceType;

    // For HTML parsing
    selectors?: {
        productContainer: string;
        productName: string;
        brandName?: string;
        price: string;
        regularPrice?: string;
        category?: string;
        thc?: string;
        cbd?: string;
        inStock?: string;
        outOfStockIndicator?: string;
        imageUrl?: string;
        productUrl?: string;
        strain?: string;
        effects?: string;
    };

    // For JSON API parsing
    jsonPaths?: {
        productsArray: string;
        productName: string;
        brandName?: string;
        price: string;
        regularPrice?: string;
        category?: string;
        thc?: string;
        cbd?: string;
        inStock?: string;
        imageUrl?: string;
    };

    // Pagination
    pagination?: {
        type: 'none' | 'page_param' | 'offset' | 'cursor' | 'scroll';
        paramName?: string;
        pageSize?: number;
        maxPages?: number;
    };

    // Category mapping
    categoryMapping?: Record<string, ProductCategory>;

    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// WATCH RULES (User-defined alerts)
// =============================================================================

export type WatchRuleType = 'price_undercut' | 'out_of_stock' | 'new_competitor_sku';

export interface WatchRule {
    id: string;
    tenantId: string;
    type: WatchRuleType;
    name: string;
    description?: string;

    // Filters
    competitorIds?: string[]; // Empty = all competitors
    brandNames?: string[];
    productIds?: string[];
    radiusMiles?: number;
    centerZip?: string;

    // Thresholds
    thresholdPercentage?: number; // e.g., "alert when 10%+ undercut"

    // Actions
    notifyEmail: boolean;
    notifySms: boolean;
    triggerPlaybookId?: string;

    active: boolean;
    lastTriggeredAt: Date | null;
    triggerCount: number;
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface ScrapeRequest {
    sourceId: string;
    priority?: number;
    triggeredBy?: 'manual' | 'scheduler' | 'ezal';
}

export interface CompetitorSearchRequest {
    tenantId: string;
    brandName?: string;
    state?: string;
    zip?: string;
    radiusMiles?: number;
    category?: ProductCategory;
}

export interface CompetitorPricingResult {
    competitor: Competitor;
    product: CompetitiveProduct;
    priceHistory: PricePoint[];
    ourPrice?: number;
    priceDifferencePercent?: number;
}
