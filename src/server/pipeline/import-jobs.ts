/**
 * Import Pipeline Jobs
 * 
 * Server-side jobs for processing data imports:
 * 1. Parser: Raw payload → Staging collection
 * 2. Merger: Staging → Canonical catalog (with mapping resolution)
 * 3. ViewBuilder: Canonical → Derived views
 * 
 * See: dev/data-architecture.md
 */

import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type {
    TenantImport,
    StagingProduct,
    ProductMapping,
    CatalogProduct,
    PublicProductView,
    DataSourceType,
    ImportStatus,
    MappingMethod
} from '@/types/tenant';

// ============================================================================
// Types
// ============================================================================

/** Parser input - raw product data from various sources */
export interface RawProductData {
    externalId: string;
    name: string;
    brandName?: string;
    category?: string;
    subcategory?: string;
    thc?: number | string;
    cbd?: number | string;
    price?: number | string;
    priceUnit?: string;
    imageUrl?: string;
    imageUrls?: string[];
    description?: string;
    effects?: string[];
    weight?: number | string;
    weightUnit?: string;
    sku?: string;
    upc?: string;
    rawData?: Record<string, unknown>;
}

/** Parser result */
export interface ParseResult {
    success: boolean;
    totalRecords: number;
    parsedRecords: number;
    errorRecords: number;
    stagingDocs: StagingProduct[];
    errors: { externalId: string; error: string }[];
}

/** Merge result */
export interface MergeResult {
    success: boolean;
    newProducts: number;
    updatedProducts: number;
    unchangedProducts: number;
    errors: { externalId: string; error: string }[];
    dirtyProductIds: string[]; // IDs needing view rebuild
}

/** View build result */
export interface ViewBuildResult {
    success: boolean;
    viewsBuilt: number;
    errors: { productId: string; error: string }[];
}

// ============================================================================
// Parser Job
// ============================================================================

/**
 * Parse raw product data into staging documents
 * 
 * @param rawProducts - Raw product data from source
 * @param sourceId - Source configuration ID
 * @param sourceType - Type of data source
 * @param importId - Import record ID
 * @returns ParseResult with staging documents
 */
export function parseProducts(
    rawProducts: RawProductData[],
    sourceId: string,
    sourceType: DataSourceType,
    importId: string
): ParseResult {
    const stagingDocs: StagingProduct[] = [];
    const errors: { externalId: string; error: string }[] = [];

    for (const raw of rawProducts) {
        try {
            // Validate required fields
            if (!raw.externalId || !raw.name) {
                errors.push({
                    externalId: raw.externalId || 'unknown',
                    error: 'Missing required field: externalId or name'
                });
                continue;
            }

            // Parse and normalize product
            const staging: StagingProduct = {
                externalId: raw.externalId,
                sourceId,
                sourceType,
                importId,
                name: raw.name.trim(),
                brandName: raw.brandName?.trim(),
                category: normalizeCategory(raw.category),
                subcategory: raw.subcategory?.trim(),
                thc: parseNumber(raw.thc),
                thcUnit: raw.thc ? (typeof raw.thc === 'string' && raw.thc.includes('mg') ? 'mg' : 'percent') : undefined,
                cbd: parseNumber(raw.cbd),
                cbdUnit: raw.cbd ? (typeof raw.cbd === 'string' && raw.cbd.includes('mg') ? 'mg' : 'percent') : undefined,
                price: parseNumber(raw.price),
                priceUnit: raw.priceUnit,
                imageUrl: raw.imageUrl,
                imageUrls: raw.imageUrls,
                rawData: raw.rawData,
                parseDiagnostics: {
                    warnings: [],
                    normalized: true,
                    confidence: calculateConfidence(raw)
                },
                mergeState: 'pending',
                stagedAt: new Date() as any
            };

            // Add warnings for missing recommended fields
            if (!staging.category) {
                staging.parseDiagnostics!.warnings.push('Missing category');
            }
            if (!staging.price) {
                staging.parseDiagnostics!.warnings.push('Missing price');
            }
            if (!staging.imageUrl && (!staging.imageUrls || staging.imageUrls.length === 0)) {
                staging.parseDiagnostics!.warnings.push('Missing images');
            }

            stagingDocs.push(staging);
        } catch (error) {
            errors.push({
                externalId: raw.externalId || 'unknown',
                error: error instanceof Error ? error.message : 'Unknown parse error'
            });
        }
    }

    return {
        success: errors.length === 0,
        totalRecords: rawProducts.length,
        parsedRecords: stagingDocs.length,
        errorRecords: errors.length,
        stagingDocs,
        errors
    };
}

