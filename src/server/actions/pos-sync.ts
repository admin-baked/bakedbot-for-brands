'use server';

import { createServerClient } from '@/firebase/server-client';
import { DutchieClient } from '@/lib/pos/adapters/dutchie';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { createImport } from './import-actions';
import { logger } from '@/lib/logger';

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
        
        if (!result.success) {
            logger.error('[POS_SYNC] Import pipeline failed', { error: result.error });
            throw new Error(result.error);
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
