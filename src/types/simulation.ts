/**
 * Simulation Mode - Core Types
 * 
 * "Flight simulator" for cannabis operators: run what-if scenarios
 * with synthetic customers + transactions grounded in real data.
 */

// ==========================================
// Profile Types
// ==========================================

export type SimProfile = 'DISPENSARY' | 'BRAND';

// ==========================================
// Customer Segments & Bands
// ==========================================

export type CustomerSegment = 'new' | 'returning' | 'vip' | 'deal_seeker' | 'connoisseur';
export type BudgetBand = 'low' | 'mid' | 'high';
export type PriceSensitivity = 'low' | 'mid' | 'high';
export type StrengthLevel = 'low' | 'mid' | 'high';

// ==========================================
// Synthetic Customer
// ==========================================

export interface SyntheticCustomer {
    /** Deterministic ID: hash of {runId, customerIndex} */
    id: string;
    segment: CustomerSegment;
    budgetBand: BudgetBand;
    priceSensitivity: PriceSensitivity;
    /** Category affinities: { "vapes": 0.7, "edibles": 0.3 } */
    categoryAffinity: Record<string, number>;
    /** Brand affinities (more important for Brand profile) */
    brandAffinity: Record<string, number>;
    /** Expected store visits per month */
    visitFrequency: number;
    /** Optional channel preference */
    channelPreference?: 'in_store' | 'pickup' | 'delivery';
}

// ==========================================
// Venue (Profile-specific)
// ==========================================

export type SimVenue = DispensaryVenue | BrandVenue;

export interface DispensaryVenue {
    locationId: string;
}

export interface BrandVenue {
    partnerRetailerId: string;
    retailerLocationId?: string;
}

// ==========================================
// Line Items & Order Totals
// ==========================================

export interface SimLineItem {
    productId: string;
    variantId?: string;
    brandId: string;
    category: string;
    qty: number;
    unitPrice: number;
    discountApplied: number;
    netLineRevenue: number;
    cogs?: number;
    grossMargin?: number;
}

export interface SimOrderTotals {
    grossRevenue: number;
    discountTotal: number;
    netRevenue: number;
    grossMargin?: number;
    contributionMargin?: number;
}

export interface SimOrderSignals {
    promoIdsApplied?: string[];
    competitorPressure: number; // 0-1
    substitutions?: Array<{
        originalProductId: string;
        substitutedProductId: string;
        reason: 'price' | 'oos';
    }>;
}

// ==========================================
// Synthetic Order
// ==========================================

export interface SimOrder {
    /** Deterministic ID: hash of {runId, day, orderIndex} */
    orderId: string;
    dateTime: Date | string;
    profile: SimProfile;
    venue: SimVenue;
    customerRef: {
        syntheticCustomerId: string;
        segment: CustomerSegment;
        budgetBand: BudgetBand;
        priceSensitivity: PriceSensitivity;
    };
    lineItems: SimLineItem[];
    orderTotals: SimOrderTotals;
    signals: SimOrderSignals;
    /** Human-readable "why" explanations */
    why: string[];
}

// ==========================================
// Day Summary (stored in Firestore)
// ==========================================

export interface SimDaySummary {
    date: string; // YYYY-MM-DD
    orders: number;
    units: number;
    netRevenue: number;
    discountTotal: number;
    grossMargin?: number;
    contributionMargin?: number;
    aov: number;
    repeatRateEstimate?: number;

    // Dispensary-specific
    stockouts?: number;
    missedSalesEstimate?: number;

    // Brand-specific
    velocityByPartner?: Record<string, number>;
    shareByCategory?: Record<string, number>;

    // Pointer to GCS ledger
    ledgerRef: {
        bucket: string;
        path: string;
        contentType: string;
        sizeBytes?: number;
    };
}

// ==========================================
// Interventions
// ==========================================

export type SimIntervention =
    | PriceChangeIntervention
    | PromotionIntervention
    | LoyaltyPolicyIntervention
    | AssortmentChangeIntervention
    | TradeSpendIntervention      // Brand only
    | PlacementBoostIntervention; // Brand only

export interface InterventionBase {
    type: string;
    startDate?: string;
    endDate?: string;
}

export interface PriceChangeIntervention extends InterventionBase {
    type: 'PriceChange';
    scope: {
        kind: 'category' | 'brand' | 'sku' | 'variant' | 'location' | 'partner';
        category?: string;
        brandId?: string;
        skuId?: string;
        locationId?: string;
        partnerId?: string;
    };
    mode: 'percent' | 'fixed';
    value: number;
    constraints?: {
        minPrice?: number;
        maxPrice?: number;
        excludeSkus?: string[];
    };
}

export interface PromotionIntervention extends InterventionBase {
    type: 'Promotion';
    promoType: '%off' | '$off' | 'BOGO' | 'bundle' | 'gift_with_purchase' | 'threshold_discount';
    eligibility?: {
        categories?: string[];
        skus?: string[];
        brands?: string[];
        partners?: string[];
    };
    value: number;
    minSpend?: number;
    limitPerCustomer?: number;
    bundle?: {
        giftSkuId?: string;
        bundleSkuIds?: string[];
    };
}

