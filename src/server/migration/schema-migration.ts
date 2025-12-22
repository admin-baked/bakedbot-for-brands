/**
 * Schema Migration: Legacy → New Data Architecture
 * 
 * Migrates existing Firestore collections to the new Directory/Tenant model.
 * See: dev/data-architecture.md
 * 
 * Current schema:
 *   - users/{userId}
 *   - brands/{brandId}
 *   - products/{productId}
 *   - dispensaries/{dispensaryId}
 * 
 * New schema:
 *   - directory/brands/{brandId}
 *   - directory/dispensaries/{dispensaryId}
 *   - tenants/{tenantId}/...
 */

import type {
    DirectoryBrand,
    DirectoryDispensary,
    DirectoryEntityView,
    ConfidenceScore
} from '@/types/directory';
import type { Tenant, CatalogProduct } from '@/types/tenant';

// ============================================================================
// Migration Types
// ============================================================================

/** Legacy brand document from brands/{brandId} */
export interface LegacyBrand {
    id?: string;
    name: string;
    slug?: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
    logo?: string;
    coverImage?: string;
    verified?: boolean;
    status?: string;
    createdAt?: any;
    updatedAt?: any;
    [key: string]: unknown;
}

/** Legacy dispensary document from dispensaries/{dispensaryId} */
export interface LegacyDispensary {
    id?: string;
    name: string;
    slug?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    website?: string;
    lat?: number;
    lng?: number;
    lat_lng?: { lat: number; lng: number };
    hours?: Record<string, unknown>;
    rating?: number;
    reviewCount?: number;
    createdAt?: any;
    updatedAt?: any;
    [key: string]: unknown;
}

/** Legacy product document from products/{productId} */
export interface LegacyProduct {
    id?: string;
    name: string;
    brandId?: string;
    brandName?: string;
    category?: string;
    subcategory?: string;
    thc?: number | string;
    cbd?: number | string;
    price?: number;
    image?: string;
    images?: string[];
    description?: string;
    effects?: string[];
    strainType?: string;
    createdAt?: any;
    updatedAt?: any;
    [key: string]: unknown;
}

/** Migration result */
export interface MigrationResult {
    success: boolean;
    phase: string;
    recordsMigrated: number;
    recordsSkipped: number;
    errors: { id: string; error: string }[];
}

/** Full migration report */
export interface MigrationReport {
    startedAt: Date;
    completedAt?: Date;
    phases: MigrationResult[];
    totalMigrated: number;
    totalErrors: number;
}

// ============================================================================
// Brand Migration
// ============================================================================

/**
 * Transform legacy brand to directory brand
 */
export function transformLegacyBrand(legacy: LegacyBrand, brandId: string): DirectoryBrand {
    const now = new Date();

    return {
        id: brandId,
        name: legacy.name,
        slug: legacy.slug || createSlug(legacy.name),
        description: legacy.description,
        website: legacy.website,
        email: legacy.email,
        phone: legacy.phone,
        logoUrl: legacy.logo,
        coverImageUrl: legacy.coverImage,
        confidence: calculateBrandConfidence(legacy),
        sourceRefs: [{
            importId: 'migration-initial',
            sourceId: 'legacy-brands',
            timestamp: now as any
        }],
        status: legacy.verified ? 'claimed' : 'active',
        lastSeenAt: legacy.updatedAt || now as any,
        lastUpdatedAt: now as any,
        createdAt: legacy.createdAt || now as any
    };
}

/**
 * Calculate confidence score for legacy brand
 */
function calculateBrandConfidence(legacy: LegacyBrand): ConfidenceScore {
    let score = 0.5; // Base score for existing data

    if (legacy.description) score += 0.1;
    if (legacy.website) score += 0.1;
    if (legacy.logo) score += 0.1;
    if (legacy.verified) score += 0.2;

    return Math.min(1, score);
}

/**
 * Create entity view from directory brand
 */
