'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireSuperUser } from '@/server/auth/auth';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { logger } from '@/lib/logger';

export interface LocationWithPOS {
    id: string;
    name: string;
    orgId: string;
    city?: string;
    state?: string;
    posConfig?: {
        provider?: string;
        status?: string;
        storeId?: string;
        locationId?: string;
        syncedAt?: string;
        lastSyncStatus?: string;
    };
}

export interface POSConfigFormData {
    locationId: string;
    provider: 'alleaves' | 'dutchie';
    username: string;
    password: string;
    pin?: string;
    storeId: string;
}

/**
 * Get all locations for POS configuration.
 * SECURITY: Requires Super User privileges.
 */
export async function getAllLocations(): Promise<LocationWithPOS[]> {
    await requireSuperUser();

    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore.collection('locations').get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || doc.id,
                orgId: data.orgId || '',
                city: data.city,
                state: data.state,
                posConfig: data.posConfig ? {
                    provider: data.posConfig.provider,
                    status: data.posConfig.status,
                    storeId: data.posConfig.storeId,
                    locationId: data.posConfig.locationId,
                    syncedAt: data.posConfig.syncedAt?.toDate?.()?.toISOString() || data.posConfig.syncedAt,
                    lastSyncStatus: data.posConfig.lastSyncStatus,
                } : undefined,
            };
        });
    } catch (error: any) {
        logger.error('[POSConfig] Failed to get locations', { error: error.message });
        throw new Error('Failed to load locations');
    }
}

/**
 * Get POS configuration details for a specific location.
 * SECURITY: Requires Super User privileges.
 */
export async function getLocationPOSConfig(locationId: string): Promise<{
    username?: string;
    password?: string;
    pin?: string;
    storeId?: string;
    locationId?: string;
    provider?: string;
    status?: string;
} | null> {
    await requireSuperUser();

    try {
        const { firestore } = await createServerClient();
        const doc = await firestore.collection('locations').doc(locationId).get();

        if (!doc.exists) {
            return null;
        }

        const posConfig = doc.data()?.posConfig;
        if (!posConfig) {
            return null;
        }

        return {
            username: posConfig.username,
            password: posConfig.password,
            pin: posConfig.pin,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId,
            provider: posConfig.provider,
            status: posConfig.status,
        };
    } catch (error: any) {
        logger.error('[POSConfig] Failed to get location config', { locationId, error: error.message });
        throw new Error('Failed to load location configuration');
    }
}

/**
 * Test POS connection with provided credentials.
 * SECURITY: Requires Super User privileges.
 */
export async function testPOSConnection(config: POSConfigFormData): Promise<{
    success: boolean;
    message: string;
    menuItemCount?: number;
}> {
    await requireSuperUser();

    logger.info('[POSConfig] Testing connection', {
        locationId: config.locationId,
        provider: config.provider,
        storeId: config.storeId
    });

    if (config.provider !== 'alleaves') {
        return { success: false, message: `Provider "${config.provider}" not yet supported` };
    }

    try {
        const alleavesConfig: ALLeavesConfig = {
            apiKey: '',
            storeId: config.storeId,
            username: config.username,
            password: config.password,
            pin: config.pin,
            locationId: config.storeId,
            environment: 'production',
        };

        const client = new ALLeavesClient(alleavesConfig);
        const isValid = await client.validateConnection();

        if (!isValid) {
            return { success: false, message: 'Connection validation failed. Check credentials.' };
        }

        // Test menu fetch
        const menuItems = await client.fetchMenu();

        return {
            success: true,
            message: `Connection successful! Found ${menuItems.length} menu items.`,
            menuItemCount: menuItems.length,
        };
    } catch (error: any) {
        logger.error('[POSConfig] Connection test failed', { error: error.message });
        return { success: false, message: error.message || 'Connection test failed' };
    }
}

/**
 * Save POS configuration for a location.
 * SECURITY: Requires Super User privileges.
 */
