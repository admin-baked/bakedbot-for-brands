/**
 * Simulation Mode - Profile Configurations
 * 
 * Single engine, two profiles: DISPENSARY vs BRAND.
 * This config drives the differences without separate codepaths.
 */

import { SimProfile, SimAssumptions, StrengthLevel } from './simulation';

// ==========================================
// KPI Definitions
// ==========================================

export interface KpiDefinition {
    id: string;
    name: string;
    unit: 'currency' | 'number' | 'percent' | 'ratio';
    direction: 'higher_better' | 'lower_better';
    description: string;
}

// ==========================================
// Profile Configuration
// ==========================================

export interface SimProfileConfig {
    profile: SimProfile;
    name: string;
    description: string;

    // What interventions are allowed
    allowedInterventionTypes: string[];

    // KPIs for this profile
    kpiDefinitions: KpiDefinition[];

    // Required inputs
    requiredInputs: {
        hard: string[];  // Must have
        soft: string[];  // Recommended
    };

    // Default assumptions
    defaultAssumptions: SimAssumptions;

    // Venue resolution strategy
    venueType: 'location' | 'partner';

    // Goal presets for comparison
    goalPresets: Array<{
        id: string;
        name: string;
        primaryMetrics: string[];
    }>;
}

// ==========================================
// DISPENSARY Profile Config
// ==========================================

export const DISPENSARY_PROFILE: SimProfileConfig = {
    profile: 'DISPENSARY',
    name: 'Dispensary Simulation',
    description: 'Simulate store performance with end-customer baskets, inventory, and margin.',

    allowedInterventionTypes: [
        'PriceChange',
        'Promotion',
        'LoyaltyPolicy',
        'AssortmentChange',
    ],

    kpiDefinitions: [
        { id: 'netRevenue', name: 'Net Revenue', unit: 'currency', direction: 'higher_better', description: 'Total revenue after discounts' },
        { id: 'grossMargin', name: 'Gross Margin', unit: 'currency', direction: 'higher_better', description: 'Revenue minus COGS' },
        { id: 'contributionMargin', name: 'Contribution Margin', unit: 'currency', direction: 'higher_better', description: 'Margin after variable costs' },
        { id: 'orders', name: 'Orders', unit: 'number', direction: 'higher_better', description: 'Total transactions' },
        { id: 'units', name: 'Units Sold', unit: 'number', direction: 'higher_better', description: 'Total items sold' },
        { id: 'aov', name: 'AOV', unit: 'currency', direction: 'higher_better', description: 'Average order value' },
        { id: 'discountTotal', name: 'Discount Total', unit: 'currency', direction: 'lower_better', description: 'Total promo cost' },
        { id: 'repeatRate', name: 'Repeat Rate', unit: 'percent', direction: 'higher_better', description: 'Returning customer rate' },
        { id: 'stockouts', name: 'Stockouts', unit: 'number', direction: 'lower_better', description: 'Out of stock events' },
        { id: 'missedSales', name: 'Missed Sales', unit: 'currency', direction: 'lower_better', description: 'Estimated lost revenue' },
    ],

    requiredInputs: {
        hard: ['catalog', 'locations'],
        soft: ['inventory', 'costs', 'history'],
    },

    defaultAssumptions: {
        elasticityStrength: 'mid',
        substitutionStrength: 'mid',
        promoLiftMultiplier: 1.0,
        competitorPressureSensitivity: 0.6,
        seasonalityIntensity: 0.5,
    },

    venueType: 'location',

    goalPresets: [
        { id: 'revenue', name: 'Maximize Revenue', primaryMetrics: ['netRevenue', 'orders', 'aov'] },
        { id: 'margin', name: 'Maximize Margin', primaryMetrics: ['grossMargin', 'contributionMargin'] },
        { id: 'retention', name: 'Maximize Retention', primaryMetrics: ['repeatRate', 'orders'] },
        { id: 'balanced', name: 'Balanced Growth', primaryMetrics: ['netRevenue', 'grossMargin', 'repeatRate'] },
    ],
};

// ==========================================
// BRAND Profile Config
// ==========================================