/**
 * Normalize category to standard values
 */
function normalizeCategory(category?: string): string | undefined {
    if (!category) return undefined;

    const normalized = category.toLowerCase().trim();
    const categoryMap: Record<string, string> = {
        'flower': 'flower',
        'flowers': 'flower',
        'pre-roll': 'prerolls',
        'preroll': 'prerolls',
        'prerolls': 'prerolls',
        'pre-rolls': 'prerolls',
        'vape': 'vapes',
        'vapes': 'vapes',
        'cartridge': 'vapes',
        'cartridges': 'vapes',
        'edible': 'edibles',
        'edibles': 'edibles',
        'gummy': 'edibles',
        'gummies': 'edibles',
        'concentrate': 'concentrates',
        'concentrates': 'concentrates',
        'extract': 'concentrates',
        'extracts': 'concentrates',
        'wax': 'concentrates',
        'shatter': 'concentrates',
        'tincture': 'tinctures',
        'tinctures': 'tinctures',
        'topical': 'topicals',
        'topicals': 'topicals',
        'accessory': 'accessories',
        'accessories': 'accessories'
    };

    return categoryMap[normalized] || 'other';
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
 * Calculate confidence score based on data completeness
 */
function calculateConfidence(raw: RawProductData): number {
    let score = 0;
    const weights = {
        name: 0.2,
        category: 0.15,
        price: 0.15,
        imageUrl: 0.1,
        description: 0.1,
        thc: 0.1,
        brandName: 0.1,
        effects: 0.1
    };

    if (raw.name) score += weights.name;
    if (raw.category) score += weights.category;
    if (raw.price) score += weights.price;
    if (raw.imageUrl || (raw.imageUrls && raw.imageUrls.length > 0)) score += weights.imageUrl;
    if (raw.description) score += weights.description;
    if (raw.thc) score += weights.thc;
    if (raw.brandName) score += weights.brandName;
    if (raw.effects && raw.effects.length > 0) score += weights.effects;

    return Math.round(score * 100) / 100;
}

// ============================================================================
// Merger Job
// ============================================================================

/**
 * Merge staging products into canonical catalog
 * 
 * @param stagingProducts - Parsed staging documents
 * @param existingMappings - Current product mappings for this source
 * @param tenantId - Tenant ID
 * @returns MergeResult with counts and dirty product IDs
 */
export function mergeProducts(
    stagingProducts: StagingProduct[],
    existingMappings: Map<string, ProductMapping>,
    tenantId: string
): MergeResult {
    const dirtyProductIds: string[] = [];
    const errors: { externalId: string; error: string }[] = [];
    let newProducts = 0;
    let updatedProducts = 0;
    let unchangedProducts = 0;

    const newMappings: ProductMapping[] = [];
    const updatedCatalogProducts: CatalogProduct[] = [];
    const newCatalogProducts: CatalogProduct[] = [];

    for (const staging of stagingProducts) {
        try {
            const mappingKey = `${staging.sourceType}:${staging.externalId}`;
            const existingMapping = existingMappings.get(mappingKey);

            if (existingMapping) {
                // Update existing product
                const productId = existingMapping.productId;
                const catalogProduct = createCatalogProductFromStaging(staging, productId, tenantId);
                updatedCatalogProducts.push(catalogProduct);
                dirtyProductIds.push(productId);
                updatedProducts++;
            } else {
                // Create new product
                const productId = generateProductId(tenantId, staging.externalId);
                const catalogProduct = createCatalogProductFromStaging(staging, productId, tenantId);
                newCatalogProducts.push(catalogProduct);
                dirtyProductIds.push(productId);

                // Create mapping
                const mapping: ProductMapping = {
                    id: generateMappingId(staging.sourceType, staging.externalId),
                    source: staging.sourceType,
                    externalId: staging.externalId,
                    productId,
                    confidence: staging.matchConfidence || 1.0,
                    method: staging.matchMethod || 'exact',
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any
                };
                newMappings.push(mapping);
                newProducts++;
            }
        } catch (error) {
            errors.push({
                externalId: staging.externalId,
                error: error instanceof Error ? error.message : 'Unknown merge error'
            });
        }
    }

    return {
        success: errors.length === 0,
        newProducts,
        updatedProducts,
        unchangedProducts,
        errors,
        dirtyProductIds
    };
}

/**
 * Create catalog product from staging data
 */
function createCatalogProductFromStaging(
    staging: StagingProduct,
    productId: string,
    tenantId: string
): CatalogProduct {
    const externalRefKey = `${staging.sourceType}:${staging.externalId}`;

    return {
        id: productId,
        tenantId,
        name: staging.name,
        brandName: staging.brandName,
        category: (staging.category as CatalogProduct['category']) || 'other',
        subcategory: staging.subcategory,
        strainType: undefined, // Would need to be inferred
        potency: buildPotency(staging),
        description: undefined,
        images: staging.imageUrl ? [{ url: staging.imageUrl, isPrimary: true }] :
            staging.imageUrls?.map((url, i) => ({ url, isPrimary: i === 0 })),
        externalRefs: { [externalRefKey]: true },
        isActive: true,
        isPublished: false,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
        lastImportedAt: new Date() as any
    };
}

/**
 * Build potency object from staging data
 */
function buildPotency(staging: StagingProduct): CatalogProduct['potency'] {
    if (!staging.thc && !staging.cbd) return undefined;

    return {
        thc: staging.thc ? { value: staging.thc, unit: staging.thcUnit || 'percent' } : undefined,
        cbd: staging.cbd ? { value: staging.cbd, unit: staging.cbdUnit || 'percent' } : undefined
    };
}

/**
 * Generate deterministic product ID
 */
function generateProductId(tenantId: string, externalId: string): string {
    const hash = createHash('sha256')
        .update(`${tenantId}:${externalId}`)
        .digest('hex')
        .slice(0, 20);
    return `prod_${hash}`;
}

/**
 * Generate deterministic mapping ID
 */
function generateMappingId(sourceType: DataSourceType, externalId: string): string {
    const hash = createHash('sha256')
        .update(`${sourceType}:${externalId}`)
        .digest('hex')
        .slice(0, 20);
    return `map_${hash}`;
}

// ============================================================================
// View Builder Job
// ============================================================================

/**
 * Build public views from catalog products
 * 
 * @param catalogProducts - Products to build views for
 * @returns ViewBuildResult
 */
export function buildPublicViews(catalogProducts: CatalogProduct[]): ViewBuildResult {
    const views: PublicProductView[] = [];
    const errors: { productId: string; error: string }[] = [];

    for (const product of catalogProducts) {
        try {
            const view: PublicProductView = {
                id: product.id,
                tenantId: product.tenantId,
                name: product.name,
                brandName: product.brandName,
                category: product.category,
                strainType: product.strainType,
                description: product.shortDescription || product.description,
                effects: undefined, // Would come from product
                flavors: undefined,
                thcPercent: product.potency?.thc?.unit === 'percent' ? product.potency.thc.value : undefined,
                cbdPercent: product.potency?.cbd?.unit === 'percent' ? product.potency.cbd.value : undefined,
                imageUrl: product.images?.[0]?.url,
                imageUrls: product.images?.map(i => i.url),
                // Pricing would come from prices subcollection
                price: undefined,
                originalPrice: undefined,
                currency: 'USD',
                isInStock: undefined, // Would come from inventory subcollection
                availableLocations: undefined,
                viewBuiltAt: new Date() as any,
                sourceProductUpdatedAt: product.updatedAt
            };

            views.push(view);
        } catch (error) {
            errors.push({
                productId: product.id,
                error: error instanceof Error ? error.message : 'Unknown view build error'
            });
        }
    }

    return {
        success: errors.length === 0,
        viewsBuilt: views.length,
        errors
    };
}

// ============================================================================
// Content Hash Utilities
// ============================================================================

/**
 * Generate content hash for idempotency checking
 */
export function generateContentHash(data: unknown): string {
    const serialized = JSON.stringify(data, Object.keys(data as object).sort());
    return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Check if import is duplicate based on content hash
 */
export function isDuplicateImport(contentHash: string, existingHashes: Set<string>): boolean {
    return existingHashes.has(contentHash);
}