export function createBrandEntityView(brand: DirectoryBrand): DirectoryEntityView {
    return {
        id: brand.id,
        entityType: 'brand',
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoUrl: brand.logoUrl,
        coverImageUrl: brand.coverImageUrl,
        phone: brand.phone,
        website: brand.website,
        isClaimed: brand.status === 'claimed',
        isVerified: brand.status === 'claimed',
        pageTitle: `${brand.name} | Cannabis Brand`,
        metaDescription: brand.description || `Discover ${brand.name} cannabis products, where to buy, and more.`,
        sourceEntityUpdatedAt: brand.lastUpdatedAt,
        viewBuiltAt: new Date() as any
    };
}

// ============================================================================
// Dispensary Migration
// ============================================================================

/**
 * Transform legacy dispensary to directory dispensary
 */
export function transformLegacyDispensary(legacy: LegacyDispensary, dispensaryId: string): DirectoryDispensary {
    const now = new Date();

    // Handle both lat/lng formats
    const lat = legacy.lat || legacy.lat_lng?.lat || 0;
    const lng = legacy.lng || legacy.lat_lng?.lng || 0;

    return {
        id: dispensaryId,
        name: legacy.name,
        slug: legacy.slug || createSlug(legacy.name),
        address: {
            street: legacy.address,
            city: legacy.city || '',
            state: legacy.state || '',
            postalCode: legacy.zip || ''
        },
        geo: { lat, lng },
        phone: legacy.phone,
        website: legacy.website,
        hours: legacy.hours as any,
        rating: legacy.rating,
        reviewCount: legacy.reviewCount,
        confidence: calculateDispensaryConfidence(legacy),
        sourceRefs: [{
            importId: 'migration-initial',
            sourceId: 'legacy-dispensaries',
            timestamp: now as any
        }],
        status: 'active',
        lastSeenAt: legacy.updatedAt || now as any,
        lastUpdatedAt: now as any,
        createdAt: legacy.createdAt || now as any
    };
}

/**
 * Calculate confidence score for legacy dispensary
 */
function calculateDispensaryConfidence(legacy: LegacyDispensary): ConfidenceScore {
    let score = 0.5;

    if (legacy.address) score += 0.1;
    if (legacy.phone) score += 0.1;
    if ((legacy.lat || legacy.lat_lng?.lat) && (legacy.lng || legacy.lat_lng?.lng)) score += 0.15;
    if (legacy.hours) score += 0.1;
    if (legacy.rating) score += 0.05;

    return Math.min(1, score);
}

/**
 * Create entity view from directory dispensary
 */
export function createDispensaryEntityView(dispensary: DirectoryDispensary): DirectoryEntityView {
    return {
        id: dispensary.id,
        entityType: 'dispensary',
        name: dispensary.name,
        slug: dispensary.slug,
        description: dispensary.description,
        logoUrl: dispensary.logoUrl,
        coverImageUrl: dispensary.coverImageUrl,
        address: dispensary.address,
        geo: dispensary.geo,
        phone: dispensary.phone,
        website: dispensary.website,
        isClaimed: dispensary.status === 'claimed',
        isVerified: dispensary.status === 'claimed',
        pageTitle: `${dispensary.name} | Cannabis Dispensary in ${dispensary.address.city}, ${dispensary.address.state}`,
        metaDescription: `Visit ${dispensary.name} dispensary in ${dispensary.address.city}. View menu, hours, and directions.`,
        sourceEntityUpdatedAt: dispensary.lastUpdatedAt,
        viewBuiltAt: new Date() as any
    };
}

// ============================================================================
// Product Migration (to Tenant Catalog)
// ============================================================================

/**
 * Transform legacy product to catalog product
 */
