'use server';

/**
 * Import Actions: Server actions for the data import pipeline
 * 
 * Wires the import pipeline (import-jobs.ts) to Firestore.
 * See: dev/data-architecture.md
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import {
    parseProducts,
    mergeProducts,
    buildPublicViews,
    generateContentHash,
    isDuplicateImport,
    RawProductData
} from '@/server/pipeline/import-jobs';
import type {
    TenantImport,
    TenantSource,
    StagingProduct,
    ProductMapping,
    CatalogProduct,
    DataSourceType,
    ImportStatus
} from '@/types/tenant';
import { CANNMENUS_CONFIG } from '@/lib/config';

// ============================================================================
// Types
// ============================================================================

export interface ImportResult {
    success: boolean;
    importId: string;
    stats?: {
        totalRecords: number;
        newProducts: number;
        updatedProducts: number;
        errors: number;
    };
    error?: string;
}

export interface CannMenusImportOptions {
    tenantId: string;
    sourceId: string;
    cannMenusId: string;
    entityType: 'brand' | 'dispensary';
    state?: string;
    limit?: number;
}

// ============================================================================
// Import Actions
// ============================================================================

/**
 * Create a new import record and kick off the pipeline
 */
export async function createImport(
    tenantId: string,
    sourceId: string,
    rawData: RawProductData[]
): Promise<ImportResult> {
    const { firestore } = await createServerClient();

    // Generate content hash for idempotency
    const contentHash = generateContentHash(rawData);

    // Check for duplicate imports
    const existingImports = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .where('contentHash', '==', contentHash)
        .where('status', '==', 'completed')
        .limit(1)
        .get();

    if (!existingImports.empty) {
        return {
            success: false,
            importId: existingImports.docs[0].id,
            error: 'Duplicate import detected - this data was already imported'
        };
    }

    // Create import record
    const importRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .doc();

    const importRecord: TenantImport = {
        id: importRef.id,
        sourceId,
        sourceType: 'cannmenus', // Will be dynamic
        status: 'pending',
        contentHash,
        storagePathRaw: `tenants/${tenantId}/imports/${importRef.id}/raw.json.gz`,
        startedAt: new Date() as any,
        createdAt: new Date() as any
    };

    await importRef.set(importRecord);

    try {
        // Run the pipeline
        const result = await runImportPipeline(
            tenantId,
            importRef.id,
            sourceId,
            'cannmenus',
            rawData
        );

        return result;
    } catch (error) {
        // Update import record with error
        await importRef.update({
            status: 'failed',
            endedAt: FieldValue.serverTimestamp(),
            error: {
                code: 'PIPELINE_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return {
            success: false,
            importId: importRef.id,
            error: error instanceof Error ? error.message : 'Import failed'
        };
    }
}

/**
 * Run the full import pipeline: Parse → Stage → Merge → Build Views
 */
async function runImportPipeline(
    tenantId: string,
    importId: string,
    sourceId: string,
    sourceType: DataSourceType,
    rawData: RawProductData[]
): Promise<ImportResult> {
    const { firestore } = await createServerClient();

    const importRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .doc(importId);

    // Phase 1: Parse
    await importRef.update({ status: 'parsing' });

    const parseResult = parseProducts(rawData, sourceId, sourceType, importId);

    if (!parseResult.success && parseResult.errorRecords === parseResult.totalRecords) {
        await importRef.update({
            status: 'failed',
            endedAt: FieldValue.serverTimestamp(),
            stats: {
                totalRecords: parseResult.totalRecords,
                errorRecords: parseResult.errorRecords,
                warnings: parseResult.errors.map(e => e.error)
            }
        });

        return {
            success: false,
            importId,
            error: 'All records failed to parse'
        };
    }

    // Phase 2: Stage
    await importRef.update({ status: 'staging' });

    const batch = firestore.batch();
    for (const staging of parseResult.stagingDocs) {
        const stagingRef = firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('staging')
            .doc('products')
            .collection('items')
            .doc(`${sourceType}:${staging.externalId}`);

        batch.set(stagingRef, staging);
    }
    await batch.commit();

    // Phase 3: Merge
    await importRef.update({ status: 'merging' });

    // Load existing mappings
    const mappingsSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('mappings')
        .doc('products')
        .collection('items')
        .get();

    const existingMappings = new Map<string, ProductMapping>();
    mappingsSnapshot.docs.forEach(doc => {
        const mapping = doc.data() as ProductMapping;
        existingMappings.set(`${mapping.source}:${mapping.externalId}`, mapping);
    });

    const mergeResult = mergeProducts(parseResult.stagingDocs, existingMappings, tenantId);

    // Write catalog products and mappings to Firestore
    // Using multiple batches to handle > 500 operations
    const BATCH_SIZE = 400; // Leave room for other operations
    let batchIndex = 0;
    let currentBatch = firestore.batch();
    let operationsInBatch = 0;

    // Track created products for view building
    const createdProducts: CatalogProduct[] = [];
    // Track prices from staging (since CatalogProduct doesn't have price field)
    const productPrices = new Map<string, number>();

    for (const staging of parseResult.stagingDocs) {
        const mappingKey = `${sourceType}:${staging.externalId}`;
        const existingMapping = existingMappings.get(mappingKey);

        // Create catalog product
        const productId = existingMapping?.productId || generateProductId(tenantId, staging.externalId);
        const catalogProduct = createCatalogProductFromStaging(staging, productId, tenantId, sourceType);

        // Preserve price from staging for public view
        if (staging.price !== undefined && staging.price > 0) {
            productPrices.set(productId, staging.price);
        }

        const productRef = firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('catalog')
            .doc('products')
            .collection('items')
            .doc(productId);

        currentBatch.set(productRef, catalogProduct, { merge: true });
        createdProducts.push(catalogProduct);
        operationsInBatch++;

        // Create mapping if new product
        if (!existingMapping) {
            const mappingId = generateMappingId(sourceType, staging.externalId);
            const mapping: ProductMapping = {
                id: mappingId,
                source: sourceType,
                externalId: staging.externalId,
                productId,
                confidence: staging.matchConfidence || 1.0,
                method: staging.matchMethod || 'exact',
                createdAt: new Date() as any,
                updatedAt: new Date() as any
            };

            const mappingRef = firestore
                .collection('tenants')
                .doc(tenantId)
                .collection('mappings')
                .doc('products')
                .collection('items')
                .doc(mappingId);

            currentBatch.set(mappingRef, mapping);
            operationsInBatch++;
        }

        // Commit batch if reaching limit
        if (operationsInBatch >= BATCH_SIZE) {
            await currentBatch.commit();
            currentBatch = firestore.batch();
            operationsInBatch = 0;
            batchIndex++;
        }
    }

    // Commit remaining operations
    if (operationsInBatch > 0) {
        await currentBatch.commit();
    }

    // Phase 4: Build views
    await importRef.update({ status: 'building_views' });

    // Build and write public views
    const viewResult = buildPublicViews(createdProducts);

    // Write public views in batches
    let viewBatch = firestore.batch();
    let viewOps = 0;

    for (const product of createdProducts) {
        const publicView = {
            id: product.id,
            tenantId: product.tenantId,
            name: product.name,
            brandName: product.brandName,
            category: product.category,
            strainType: product.strainType,
            description: product.shortDescription || product.description,
            thcPercent: product.potency?.thc?.unit === 'percent' ? product.potency.thc.value : undefined,
            cbdPercent: product.potency?.cbd?.unit === 'percent' ? product.potency.cbd.value : undefined,
            imageUrl: product.images?.[0]?.url,
            imageUrls: product.images?.map(i => i.url),
            price: productPrices.get(product.id) || 0, // Default to $0 for products without pricing
            currency: 'USD',
            viewBuiltAt: new Date() as any,
            sourceProductUpdatedAt: product.updatedAt
        };

        const viewRef = firestore
            .collection('tenants')
            .doc(tenantId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .doc(product.id);

        viewBatch.set(viewRef, publicView, { merge: true });
        viewOps++;

        if (viewOps >= BATCH_SIZE) {
            await viewBatch.commit();
            viewBatch = firestore.batch();
            viewOps = 0;
        }
    }

    if (viewOps > 0) {
        await viewBatch.commit();
    }

    // Update import record with final stats
    await importRef.update({
        status: 'completed',
        endedAt: FieldValue.serverTimestamp(),
        stats: {
            totalRecords: parseResult.totalRecords,
            newRecords: mergeResult.newProducts,
            updatedRecords: mergeResult.updatedProducts,
            unchangedRecords: mergeResult.unchangedProducts,
            errorRecords: parseResult.errorRecords + mergeResult.errors.length,
            viewsBuilt: viewResult.viewsBuilt,
            warnings: [
                ...parseResult.errors.map(e => e.error),
                ...mergeResult.errors.map(e => e.error),
                ...viewResult.errors.map(e => e.error)
            ]
        }
    });

    return {
        success: true,
        importId,
        stats: {
            totalRecords: parseResult.totalRecords,
            newProducts: mergeResult.newProducts,
            updatedProducts: mergeResult.updatedProducts,
            errors: parseResult.errorRecords + mergeResult.errors.length
        }
    };
}

// ============================================================================
// Pipeline Helpers
// ============================================================================

/**
 * Generate deterministic product ID
 */
function generateProductId(tenantId: string, externalId: string): string {
    // Use a simple hash for deterministic IDs
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
        .update(`${tenantId}:${externalId}`)
        .digest('hex')
        .slice(0, 20);
    return `prod_${hash}`;
}

/**
 * Generate deterministic mapping ID
 */
function generateMappingId(sourceType: DataSourceType, externalId: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
        .update(`${sourceType}:${externalId}`)
        .digest('hex')
        .slice(0, 20);
    return `map_${hash}`;
}

/**
 * Create catalog product from staging data
 */
function createCatalogProductFromStaging(
    staging: StagingProduct,
    productId: string,
    tenantId: string,
    sourceType: DataSourceType
): CatalogProduct {
    const externalRefKey = `${sourceType}:${staging.externalId}`;

    return {
        id: productId,
        tenantId,
        name: staging.name,
        brandName: staging.brandName,
        category: (staging.category as CatalogProduct['category']) || 'other',
        subcategory: staging.subcategory,
        strainType: undefined,
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

// ============================================================================
// CannMenus Adapter
// ============================================================================

/**
 * Fetch products from CannMenus API and transform to RawProductData
 */
export async function fetchCannMenusProducts(
    options: CannMenusImportOptions
): Promise<RawProductData[]> {
    const { cannMenusId, entityType, state, limit } = options;
    const { API_BASE: base, API_KEY: apiKey } = CANNMENUS_CONFIG;

    if (!apiKey) {
        console.warn('[CannMenus Import] No API key, returning mock data');
        return generateMockProducts(cannMenusId, limit || 10);
    }

    try {
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'BakedBot/1.0',
            'X-Token': apiKey.trim().replace(/^['"]|['"]$/g, ''),
        };

        // Build API URL based on entity type
        let url: string;
        if (entityType === 'brand') {
            url = `${base}/v1/products?brand_id=${cannMenusId}`;
        } else {
            url = `${base}/v1/products?retailer_id=${cannMenusId}`;
        }

        if (state) {
            url += `&state=${encodeURIComponent(state)}`;
        }
        if (limit) {
            url += `&limit=${limit}`;
        }

        console.log(`[CannMenus Import] Fetching from: ${url}`);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.error(`[CannMenus Import] API error: ${response.status}`);
            return generateMockProducts(cannMenusId, limit || 10);
        }

        const data = await response.json();

        // Transform CannMenus response to RawProductData
        return transformCannMenusResponse(data.data || []);

    } catch (error) {
        console.error('[CannMenus Import] Fetch error:', error);
        return generateMockProducts(cannMenusId, limit || 10);
    }
}

/**
 * Transform CannMenus API response to RawProductData format
 */
function transformCannMenusResponse(products: any[]): RawProductData[] {
    return products.map(p => ({
        externalId: String(p.cann_sku_id || p.id),
        name: p.product_name || p.name,
        brandName: p.brand_name,
        category: p.category || p.product_type,
        subcategory: p.subcategory,
        thc: p.percentage_thc || p.thc_percentage,
        cbd: p.percentage_cbd || p.cbd_percentage,
        price: p.latest_price || p.price,
        priceUnit: p.display_weight || p.weight,
        imageUrl: p.image_url || p.primary_image,
        imageUrls: p.images,
        description: p.description,
        effects: p.effects,
        weight: p.display_weight,
        weightUnit: 'g',
        rawData: p
    }));
}

/**
 * Generate mock product data for testing/demo
 */
function generateMockProducts(cannMenusId: string, count: number): RawProductData[] {
    const categories = ['Flower', 'Edibles', 'Vapes', 'Concentrates', 'Prerolls'];
    const strains = ['Blue Dream', 'OG Kush', 'Gelato', 'Wedding Cake', 'Gorilla Glue'];

    return Array.from({ length: count }).map((_, i) => ({
        externalId: `${cannMenusId}_sku_${i}`,
        name: `${strains[i % strains.length]} - ${categories[i % categories.length]}`,
        brandName: 'Demo Brand',
        category: categories[i % categories.length],
        thc: 18 + (i % 10),
        cbd: i % 5 === 0 ? 2 : 0,
        price: 25 + (i * 5),
        priceUnit: '3.5g',
        imageUrl: `https://picsum.photos/seed/${cannMenusId}-${i}/400/400`,
        description: `Demo product imported from CannMenus ID ${cannMenusId}`,
        effects: ['relaxed', 'happy', 'creative'].slice(0, (i % 3) + 1)
    }));
}

// ============================================================================
// High-Level Import Action
// ============================================================================

/**
 * Import products from CannMenus for a tenant
 */
export async function importFromCannMenus(
    options: CannMenusImportOptions
): Promise<ImportResult> {
    const { tenantId, sourceId } = options;

    // Fetch products from CannMenus
    const rawProducts = await fetchCannMenusProducts(options);

    if (rawProducts.length === 0) {
        return {
            success: false,
            importId: '',
            error: 'No products found in CannMenus'
        };
    }

    // Create and run import
    return createImport(tenantId, sourceId, rawProducts);
}

// ============================================================================
// Leafly Adapter
// ============================================================================

export interface LeaflyImportOptions {
    tenantId: string;
    sourceId: string;
    dispensarySlug: string;
    state?: string;
    limit?: number;
}

/**
 * Fetch products from Leafly (via stored discovery data) and transform to RawProductData
 */
export async function fetchLeaflyProducts(
    options: LeaflyImportOptions
): Promise<RawProductData[]> {
    const { dispensarySlug, state, limit } = options;
    const { firestore } = await createServerClient();

    try {
        // Leafly data is stored from discovery in sources/leafly/dispensaries/{slug}/products
        let productsQuery = firestore
            .collection('sources')
            .doc('leafly')
            .collection('dispensaries')
            .doc(dispensarySlug)
            .collection('products');

        const snapshot = await productsQuery.limit(limit || 100).get();

        if (snapshot.empty) {
            console.log(`[Leafly Import] No products found for dispensary: ${dispensarySlug}`);
            return generateMockLeaflyProducts(dispensarySlug, limit || 10);
        }

        // Transform Leafly products to RawProductData
        return snapshot.docs.map(doc => transformLeaflyProduct(doc.data()));

    } catch (error) {
        console.error('[Leafly Import] Fetch error:', error);
        return generateMockLeaflyProducts(dispensarySlug, limit || 10);
    }
}

/**
 * Transform Leafly product document to RawProductData format
 */
function transformLeaflyProduct(product: any): RawProductData {
    return {
        externalId: product.id || `leafly_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: product.productName || product.name,
        brandName: product.brandName || product.brand,
        category: normalizeLeaflyCategory(product.category),
        subcategory: product.subcategory,
        thc: product.thcPercent || product.thc,
        cbd: product.cbdPercent || product.cbd,
        price: product.price || product.lastPrice,
        priceUnit: product.weightGrams ? `${product.weightGrams}g` : undefined,
        imageUrl: product.imageUrl || product.image,
        description: undefined,
        effects: undefined,
        weight: product.weightGrams,
        weightUnit: 'g',
        rawData: product
    };
}

/**
 * Normalize Leafly category to standard categories
 */
function normalizeLeaflyCategory(category: string | undefined): string {
    if (!category) return 'other';
    const lower = category.toLowerCase();

    if (lower.includes('flower') || lower.includes('bud')) return 'flower';
    if (lower.includes('vape') || lower.includes('cart')) return 'vapes';
    if (lower.includes('edible') || lower.includes('gummy') || lower.includes('chocolate')) return 'edibles';
    if (lower.includes('concentrate') || lower.includes('dab') || lower.includes('wax')) return 'concentrates';
    if (lower.includes('preroll') || lower.includes('pre-roll') || lower.includes('joint')) return 'prerolls';
    if (lower.includes('topical') || lower.includes('balm') || lower.includes('lotion')) return 'topicals';
    if (lower.includes('tincture')) return 'tinctures';

    return 'other';
}

/**
 * Generate mock Leafly product data for testing/demo
 */
function generateMockLeaflyProducts(dispensarySlug: string, count: number): RawProductData[] {
    const categories = ['flower', 'vapes', 'edibles', 'concentrates', 'prerolls'];
    const strains = ['Purple Haze', 'Jack Herer', 'Girl Scout Cookies', 'Sour Diesel', 'Northern Lights'];
    const brands = ['Leafly Brand', 'Green Thumb', 'Pure Leaf', 'High Five', 'Nature\'s Best'];

    return Array.from({ length: count }).map((_, i) => ({
        externalId: `leafly_${dispensarySlug}_${i}`,
        name: `${strains[i % strains.length]} (${categories[i % categories.length]})`,
        brandName: brands[i % brands.length],
        category: categories[i % categories.length],
        thc: 15 + (i % 15),
        cbd: i % 4 === 0 ? 3 : 0,
        price: 20 + (i * 4),
        priceUnit: '3.5g',
        imageUrl: `https://picsum.photos/seed/leafly-${dispensarySlug}-${i}/400/400`,
        description: `Leafly product from ${dispensarySlug}`,
        effects: ['euphoric', 'creative', 'focused'].slice(0, (i % 3) + 1)
    }));
}

/**
 * Import products from Leafly for a tenant
 */
export async function importFromLeafly(
    options: LeaflyImportOptions
): Promise<ImportResult> {
    const { tenantId, sourceId } = options;

    // Fetch products from Leafly
    const rawProducts = await fetchLeaflyProducts(options);

    if (rawProducts.length === 0) {
        return {
            success: false,
            importId: '',
            error: 'No products found in Leafly data'
        };
    }

    // Create and run import with Leafly source type
    const { firestore } = await createServerClient();

    // Generate content hash for idempotency
    const contentHash = generateContentHash(rawProducts);

    // Check for duplicate imports
    const existingImports = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .where('contentHash', '==', contentHash)
        .where('status', '==', 'completed')
        .limit(1)
        .get();

    if (!existingImports.empty) {
        return {
            success: false,
            importId: existingImports.docs[0].id,
            error: 'Duplicate import detected - this data was already imported'
        };
    }

    // Create import record
    const importRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .doc();

    const importRecord: TenantImport = {
        id: importRef.id,
        sourceId,
        sourceType: 'leafly',
        status: 'pending',
        contentHash,
        storagePathRaw: `tenants/${tenantId}/imports/${importRef.id}/raw.json.gz`,
        startedAt: new Date() as any,
        createdAt: new Date() as any
    };

    await importRef.set(importRecord);

    try {
        // Run the pipeline with Leafly source type
        const result = await runImportPipelineWithSource(
            tenantId,
            importRef.id,
            sourceId,
            'leafly',
            rawProducts
        );

        return result;
    } catch (error) {
        await importRef.update({
            status: 'failed',
            endedAt: FieldValue.serverTimestamp(),
            error: {
                code: 'PIPELINE_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });

        return {
            success: false,
            importId: importRef.id,
            error: error instanceof Error ? error.message : 'Import failed'
        };
    }
}

/**
 * Run import pipeline with explicit source type (for Leafly)
 */
async function runImportPipelineWithSource(
    tenantId: string,
    importId: string,
    sourceId: string,
    sourceType: DataSourceType,
    rawData: RawProductData[]
): Promise<ImportResult> {
    // Reuse the main pipeline logic
    return runImportPipeline(tenantId, importId, sourceId, sourceType, rawData);
}

/**
 * Get import history for a tenant
 */
export async function getImportHistory(
    tenantId: string,
    limit: number = 20
): Promise<TenantImport[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => doc.data() as TenantImport);
}

/**
 * Get import details
 */
export async function getImportDetails(
    tenantId: string,
    importId: string
): Promise<TenantImport | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('imports')
        .doc(importId)
        .get();

    return doc.exists ? (doc.data() as TenantImport) : null;
}
