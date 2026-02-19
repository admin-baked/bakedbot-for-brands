'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { makeProductRepo } from '@/server/repos/productRepo';
import { logger } from '@/lib/logger';
import { CannMenusService } from '@/server/services/cannmenus';
import { normalizeCategoryName } from '@/lib/utils/product-image';

export interface MenuData {
    products: any[];
    source: 'pos' | 'cannmenus' | 'manual' | 'none';
    lastSyncedAt: string | null;
}

export interface PosConfigInfo {
    provider: string | null;
    status: string | null;
    displayName: string;
    lastSyncCount: number | null;   // POS product count from last sync (source of truth)
    lastSyncedAt: string | null;    // ISO timestamp of last successful sync
}

/**
 * Resolve the location document for a user, with proper fallback logic.
 * Tries: locationId doc → orgId query → brandId query
 */
async function resolveLocation(
    firestore: FirebaseFirestore.Firestore,
    locationId: string | undefined,
    orgId: string | undefined,
    tag: string
): Promise<{ locationId: string | undefined; locationData: any }> {
    let resolvedLocationId = locationId;
    let locationData: any = null;

    // 1. Try locationId as document ID first
    if (resolvedLocationId) {
        const locDoc = await firestore.collection('locations').doc(resolvedLocationId).get();
        if (locDoc.exists) {
            locationData = locDoc.data();
            logger.info(`[${tag}] Found location by ID`, { locationId: resolvedLocationId });
            return { locationId: resolvedLocationId, locationData };
        }
        // Document doesn't exist - fall through to orgId query
        logger.info(`[${tag}] Location ID not found as document, trying orgId`, { locationId: resolvedLocationId, orgId });
    }

    // 2. Query by orgId
    if (orgId) {
        let locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get();
        if (locSnap.empty) {
            locSnap = await firestore.collection('locations').where('brandId', '==', orgId).limit(1).get();
        }
        if (!locSnap.empty) {
            resolvedLocationId = locSnap.docs[0].id;
            locationData = locSnap.docs[0].data();
            logger.info(`[${tag}] Found location by orgId`, { locationId: resolvedLocationId, orgId });
            return { locationId: resolvedLocationId, locationData };
        }
    }

    // 3. Nothing found
    logger.info(`[${tag}] No location found`, { locationId, orgId });
    return { locationId: resolvedLocationId, locationData: null };
}

/**
 * Resolve the user's orgId from claims, falling back to their Firestore profile.
 * Claims can be stale if they weren't refreshed after an admin update.
 */
async function resolveOrgId(
    firestore: FirebaseFirestore.Firestore,
    user: { uid: string; locationId?: string; [key: string]: any }
): Promise<string | undefined> {
    // 1. Try claims first
    const fromClaims = user.orgId || user.currentOrgId || user.locationId;
    if (fromClaims) return fromClaims;

    // 2. Fallback: check Firestore user profile
    try {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const fromProfile = data?.orgId || data?.currentOrgId || data?.locationId || data?.dispensaryId;
            if (fromProfile) {
                logger.info('[RESOLVE_ORG] Found orgId from user profile', { uid: user.uid, orgId: fromProfile });
                return fromProfile;
            }
        }
    } catch (e) {
        logger.warn('[RESOLVE_ORG] Failed to read user profile', { uid: user.uid });
    }

    return undefined;
}

/**
 * Get POS configuration info for the current user's location
 */
