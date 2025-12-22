/**
 * BakedBot Data Architecture Types
 * 
 * Core types for the Directory and Tenant data model.
 * See: dev/data-architecture.md for full specification.
 */

import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore';

// ============================================================================
// Common Types
// ============================================================================

/** Timestamp type that works with both client and admin SDKs */
export type Timestamp = FirestoreTimestamp | Date;

/** Geographic coordinates */
export interface GeoPoint {
    lat: number;
    lng: number;
}

/** Address structure */
export interface Address {
    street?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
}

/** Confidence score for data quality */
export type ConfidenceScore = number; // 0-1

/** Source reference pointing to raw import evidence */
export interface SourceRef {
    importId: string;
    sourceId: string;
    externalId?: string;
    timestamp: Timestamp;
}

/** Entity status in the directory */
export type DirectoryEntityStatus = 'active' | 'inactive' | 'pending' | 'claimed';

/** Claim status */
export type ClaimStatus = 'requested' | 'pending_verification' | 'verified' | 'rejected';

// ============================================================================
// Directory Types (World A - Public/SEO)
// ============================================================================

/**
 * Directory Brand Entity
 * Path: directory/brands/{brandId}
 */
export interface DirectoryBrand {
    id: string;
    name: string;
    slug: string;
    description?: string;

    // Contact & Web
    website?: string;
    email?: string;
    phone?: string;
    socialLinks?: {
        instagram?: string;
        twitter?: string;
        facebook?: string;
    };

    // Assets
    logoUrl?: string;
    coverImageUrl?: string;

    // Location info
    headquarters?: Address;
    operatingStates?: string[];

    // Licensing
    licenses?: {
        state: string;
        type: string;
        number?: string;
        verified: boolean;
    }[];

    // Data quality
    confidence: ConfidenceScore;
    sourceRefs: SourceRef[];
    resolutionMetadata?: {
        mergedFrom?: string[];
        dedupeMethod?: string;
    };

    // Claim status
    status: DirectoryEntityStatus;
    claimedAt?: Timestamp;
    tenantId?: string;

    // Timestamps
    lastSeenAt: Timestamp;
    lastUpdatedAt: Timestamp;
    createdAt: Timestamp;
}

/**
 * Directory Dispensary Entity
 * Path: directory/dispensaries/{dispensaryId}
 */
export interface DirectoryDispensary {
    id: string;
    name: string;
    slug: string;
    description?: string;

    // Location
    address: Address;
    geo: GeoPoint;
    placeId?: string; // Google Places ID

    // Contact
    phone?: string;
    email?: string;
    website?: string;
    menuUrl?: string;

    // Assets
    logoUrl?: string;
    coverImageUrl?: string;
    photos?: string[];

    // Business info
    storeType?: 'recreational' | 'medical' | 'both';
    amenities?: string[];
    paymentMethods?: string[];

    // Hours
    hours?: {
        [day: string]: { open: string; close: string } | null;
    };

    // Licensing
    licenses?: {
        type: string;
        number?: string;
        verified: boolean;
    }[];

    // Ratings (aggregated from sources)
    rating?: number;
    reviewCount?: number;

    // Data quality
    confidence: ConfidenceScore;
    sourceRefs: SourceRef[];
    resolutionMetadata?: {
        mergedFrom?: string[];
        dedupeMethod?: string;
    };

    // Claim status
    status: DirectoryEntityStatus;
    claimedAt?: Timestamp;
    tenantId?: string;

    // Timestamps
    lastSeenAt: Timestamp;
    lastUpdatedAt: Timestamp;
    createdAt: Timestamp;
}

/**
 * Directory Location (for "where to buy" brand placement)
 * Path: directory/locations/{locationId}
 */
export interface DirectoryLocation {
    id: string;
    dispensaryId: string;
    dispensaryName: string;

    // Location
    address: Address;
    geo: GeoPoint;

    // Brands carried at this location
    brandIds?: string[];

    // Status
    isActive: boolean;

    // Timestamps
    lastSeenAt: Timestamp;
    lastUpdatedAt: Timestamp;
}

/**
 * Directory SEO Page (programmatic pages for ZIP/city/state/category)
 * Path: directory/pages/{pageId}
 */
export interface DirectoryPage {
    id: string;

    // Page type and targeting
    pageType: 'zip' | 'city' | 'state' | 'category' | 'brand-near' | 'dispensary-near';

