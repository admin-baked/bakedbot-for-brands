/**
 * Customer CRM Types
 * Used for personalized marketing and agent interactions
 */

// Segment types for automatic customer categorization
export type CustomerSegment =
    | 'vip'           // Top 10% by spend
    | 'loyal'         // Regular, consistent buyers
    | 'new'           // < 30 days since first order
    | 'at_risk'       // 60+ days since last order
    | 'slipping'      // 30-60 days inactive
    | 'churned'       // 90+ days inactive
    | 'high_value'    // High AOV, low frequency
    | 'frequent';     // High frequency, lower AOV

// Legacy segment mapping for backwards compatibility
export type LegacySegment = 'VIP' | 'Loyal' | 'New' | 'Slipping' | 'Risk' | 'Churned';

export const segmentLegacyMap: Record<LegacySegment, CustomerSegment> = {
    'VIP': 'vip',
    'Loyal': 'loyal',
    'New': 'new',
    'Slipping': 'slipping',
    'Risk': 'at_risk',
    'Churned': 'churned'
};

/**
 * Full customer profile for CRM
 * Isolated per organization (brand or dispensary)
 */
export interface CustomerProfile {
    // Identity
    id: string;
    orgId: string; // Brand or Dispensary ID - ISOLATED per org
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string; // Computed or manual

    // Behavior metrics
    totalSpent: number;
    orderCount: number;
    avgOrderValue: number;
    lastOrderDate?: Date;
    firstOrderDate?: Date;
    daysSinceLastOrder?: number;

    // AI-inferred preferences
    preferredCategories: string[];
    preferredProducts: string[];
    priceRange: 'budget' | 'mid' | 'premium';

    // Segmentation
    segment: CustomerSegment;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    points: number;
    lifetimeValue: number;
    customTags: string[];

    // Personalization data
    birthDate?: string;
    preferences?: CustomerPreferences;

    // Acquisition tracking
    source: 'brand_page' | 'dispensary_page' | 'pos_dutchie' | 'pos_jane' | 'pos_treez' | 'manual' | 'import';
    acquisitionCampaign?: string;
    referralCode?: string;

    // Social equity
    equityStatus?: boolean;

    // Notes (manual CRM entries)
    notes?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Customer preferences for personalization
 */
export interface CustomerPreferences {
    strainType?: 'indica' | 'sativa' | 'hybrid' | 'any';
    thcPreference?: 'low' | 'medium' | 'high';
    cbdPreference?: 'low' | 'medium' | 'high';
    consumptionMethods?: ('flower' | 'vape' | 'edible' | 'concentrate' | 'topical')[];
    favoriteTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    pricesSensitivity?: 'low' | 'medium' | 'high';
}

/**
 * Customer activity for timeline
 */
export interface CustomerActivity {
    id: string;
    customerId: string;
    orgId: string;
    type: 'order' | 'page_view' | 'email_open' | 'email_click' | 'points_earned' | 'points_redeemed' | 'segment_change' | 'note';
    description: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

/**
 * Custom segment definition
 */
export interface CustomSegment {
    id: string;
    orgId: string;
    name: string;
    description?: string;
    filters: SegmentFilter[];
    customerCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface SegmentFilter {
    field: keyof CustomerProfile | string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
    value: any;
}

/**
 * AI segment suggestion
 */
export interface SegmentSuggestion {
    name: string;
    description: string;
    filters: SegmentFilter[];
    estimatedCount: number;
    reasoning: string;
}

/**
 * CRM Statistics
 */
export interface CRMStats {
    totalCustomers: number;
    newThisWeek: number;
    newThisMonth: number;
    atRiskCount: number;
    vipCount: number;
    avgLifetimeValue: number;
    segmentBreakdown: Record<CustomerSegment, number>;
}

// ==========================================
// Loyalty Types (existing, preserved)
// ==========================================

export interface LoyaltyTier {
    id: string;
    name: string;
    threshold: number; // Spend required
    color: string;
    benefits: string[];
}

export interface LoyaltySettings {
    pointsPerDollar: number;
    tiers: LoyaltyTier[];
    equityMultiplier: number; // e.g. 1.2x points for equity applicants
    redemptionTiers?: RedemptionTier[];
}

export interface RedemptionTier {
    id: string;
    pointsCost: number;
    rewardValue: number;
    description: string;
}

export type CampaignType = 'birthday' | 'winback' | 'vip_welcome';

export interface LoyaltyCampaign {
    id: string;
    type: CampaignType;
    name: string;
    enabled: boolean;
    description: string;
    stats: {
        sent: number;
        converted: number;
    };
}

// ==========================================
// Helper functions
// ==========================================

/**
 * Calculate customer segment based on behavior
 */
export function calculateSegment(profile: Partial<CustomerProfile>): CustomerSegment {
    const daysSinceOrder = profile.daysSinceLastOrder ??
        (profile.lastOrderDate ? Math.floor((Date.now() - new Date(profile.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)) : 999);

    const orderCount = profile.orderCount ?? 0;
    const avgOrderValue = profile.avgOrderValue ?? 0;
    const lifetimeValue = profile.lifetimeValue ?? 0;

    // Churned: 90+ days
    if (daysSinceOrder >= 90) return 'churned';

    // At Risk: 60-89 days
    if (daysSinceOrder >= 60) return 'at_risk';

    // Slipping: 30-59 days
    if (daysSinceOrder >= 30) return 'slipping';

    // New: first order < 30 days ago
    if (profile.firstOrderDate) {
        const daysSinceFirst = Math.floor((Date.now() - new Date(profile.firstOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceFirst < 30) return 'new';
    }

    // VIP: High LTV (top tier)
    if (lifetimeValue >= 1000 || (orderCount >= 10 && avgOrderValue >= 100)) return 'vip';

    // High Value: High AOV but low frequency
    if (avgOrderValue >= 150 && orderCount < 5) return 'high_value';

    // Frequent: Many orders but lower AOV
    if (orderCount >= 8 && avgOrderValue < 75) return 'frequent';

    // Loyal: Regular customer
    if (orderCount >= 3) return 'loyal';

    return 'new';
}

/**
 * Get segment display info
 */
export function getSegmentInfo(segment: CustomerSegment): { label: string; color: string; description: string } {
    const info: Record<CustomerSegment, { label: string; color: string; description: string }> = {
        vip: { label: 'VIP', color: 'bg-purple-100 text-purple-800', description: 'Top customers by spend' },
        loyal: { label: 'Loyal', color: 'bg-green-100 text-green-800', description: 'Regular, consistent buyers' },
        new: { label: 'New', color: 'bg-blue-100 text-blue-800', description: 'Recently acquired' },
        at_risk: { label: 'At Risk', color: 'bg-red-100 text-red-800', description: '60+ days inactive' },
        slipping: { label: 'Slipping', color: 'bg-orange-100 text-orange-800', description: '30-60 days inactive' },
        churned: { label: 'Churned', color: 'bg-gray-100 text-gray-800', description: '90+ days inactive' },
        high_value: { label: 'High Value', color: 'bg-yellow-100 text-yellow-800', description: 'High spend, low frequency' },
        frequent: { label: 'Frequent', color: 'bg-teal-100 text-teal-800', description: 'High frequency shopper' },
    };
    return info[segment];
}
