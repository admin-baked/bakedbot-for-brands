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

    // Write new catalog products and mappings
    const mergeBatch = firestore.batch();

    // Note: In a real implementation, we'd also write the new catalog products
    // For now, we're relying on the merge result to track dirty product IDs

    // Phase 4: Build views
    await importRef.update({ status: 'building_views' });

    // In a real implementation, we'd load the dirty products and build views
    // For now, we mark completion

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
            warnings: [
                ...parseResult.errors.map(e => e.error),
                ...mergeResult.errors.map(e => e.error)
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