    // Location targeting
    zip?: string;
    city?: string;
    state?: string;

    // Category targeting
    category?: string;

    // Entity targeting (for entity-specific pages)
    entityType?: 'brand' | 'dispensary';
    entityId?: string;

    // SEO metadata
    slug: string;
    title: string;
    metaDescription?: string;
    h1?: string;

    // Content
    contentBlocks?: {
        type: string;
        content: string;
    }[];

    // Status
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Timestamp;

    // Performance
    pageViews?: number;
    lastViewedAt?: Timestamp;

    // Timestamps
    createdAt: Timestamp;
    lastUpdatedAt: Timestamp;
}

// ============================================================================
// Directory Derived Views (for fast page rendering)
// ============================================================================

/**
 * Entity View (pre-rendered brand/dispensary data)
 * Path: directory/entityViews/{entityId}
 */
export interface DirectoryEntityView {
    id: string;
    entityType: 'brand' | 'dispensary';

    // Core display fields (flattened)
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    coverImageUrl?: string;

    // Location (dispensary only)
    address?: Address;
    geo?: GeoPoint;

    // Contact
    phone?: string;
    website?: string;

    // Status
    isClaimed: boolean;
    isVerified: boolean;

    // SEO
    pageTitle: string;
    metaDescription: string;

    // Related entities (for cross-linking)
    relatedBrandIds?: string[];
    relatedDispensaryIds?: string[];
    nearbyDispensaryIds?: string[];

    // View freshness
    sourceEntityUpdatedAt: Timestamp;
    viewBuiltAt: Timestamp;
}

/**
 * Page View (pre-rendered SEO page data)
 * Path: directory/pageViews/{pageId}
 */
export interface DirectoryPageView {
    id: string;
    pageType: DirectoryPage['pageType'];

    // Targeting (copied from page)
    zip?: string;
    city?: string;
    state?: string;
    category?: string;

    // SEO fields
    slug: string;
    pageTitle: string;
    metaDescription: string;
    h1: string;

    // Pre-fetched content
    featuredBrands?: DirectoryEntityView[];
    featuredDispensaries?: DirectoryEntityView[];

    // Counts
    totalBrands?: number;
    totalDispensaries?: number;

    // View freshness
    viewBuiltAt: Timestamp;
}

// ============================================================================
// Claims & Tenant Links
// ============================================================================

/**
 * Claim Request
 * Path: directory/claims/{claimId}
 */
export interface DirectoryClaim {
    id: string;

    // What is being claimed
    entityType: 'brand' | 'dispensary';
    entityId: string;
    entityName: string;

    // Who is claiming
    claimantEmail: string;
    claimantName?: string;
    claimantPhone?: string;
    claimantRole?: string;

    // Verification
    verificationMethod: 'email' | 'phone' | 'document' | 'manual';
    verificationCode?: string;
    verificationAttempts?: number;

    // Status
    status: ClaimStatus;
    rejectionReason?: string;

    // Result
    tenantId?: string;
    verifiedAt?: Timestamp;
    verifiedBy?: string; // admin UID if manual

    // Timestamps
    requestedAt: Timestamp;
    expiresAt?: Timestamp;
    lastUpdatedAt: Timestamp;
}

/**
 * Tenant Link (bridges directory entity to tenant)
 * Path: directory/tenantLinks/{directoryEntityKey}
 * Key format: "brand:{brandId}" or "dispensary:{dispensaryId}"
 */
export interface DirectoryTenantLink {
    entityType: 'brand' | 'dispensary';
    entityId: string;
    tenantId: string;

    // Verification
    verifiedAt: Timestamp;
    verifiedBy: string; // claim ID or admin UID

    // Status
    status: 'active' | 'suspended' | 'revoked';

    // Field control (which fields tenant can override)
    overridableFields?: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDirectoryBrand(obj: unknown): obj is DirectoryBrand {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'confidence' in obj &&
        'sourceRefs' in obj
    );
}

export function isDirectoryDispensary(obj: unknown): obj is DirectoryDispensary {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'address' in obj &&
        'geo' in obj
    );
}

export function isDirectoryClaim(obj: unknown): obj is DirectoryClaim {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'entityType' in obj &&
        'entityId' in obj &&
        'claimantEmail' in obj &&
        'status' in obj
    );
}
