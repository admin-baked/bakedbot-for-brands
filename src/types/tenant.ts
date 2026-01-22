/**
 * Tenant Workspace Types
 * 
 * Types for tenant-owned data: catalog, imports, mappings, events, audit.
 * See: dev/data-architecture.md for full specification.
 */

import type { Timestamp, GeoPoint, Address, SourceRef, ConfidenceScore } from './directory';

// ============================================================================
// Tenant Core
// ============================================================================

/**
 * Tenant Profile (organization workspace)
 * Path: tenants/{tenantId}
 */
export interface Tenant {
    id: string;

    // Organization info
    name: string;
    legalName?: string;
    type: 'brand' | 'dispensary' | 'distributor';

    // Contact
    email: string;
    phone?: string;
    website?: string;

    // Location
    address?: Address;
    operatingJurisdictions?: string[]; // state codes

    // Directory link
    directoryRef?: {
        entityType: 'brand' | 'dispensary';
        entityId: string;
    };

    // Billing
    planId?: string;
    subscriptionStatus?: 'trial' | 'active' | 'past_due' | 'canceled';
    customerId?: string; // Authorize.net Customer Profile ID

    // Settings
    settings?: {
        timezone?: string;
        currency?: string;
        defaultLocationId?: string;
    };

    // Channels enabled
    channels?: {
        headlessMenu?: boolean;
        smokeyAgent?: boolean;
        craigCampaigns?: boolean;
        deeboCompliance?: boolean;
    };

    // Custom Domain Configuration
    customDomain?: CustomDomainConfig;

    // Timestamps
    createdAt: Timestamp;
    onboardedAt?: Timestamp;
    lastActiveAt?: Timestamp;
}

// ============================================================================
// Custom Domain Types
// ============================================================================

/** Connection method for custom domains */
export type DomainConnectionType = 'cname' | 'nameserver';

/** Verification status for custom domains */
export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

/** SSL certificate status */
export type DomainSSLStatus = 'pending' | 'provisioning' | 'active' | 'error';

/**
 * Custom Domain Configuration
 * Stored at tenants/{tenantId}.customDomain
 */
export interface CustomDomainConfig {
    /** The custom domain (e.g., "shop.mybrand.com" or "mybrandmenu.com") */
    domain: string;

    /** How the domain is connected: CNAME (subdomain) or Nameserver (full domain) */
    connectionType: DomainConnectionType;

    /** Verification status */
    verificationStatus: DomainVerificationStatus;

    /** DNS TXT record token for verification */
    verificationToken: string;

    /** Verification error message (if failed) */
    verificationError?: string;

    /** Timestamp when domain was verified */
    verifiedAt?: Timestamp;

    /** Timestamp of last verification check */
    lastCheckAt?: Timestamp;

    /** SSL certificate status */
    sslStatus?: DomainSSLStatus;

    /** For nameserver method: assigned nameservers */
    nameserversAssigned?: string[];

    /** Timestamp when domain config was created */
    createdAt: Timestamp;

    /** Timestamp when domain config was last updated */
    updatedAt: Timestamp;
}

/**
 * Domain Mapping (for fast hostname -> tenant lookup)
 * Path: domain_mappings/{domain}
 */
export interface DomainMapping {
    /** The custom domain */
    domain: string;

    /** The tenant ID this domain belongs to */
    tenantId: string;

    /** Connection type */
    connectionType: DomainConnectionType;

    /** When the domain was verified */
    verifiedAt: Timestamp;

    /** TTL for cache invalidation */
    ttl?: Timestamp;
}

// ============================================================================
// Sources & Imports
// ============================================================================

/** Supported data sources */
export type DataSourceType =
    | 'cannmenus'
    | 'leafly'
    | 'dutchie'
    | 'jane'
    | 'weedmaps'
    | 'biotrack'
    | 'metrc'
    | 'csv'
    | 'manual'
    | 'discovery';

/**
 * Data Source Configuration
 * Path: tenants/{tenantId}/sources/{sourceId}
 */
export interface TenantSource {
    id: string;
    type: DataSourceType;
    name: string;

    // Connection config (encrypted where needed)
    config?: {
        apiKey?: string;
        apiUrl?: string;
        brandName?: string;
        storeId?: string;
        locationId?: string;
    };

    // Status
    isActive: boolean;
    lastSyncAt?: Timestamp;
    lastSyncStatus?: 'success' | 'failed' | 'partial';

    // Scheduling
    syncSchedule?: 'manual' | 'hourly' | 'daily' | 'weekly';
    nextSyncAt?: Timestamp;

    // Stats
    totalImports?: number;
    totalRecordsImported?: number;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/** Import status */
export type ImportStatus =
    | 'pending'
    | 'parsing'
    | 'staging'
    | 'merging'
    | 'building_views'
    | 'completed'
    | 'failed';

/**
 * Import Record
 * Path: tenants/{tenantId}/imports/{importId}
 */
export interface TenantImport {
    id: string;
    sourceId: string;
    sourceType: DataSourceType;

    // Status
    status: ImportStatus;