export const BRAND_PROFILE: SimProfileConfig = {
    profile: 'BRAND',
    name: 'Brand Simulation',
    description: 'Simulate sell-through across retail partners with trade spend and share modeling.',

    allowedInterventionTypes: [
        'PriceChange',
        'Promotion',
        'TradeSpend',
        'PlacementBoost',
        'AssortmentChange',
    ],

    kpiDefinitions: [
        { id: 'velocity', name: 'Velocity', unit: 'ratio', direction: 'higher_better', description: 'Units/store/day' },
        { id: 'sellThrough', name: 'Sell-Through', unit: 'number', direction: 'higher_better', description: 'Units/week' },
        { id: 'share', name: 'Category Share', unit: 'percent', direction: 'higher_better', description: 'Share at partner stores' },
        { id: 'promoRoi', name: 'Promo ROI', unit: 'ratio', direction: 'higher_better', description: 'Lift vs trade spend' },
        { id: 'distributionValue', name: 'Distribution Value', unit: 'number', direction: 'higher_better', description: 'Partner leverage score' },
        { id: 'netRevenue', name: 'Net Revenue', unit: 'currency', direction: 'higher_better', description: 'Total revenue (proxy)' },
        { id: 'tradeSpendTotal', name: 'Trade Spend', unit: 'currency', direction: 'lower_better', description: 'Total promo funding' },
        { id: 'units', name: 'Units Sold', unit: 'number', direction: 'higher_better', description: 'Total items sold' },
    ],

    requiredInputs: {
        hard: ['catalog', 'partnerRetailers'],
        soft: ['partnerMenus', 'competitorSnapshots', 'history'],
    },

    defaultAssumptions: {
        elasticityStrength: 'mid',
        substitutionStrength: 'mid',
        promoLiftMultiplier: 1.1,
        competitorPressureSensitivity: 0.7,
        seasonalityIntensity: 0.5,
    },

    venueType: 'partner',

    goalPresets: [
        { id: 'velocity', name: 'Maximize Velocity', primaryMetrics: ['velocity', 'sellThrough'] },
        { id: 'share', name: 'Grow Share', primaryMetrics: ['share', 'velocity'] },
        { id: 'roi', name: 'Optimize Promo ROI', primaryMetrics: ['promoRoi', 'netRevenue'] },
        { id: 'balanced', name: 'Balanced Growth', primaryMetrics: ['velocity', 'share', 'promoRoi'] },
    ],
};

// ==========================================
// Profile Lookup
// ==========================================

export const PROFILE_CONFIGS: Record<SimProfile, SimProfileConfig> = {
    DISPENSARY: DISPENSARY_PROFILE,
    BRAND: BRAND_PROFILE,
};

export function getProfileConfig(profile: SimProfile): SimProfileConfig {
    return PROFILE_CONFIGS[profile];
}

export function isInterventionAllowed(profile: SimProfile, interventionType: string): boolean {
    const config = getProfileConfig(profile);
    return config.allowedInterventionTypes.includes(interventionType);
}

export function getKpiDefinition(profile: SimProfile, kpiId: string): KpiDefinition | undefined {
    const config = getProfileConfig(profile);
    return config.kpiDefinitions.find(k => k.id === kpiId);
}

// ==========================================
// Elasticity & Priors (system defaults)
// ==========================================

export const ELASTICITY_PRIORS: Record<string, Record<StrengthLevel, number>> = {
    vapes: { low: -0.5, mid: -1.2, high: -2.0 },
    edibles: { low: -0.3, mid: -0.8, high: -1.5 },
    flower: { low: -0.4, mid: -1.0, high: -1.8 },
    concentrates: { low: -0.4, mid: -1.0, high: -1.8 },
    pre_rolls: { low: -0.6, mid: -1.3, high: -2.2 },
    default: { low: -0.4, mid: -1.0, high: -1.8 },
};

export const SEGMENT_PRIORS = {
    new: 0.25,
    returning: 0.35,
    vip: 0.10,
    deal_seeker: 0.20,
    connoisseur: 0.10,
};

export const BUDGET_BAND_PRIORS = {
    low: 0.30,
    mid: 0.50,
    high: 0.20,
};

export const SEASONALITY_FACTORS = {
    // Day of week factors (Sunday = 0)
    dayOfWeek: [0.85, 0.90, 0.95, 1.00, 1.10, 1.20, 1.30],
    // Monthly factors (January = 0)
    month: [0.90, 0.85, 0.95, 1.00, 1.05, 1.10, 1.05, 1.00, 0.95, 1.00, 1.05, 1.15],
    // Holiday boosts
    holidays: {
        '04-20': 2.5,  // 4/20
        '07-04': 1.3,  // July 4th
        '12-31': 1.4,  // NYE
        '11-24': 1.2,  // Black Friday approx
    } as Record<string, number>,
};

// ==========================================
// Warning Messages
// ==========================================

export const SIM_WARNINGS = {
    NO_COSTS: 'Cost data not available. Margin calculations will use category priors.',
    NO_INVENTORY: 'Inventory data not available. Stockout modeling disabled.',
    THIN_HISTORY: 'Less than 90 days of transaction history. Using uncalibrated priors.',
    NO_COMPETITORS: 'No competitor snapshots found. Market pressure modeling disabled.',
    BRAND_NEEDS_PARTNERS: 'Brand profile requires partner retailer data for accurate simulation.',
};
