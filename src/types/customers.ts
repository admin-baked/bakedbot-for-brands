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

    // Loyalty sync (hybrid system)
    pointsFromOrders?: number;         // Calculated from Alleaves order history
    pointsFromAlpine?: number;         // Synced from Alpine IQ (source of truth)
    pointsLastCalculated?: Date;       // Last sync timestamp
    tierSource?: 'calculated' | 'alpine_iq';  // Source of tier assignment
    loyaltyReconciled?: boolean;       // Are calculated and Alpine in sync?
    loyaltyDiscrepancy?: number;       // Difference between sources
    alpineUserId?: string;             // Alpine IQ user code from Alleaves

    // Personalization data
    birthDate?: string;
    preferences?: CustomerPreferences;
    notes?: string | null;

    // Acquisition tracking
    source: 'brand_page' | 'dispensary_page' | 'pos_dutchie' | 'pos_jane' | 'pos_treez' | 'manual' | 'import';
    acquisitionCampaign?: string;
    referralCode?: string;
    equityStatus?: boolean | null;

    // Gamification
    purchaseStreak?: number;
    badges?: {
        id: string;
        name: string;
        icon: string;
        earnedAt: Date;
    }[];
    tierProgress?: number; // 0-100 percentage to next tier

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

export interface SegmentThresholds {
    loyal_minOrders: number;          // Default: 2
    vip_minLifetimeValue: number;     // Default: 500
    vip_minOrders: number;            // Default: 8
    vip_minAOV: number;               // Default: 50
    highValue_minAOV: number;         // Default: 75
    highValue_maxOrders: number;      // Default: 5
    frequent_minOrders: number;       // Default: 5
    frequent_maxAOV: number;          // Default: 60
    slipping_minDays: number;         // Default: 30
    atRisk_minDays: number;           // Default: 60
    churned_minDays: number;          // Default: 90
    new_maxDays: number;              // Default: 30
}

/** Icon key for discount programs — maps to Lucide icons on the menu */
export type DiscountProgramIcon = 'shield' | 'graduation-cap' | 'star' | 'heart' | 'users' | 'tag';

export interface DiscountProgram {
    id: string;
    enabled: boolean;
    name: string;          // e.g. "Military & Veterans"
    description: string;   // e.g. "10% off every visit"
    icon: DiscountProgramIcon;
}

export interface LoyaltyMenuDisplay {
    showBar: boolean;              // Show the loyalty/discount bar on public menu
    loyaltyTagline?: string;       // e.g. "Earn points every visit — redeem for free products"
    showDiscountPrograms: boolean; // Show discount program badges in the bar
    showDeliveryInfo: boolean;     // Show delivery terms (min, fee, radius)
    deliveryMinimum?: number;      // $ minimum for delivery
    deliveryFee?: number;          // $ delivery fee
    deliveryRadius?: number;       // Miles radius
    showDriveThru?: boolean;       // Show drive-thru messaging
}

export interface LoyaltySettings {
    pointsPerDollar: number;
    tiers: LoyaltyTier[];
    equityMultiplier: number; // e.g. 1.2x points for equity applicants
    redemptionTiers?: RedemptionTier[];
    enableGamification?: boolean;
    segmentThresholds?: SegmentThresholds;
    discountPrograms?: DiscountProgram[];
    menuDisplay?: LoyaltyMenuDisplay;
}

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
    pointsPerDollar: 1,
    equityMultiplier: 1.2,
    enableGamification: false,
    tiers: [
        { id: 'bronze', name: 'Bronze', threshold: 0, color: '#cd7f32', benefits: ['1x points'] },
        { id: 'silver', name: 'Silver', threshold: 200, color: '#c0c0c0', benefits: ['1.25x points', 'Early access to deals'] },
        { id: 'gold', name: 'Gold', threshold: 500, color: '#ffd700', benefits: ['1.5x points', 'Birthday bonus', 'Free delivery'] },
        { id: 'platinum', name: 'Platinum', threshold: 1000, color: '#e5e4e2', benefits: ['2x points', 'VIP events', 'Exclusive products'] },
    ],
    redemptionTiers: [
        { id: 'small', pointsCost: 100, rewardValue: 5, description: '$5 off your order' },
        { id: 'medium', pointsCost: 250, rewardValue: 15, description: '$15 off your order' },
        { id: 'large', pointsCost: 500, rewardValue: 35, description: '$35 off your order' },
    ],
    segmentThresholds: {
        loyal_minOrders: 2,
        vip_minLifetimeValue: 500,
        vip_minOrders: 8,
        vip_minAOV: 50,
        highValue_minAOV: 75,
        highValue_maxOrders: 5,
        frequent_minOrders: 5,
        frequent_maxAOV: 60,
        slipping_minDays: 30,
        atRisk_minDays: 60,
        churned_minDays: 90,
        new_maxDays: 30,
    },
    discountPrograms: [
        { id: 'military', enabled: false, name: 'Military & Veterans', description: '10% off every visit', icon: 'shield' },
        { id: 'senior', enabled: false, name: 'Seniors 60+', description: '15% off daily', icon: 'star' },
        { id: 'student', enabled: false, name: 'Students', description: '10% off with valid ID', icon: 'graduation-cap' },
    ],
    menuDisplay: {
        showBar: true,
        loyaltyTagline: '',
        showDiscountPrograms: true,
        showDeliveryInfo: false,
        deliveryMinimum: 50,
        deliveryFee: 10,
        deliveryRadius: 20,
        showDriveThru: false,
    },
};

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
    const orderCount = profile.orderCount ?? 0;
    const avgOrderValue = profile.avgOrderValue ?? 0;
    const lifetimeValue = profile.lifetimeValue ?? 0;

    // No order history at all (e.g. loyalty-only enrollees from POS where spending data
    // is not yet loaded). Cannot classify by recency — treat as 'new' rather than 'churned'.
    if (orderCount === 0 && !profile.lastOrderDate && profile.daysSinceLastOrder === undefined) {
        return 'new';
    }

    const daysSinceOrder = profile.daysSinceLastOrder ??
        (profile.lastOrderDate ? Math.floor((Date.now() - new Date(profile.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)) : 999);

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

    // VIP: High LTV (top tier) - Adjusted for realistic dispensary spending
    if (lifetimeValue >= 500 || (orderCount >= 8 && avgOrderValue >= 50)) return 'vip';

    // High Value: High AOV but low frequency - Adjusted thresholds
    if (avgOrderValue >= 75 && orderCount < 5) return 'high_value';

    // Frequent: Many orders but lower AOV - Adjusted for more inclusivity
    if (orderCount >= 5 && avgOrderValue < 60) return 'frequent';

    // Loyal: Regular customer - Adjusted to capture more customers
    if (orderCount >= 2) return 'loyal';

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
