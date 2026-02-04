import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/server/auth/session';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

const ORG_ID = 'org_thrive_syracuse';

/**
 * GET /api/admin/fix-thrive-pos
 *
 * Fixes the POS configuration for Thrive Syracuse by ensuring
 * the posConfig.provider is set to 'alleaves'.
 *
 * SECURITY: Requires super_user role.
 */
export async function GET(request: NextRequest) {
    try {
        // Auth check
        const user = await getServerSessionUser();
        if (!user || user.role !== 'super_user') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const logs: string[] = [];
        const log = (msg: string) => {
            logger.info(`[FixThrivePOS] ${msg}`);
            logs.push(msg);
        };

        log('Starting Thrive Syracuse POS configuration fix...');

        const db = getAdminFirestore();

        // Find the location document
        const locationsSnap = await db.collection('locations')
            .where('orgId', '==', ORG_ID)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            log(`ERROR: No location found for org: ${ORG_ID}`);
            return NextResponse.json({
                success: false,
                logs,
                error: 'Location not found'
            });
        }

        const doc = locationsSnap.docs[0];
        const currentData = doc.data();

        log(`Found location: ${doc.id}`);
        log(`Current posConfig: ${JSON.stringify(currentData.posConfig || 'NOT SET')}`);

        // Get credentials from environment
        const username = process.env.ALLEAVES_USERNAME;
        const password = process.env.ALLEAVES_PASSWORD;
        const pin = process.env.ALLEAVES_PIN || '1234';
        const storeId = process.env.ALLEAVES_STORE_ID || '1000';

        if (!username || !password) {
            log('ERROR: Missing ALLEAVES_USERNAME or ALLEAVES_PASSWORD env vars');
            return NextResponse.json({
                success: false,
                logs,
                error: 'Missing Alleaves credentials in environment'
            });
        }

        // Prepare updated config
        const updatedConfig = {
            ...currentData.posConfig,
            provider: 'alleaves',  // CRITICAL: This enables the Sync button
            status: 'active',
            username: username,
            password: password,
            pin: pin,
            locationId: storeId,
            storeId: storeId,
            environment: 'production',
            updatedAt: new Date().toISOString(),
        };

        // Update document
        await db.collection('locations').doc(doc.id).update({
            posConfig: updatedConfig,
            updatedAt: new Date()
        });

        log('Configuration updated successfully!');
        log(`Provider: ${updatedConfig.provider}`);
        log(`Status: ${updatedConfig.status}`);
        log(`Store ID: ${updatedConfig.storeId}`);

        return NextResponse.json({
            success: true,
            logs,
            locationId: doc.id,
            config: {
                provider: updatedConfig.provider,
                status: updatedConfig.status,
                storeId: updatedConfig.storeId,
            }
        });

    } catch (error: any) {
        logger.error('[FixThrivePOS] Failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