export async function getPosConfig(): Promise<PosConfigInfo> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        const orgId = await resolveOrgId(firestore, user as any);
        logger.info('[GET_POS_CONFIG] Called', { locationId: user.locationId, orgId, role: user.role });

        const { locationId, locationData } = await resolveLocation(firestore, user.locationId, orgId, 'GET_POS_CONFIG');

        if (!locationId || !locationData) {
            return { provider: null, status: null, displayName: 'POS', lastSyncCount: null, lastSyncedAt: null };
        }

        const posConfig = locationData.posConfig;
        logger.info('[GET_POS_CONFIG] Location data', {
            locationId,
            hasPosConfig: !!posConfig,
            provider: posConfig?.provider,
            status: posConfig?.status
        });

        if (!posConfig) {
            return { provider: null, status: null, displayName: 'POS', lastSyncCount: null, lastSyncedAt: null };
        }

        // Map provider to display name
        const displayNames: Record<string, string> = {
            'dutchie': 'Dutchie',
            'alleaves': 'Alleaves',
            'treez': 'Treez',
            'jane': 'Jane',
        };

        // Normalize syncedAt to ISO string
        const rawSyncedAt = posConfig.syncedAt;
        let lastSyncedAt: string | null = null;
        if (rawSyncedAt) {
            if (typeof rawSyncedAt === 'string') lastSyncedAt = rawSyncedAt;
            else if (rawSyncedAt.toDate) lastSyncedAt = rawSyncedAt.toDate().toISOString();
            else if (rawSyncedAt._seconds) lastSyncedAt = new Date(rawSyncedAt._seconds * 1000).toISOString();
        }

        return {
            provider: posConfig.provider || null,
            status: posConfig.status || null,
            displayName: displayNames[posConfig.provider] || posConfig.provider || 'POS',
            lastSyncCount: posConfig.lastSyncCount ?? null,
            lastSyncedAt,
        };
    } catch (error) {
        logger.error('[GET_POS_CONFIG] Failed:', error instanceof Error ? error : new Error(String(error)));
        return { provider: null, status: null, displayName: 'POS', lastSyncCount: null, lastSyncedAt: null };
    }
}

/**
 * Triggers a sync with the connected POS (Dutchie or Alleaves).
 * Upserts products into the 'products' collection.
 */
