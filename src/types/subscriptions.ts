/**
 * Coverage Pack & Subscription Types
 * Defines tiered pricing and feature limits
 */

export type CoveragePackTier = 'starter' | 'pro' | 'enterprise';

export interface CoveragePack {
    id: CoveragePackTier;
    name: string;
    price: number; // Monthly in cents
    description: string;
    features: string[];
    limits: CoveragePackLimits;
    recommended?: boolean;
}

export interface CoveragePackLimits {
    competitors: number;      // Max competitors to track
    scansPerMonth: number;    // Competitive scans per month
    aiInsights: boolean;      // Access to AI-powered insights
    customAlerts: boolean;    // Custom price/inventory alerts
    exportData: boolean;      // Export data to CSV
    apiAccess: boolean;       // API access for integrations
    whiteLabel: boolean;      // White-label features
}

export const COVERAGE_PACKS: CoveragePack[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 0,
        description: 'Get started with basic competitive intel',
        features: [
            '3 competitors tracked',
            '10 scans per month',
            'Basic price comparison',
            'Email alerts',
        ],
        limits: {
            competitors: 3,
            scansPerMonth: 10,
            aiInsights: false,
            customAlerts: false,
            exportData: false,
            apiAccess: false,
            whiteLabel: false,
        },
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 4900, // $49/mo
        description: 'Advanced intel for serious operators',
        features: [
            '10 competitors tracked',
            '100 scans per month',
            'AI-powered insights',
            'Custom alerts',
            'CSV export',
        ],
        limits: {
            competitors: 10,
            scansPerMonth: 100,
            aiInsights: true,
            customAlerts: true,
            exportData: true,
            apiAccess: false,
            whiteLabel: false,
        },
        recommended: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 19900, // $199/mo
        description: 'Unlimited intelligence for multi-location operators',
        features: [
            'Unlimited competitors',
            'Unlimited scans',
            'AI-powered insights',
            'Custom alerts',
            'Full data export',
            'API access',
            'White-label reports',
        ],
        limits: {
            competitors: -1, // Unlimited
            scansPerMonth: -1, // Unlimited
            aiInsights: true,
            customAlerts: true,
            exportData: true,
            apiAccess: true,
            whiteLabel: true,
        },
    },
];

/**
 * User subscription record
 */
export interface UserSubscription {
    id: string;
    userId: string;
    tenantId: string;
    packId: CoveragePackTier;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    // managed via Authorize.net customerProfileId/paymentProfileId on claimdoc
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Usage tracking for enforcement
 */
export interface UsageRecord {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    competitorsUsed: number;
    scansUsed: number;
    lastUpdated: Date;
}

/**
 * Get pack by ID
 */
export function getCoveragePack(packId: CoveragePackTier): CoveragePack | undefined {
    return COVERAGE_PACKS.find(p => p.id === packId);
}

/**
 * Check if usage is within limits
 */
export function isWithinLimits(
    pack: CoveragePack,
    usage: UsageRecord
): { allowed: boolean; reason?: string } {
    // Check competitors limit
    if (pack.limits.competitors !== -1 && usage.competitorsUsed >= pack.limits.competitors) {
        return { allowed: false, reason: `Maximum ${pack.limits.competitors} competitors reached. Upgrade to track more.` };
    }

    // Check scans limit
    if (pack.limits.scansPerMonth !== -1 && usage.scansUsed >= pack.limits.scansPerMonth) {
        return { allowed: false, reason: `Maximum ${pack.limits.scansPerMonth} scans this month. Upgrade for more.` };
    }

    return { allowed: true };
}