export async function savePOSConfig(config: POSConfigFormData): Promise<{
    success: boolean;
    message: string;
}> {
    await requireSuperUser();

    logger.info('[POSConfig] Saving configuration', {
        locationId: config.locationId,
        provider: config.provider
    });

    try {
        const { firestore } = await createServerClient();

        // Verify location exists
        const locDoc = await firestore.collection('locations').doc(config.locationId).get();
        if (!locDoc.exists) {
            return { success: false, message: 'Location not found' };
        }

        // Build POS config
        const posConfig = {
            provider: config.provider,
            status: 'active',
            username: config.username,
            password: config.password,
            pin: config.pin || null,
            storeId: config.storeId,
            locationId: config.storeId,
            environment: 'production',
            updatedAt: new Date(),
        };

        // Update location
        await firestore.collection('locations').doc(config.locationId).update({
            posConfig,
            updatedAt: new Date(),
        });

        logger.info('[POSConfig] Configuration saved', { locationId: config.locationId });
        return { success: true, message: 'POS configuration saved successfully' };
    } catch (error: any) {
        logger.error('[POSConfig] Failed to save configuration', { error: error.message });
        return { success: false, message: error.message || 'Failed to save configuration' };
    }
}

/**
 * Trigger a menu sync for a location.
 * SECURITY: Requires Super User privileges.
 */
export async function triggerMenuSync(locationId: string): Promise<{
    success: boolean;
    message: string;
    productCount?: number;
}> {
    await requireSuperUser();

    logger.info('[POSConfig] Triggering menu sync', { locationId });

    try {
        const { firestore } = await createServerClient();

        // Get location and POS config
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (!locDoc.exists) {
            return { success: false, message: 'Location not found' };
        }

        const locationData = locDoc.data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves') {
            return { success: false, message: 'Alleaves not configured for this location' };
        }

        // Build client config
        const alleavesConfig: ALLeavesConfig = {
            apiKey: '',
            storeId: posConfig.storeId,
            username: posConfig.username || process.env.ALLEAVES_USERNAME || '',
            password: posConfig.password || process.env.ALLEAVES_PASSWORD || '',
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            locationId: posConfig.locationId || posConfig.storeId,
            environment: posConfig.environment || 'production',
        };

        // Fetch menu
        const client = new ALLeavesClient(alleavesConfig);
        const items = await client.fetchMenu();

        if (items.length === 0) {
            return { success: true, message: 'No products found in POS', productCount: 0 };
        }

        // Upsert products
        const batch = firestore.batch();
        const now = new Date();
        let count = 0;

        for (const item of items) {
            const docId = `${locationId}_${item.externalId}`;
            const ref = firestore.collection('products').doc(docId);

            const productData = {
                id: docId,
                name: item.name,
                brandId: locationData?.brandId || locationId,
                brandName: item.brand,
                dispensaryId: locationId,
                category: item.category,
                description: '',
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
                lastSyncedAt: now.toISOString(),
            };

            batch.set(ref, productData, { merge: true });
            count++;

            if (count % 400 === 0) {
                await batch.commit();
            }
        }

        await batch.commit();

        // Update location sync status
        await firestore.collection('locations').doc(locationId).update({
            'posConfig.syncedAt': now,
            'posConfig.lastSyncStatus': 'success',
        });

        return {
            success: true,
            message: `Synced ${count} products from Alleaves`,
            productCount: count,
        };
    } catch (error: any) {
        logger.error('[POSConfig] Menu sync failed', { locationId, error: error.message });
        return { success: false, message: error.message || 'Menu sync failed' };
    }
}

/**
 * Disable POS integration for a location.
 * SECURITY: Requires Super User privileges.
 */
export async function disablePOSConfig(locationId: string): Promise<{
    success: boolean;
    message: string;
}> {
    await requireSuperUser();

    logger.info('[POSConfig] Disabling POS config', { locationId });

    try {
        const { firestore } = await createServerClient();

        await firestore.collection('locations').doc(locationId).update({
            'posConfig.status': 'disabled',
            'posConfig.updatedAt': new Date(),
        });

        return { success: true, message: 'POS integration disabled' };
    } catch (error: any) {
        logger.error('[POSConfig] Failed to disable config', { error: error.message });
        return { success: false, message: error.message || 'Failed to disable' };
    }
}