export async function syncMenu(): Promise<{ success: boolean; count?: number; error?: string; provider?: string; removed?: number }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        const orgId = await resolveOrgId(firestore, user as any);

        // 1. Resolve Location with proper fallback
        const { locationId, locationData } = await resolveLocation(firestore, user.locationId, orgId, 'SYNC_MENU');

        if (!locationId || !locationData) {
            return { success: false, error: 'Location not found. User does not have a valid location linked.' };
        }

        const posConfig = locationData.posConfig;
        if (!posConfig || !posConfig.provider) {
            return { success: false, error: 'No POS integration configured for this location.' };
        }

        const provider = posConfig.provider;
        let items;

        // 3. Fetch from appropriate POS based on provider
        if (provider === 'dutchie') {
            const { DutchieClient } = await import('@/lib/pos/adapters/dutchie');
            const client = new DutchieClient(posConfig);
            try {
                items = await client.fetchMenu();
            } catch (e: any) {
                return { success: false, error: `Dutchie Sync Failed: ${e.message}`, provider };
            }
        } else if (provider === 'alleaves') {
            const { ALLeavesClient } = await import('@/lib/pos/adapters/alleaves');
            const alleavesConfig = {
                ...posConfig,
                username: posConfig.username || process.env.ALLEAVES_USERNAME,
                password: posConfig.password || process.env.ALLEAVES_PASSWORD,
                pin: posConfig.pin || process.env.ALLEAVES_PIN,
                locationId: posConfig.locationId || posConfig.storeId,
            };
            const client = new ALLeavesClient(alleavesConfig);
            try {
                items = await client.fetchMenu();
            } catch (e: any) {
                return { success: false, error: `Alleaves Sync Failed: ${e.message}`, provider };
            }
        } else {
            return { success: false, error: `Unsupported POS provider: ${provider}` };
        }

        if (!items || items.length === 0) {
            return { success: true, count: 0, provider };
        }

        // 4. Map & Upsert
        const productRepo = makeProductRepo(firestore);
        const now = new Date();

        // Build set of external IDs returned by POS this sync
        const syncedExternalIds = new Set(items.map(item => item.externalId));

        let count = 0;
        let batch = firestore.batch();

        for (const item of items) {
             // Create a deterministic ID: locationId_externalId
             const docId = `${locationId}_${item.externalId}`;
             const ref = productRepo.getRef(docId);

             const productData = {
                 id: docId,
                 name: item.name,
                 brandId: user.brandId || '',
                 brandName: item.brand,
                 dispensaryId: locationId,
                 category: normalizeCategoryName(item.category),
                 description: '',
                 imageUrl: item.imageUrl || '',

                 price: item.price,
                 originalPrice: item.price,
                 currency: 'USD',

                 thcPercent: item.thcPercent || 0,
                 cbdPercent: item.cbdPercent || 0,

                 inStock: (item.stock || 0) > 0,
                 stockCount: item.stock || 0,

                 // COGS — undefined skips field (preserves manually-entered values on merge)
                 ...(item.cost !== undefined ? { cost: item.cost } : {}),
                 ...(item.batchCost !== undefined ? { batchCost: item.batchCost } : {}),

                 // Inventory metadata (P1 — always present in Alleaves response)
                 ...(item.sku !== undefined ? { sku: item.sku } : {}),
                 ...(item.strain !== undefined ? { strain: item.strain } : {}),
                 ...(item.uom !== undefined ? { uom: item.uom } : {}),
                 ...(item.onHand !== undefined ? { onHand: item.onHand } : {}),
                 ...(item.packageDate !== undefined ? { packageDate: item.packageDate } : {}),
                 ...(item.expirationDate !== undefined ? { expirationDate: item.expirationDate } : {}),
                 ...(item.batchId !== undefined ? { batchId: item.batchId } : {}),

                 // Potency in mg (if provided by API)
                 ...(item.thcMg !== undefined ? { thcMg: item.thcMg } : {}),
                 ...(item.cbdMg !== undefined ? { cbdMg: item.cbdMg } : {}),

                 // Traceability / area (P2+P3 — best-effort from batch enrichment)
                 ...(item.metrcTag !== undefined ? { metrcTag: item.metrcTag } : {}),
                 ...(item.batchStatus !== undefined ? { batchStatus: item.batchStatus } : {}),
                 ...(item.areaName !== undefined ? { areaName: item.areaName } : {}),

                 source: 'pos',
                 externalId: item.externalId,
                 updatedAt: now,
                 lastSyncedAt: now.toISOString()
             };

             batch.set(ref, productData, { merge: true });
             count++;

             if (count % 400 === 0) {
                 await batch.commit();
                 batch = firestore.batch();
             }
        }

        if (count % 400 !== 0) {
            await batch.commit();
        }

        // 4b. Also write to tenant catalog (used by the public-facing menu)
        // This keeps bakedbot.ai/{slug} in sync with the latest POS data and clean images
        if (orgId) {
            try {
                const tenantBase = firestore
                    .collection('tenants').doc(orgId)
                    .collection('publicViews').doc('products')
                    .collection('items');

                let tenantBatch = firestore.batch();
                let tenantCount = 0;

                for (const item of items) {
                    const docId = `${locationId}_${item.externalId}`;
                    const ref = tenantBase.doc(docId);
                    const tenantProductData = {
                        id: docId,
                        name: item.name,
                        brandName: item.brand,
                        dispensaryId: locationId,
                        orgId,
                        category: normalizeCategoryName(item.category),
                        // Only store real POS images — never stock photos
                        imageUrl: (item.imageUrl && !item.imageUrl.includes('unsplash.com')) ? item.imageUrl : '',
                        price: item.price,
                        originalPrice: item.price,
                        thcPercent: item.thcPercent || 0,
                        cbdPercent: item.cbdPercent || 0,
                        inStock: (item.stock || 0) > 0,
                        stockCount: item.stock || 0,
                        source: 'pos',
                        externalId: item.externalId,
                        lastSyncedAt: now.toISOString(),
                    };
                    tenantBatch.set(ref, tenantProductData, { merge: true });
                    tenantCount++;
                    if (tenantCount % 400 === 0) {
                        await tenantBatch.commit();
                        tenantBatch = firestore.batch();
                    }
                }
                if (tenantCount % 400 !== 0) {
                    await tenantBatch.commit();
                }
                logger.info('[SYNC_MENU] Synced tenant catalog', { orgId, count: tenantCount });
            } catch (tenantErr) {
                // Non-fatal — legacy products collection is the source of truth for the dashboard
                logger.warn('[SYNC_MENU] Failed to sync tenant catalog', { orgId, error: String(tenantErr) });
            }
        }

        // 5. Remove stale products — when POS is connected it is the ONLY source of truth.
        // Remove ALL products for this location not present in the current POS sync,
        // regardless of source (clears historical CannMenus imports, manual entries, etc.)
        const existingSnap = await firestore.collection('products')
            .where('dispensaryId', '==', locationId)
            .get();

        const staleIds = existingSnap.docs
            .filter(doc => {
                const externalId = doc.data().externalId;
                // Remove if: no externalId (non-POS product) OR externalId not in current POS sync
                return !externalId || !syncedExternalIds.has(externalId);
            })
            .map(doc => doc.id);

        if (staleIds.length > 0) {
            let deleteBatch = firestore.batch();
            let deleteCount = 0;
            for (const staleId of staleIds) {
                deleteBatch.delete(firestore.collection('products').doc(staleId));
                deleteCount++;
                if (deleteCount % 400 === 0) {
                    await deleteBatch.commit();
                    deleteBatch = firestore.batch();
                }
            }
            if (deleteCount % 400 !== 0) {
                await deleteBatch.commit();
            }
            logger.info('[SYNC_MENU] Removed stale POS products', { locationId, removed: staleIds.length });
        }

        // 6. Update Location Sync Status (including POS count — source of truth)
        await firestore.collection('locations').doc(locationId).update({
            'posConfig.syncedAt': now,
            'posConfig.lastSyncStatus': 'success',
            'posConfig.lastSyncCount': count,   // POS authoritative product count
        });

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/dashboard/menu');
        revalidatePath('/dashboard/products');

        return { success: true, count, provider, removed: staleIds.length };

    } catch (e: any) {
        logger.error('[SYNC_MENU] Failed:', e);
        return { success: false, error: e.message };
    }
}

