'use server';

import { createServerClient } from '@/firebase/server-client';
import { DutchieClient } from '@/lib/pos/adapters/dutchie';
import { ALLeavesClient, type ALLeavesConfig, type ALLeavesDiscount } from '@/lib/pos/adapters/alleaves';
import { createImport } from './import-actions';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

/**
 * Syncs products from a configured POS system for a specific location.
 * 
 * @param locationId - The Firestore location ID
 * @param orgId - The Firestore organization/tenant ID
 * @returns Number of products synced
 */
export async function syncPOSProducts(locationId: string, orgId: string) {
    const { firestore } = await createServerClient();
    
    logger.info('[POS_SYNC] Starting sync for location', { locationId, orgId });

    // 1. Fetch Location POS Config
    const locationDoc = await firestore.collection('locations').doc(locationId).get();
    if (!locationDoc.exists) {
        logger.error('[POS_SYNC] Location not found', { locationId });
        throw new Error('Location not found');
    }
    
    const data = locationDoc.data();
    const posConfig = data?.posConfig;
    
    if (!posConfig || posConfig.provider === 'none' || posConfig.status !== 'active') {
        logger.warn('[POS_SYNC] No active POS configuration found', { locationId });
        return 0;
    }

    // 2. Initialize the appropriate POS Client
    let client;
    if (posConfig.provider === 'dutchie') {
        client = new DutchieClient({
            apiKey: posConfig.apiKey,
            storeId: posConfig.dispensaryId || posConfig.storeId,
        });
    } else if (posConfig.provider === 'alleaves') {
        // Alleaves configuration - supports both Bearer token and Basic Auth
        const alleavesConfig: ALLeavesConfig = {
            // Try API key first (Bearer), fallback to username/password (Basic Auth)
            apiKey: posConfig.apiKey,
            username: posConfig.username || process.env.ALLEAVES_USERNAME,
            password: posConfig.password || process.env.ALLEAVES_PASSWORD,
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        logger.info('[POS_SYNC] Initializing Alleaves client', {
            locationId: alleavesConfig.locationId,
            authMethod: alleavesConfig.apiKey ? 'bearer' : (alleavesConfig.username ? 'basic' : 'none'),
            hasUsername: !!alleavesConfig.username,
            hasPassword: !!alleavesConfig.password,
            hasPin: !!alleavesConfig.pin,
            hasPartnerId: !!alleavesConfig.partnerId,
        });

        client = new ALLeavesClient(alleavesConfig);
    } else {
        logger.warn('[POS_SYNC] Unsupported POS provider', { provider: posConfig.provider });
        return 0;
    }

    try {
        // 3. Fetch Menu from POS
        const posProducts = await client.fetchMenu();
        
        if (posProducts.length === 0) {
            logger.info('[POS_SYNC] No products found in POS', { locationId });
            return 0;
        }

        // 4. Transform POS Products to RawProductData format for the import pipeline
        const rawProducts = posProducts.map(p => ({
            externalId: p.externalId,
            name: p.name,
            brandName: p.brand,
            category: p.category,
            price: p.price,
            thc: p.thcPercent,
            cbd: p.cbdPercent,
            imageUrl: p.imageUrl,
            rawData: p.rawData
        }));

        // 5. Trigger the standard import pipeline
        const sourceId = `pos_${posConfig.provider}_${locationId}`;
        const result = await createImport(orgId, sourceId, rawProducts);

        if (!result.success && !result.importId) {
            logger.error('[POS_SYNC] Import pipeline failed', { error: result.error });
            throw new Error(result.error);
        }

        // 6. Write COGS (cost) fields separately — import pipeline doesn't carry cost data.
        // Product doc IDs are deterministic: prod_{sha256(orgId:externalId).slice(0,20)}
        const productsWithCost = posProducts.filter(p => p.cost != null);
        if (productsWithCost.length > 0) {
            logger.info('[POS_SYNC] Writing COGS to tenant catalog', { count: productsWithCost.length, orgId });
            const COST_BATCH_SIZE = 400;
            let costBatch = firestore.batch();
            let costOps = 0;
            let totalCostWritten = 0;

            for (const p of productsWithCost) {
                if (!p.externalId) continue;
                const docId = `prod_${createHash('sha256').update(`${orgId}:${p.externalId}`).digest('hex').slice(0, 20)}`;
                const viewRef = firestore
                    .collection('tenants')
                    .doc(orgId)
                    .collection('publicViews')
                    .doc('products')
                    .collection('items')
                    .doc(docId);

                // Use set+merge so the update is a no-op if the doc doesn't exist yet
                costBatch.set(viewRef, { cost: p.cost }, { merge: true });
                costOps++;
                totalCostWritten++;

                if (costOps >= COST_BATCH_SIZE) {
                    await costBatch.commit();
                    costBatch = firestore.batch();
                    costOps = 0;
                }
            }

            if (costOps > 0) {
                await costBatch.commit();
            }

            logger.info('[POS_SYNC] COGS write complete', { totalCostWritten, orgId });
        }

        logger.info('[POS_SYNC] Sync completed successfully', {
            locationId,
            count: result.stats?.totalRecords
        });

        return result.stats?.totalRecords || 0;
    } catch (error) {
        logger.error('[POS_SYNC] Sync failed', { error });
        throw error;
    }
}

/**
 * Syncs discounts from POS and updates publicViews products with sale badges.
 *
 * @param orgId - The tenant organization ID (e.g., 'org_thrive_syracuse')
 * @returns Summary of products updated with sale info
 */
export async function syncPOSDiscounts(orgId: string): Promise<{
    success: boolean;
    discountsFound: number;
    productsUpdated: number;
    error?: string;
}> {
    const { firestore } = await createServerClient();

    logger.info('[POS_SYNC_DISCOUNTS] Starting discount sync', { orgId });

    try {
        // 1. Find location with Alleaves POS config for this org
        const locationsSnapshot = await firestore
            .collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnapshot.empty) {
            // Try to find by direct brand reference
            const brandDoc = await firestore.collection('brands').doc(orgId.replace('org_', '')).get();
            if (!brandDoc.exists) {
                return { success: false, discountsFound: 0, productsUpdated: 0, error: 'No location found for org' };
            }
        }

        // Get POS config - check for Alleaves
        let posConfig: Record<string, unknown> | undefined;
        let locationId: string | undefined;

        if (!locationsSnapshot.empty) {
            const locationDoc = locationsSnapshot.docs[0];
            locationId = locationDoc.id;
            posConfig = locationDoc.data()?.posConfig;
        }

        // Fallback: check tenant document for POS config
        if (!posConfig) {
            const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
            if (tenantDoc.exists) {
                posConfig = tenantDoc.data()?.posConfig;
            }
        }

        // For Thrive Syracuse, use environment variables directly
        if (!posConfig && orgId === 'org_thrive_syracuse') {
            posConfig = {
                provider: 'alleaves',
                username: process.env.ALLEAVES_USERNAME,
                password: process.env.ALLEAVES_PASSWORD,
                pin: process.env.ALLEAVES_PIN,
                locationId: process.env.ALLEAVES_LOCATION_ID || '1',
            };
        }

        if (!posConfig || posConfig.provider !== 'alleaves') {
            logger.info('[POS_SYNC_DISCOUNTS] No Alleaves POS config found', { orgId });
            return { success: true, discountsFound: 0, productsUpdated: 0 };
        }

        // 2. Initialize Alleaves client
        const alleavesConfig: ALLeavesConfig = {
            username: (posConfig.username as string) || process.env.ALLEAVES_USERNAME || '',
            password: (posConfig.password as string) || process.env.ALLEAVES_PASSWORD || '',
            pin: (posConfig.pin as string) || process.env.ALLEAVES_PIN,
            storeId: (posConfig.storeId as string) || (posConfig.locationId as string) || '1',
            locationId: (posConfig.locationId as string) || (posConfig.storeId as string) || '1',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // 3. Fetch discounts from Alleaves
        const discounts = await client.getDiscounts();
        logger.info('[POS_SYNC_DISCOUNTS] Fetched discounts', {
            orgId,
            count: discounts.length,
            discountNames: discounts.map(d => d.name),
        });

        if (discounts.length === 0) {
            return { success: true, discountsFound: 0, productsUpdated: 0 };
        }

        // 4. Build lookup maps for efficient product matching
        const productDiscounts = new Map<string, ALLeavesDiscount>();
        const categoryDiscounts = new Map<string, ALLeavesDiscount>();
        const brandDiscounts = new Map<string, ALLeavesDiscount>();

        // Sort by priority (higher first)
        const sortedDiscounts = [...discounts].sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const discount of sortedDiscounts) {
            if (discount.conditions?.products) {
                for (const productId of discount.conditions.products) {
                    const key = productId.toString();
                    if (!productDiscounts.has(key)) {
                        productDiscounts.set(key, discount);
                    }
                }
            }
            if (discount.conditions?.categories) {
                for (const category of discount.conditions.categories) {
                    const key = category.toLowerCase();
                    if (!categoryDiscounts.has(key)) {
                        categoryDiscounts.set(key, discount);
                    }
                }
            }
            if (discount.conditions?.brands) {
                for (const brand of discount.conditions.brands) {
                    const key = brand.toLowerCase();
                    if (!brandDiscounts.has(key)) {
                        brandDiscounts.set(key, discount);
                    }
                }
            }
        }

        // 5. Fetch all publicView products for this tenant
        const productsRef = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items');

        const productsSnapshot = await productsRef.get();
        logger.info('[POS_SYNC_DISCOUNTS] Fetched products', { count: productsSnapshot.size });

        // 6. Update products with sale info
        const batch = firestore.batch();
        let updatedCount = 0;

        for (const productDoc of productsSnapshot.docs) {
            const product = productDoc.data();
            const externalId = product.externalId || productDoc.id;
            const category = (product.category || '').toLowerCase();
            const brand = (product.brandName || '').toLowerCase();

            // Find applicable discount
            const discount =
                productDiscounts.get(externalId) ||
                categoryDiscounts.get(category) ||
                brandDiscounts.get(brand);

            if (discount) {
                // Calculate sale price
                const originalPrice = product.price || 0;
                let salePrice = originalPrice;

                if (discount.discount_type === 'percent') {
                    salePrice = originalPrice * (1 - discount.discount_value / 100);
                } else if (discount.discount_type === 'amount') {
                    salePrice = Math.max(0, originalPrice - discount.discount_value);
                } else if (discount.discount_type === 'fixed_price') {
                    salePrice = discount.discount_value;
                }

                salePrice = Math.round(salePrice * 100) / 100;

                // Generate badge text
                const saleBadgeText = discount.badge_text ||
                    (discount.discount_type === 'percent' ? `${discount.discount_value}% OFF` :
                     discount.discount_type === 'bogo' ? 'BOGO' :
                     `$${discount.discount_value} OFF`);

                // Update product
                batch.update(productDoc.ref, {
                    isOnSale: true,
                    originalPrice,
                    salePrice,
                    price: salePrice, // Update price to sale price
                    saleBadgeText,
                    discountId: discount.id_discount.toString(),
                    saleEndsAt: discount.end_date ? new Date(discount.end_date) : null,
                    lastDiscountSyncAt: FieldValue.serverTimestamp(),
                });

                updatedCount++;
            } else if (product.isOnSale) {
                // Clear sale info if no longer on sale
                batch.update(productDoc.ref, {
                    isOnSale: false,
                    originalPrice: FieldValue.delete(),
                    salePrice: FieldValue.delete(),
                    saleBadgeText: FieldValue.delete(),
                    discountId: FieldValue.delete(),
                    saleEndsAt: FieldValue.delete(),
                    lastDiscountSyncAt: FieldValue.serverTimestamp(),
                });
            }
        }

        // Commit batch
        await batch.commit();

        logger.info('[POS_SYNC_DISCOUNTS] Discount sync completed', {
            orgId,
            discountsFound: discounts.length,
            productsUpdated: updatedCount,
        });

        return {
            success: true,
            discountsFound: discounts.length,
            productsUpdated: updatedCount,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[POS_SYNC_DISCOUNTS] Sync failed', { orgId, error: errorMessage });
        return {
            success: false,
            discountsFound: 0,
            productsUpdated: 0,
            error: errorMessage,
        };
    }
}

/**
 * Get expiring inventory batches for clearance bundle suggestions.
 *
 * @param orgId - The tenant organization ID
 * @param daysThreshold - Products expiring within this many days (default: 30)
 * @returns Array of expiring products with batch info
 */
export async function getExpiringInventory(orgId: string, daysThreshold: number = 30): Promise<{
    success: boolean;
    expiringProducts: Array<{
        id_batch: number;
        id_item: number;
        item_name: string;
        days_until_expiry: number;
        quantity: number;
    }>;
    error?: string;
}> {
    logger.info('[POS_EXPIRING] Fetching expiring inventory', { orgId, daysThreshold });

    try {
        // Initialize Alleaves client (same pattern as syncPOSDiscounts)
        const alleavesConfig: ALLeavesConfig = {
            username: process.env.ALLEAVES_USERNAME || '',
            password: process.env.ALLEAVES_PASSWORD || '',
            pin: process.env.ALLEAVES_PIN,
            storeId: process.env.ALLEAVES_LOCATION_ID || '1',
            locationId: process.env.ALLEAVES_LOCATION_ID || '1',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // Search for batches expiring within threshold
        const expiringBatches = await client.searchBatches({
            expiringWithinDays: daysThreshold,
            minQuantity: 1,
        });

        logger.info('[POS_EXPIRING] Found expiring batches', {
            orgId,
            count: expiringBatches.length,
        });

        return {
            success: true,
            expiringProducts: expiringBatches.filter(b => b.days_until_expiry !== undefined) as Array<{
                id_batch: number;
                id_item: number;
                item_name: string;
                days_until_expiry: number;
                quantity: number;
            }>,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[POS_EXPIRING] Failed to fetch expiring inventory', { orgId, error: errorMessage });
        return {
            success: false,
            expiringProducts: [],
            error: errorMessage,
        };
    }
}

/**
 * Sync metadata (brands, categories, vendors) from POS for filter UIs.
 * Caches in Firestore for fast access.
 *
 * @param orgId - The tenant organization ID
 * @returns Summary of synced metadata
 */
export async function syncPOSMetadata(orgId: string): Promise<{
    success: boolean;
    brands: number;
    categories: number;
    vendors: number;
    error?: string;
}> {
    const { firestore } = await createServerClient();

    logger.info('[POS_METADATA] Starting metadata sync', { orgId });

    try {
        // Initialize Alleaves client
        const alleavesConfig: ALLeavesConfig = {
            username: process.env.ALLEAVES_USERNAME || '',
            password: process.env.ALLEAVES_PASSWORD || '',
            pin: process.env.ALLEAVES_PIN,
            storeId: process.env.ALLEAVES_LOCATION_ID || '1',
            locationId: process.env.ALLEAVES_LOCATION_ID || '1',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // Fetch all metadata in parallel
        const metadata = await client.getAllMetadata();

        // Store in tenant's metadata collection
        const metadataRef = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('metadata');

        // Update brands
        await metadataRef.doc('brands').set({
            items: metadata.brands,
            count: metadata.brands.length,
            updatedAt: FieldValue.serverTimestamp(),
            source: 'alleaves',
        });

        // Update categories
        await metadataRef.doc('categories').set({
            items: metadata.categories,
            count: metadata.categories.length,
            updatedAt: FieldValue.serverTimestamp(),
            source: 'alleaves',
        });

        // Update vendors
        await metadataRef.doc('vendors').set({
            items: metadata.vendors,
            count: metadata.vendors.length,
            updatedAt: FieldValue.serverTimestamp(),
            source: 'alleaves',
        });

        // Update location info if available
        if (metadata.location) {
            await metadataRef.doc('location').set({
                ...metadata.location,
                updatedAt: FieldValue.serverTimestamp(),
                source: 'alleaves',
            });
        }

        logger.info('[POS_METADATA] Metadata sync completed', {
            orgId,
            brands: metadata.brands.length,
            categories: metadata.categories.length,
            vendors: metadata.vendors.length,
            hasLocation: !!metadata.location,
        });

        return {
            success: true,
            brands: metadata.brands.length,
            categories: metadata.categories.length,
            vendors: metadata.vendors.length,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[POS_METADATA] Sync failed', { orgId, error: errorMessage });
        return {
            success: false,
            brands: 0,
            categories: 0,
            vendors: 0,
            error: errorMessage,
        };
    }
}

/**
 * Get cached metadata for filter UIs.
 * Returns data from Firestore cache, not live from POS.
 *
 * @param orgId - The tenant organization ID
 * @returns Cached metadata
 */
export async function getCachedMetadata(orgId: string): Promise<{
    brands: Array<{ id: string; name: string; productCount?: number }>;
    categories: Array<{ id: string; name: string; productCount?: number }>;
    vendors: Array<{ id: string; name: string }>;
    location: { id: string; name: string; licenseNumber?: string; timezone?: string } | null;
    lastUpdated: Date | null;
}> {
    const { firestore } = await createServerClient();

    try {
        const metadataRef = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('metadata');

        const [brandsDoc, categoriesDoc, vendorsDoc, locationDoc] = await Promise.all([
            metadataRef.doc('brands').get(),
            metadataRef.doc('categories').get(),
            metadataRef.doc('vendors').get(),
            metadataRef.doc('location').get(),
        ]);

        const brands = brandsDoc.exists ? brandsDoc.data()?.items || [] : [];
        const categories = categoriesDoc.exists ? categoriesDoc.data()?.items || [] : [];
        const vendors = vendorsDoc.exists ? vendorsDoc.data()?.items || [] : [];

        let location = null;
        if (locationDoc.exists) {
            const locData = locationDoc.data();
            location = {
                id: locData?.id,
                name: locData?.name,
                licenseNumber: locData?.licenseNumber,
                timezone: locData?.timezone,
            };
        }

        // Get most recent update time
        const timestamps = [
            brandsDoc.data()?.updatedAt,
            categoriesDoc.data()?.updatedAt,
            locationDoc.data()?.updatedAt,
        ].filter(Boolean);

        let lastUpdated = null;
        if (timestamps.length > 0) {
            const mostRecent = timestamps.reduce((a, b) =>
                (a as Timestamp).toMillis() > (b as Timestamp).toMillis() ? a : b
            ) as Timestamp;
            lastUpdated = mostRecent.toDate();
        }

        return { brands, categories, vendors, location, lastUpdated };
    } catch (error) {
        logger.error('[POS_METADATA] Failed to get cached metadata', { orgId, error });
        return {
            brands: [],
            categories: [],
            vendors: [],
            location: null,
            lastUpdated: null,
        };
    }
}
