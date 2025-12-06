/**
 * Dynamic Pricing System
 * Autonomous live pricing based on competitor intelligence
 */

export type PricingStrategy = 'match_lowest' | 'undercut' | 'premium' | 'margin_target' | 'velocity';
export type PricingSignal = 'competitor_stockout' | 'competitor_price_drop' | 'low_velocity' | 'high_velocity' | 'margin_below_target';

// Legacy type - kept for backwards compatibility
export type PricingRecommendation = {
    id: string;
    brandId: string;
    productId: string;
    productName: string;
    currentPrice: number;
    recommendedPrice: number;
    marketAverage: number;
    marketLow: number;
    marketHigh: number;
    reason: string;
    status: 'pending' | 'applied' | 'dismissed';
    createdAt: string;
};

export interface CompetitorPricePoint {
    competitorId: string;
    competitorName: string;
    price: number;
    inStock: boolean;
    lastUpdated: Date;
    source: 'cannmenus' | 'agent_scrape' | 'manual';
}

export interface ProductPricingRule {
    id: string;
    productId: string;
    productName: string;

    // Current state
    currentPrice: number;
    costOfGoods: number;
    currentMargin: number;

    // Target settings
    strategy: PricingStrategy;
    targetMargin?: number;
    undercutAmount?: number;
    undercutIsPercent?: boolean;

    // Price boundaries
    floorPrice: number;
    ceilingPrice: number;

    // Competitor tracking
    competitorPrices: CompetitorPricePoint[];
    marketAverage: number;
    marketLow: number;
    marketHigh: number;

    // Automation
    autoAdjust: boolean;
    requireApproval: boolean;
    maxDailyChange: number;

    // Last action
    lastAdjustedAt?: Date;
    lastAdjustmentReason?: string;
    adjustmentHistory: PriceAdjustment[];

    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

export interface PriceAdjustment {
    id: string;
    productId: string;

    previousPrice: number;
    newPrice: number;
    changeAmount: number;
    changePercent: number;

    signal: PricingSignal;
    reason: string;
    competitorData?: CompetitorPricePoint[];

    previousMargin: number;
    newMargin: number;
    projectedImpact?: {
        revenueChange: number;
        marginChange: number;
        velocityChange: number;
    };

    status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
    approvedBy?: string;
    approvedAt?: Date;

    createdAt: Date;
}

export interface PricingOpportunity {
    id: string;
    productId: string;
    productName: string;

    signal: PricingSignal;
    confidence: number; // 0-100

    currentPrice: number;
    suggestedPrice: number;
    potentialMarginGain: number;

    evidence: {
        type: 'competitor_oos' | 'price_gap' | 'velocity_trend' | 'market_shift';
        description: string;
        data: Record<string, unknown>;
    }[];

    autoApplyable: boolean;
    expiresAt: Date;

    createdAt: Date;
}

export interface DynamicPricingConfig {
    id: string;
    orgId: string;

    enabled: boolean;
    defaultStrategy: PricingStrategy;
    defaultTargetMargin: number;

    // Competitor sources
    useCannMenus: boolean;
    useAgentScraping: boolean;
    competitorRadius: number;

    // Automation
    autoApplyThreshold: number;
    maxDailyPriceChanges: number;
    blackoutPeriods: {
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
    }[];

    // Notifications
    notifyOnOpportunity: boolean;
    notifyOnAutoApply: boolean;
    notificationChannels: ('email' | 'sms' | 'dashboard')[];

    // Categories
    includedCategories: string[];
    excludedCategories: string[];
    excludedBrands: string[];

    createdAt: Date;
    updatedAt: Date;
}
