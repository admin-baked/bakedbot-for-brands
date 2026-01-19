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

/**
 * Triggers a sync with the connected POS (Dutchie).
 * Upserts products into the 'products' collection.
 */
export async function syncMenu(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'super_user']);
        // Use DutchieClient adapter directly for robust GraphQL support
        const { DutchieClient } = await import('@/lib/pos/adapters/dutchie');

        let locationId = user.locationId;
        const orgId = (user as any).orgId || (user.customClaims?.orgId); 

        // 1. Resolve Location if missing from claim
        if (!locationId && orgId) {
            const locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get();
            if (!locSnap.empty) {
                locationId = locSnap.docs[0].id;
            }
        }

        if (!locationId) {
            return { success: false, error: 'User does not have a locationId linked.' };
        }

        // 2. Fetch POS Config from Location
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (!locDoc.exists) {
            return { success: false, error: 'Location document not found.' };
        }
        
        const posConfig = locDoc.data()?.posConfig;
        if (!posConfig || posConfig.provider !== 'dutchie') {
             return { success: false, error: 'Dutchie integration is not configured for this location.' };
        }

        // 3. Fetch from Dutchie
        const client = new DutchieClient(posConfig);
        let items;
        try {
            items = await client.fetchMenu();
        } catch (e: any) {
            return { success: false, error: `Dutchie Sync Failed: ${e.message}` };
        }

        if (!items || items.length === 0) {
            return { success: true, count: 0 };
        }

        // 4. Map & Upsert
        const productRepo = makeProductRepo(firestore);
        const batch = firestore.batch();
        const now = new Date();

        let count = 0;

        for (const item of items) {
             // Create a deterministic ID: locationId_dutchieId
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

        return { success: true, count };

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
        const user = await requireUser(['brand', 'dispensary', 'super_user']);
        
        const locationId = user.locationId;
        const brandId = user.brandId; // For Brands
        const role = user.role;

        const productRepo = makeProductRepo(firestore);
        
        // 1. Check for POS-synced products (Truth)
        if (locationId) {
            const localProducts = await productRepo.getAllByLocation(locationId);
            if (localProducts.length > 0) {
                return {
                    products: localProducts,
                    source: 'pos',
                    lastSyncedAt: new Date().toISOString() // In reality, fetch from location.lastSyncAt
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