    // Content hash for idempotency
    contentHash: string;

    // Storage paths
    storagePathRaw: string;     // gs://bucket/tenants/{tenantId}/imports/{importId}/raw.json.gz
    storagePathNormalized?: string;

    // Stats
    stats?: {
        totalRecords: number;
        newRecords: number;
        updatedRecords: number;
        unchangedRecords: number;
        errorRecords: number;
        warnings: string[];
    };

    // Error info
    error?: {
        code: string;
        message: string;
        stack?: string;
    };

    // Timestamps
    startedAt: Timestamp;
    endedAt?: Timestamp;
    createdAt: Timestamp;
}

// ============================================================================
// Staging & Mapping
// ============================================================================

/**
 * Staging Product (temporary during import)
 * Path: tenants/{tenantId}/staging/products/{externalId}
 */
export interface StagingProduct {
    externalId: string; // deterministic ID from source
    sourceId: string;
    sourceType: DataSourceType;
    importId: string;

    // Raw parsed fields
    name: string;
    brandName?: string;
    category?: string;
    subcategory?: string;

    // Potency
    thc?: number;
    thcUnit?: 'percent' | 'mg';
    cbd?: number;
    cbdUnit?: 'percent' | 'mg';

    // Pricing
    price?: number;
    priceUnit?: string;

    // Images
    imageUrl?: string;
    imageUrls?: string[];

    // Other fields (source-specific)
    rawData?: Record<string, unknown>;

    // Parse diagnostics
    parseDiagnostics?: {
        warnings: string[];
        normalized: boolean;
        confidence: ConfidenceScore;
    };

    // Merge state
    mergeState?: 'pending' | 'matched' | 'created' | 'error';
    matchedProductId?: string;
    matchConfidence?: ConfidenceScore;
    matchMethod?: MappingMethod;

    // Timestamps
    stagedAt: Timestamp;
    mergedAt?: Timestamp;
}

/** Mapping methods */
export type MappingMethod = 'exact' | 'upc' | 'fuzzy' | 'manual';

/**
 * Product Mapping (external ID → canonical ID)
 * Path: tenants/{tenantId}/mappings/products/{mappingId}
 */
export interface ProductMapping {
    id: string;

    // Source reference
    source: DataSourceType;
    externalId: string;

    // Canonical reference
    productId: string;

    // Match quality
    confidence: ConfidenceScore;
    method: MappingMethod;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    verifiedAt?: Timestamp;
    verifiedBy?: string; // user ID if manual
}

// ============================================================================
// Catalog (Canonical Products)
// ============================================================================

/** Product category */
export type ProductCategory =
    | 'flower'
    | 'prerolls'
    | 'vapes'
    | 'edibles'
    | 'concentrates'
    | 'tinctures'
    | 'topicals'
    | 'accessories'
    | 'other';

/** Strain type */
export type StrainType = 'indica' | 'sativa' | 'hybrid' | 'cbd' | 'unknown';

/**
 * Canonical Product
 * Path: tenants/{tenantId}/catalog/products/{productId}
 */
export interface CatalogProduct {
    id: string;
    tenantId: string;

    // Core fields
    name: string;
    brandName?: string;
    category: ProductCategory;
    subcategory?: string;

    // Cannabis specifics
    strainType?: StrainType;
    strainName?: string;
    terpenes?: {
        name: string;
        percentage?: number;
    }[];

    // Potency (structured)
    potency?: {
        thc?: { value: number; unit: 'percent' | 'mg' };
        cbd?: { value: number; unit: 'percent' | 'mg' };
        total?: { value: number; unit: 'percent' | 'mg' };
    };

    // Content
    description?: string;
    shortDescription?: string;
    effects?: string[];
    flavors?: string[];
    tags?: string[];

    // Images
    images?: {
        url: string;
        alt?: string;
        isPrimary?: boolean;
    }[];

    // External ID reverse index (for deduplication)
    externalRefs: Record<string, boolean>; // "dutchie:abc123": true

    // Compliance (Deebo outputs)
    compliance?: {
        isCompliant: boolean;
        lastCheckedAt: Timestamp;
        jurisdictions: {
            state: string;
            isCompliant: boolean;
            issues?: string[];
        }[];
    };

    // Status
    isActive: boolean;
    isPublished: boolean;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastImportedAt?: Timestamp;
}

/**
 * Product Variant (SKU/size/unit)
 * Path: tenants/{tenantId}/catalog/products/{productId}/variants/{variantId}
 */
export interface ProductVariant {
    id: string;
    productId: string;

    // Variant info
    name: string;
    sku?: string;
    upc?: string;

    // Size/Weight
    weight?: { value: number; unit: 'g' | 'oz' | 'mg' | 'ml' };
    quantity?: number; // for packs

    // External refs
    externalRefs?: Record<string, boolean>;

    // Status
    isActive: boolean;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Inventory Status (high-churn)
 * Path: tenants/{tenantId}/catalog/products/{productId}/inventory/{locationId}
 */
export interface ProductInventory {
    locationId: string;
    productId: string;
    variantId?: string;

