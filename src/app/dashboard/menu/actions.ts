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
 * Fetches menu data with prioritization logic:
 * POS (Truth) > CannMenus > Manual
 */
export async function getMenuData(): Promise<MenuData> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();
        
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