/**
 * Fetches menu data with prioritization logic:
 * POS (Truth) > CannMenus > Manual
 */
export async function getMenuData(): Promise<MenuData> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        const brandId = user.brandId; // For Brands
        const role = user.role;
        const orgId = await resolveOrgId(firestore, user as any);

        logger.info('[MENU] getMenuData called', { locationId: user.locationId, brandId, role, orgId });

        // Resolve locationId with proper fallback
        const { locationId, locationData } = await resolveLocation(firestore, user.locationId, orgId, 'MENU');

        const productRepo = makeProductRepo(firestore);

        // 1. Check for POS-synced products (Truth)
        // Priority: orgId tenant catalog > locationId tenant catalog > legacy products
        if (orgId || locationId) {
            let localProducts: any[] = [];

            // Try orgId first (tenant catalog at tenants/{orgId}/publicViews/products/items)
            if (orgId) {
                try {
                    logger.info('[MENU] Trying tenant catalog with orgId', { orgId });
                    localProducts = await productRepo.getAllByLocation(orgId);
                    logger.info('[MENU] Tenant catalog result', { orgId, count: localProducts.length });
                } catch (err) {
                    logger.error('[MENU] Error fetching from tenant catalog', { orgId, error: err instanceof Error ? err.message : String(err) });
                }
            }

            // Fallback: try locationId if different from orgId
            if (localProducts.length === 0 && locationId && locationId !== orgId) {
                try {
                    logger.info('[MENU] Trying locationId as fallback', { locationId });
                    localProducts = await productRepo.getAllByLocation(locationId);
                } catch (err) {
                    logger.error('[MENU] Error fetching by locationId', { locationId, error: err instanceof Error ? err.message : String(err) });
                }
            }

            if (localProducts.length > 0) {
                logger.info('[MENU] Found local products', { count: localProducts.length });
                return {
                    products: localProducts,
                    source: 'pos',
                    lastSyncedAt: locationData?.posConfig?.syncedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                };
            }
        }

        // 2. Fallback for Brands
        if (role === 'brand' && brandId) {
            const brandProducts = await productRepo.getAllByBrand(brandId);
            if (brandProducts.length > 0) {
                return {
                    products: brandProducts,
                    source: 'manual',
                    lastSyncedAt: null
                };
            }
        }

        // 2b. For dispensaries, try getAllByBrand with orgId (checks tenant catalog)
        if (orgId) {
            logger.info('[MENU] Trying getAllByBrand with orgId for dispensary', { orgId });
            const orgProducts = await productRepo.getAllByBrand(orgId);
            if (orgProducts.length > 0) {
                logger.info('[MENU] Found products via getAllByBrand', { count: orgProducts.length });
                return {
                    products: orgProducts,
                    source: 'pos',
                    lastSyncedAt: locationData?.posConfig?.syncedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                };
            }
        }

        // 3. Last Resort Fallback: Fetch live from CannMenus if IDs are available
        if (locationId && locationId.startsWith('cm_')) {
            const cms = new CannMenusService();
            // This is a slow path, ideally we sync in background
            const cmProducts = await cms.getRetailerInventory(locationId);
            return {
                products: cmProducts || [],
                source: 'cannmenus',
                lastSyncedAt: 'Live'
            };
        }

        return {
            products: [],
            source: 'none',
            lastSyncedAt: null
        };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to fetch menu data', { error });
        throw error;
    }
}

