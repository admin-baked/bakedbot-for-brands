
export type VerificationStatus = 'unverified' | 'verified' | 'featured';
export type ClaimStatus = 'unclaimed' | 'pending' | 'claimed';
export type EntityType = 'brand' | 'dispensary';
export type PageType = 'zip' | 'brand' | 'dispensary' | 'ranking' | 'desert';

// Core Entity: Brand
export interface Brand {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string; // e.g. /images/brands/jeeter.png
    websiteUrl?: string;
    socialHandles?: {
        instagram?: string;
        twitter?: string;
        linkedin?: string;
    };
    description?: string;

    // SEO & Claiming
    verificationStatus: VerificationStatus; // Default: 'unverified'
    claimStatus: ClaimStatus;               // Default: 'unclaimed'
    featuredPlan?: 'featured_100';          // If verified && upgrading

    // Stats
    dispensaryCount?: number;
    productCount?: number;

    createdAt: Date;
    updatedAt: Date;
}

// Core Entity: Dispensary
export interface Dispensary {
    id: string;
    name: string;
    slug: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;

    geo?: {
        lat: number;
        lng: number;
    };

    hours?: Record<string, string>; // "Monday": "9am-9pm"
    orderingLinks?: {
        weedmaps?: string;
        leafly?: string;
        dutchie?: string;
        website?: string;
    };

    // SEO & Claiming
    verificationStatus: VerificationStatus;
    claimStatus: ClaimStatus;

    createdAt: Date;
    updatedAt: Date;
}

// Brand Presence (Intersection of Brand + Dispensary)
export interface BrandPresence {
    id: string; // composite key or auto-id
    brandId: string;
    dispensaryId: string;

    inStock: boolean;
    lastSeenAt: Date;

    priceRange?: {
        min: number;
        max: number;
        currency: 'USD';
    };
}

// Local Page (The programmatic SEO page config)
export interface LocalPage {
    id: string;
    slug: string; // e.g. "brands/jeeter/near/48201" or "local/48201"
    type: PageType;

    // SEO Metadata
    title: string;
    description: string;
    h1: string;

    // Data References (for fast loading)
    snapshotRef?: string; // Pointer to a cached JSON snapshot in storage

    status: 'active' | 'inactive';
    lastGeneratedAt: Date;
}

// Claim Request
export interface ClaimRequest {
    id: string;
    entityType: EntityType;
    entityId: string; // brandId or dispensaryId
    userId: string;   // The user claiming it

    // Contact Info
    businessEmail: string;
    role: string;
    website: string;

    // Verification
    status: 'pending' | 'verified' | 'rejected';
    verificationMethod: 'email_domain' | 'social_handle' | 'manual_review';

    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
}

// Featured Placement (The $100/mo Inventory)
export interface FeaturedPlacement {
    id: string;
    entityType: EntityType;
    entityId: string;

    // Where is it featured?
    placementScope: 'zip' | 'state' | 'brand_page';
    zipCode?: string; // if scope == zip
    state?: string;   // if scope == state

    // Plan details
    planId: 'featured_100';
    isActive: boolean;

    startsAt: Date;
    endsAt?: Date; // If subscription cancels
}

// Cannabis Desert Index (Earned Media)
export interface CannabisDesertRecord {
    zipCode: string;
    city: string;
    state: string;

    underservedScore: number; // 0-100 (100 = worst desert)
    populationProxy?: number;
    distanceToNearestDispensaryMiles: number;
    dispensaryCount: number; // usually 0 for true deserts
}
