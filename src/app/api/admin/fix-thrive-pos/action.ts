'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

/**
 * Fix Thrive Syracuse POS Configuration.
 * Updates the location document with correct Alleaves credentials.
 * SECURITY: Requires Super User privileges.
 */
export async function fixThriveSyracusePOS() {
    // Security gate: Only super users can run this admin action
    await requireSuperUser();

    const logs: string[] = [];
    const log = (msg: string) => {
        logger.info(`[FixThrivePOS] ${msg}`);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    try {
        log('Starting Thrive Syracuse POS fix...');

        // Get credentials from environment
        const username = process.env.ALLEAVES_USERNAME;
        const password = process.env.ALLEAVES_PASSWORD;
        const pin = process.env.ALLEAVES_PIN;
        const storeId = process.env.ALLEAVES_STORE_ID || process.env.THRIVE_ALLEAVES_STORE_ID || '1000';

        if (!username || !password || !pin) {
            log('ERROR: Missing Alleaves credentials in environment variables.');
            log(`  ALLEAVES_USERNAME: ${username ? 'set' : 'MISSING'}`);
            log(`  ALLEAVES_PASSWORD: ${password ? 'set' : 'MISSING'}`);
            log(`  ALLEAVES_PIN: ${pin ? 'set' : 'MISSING'}`);
            return {
                success: false,
                logs,
                error: 'Missing environment variables: ALLEAVES_USERNAME, ALLEAVES_PASSWORD, ALLEAVES_PIN',
            };
        }

        const { firestore } = await createServerClient();

        // Find the location document - try both naming conventions
        log('Searching for Thrive Syracuse location...');

        let locSnap = await firestore.collection('locations')
            .where('orgId', '==', 'org_thrive_syracuse')
            .limit(1)
            .get();

        // Fallback to legacy naming convention
        if (locSnap.empty) {
            log('Not found with org_thrive_syracuse, trying dispensary_thrive_syracuse...');
            locSnap = await firestore.collection('locations')
                .where('orgId', '==', 'dispensary_thrive_syracuse')
                .limit(1)
                .get();
        }

        if (locSnap.empty) {
            log('ERROR: No location found for Thrive Syracuse.');
            return {
                success: false,
                logs,
                error: 'Location not found for Thrive Syracuse',
            };
        }

        const doc = locSnap.docs[0];
        const currentData = doc.data();
        log(`Found location: ${doc.id}`);
        log(`Current orgId: ${currentData.orgId}`);
        log(`Current posConfig provider: ${currentData.posConfig?.provider || 'none'}`);

        // Build the updated POS config
        const updatedConfig = {
            ...(currentData.posConfig || {}),
            provider: 'alleaves',
            status: 'active',
            username: username,
            password: password,
            pin: pin,
            locationId: storeId,
            storeId: storeId,
            environment: 'production',
            updatedAt: new Date(),
        };

        // Update the location document
        log('Updating location with POS configuration...');
        await firestore.collection('locations').doc(doc.id).update({
            posConfig: updatedConfig,
            updatedAt: new Date(),
        });

        log('SUCCESS: POS configuration updated!');
        log(`  Provider: ${updatedConfig.provider}`);
        log(`  Status: ${updatedConfig.status}`);
        log(`  Store ID: ${updatedConfig.storeId}`);
        log(`  Location ID: ${updatedConfig.locationId}`);

        return {
            success: true,
            logs,
            locationId: doc.id,
            config: {
                provider: updatedConfig.provider,
                status: updatedConfig.status,
                storeId: updatedConfig.storeId,
            },
        };

    } catch (error: any) {
        log(`CRITICAL ERROR: ${error.message}`);
        return { success: false, logs, error: error.message };
    }
}
