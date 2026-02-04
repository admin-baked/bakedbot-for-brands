'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireSuperUser } from '@/server/auth/auth';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { logger } from '@/lib/logger';

/**
 * Admin action to configure Alleaves POS for a location.
 * SECURITY: Requires Super User privileges.
 */
export async function configureAlleavesForLocation(
    locationId: string,
    config: {
        username: string;
        password: string;
        pin?: string;
        storeId: string;
        partnerId?: string;
    }
) {
    // Security gate: Only super users can run this admin action
    await requireSuperUser();

    const logs: string[] = [];
    const log = (msg: string) => {
        logger.info(`[ConfigureAlleaves] ${msg}`);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log(`Starting Alleaves configuration for location: ${locationId}`);

        const { firestore } = await createServerClient();

        // 1. Verify location exists
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (!locDoc.exists) {
            log(`ERROR: Location ${locationId} not found.`);
            return { success: false, logs, error: 'Location not found' };
        }

        const locationData = locDoc.data();
        log(`Found location: ${locationData?.name || locationId}`);

        // 2. Build Alleaves config
        const alleavesConfig: ALLeavesConfig = {
            apiKey: '', // Not used for Alleaves (JWT-based)
            storeId: config.storeId,
            username: config.username,
            password: config.password,
            pin: config.pin,
            locationId: config.storeId, // Alleaves locationId is same as storeId
            partnerId: config.partnerId,
            environment: 'production',
        };

        // 3. Validate connection
        log('Validating Alleaves connection...');
        const client = new ALLeavesClient(alleavesConfig);
        const isValid = await client.validateConnection();

        if (!isValid) {
            log('ERROR: Alleaves connection validation failed.');
            return { success: false, logs, error: 'Connection validation failed' };
        }
        log('SUCCESS: Alleaves connection validated!');

        // 4. Test menu fetch
        log('Testing menu fetch...');
        const menuItems = await client.fetchMenu();
        log(`Fetched ${menuItems.length} menu items from Alleaves.`);

        // 5. Update location with POS config
        log('Saving POS configuration to location...');
        await firestore.collection('locations').doc(locationId).update({
            posConfig: {
                provider: 'alleaves',
                storeId: config.storeId,
                locationId: config.storeId,
                username: config.username,
                password: config.password,
                pin: config.pin || null,
                partnerId: config.partnerId || null,
                environment: 'production',
                status: 'active',
                syncedAt: null,
                lastSyncStatus: null,
                updatedAt: new Date(),
            },
            updatedAt: new Date(),
        });
        log('POS configuration saved successfully.');

        return {
            success: true,
            logs,
            menuItemCount: menuItems.length,
        };

    } catch (error: any) {
        log(`CRITICAL ERROR: ${error.message}`);
        return { success: false, logs, error: error.message };
    }
}

/**
 * Quick helper to configure Alleaves for Thrive Syracuse using env vars.
 * SECURITY: Requires Super User privileges.
 */