export interface LoyaltyPolicyIntervention extends InterventionBase {
    type: 'LoyaltyPolicy';
    earnRateDelta?: number; // e.g., +0.1 for +10%
    tierThresholdChanges?: Record<string, number>;
    rewardRuleChanges?: Record<string, any>;
}

export interface AssortmentChangeIntervention extends InterventionBase {
    type: 'AssortmentChange';
    removeSkus?: string[];
    focusSkus?: string[];
    featuredBoost?: number; // 0-1
}

export interface TradeSpendIntervention extends InterventionBase {
    type: 'TradeSpend';
    budgetTotal: number;
    mechanism: 'percent_off_funding' | 'flat_rebate' | 'coop_marketing';
    allocation: Record<string, number>; // partnerId: amount
}

export interface PlacementBoostIntervention extends InterventionBase {
    type: 'PlacementBoost';
    partners?: string[];
    markets?: string[];
    liftAssumption: number; // 0-1
}

// ==========================================
// Assumptions
// ==========================================

export interface SimAssumptions {
    elasticityStrength: StrengthLevel;
    substitutionStrength: StrengthLevel;
    promoLiftMultiplier: number;
    competitorPressureSensitivity: number; // 0-1
    seasonalityIntensity: number; // 0-1

    // Optional overrides
    baselineOrdersPerDay?: number;
    customerPopulationSize?: number;
}

// ==========================================
// Scenario
// ==========================================

export interface SimScenario {
    id: string;
    tenantId: string;
    profile: SimProfile;
    name: string;
    description?: string;
    horizonDays: number;
    interventions: SimIntervention[];
    assumptions: SimAssumptions;
    competitorSetIds?: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
    createdBy?: string;
}

// ==========================================
// Data References (for reproducibility)
// ==========================================

export interface SimDataRefs {
    catalogSnapshotRef: string;
    inventorySnapshotRef?: string;
    competitorSnapshotRefs?: string[];
    historyWindowRef?: string;
}

// ==========================================
// Summary Metrics
// ==========================================

export interface SimSummaryMetrics {
    // Revenue
    netRevenue: { p10: number; p50: number; p90: number };
    discountTotal: { p10: number; p50: number; p90: number };
    grossMargin?: { p10: number; p50: number; p90: number };

    // Volume
    orders: { p10: number; p50: number; p90: number };
    units: { p10: number; p50: number; p90: number };
    aov: { p10: number; p50: number; p90: number };

    // Profile-specific
    repeatRate?: { p10: number; p50: number; p90: number };
    stockouts?: { p10: number; p50: number; p90: number };
    velocity?: { p10: number; p50: number; p90: number };
    shareChange?: { p10: number; p50: number; p90: number };
}

// ==========================================
// Run Status & Metadata
// ==========================================

export type SimRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SimRun {
    id: string;
    tenantId: string;
    scenarioId: string;
    profile: SimProfile;
    status: SimRunStatus;

    // Time range
    startDate: string;
    endDate: string;
    horizonDays: number;

    // Determinism
    seed: number;
    monteCarloRuns?: number;

    // Data references for reproducibility
    dataRefs: SimDataRefs;
    assumptions: SimAssumptions;

    // Results
    summaryMetrics?: SimSummaryMetrics;
    confidenceScore?: number;

    // Warnings for transparency
    warnings: string[];

    // Metadata
    createdAt: Date | string;
    createdBy?: string;
    completedAt?: Date | string;
    error?: string;
}

// ==========================================
// Inputs (loaded at run time)
// ==========================================

export interface SimInputs {
    tenantId: string;
    profile: SimProfile;
    scenario: SimScenario;

    // Catalog
    products: SimProduct[];

    // Inventory (Dispensary)
    inventory?: Record<string, number>; // productId: qty

    // Competitors
    competitorSnapshots?: SimCompetitorSnapshot[];

    // Historical (for calibration)
    historicalStats?: SimHistoricalStats;
}

export interface SimProduct {
    id: string;
    variantId?: string;
    name: string;
    brandId: string;
    category: string;
    price: number;
    cogs?: number;
    inStock?: boolean;
}

export interface SimCompetitorSnapshot {
    competitorId: string;
    snapshotDate: string;
    categoryMedians: Record<string, number>;
    activePromos?: string[];
}

export interface SimHistoricalStats {
    avgOrdersPerDay: number;
    avgAov: number;
    segmentMix: Record<CustomerSegment, number>;
    categoryMix: Record<string, number>;
}

// ==========================================
// Compare Results
// ==========================================

export interface SimCompareResult {
    runIds: string[];
    metrics: string[];
    comparison: Array<{
        metric: string;
        runs: Array<{
            runId: string;
            scenarioName: string;
            value: { p10: number; p50: number; p90: number };
        }>;
        winner?: string;
        delta?: number;
    }>;
}