    // Inventory
    quantity: number;
    isInStock: boolean;
    lowStockThreshold?: number;

    // Source reference
    sourceId?: string;
    lastSyncAt: Timestamp;

    // Timestamps
    updatedAt: Timestamp;
}

/**
 * Product Pricing (high-churn)
 * Path: tenants/{tenantId}/catalog/products/{productId}/prices/{locationId}
 */
export interface ProductPrice {
    locationId: string;
    productId: string;
    variantId?: string;

    // Pricing
    price: number;
    originalPrice?: number; // if on sale
    currency: string;

    // Discounts
    discountPercent?: number;
    discountType?: 'sale' | 'clearance' | 'member';

    // Tax
    taxIncluded?: boolean;
    taxRate?: number;

    // Source reference
    sourceId?: string;
    lastSyncAt: Timestamp;

    // Timestamps
    updatedAt: Timestamp;
}

/**
 * Lab Results
 * Path: tenants/{tenantId}/catalog/products/{productId}/labResults/{labId}
 */
export interface ProductLabResult {
    id: string;
    productId: string;

    // Lab info
    labName?: string;
    testDate?: Timestamp;
    batchNumber?: string;

    // Results
    cannabinoids?: Record<string, { value: number; unit: string }>;
    terpenes?: Record<string, { value: number; unit: string }>;

    // Safety
    pesticides?: { passed: boolean; details?: string };
    heavyMetals?: { passed: boolean; details?: string };
    microbials?: { passed: boolean; details?: string };

    // Document
    coaUrl?: string; // Storage URL to COA PDF

    // Timestamps
    createdAt: Timestamp;
}

// ============================================================================
// Public Views (sanitized for headless menu / public pages)
// ============================================================================

/**
 * Public Product View (safe for public display)
 * Path: tenants/{tenantId}/publicViews/products/{productId}
 */
export interface PublicProductView {
    id: string;
    tenantId: string;

    // Display fields
    name: string;
    brandName?: string;
    category: ProductCategory;
    strainType?: StrainType;

    // Content
    description?: string;
    effects?: string[];
    flavors?: string[];

    // Potency (simplified)
    thcPercent?: number;
    cbdPercent?: number;

    // Images
    imageUrl?: string;
    imageUrls?: string[];

    // Pricing (from primary location)
    price?: number;
    originalPrice?: number;
    currency?: string;

    // Availability
    isInStock?: boolean;
    availableLocations?: number;

    // View metadata
    viewBuiltAt: Timestamp;
    sourceProductUpdatedAt: Timestamp;
}

// ============================================================================
// Events & Audit
// ============================================================================

/** Event types */
export type EventType =
    | 'page_view'
    | 'product_view'
    | 'search'
    | 'recommendation_shown'
    | 'recommendation_click'
    | 'add_to_cart'
    | 'checkout_start'
    | 'order_complete';

/**
 * Analytics Event
 * Path: tenants/{tenantId}/events/{eventId}
 */
export interface TenantEvent {
    id: string;
    type: EventType;

    // Session
    sessionId?: string;
    userId?: string;

    // Context
    productIds?: string[];
    searchQuery?: string;
    page?: string;
    referrer?: string;

    // Attribution
    source?: string;
    medium?: string;
    campaign?: string;

    // Metadata
    metadata?: Record<string, unknown>;

    // Timestamps
    timestamp: Timestamp;
}

/** Audit action types */
export type AuditActionType =
    | 'import_completed'
    | 'product_created'
    | 'product_updated'
    | 'recommendation_made'
    | 'campaign_sent'
    | 'compliance_check'
    | 'settings_changed';

/**
 * Audit Action
 * Path: tenants/{tenantId}/audit/actions/{actionId}
 */
export interface AuditAction {
    id: string;
    type: AuditActionType;

    // Actor
    actorType: 'user' | 'system' | 'agent';
    actorId?: string;
    agentName?: string; // 'smokey', 'craig', 'deebo', etc.

    // Target
    targetType?: string;
    targetId?: string;

    // Summary
    summary: string;

    // Input/Output pointers (for large payloads)
    inputRef?: string; // Storage path
    outputRef?: string; // Storage path

    // Inline data (small payloads only)
    inputPreview?: Record<string, unknown>;
    outputPreview?: Record<string, unknown>;

    // Result
    success: boolean;
    errorMessage?: string;

    // Timestamps
    timestamp: Timestamp;
    duration?: number; // ms
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTenant(obj: unknown): obj is Tenant {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'type' in obj &&
        'email' in obj
    );
}

export function isCatalogProduct(obj: unknown): obj is CatalogProduct {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'tenantId' in obj &&
        'name' in obj &&
        'category' in obj &&
        'externalRefs' in obj
    );
}

export function isTenantImport(obj: unknown): obj is TenantImport {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'sourceId' in obj &&
        'status' in obj &&
        'contentHash' in obj
    );
}

export function isProductMapping(obj: unknown): obj is ProductMapping {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'source' in obj &&
        'externalId' in obj &&
        'productId' in obj
    );
}