/**
 * Batch-update the sortOrder field on multiple products.
 * Called after a drag-to-reorder operation in the dashboard Preview tab.
 * Writes to both the tenant catalog and legacy products collection.
 */
export async function updateProductSortOrder(
    updates: { id: string; sortOrder: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'brand_admin', 'super_user']);
        const orgId = await resolveOrgId(firestore, user as any);

        const batch = firestore.batch();

        for (const { id, sortOrder } of updates) {
            // Update tenant catalog (primary source)
            if (orgId) {
                const tenantRef = firestore
                    .collection('tenants')
                    .doc(orgId)
                    .collection('publicViews')
                    .doc('products')
                    .collection('items')
                    .doc(id);
                batch.update(tenantRef, { sortOrder });
            }
            // Update legacy products collection
            const legacyRef = firestore.collection('products').doc(id);
            batch.update(legacyRef, { sortOrder });
        }

        await batch.commit();
        logger.info('[MENU_ACTION] Product sort order updated', { count: updates.length, orgId });
        return { success: true };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to update product sort order', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save order' };
    }
}

/**
 * Toggle the featured flag on a product.
 * Featured products float to the top of the public menu default (popular) sort.
 */
export async function toggleProductFeatured(
    productId: string,
    featured: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'brand_admin', 'super_user']);
        const orgId = await resolveOrgId(firestore, user as any);

        const updates = { featured };

        // Update tenant catalog
        if (orgId) {
            await firestore
                .collection('tenants')
                .doc(orgId)
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .doc(productId)
                .update(updates);
        }

        // Update legacy products collection
        await firestore.collection('products').doc(productId).update(updates);

        logger.info('[MENU_ACTION] Product featured toggled', { productId, featured });
        return { success: true };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to toggle product featured', { productId, error });
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update' };
    }
}

/**
 * Update the retail price of a single product.
 * Writes to both tenant catalog and legacy products collection.
 */
export async function updateProductPrice(
    productId: string,
    price: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'brand_admin', 'super_user']);
        const orgId = await resolveOrgId(firestore, user as any);

        const updates = { price };

        if (orgId) {
            await firestore
                .collection('tenants')
                .doc(orgId)
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .doc(productId)
                .update(updates);
        }

        await firestore.collection('products').doc(productId).update(updates);

        logger.info('[MENU_ACTION] Product price updated', { productId, price });
        return { success: true };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to update product price', { productId, error });
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update price' };
    }
}

/**
 * Fetch the bundles that include a specific product.
 * Used by BundleQuickSheet in the dashboard Preview tab.
 */
export async function getProductBundles(productId: string): Promise<{
    id: string;
    name: string;
    savingsPercent: number;
    bundlePrice: number;
    status: 'active' | 'draft';
}[]> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'brand_admin', 'super_user']);
        const orgId = await resolveOrgId(firestore, user as any);

        if (!orgId) return [];

        const bundlesSnap = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('bundles')
            .where('status', 'in', ['active', 'draft'])
            .get();

        const result: { id: string; name: string; savingsPercent: number; bundlePrice: number; status: 'active' | 'draft' }[] = [];

        for (const doc of bundlesSnap.docs) {
            const data = doc.data();
            const productIds: string[] = (data.products || []).map((p: any) => p.id || p);
            if (productIds.includes(productId)) {
                result.push({
                    id: doc.id,
                    name: data.name || 'Bundle',
                    savingsPercent: data.savingsPercent || 0,
                    bundlePrice: data.bundlePrice || 0,
                    status: data.status || 'draft',
                });
            }
        }

        return result;
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to fetch product bundles', { productId, error });
        return [];
    }
}

