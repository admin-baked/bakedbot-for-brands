/**
 * Fix Thrive Syracuse POS Configuration
 *
 * Explicitly updates the location document with correct Alleaves credentials
 * Run: npx tsx dev/fix-thrive-pos-config.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

const ORG_ID = 'org_thrive_syracuse';
const CORRECT_PIN = '1234';
const CORRECT_LOCATION_ID = '1000';
const CORRECT_STORE_ID = '1000';
const CORRECT_USERNAME = process.env.ALLEAVES_USERNAME || '';
const CORRECT_PASSWORD = process.env.ALLEAVES_PASSWORD || '';

// Initialize Firebase
const apps = getApps();
let app;

if (apps.length === 0) {
    const serviceAccount = JSON.parse(
        fs.readFileSync('./firebase-service-account.json', 'utf8')
    );
    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const db = getFirestore(app);

async function fixPOSConfig() {
    if (!CORRECT_USERNAME || !CORRECT_PASSWORD) {
        console.error('❌ Missing credentials. Set ALLEAVES_USERNAME and ALLEAVES_PASSWORD env vars.');
        process.exit(1);
    }
    console.log('🔧 FIXING THRIVE SYRACUSE POS CONFIGURATION\n');

    try {
        // Find the location document
        const locationsSnap = await db.collection('locations')
            .where('orgId', '==', ORG_ID)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            console.error('❌ No location found for org:', ORG_ID);
            process.exit(1);
        }

        const doc = locationsSnap.docs[0];
        const currentData = doc.data();

        console.log(`📍 Found location: ${doc.id}`);
        console.log('   Current Config:', JSON.stringify(currentData.posConfig, null, 2));

        // Prepare update - ensure provider is set for getPosConfig to find it
        const updatedConfig = {
            ...currentData.posConfig,
            provider: 'alleaves',  // CRITICAL: This enables the Sync button
            status: 'active',
            username: CORRECT_USERNAME,
            password: CORRECT_PASSWORD,
            pin: CORRECT_PIN,
            locationId: CORRECT_LOCATION_ID,
            storeId: CORRECT_STORE_ID,
            updatedAt: new Date().toISOString() // Track when we fixed it
        };

        // Update document
        await db.collection('locations').doc(doc.id).update({
            posConfig: updatedConfig,
            updatedAt: new Date()
        });

        console.log('\n✅ Configuration updated successfully!');
        console.log('   Provider:', updatedConfig.provider);
        console.log('   Status:', updatedConfig.status);
        console.log('   PIN:', updatedConfig.pin);
        console.log('   Location ID:', updatedConfig.locationId);
        console.log('   Store ID:', updatedConfig.storeId);
        console.log('\n🎯 The "Sync with Alleaves" button should now be enabled on /dashboard/menu');

    } catch (error: any) {
        console.error('❌ Failed to update configuration:', error.message);
        process.exit(1);
    }
}

fixPOSConfig()
    .then(() => {
        console.log('\nDone.');
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