export function transformLegacyProduct(legacy: LegacyProduct, productId: string, tenantId: string): CatalogProduct {
    const now = new Date();

    return {
        id: productId,
        tenantId,
        name: legacy.name,
        brandName: legacy.brandName,
        category: normalizeCategory(legacy.category),
        subcategory: legacy.subcategory,
        strainType: normalizeStrainType(legacy.strainType),
        potency: buildPotency(legacy),
        description: legacy.description,
        effects: legacy.effects,
        images: buildImages(legacy),
        externalRefs: {
            [`legacy:${productId}`]: true
        },
        isActive: true,
        isPublished: false,
        createdAt: legacy.createdAt || now as any,
        updatedAt: now as any,
        lastImportedAt: now as any
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create URL-safe slug from name
 */
export function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Normalize category string
 */
function normalizeCategory(category?: string): CatalogProduct['category'] {
    if (!category) return 'other';

    const normalized = category.toLowerCase().trim();
    const categoryMap: Record<string, CatalogProduct['category']> = {
        'flower': 'flower',
        'flowers': 'flower',
        'preroll': 'prerolls',
        'prerolls': 'prerolls',
        'pre-roll': 'prerolls',
        'vape': 'vapes',
        'vapes': 'vapes',
        'edible': 'edibles',
        'edibles': 'edibles',
        'concentrate': 'concentrates',
        'concentrates': 'concentrates',
        'tincture': 'tinctures',
        'tinctures': 'tinctures',
        'topical': 'topicals',
        'topicals': 'topicals'
    };

    return categoryMap[normalized] || 'other';
}

/**
 * Normalize strain type
 */
function normalizeStrainType(strainType?: string): CatalogProduct['strainType'] {
    if (!strainType) return undefined;

    const normalized = strainType.toLowerCase().trim();
    if (normalized.includes('indica')) return 'indica';
    if (normalized.includes('sativa')) return 'sativa';
    if (normalized.includes('hybrid')) return 'hybrid';
    if (normalized.includes('cbd')) return 'cbd';
    return 'unknown';
}

/**
 * Build potency object from legacy product
 */
function buildPotency(legacy: LegacyProduct): CatalogProduct['potency'] {
    const thc = parseNumber(legacy.thc);
    const cbd = parseNumber(legacy.cbd);

    if (!thc && !cbd) return undefined;

    return {
        thc: thc ? { value: thc, unit: 'percent' } : undefined,
        cbd: cbd ? { value: cbd, unit: 'percent' } : undefined
    };
}

/**
 * Parse number from string or number
 */
function parseNumber(value?: string | number): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? undefined : parsed;
}

/**
 * Build images array from legacy product
 */
function buildImages(legacy: LegacyProduct): CatalogProduct['images'] {
    const images: CatalogProduct['images'] = [];

    if (legacy.image) {
        images.push({ url: legacy.image, isPrimary: true });
    }

    if (legacy.images?.length) {
        for (const url of legacy.images) {
            if (url !== legacy.image) {
                images.push({ url, isPrimary: false });
            }
        }
    }

    return images.length > 0 ? images : undefined;
}

// ============================================================================
// Migration Validation
// ============================================================================

/**
 * Validate migrated brand has required fields
 */
export function validateDirectoryBrand(brand: Partial<DirectoryBrand>): string[] {
    const errors: string[] = [];

    if (!brand.id) errors.push('Missing id');
    if (!brand.name) errors.push('Missing name');
    if (!brand.slug) errors.push('Missing slug');
    if (brand.confidence === undefined) errors.push('Missing confidence');
    if (!brand.sourceRefs?.length) errors.push('Missing sourceRefs');

    return errors;
}

/**
 * Validate migrated dispensary has required fields
 */
export function validateDirectoryDispensary(dispensary: Partial<DirectoryDispensary>): string[] {
    const errors: string[] = [];

    if (!dispensary.id) errors.push('Missing id');
    if (!dispensary.name) errors.push('Missing name');
    if (!dispensary.address) errors.push('Missing address');
    if (!dispensary.geo) errors.push('Missing geo');

    return errors;
}

/**
 * Validate migrated product has required fields
 */
export function validateCatalogProduct(product: Partial<CatalogProduct>): string[] {
    const errors: string[] = [];

    if (!product.id) errors.push('Missing id');
    if (!product.tenantId) errors.push('Missing tenantId');
    if (!product.name) errors.push('Missing name');
    if (!product.category) errors.push('Missing category');
    if (!product.externalRefs) errors.push('Missing externalRefs');

    return errors;
}
