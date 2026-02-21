/**
 * Bundle Deals System
 * Allows dispensaries and brands to create promotional bundles
 */

export type BundleType = 'bogo' | 'mix_match' | 'percentage' | 'fixed_price' | 'tiered';
export type BundleStatus = 'draft' | 'active' | 'scheduled' | 'expired' | 'paused';
export type BundleCreator = 'dispensary' | 'brand' | 'collaborative';

export interface BundleProduct {
    productId: string;
    name: string;
    category: string;
    requiredQty: number;
    originalPrice: number;
    bundlePrice?: number; // For fixed-price bundles
    discountPercent?: number; // For percentage bundles
    brand?: string; // Brand name for image selection
    imageUrl?: string; // Product image URL
}

export interface BundleDeal {
    id: string;
    name: string;
    description: string;
    type: BundleType;
    status: BundleStatus;

    // Creator info
    createdBy: BundleCreator;
    dispensaryId?: string;
    brandId?: string;

    // Bundle configuration
    products: BundleProduct[];
    minProducts?: number; // For mix & match
    maxProducts?: number;

    // Pricing
    originalTotal: number;
    bundlePrice: number;
    savingsAmount: number;
    savingsPercent: number;

    // Mix & Match Configuration
    eligibleProductIds?: string[]; // IDs of products eligible for this bundle
    criteria?: {
        categories?: string[];
        brands?: string[];
        subcategories?: string[];
        priceRange?: { min: number; max: number };
        tags?: string[];
    };

    // Tiers for tiered bundles
    tiers?: {
        qty: number;
        discountPercent: number;
    }[];

    // Schedule
    startDate?: Date;
    endDate?: Date;
    daysOfWeek?: number[]; // 0=Sun, 6=Sat
    timeStart?: string; // "09:00"
    timeEnd?: string; // "17:00"

    // Limits
    maxRedemptions?: number;
    currentRedemptions: number;
    perCustomerLimit?: number;

    // Display
    imageUrl?: string;
    badgeText?: string; // e.g., "Save 20%!"
    featured: boolean;

    // Tracking
    createdAt: Date;
    updatedAt: Date;
    orgId: string;
}

export interface BrandBundleProposal {
    id: string;
    brandId: string;
    brandName: string;

    // Proposed bundle
    proposedBundle: Omit<BundleDeal, 'id' | 'dispensaryId' | 'createdAt' | 'updatedAt' | 'orgId'>;

    // Brand contribution
    brandContribution: number; // $ amount brand will subsidize
    coopPercentage?: number; // % of discount brand covers

    // Target dispensaries
    targetDispensaryIds: string[];

    // Status per dispensary
    responses: {
        dispensaryId: string;
        status: 'pending' | 'accepted' | 'rejected' | 'counter';
        counterOffer?: Partial<BundleDeal>;
        respondedAt?: Date;
    }[];

    // Metadata
    proposedAt: Date;
    expiresAt: Date;
    status: 'pending' | 'partial' | 'accepted' | 'expired';
}