export async function configureAlleavesForThriveSyracuse() {
    // Security gate: Only super users can run this admin action
    await requireSuperUser();

    const logs: string[] = [];
    const log = (msg: string) => {
        logger.info(`[ConfigureThriveSyracuse] ${msg}`);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log('Starting Alleaves configuration for Thrive Syracuse...');

        // Get credentials from environment
        const username = process.env.ALLEAVES_USERNAME;
        const password = process.env.ALLEAVES_PASSWORD;
        const pin = process.env.ALLEAVES_PIN;
        const storeId = process.env.ALLEAVES_STORE_ID || process.env.THRIVE_ALLEAVES_STORE_ID;

        if (!username || !password || !storeId) {
            log('ERROR: Missing Alleaves credentials in environment variables.');
            log(`  ALLEAVES_USERNAME: ${username ? 'set' : 'MISSING'}`);
            log(`  ALLEAVES_PASSWORD: ${password ? 'set' : 'MISSING'}`);
            log(`  ALLEAVES_STORE_ID: ${storeId ? 'set' : 'MISSING'}`);
            return {
                success: false,
                logs,
                error: 'Missing environment variables: ALLEAVES_USERNAME, ALLEAVES_PASSWORD, ALLEAVES_STORE_ID',
            };
        }

        // Location ID for Thrive Syracuse (based on pilot setup naming convention)
        const locationId = 'loc_thrive_syracuse';

        const { firestore } = await createServerClient();

        // Check if location exists, if not create it
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (!locDoc.exists) {
            log(`Location ${locationId} not found. Searching by orgId...`);

            // Try to find by orgId
            const locSnap = await firestore.collection('locations')
                .where('orgId', '==', 'dispensary_thrive_syracuse')
                .limit(1)
                .get();

            if (!locSnap.empty) {
                const foundLocId = locSnap.docs[0].id;
                log(`Found location with orgId dispensary_thrive_syracuse: ${foundLocId}`);

                // Use the found location ID
                return configureAlleavesForLocation(foundLocId, {
                    username,
                    password,
                    pin,
                    storeId,
                });
            }

            log('No location found. Creating new location for Thrive Syracuse...');
            await firestore.collection('locations').doc(locationId).set({
                id: locationId,
                orgId: 'dispensary_thrive_syracuse',
                brandId: 'dispensary_thrive_syracuse',
                name: 'Thrive Syracuse - Main Location',
                address: '3065 Erie Blvd E',
                city: 'Syracuse',
                state: 'NY',
                zip: '13224',
                phone: '',
                coordinates: null,
                hours: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            log('Created location document.');
        }

        // Configure Alleaves
        return configureAlleavesForLocation(locationId, {
            username,
            password,
            pin,
            storeId,
        });

    } catch (error: any) {
        log(`CRITICAL ERROR: ${error.message}`);
        return { success: false, logs, error: error.message };
    }
}

/**
 * Trigger a menu sync for a location with Alleaves POS.
 * SECURITY: Requires Super User privileges.
 */
export async function syncAlleavesMenu(locationId: string) {
    // Security gate: Only super users can run this admin action
    await requireSuperUser();

    const logs: string[] = [];
    const log = (msg: string) => {
        logger.info(`[SyncAlleavesMenu] ${msg}`);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log(`Starting Alleaves menu sync for location: ${locationId}`);

        const { firestore } = await createServerClient();

        // 1. Get location and POS config
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (!locDoc.exists) {
            return { success: false, logs, error: 'Location not found' };
        }

        const posConfig = locDoc.data()?.posConfig;
        if (!posConfig || posConfig.provider !== 'alleaves') {
            return { success: false, logs, error: 'Alleaves not configured for this location' };
        }

        // 2. Build client config
        const alleavesConfig: ALLeavesConfig = {
            apiKey: '',
            storeId: posConfig.storeId,
            username: posConfig.username || process.env.ALLEAVES_USERNAME || '',
            password: posConfig.password || process.env.ALLEAVES_PASSWORD || '',
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        // 3. Fetch menu
        log('Fetching menu from Alleaves...');
        const client = new ALLeavesClient(alleavesConfig);
        const items = await client.fetchMenu();
        log(`Fetched ${items.length} items from Alleaves.`);

        if (items.length === 0) {
            return { success: true, logs, count: 0 };
        }

        // 4. Upsert products
        log('Upserting products to Firestore...');
        const batch = firestore.batch();
        const now = new Date();
        let count = 0;

        for (const item of items) {
            const docId = `${locationId}_${item.externalId}`;
            const ref = firestore.collection('products').doc(docId);

            const productData = {
                id: docId,
                name: item.name,
                brandId: locDoc.data()?.brandId || locationId,
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
                log(`Committed batch of ${count} products...`);
            }
        }

        await batch.commit();
        log(`Committed final batch. Total: ${count} products.`);

        // 5. Update location sync status
        await firestore.collection('locations').doc(locationId).update({
            'posConfig.syncedAt': now,
            'posConfig.lastSyncStatus': 'success',
        });

        log('Menu sync complete!');
        return { success: true, logs, count };

    } catch (error: any) {
        log(`CRITICAL ERROR: ${error.message}`);
        return { success: false, logs, error: error.message };
    }
}