/**
 * Fetch all data needed for the dashboard Menu Preview tab.
 * Returns brand config, bundles, featured brands, carousels, and public menu settings
 * so the dashboard can render BrandMenuClient with isManageMode=true.
 */
export async function getMenuPreviewData(): Promise<{
    brand: import('@/types/domain').Brand | null;
    bundles: import('@/types/bundles').BundleDeal[];
    featuredBrands: import('@/server/actions/featured-brands').FeaturedBrand[];
    carousels: import('@/types/carousels').Carousel[];
    publicMenuSettings: import('@/components/demo/menu-info-bar').PublicMenuSettings | null;
    brandSlug: string;
}> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'brand_admin', 'super_user']);
        const orgId = await resolveOrgId(firestore, user as any);

        if (!orgId) {
            return { brand: null, bundles: [], featuredBrands: [], carousels: [], publicMenuSettings: null, brandSlug: '' };
        }

        // Fetch brand doc — check by orgId field or by doc ID
        let brandData: import('@/types/domain').Brand | null = null;
        let brandSlug = '';

        const brandByOrgSnap = await firestore.collection('brands').where('orgId', '==', orgId).limit(1).get();
        if (!brandByOrgSnap.empty) {
            const doc = brandByOrgSnap.docs[0];
            brandData = { id: doc.id, ...doc.data() } as import('@/types/domain').Brand;
            brandSlug = (brandData as any).slug || doc.id;
        } else {
            // Try using orgId as brand doc ID directly
            const brandDoc = await firestore.collection('brands').doc(orgId).get();
            if (brandDoc.exists) {
                brandData = { id: brandDoc.id, ...brandDoc.data() } as import('@/types/domain').Brand;
                brandSlug = (brandData as any).slug || orgId;
            }
        }

        if (!brandData) {
            return { brand: null, bundles: [], featuredBrands: [], carousels: [], publicMenuSettings: null, brandSlug: '' };
        }

        // Parallel fetch of supporting data
        const [bundlesResult, featuredBrandsResult, carouselsResult, settingsResult] = await Promise.allSettled([
            import('@/app/actions/bundles').then(m => m.getActiveBundles(brandData!.id)),
            import('@/server/actions/featured-brands').then(m => m.getFeaturedBrands(orgId!)),
            import('@/app/actions/carousels').then(m => m.getCarousels(orgId!)),
            import('@/server/actions/loyalty-settings').then(m => m.getPublicMenuSettings(brandData!.id)),
        ]);

        const bundles = bundlesResult.status === 'fulfilled' ? bundlesResult.value : [];
        const featuredBrands = featuredBrandsResult.status === 'fulfilled' ? featuredBrandsResult.value : [];
        const carouselsRaw = carouselsResult.status === 'fulfilled' ? carouselsResult.value : null;
        const carousels: import('@/types/carousels').Carousel[] =
            (carouselsRaw && typeof carouselsRaw === 'object' && 'data' in carouselsRaw)
                ? (carouselsRaw as { data?: import('@/types/carousels').Carousel[] }).data || []
                : [];
        const publicMenuSettings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;

        return { brand: brandData, bundles, featuredBrands, carousels, publicMenuSettings, brandSlug };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to fetch menu preview data', { error });
        return { brand: null, bundles: [], featuredBrands: [], carousels: [], publicMenuSettings: null, brandSlug: '' };
    }
}

/**
 * Update (or clear) the Cost of Goods Sold for a single product.
 * Allowed roles: dispensary_admin, dispensary, super_user.
 * Pass null to clear the cost field.
 */
export async function updateProductCost(
    productId: string,
    cost: number | null
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user']);

        const { FieldValue } = await import('firebase-admin/firestore');
        // Use FieldValue.delete() to fully remove the field when clearing cost
        await firestore.collection('products').doc(productId).update({
            cost: cost !== null ? cost : FieldValue.delete(),
        });

        logger.info('[MENU_ACTION] COGS updated', { productId, cost });
        return { success: true };
    } catch (error) {
        logger.error('[MENU_ACTION] Failed to update product cost', { productId, error });
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save' };
    }
}
