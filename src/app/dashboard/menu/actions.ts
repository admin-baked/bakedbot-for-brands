'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { makeProductRepo } from '@/server/repos/productRepo';
import { logger } from '@/lib/logger';
import { CannMenusService } from '@/server/services/cannmenus';

export interface MenuData {
    products: any[];
    source: 'pos' | 'cannmenus' | 'manual' | 'none';
    lastSyncedAt: string | null;
}

export interface PosConfigInfo {
    provider: string | null;
    status: string | null;
    displayName: string;
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
 * Get POS configuration info for the current user's location
 */
export async function getPosConfig(): Promise<PosConfigInfo> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;
        logger.info('[GET_POS_CONFIG] Called', { locationId: user.locationId, orgId, role: user.role });

        const { locationId, locationData } = await resolveLocation(firestore, user.locationId, orgId, 'GET_POS_CONFIG');

        if (!locationId || !locationData) {
            return { provider: null, status: null, displayName: 'POS' };
        }

        const posConfig = locationData.posConfig;
        logger.info('[GET_POS_CONFIG] Location data', {
            locationId,
            hasPosConfig: !!posConfig,
            provider: posConfig?.provider,
            status: posConfig?.status
        });

        if (!posConfig) {
            return { provider: null, status: null, displayName: 'POS' };
        }

        // Map provider to display name
        const displayNames: Record<string, string> = {
            'dutchie': 'Dutchie',
            'alleaves': 'Alleaves',
            'treez': 'Treez',
            'jane': 'Jane',
        };

        return {
            provider: posConfig.provider || null,
            status: posConfig.status || null,
            displayName: displayNames[posConfig.provider] || posConfig.provider || 'POS',
        };
    } catch (error) {
        logger.error('[GET_POS_CONFIG] Failed:', error instanceof Error ? error : new Error(String(error)));
        return { provider: null, status: null, displayName: 'POS' };
    }
}

/**
 * Triggers a sync with the connected POS (Dutchie or Alleaves).
 * Upserts products into the 'products' collection.
 */
export async function syncMenu(): Promise<{ success: boolean; count?: number; error?: string; provider?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;

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
        const batch = firestore.batch();
        const now = new Date();

        let count = 0;

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
                 category: item.category, 
                 description: '', // DutchieClient doesn't currently bubble description, maybe add later
                 imageUrl: item.imageUrl || '',
                 
                 price: item.price,
                 originalPrice: item.price,
                 currency: 'USD',
                 
                 thcPercent: item.thcPercent || 0,
                 cbdPercent: item.cbdPercent || 0,
                 
                 inStock: (item.stock || 0) > 0,
                 stockCount: item.stock || 0,
                 
                 source: 'pos',
                 externalId: item.externalId,
                 updatedAt: now,
                 lastSyncedAt: now.toISOString()
             };

             batch.set(ref, productData, { merge: true });
             count++;

             if (count % 400 === 0) {
                 await batch.commit();
             }
        }
        
        await batch.commit();

        // 5. Update Location Sync Status
        await firestore.collection('locations').doc(locationId).update({
            'posConfig.syncedAt': now,
            'posConfig.lastSyncStatus': 'success'
        });
        
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/dashboard/menu');

        return { success: true, count, provider };

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
        const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;

        logger.info('[MENU] getMenuData called', { locationId: user.locationId, brandId, role, orgId });

        // Resolve locationId with proper fallback
        const { locationId, locationData } = await resolveLocation(firestore, user.locationId, orgId, 'MENU');

        const productRepo = makeProductRepo(firestore);

        // 1. Check for POS-synced products (Truth) - try multiple dispensaryId values
        if (locationId || orgId) {
            // Try locationId first
            let localProducts = locationId ? await productRepo.getAllByLocation(locationId) : [];

            // If no products with locationId, try orgId as dispensaryId
            if (localProducts.length === 0 && orgId && orgId !== locationId) {
                logger.info('[MENU] Trying orgId as dispensaryId', { orgId });
                localProducts = await productRepo.getAllByLocation(orgId);
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
