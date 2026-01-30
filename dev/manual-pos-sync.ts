/**
 * Manual POS Sync Script for Thrive Syracuse
 *
 * This script manually triggers a POS sync from Alleaves to Firestore.
 *
 * Prerequisites:
 * - Firebase service account credentials
 * - ALLEAVES_API_KEY environment variable
 * - Thrive Syracuse setup complete (run setup-thrive-alleaves.ts first)
 *
 * Run: ALLEAVES_API_KEY=your_key npx tsx dev/manual-pos-sync.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { syncPOSProducts } from '../src/server/actions/pos-sync';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
const apps = getApps();
let app;

if (apps.length === 0) {
    // Try to load service account from multiple possible locations
    let serviceAccount;
    const possiblePaths = [
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(process.cwd(), 'bakedbot-prod-firebase-adminsdk.json'),
        process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    ];

    for (const filePath of possiblePaths) {
        if (filePath && fs.existsSync(filePath)) {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Loaded service account from: ${filePath}`);
            break;
        }
    }

    if (!serviceAccount) {
        console.error('❌ No service account found. Set GOOGLE_APPLICATION_CREDENTIALS or place firebase-service-account.json in project root.');
        process.exit(1);
    }

    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const firestore = getFirestore(app);

async function manualSync() {
    console.log('🔄 Manual POS Sync for Thrive Syracuse\n');
    console.log('═'.repeat(60));

    // Configuration
    const locationId = 'loc_thrive_syracuse_main';
    const orgId = 'org_thrive_syracuse';
    const brandId = 'thrivesyracuse';

    // Check for API key
    if (!process.env.ALLEAVES_API_KEY) {
        console.error('❌ ALLEAVES_API_KEY environment variable not set!');
        console.log('\nSet it with:');
        console.log('  export ALLEAVES_API_KEY=your_api_key_here');
        console.log('  npx tsx dev/manual-pos-sync.ts');
        process.exit(1);
    }

    console.log('Configuration:');
    console.log(`  Location ID: ${locationId}`);
    console.log(`  Org ID:      ${orgId}`);
    console.log(`  Brand ID:    ${brandId}`);
    console.log('═'.repeat(60));

    try {
        // Verify location exists
        console.log('\n1️⃣  Verifying location configuration...');
        const locationDoc = await firestore.collection('locations').doc(locationId).get();

        if (!locationDoc.exists) {
            console.error('❌ Location not found in Firestore!');
            console.log('\nRun setup script first:');
            console.log('  npx tsx dev/setup-thrive-alleaves.ts');
            process.exit(1);
        }

        const locationData = locationDoc.data();
        console.log('✅ Location found');
        console.log(`   POS Provider: ${locationData?.posConfig?.provider}`);
        console.log(`   Status: ${locationData?.posConfig?.status}`);
        console.log(`   Location ID: ${locationData?.posConfig?.locationId}`);

        if (locationData?.posConfig?.provider !== 'alleaves') {
            console.error('❌ Location is not configured for Alleaves!');
            process.exit(1);
        }

        if (locationData?.posConfig?.status !== 'active') {
            console.error('❌ POS integration is not active!');
            process.exit(1);
        }

        // Run sync
        console.log('\n2️⃣  Starting POS sync...');
        console.log('   This may take a minute...\n');

        const startTime = Date.now();
        const count = await syncPOSProducts(locationId, orgId);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // Update lastSyncAt
        await firestore.collection('locations').doc(locationId).update({
            'posConfig.lastSyncAt': new Date().toISOString(),
        });

        console.log('\n═'.repeat(60));
        console.log('✅ SYNC COMPLETE!');
        console.log('═'.repeat(60));
        console.log(`Products synced: ${count}`);
        console.log(`Duration: ${duration}s`);
        console.log('═'.repeat(60));

        // Show product breakdown
        if (count > 0) {
            console.log('\n📊 Verifying products in Firestore...');
            const productsSnapshot = await firestore
                .collection('brands')
                .doc(brandId)
                .collection('products')
                .limit(10)
                .get();

            console.log(`Found ${productsSnapshot.size} products in Firestore`);

            if (!productsSnapshot.empty) {
                console.log('\n📦 Sample Products:');
                productsSnapshot.docs.slice(0, 5).forEach((doc, idx) => {
                    const data = doc.data();
                    console.log(`\n${idx + 1}. ${data.name}`);
                    console.log(`   Brand: ${data.brandName || 'Unknown'}`);
                    console.log(`   Category: ${data.category || 'Unknown'}`);
                    console.log(`   Price: $${data.price || 0}`);
                    console.log(`   THC: ${data.thcPercent || 'N/A'}%`);
                });
            }

            console.log('\n✅ Products are now available for:');
            console.log('   - Headless menu at bakedbot.ai/thrivesyracuse');
            console.log('   - Smokey AI budtender widget');
            console.log('   - Dashboard analytics');
            console.log('   - All agent tools (Ezal, Craig, etc.)');
        } else {
            console.log('\n⚠️  No products were synced');
            console.log('   Check Alleaves menu to ensure products exist');
        }

    } catch (error) {
        console.error('\n❌ SYNC FAILED\n');
        console.error('Error details:');
        console.error(error);
        console.log('\nTroubleshooting:');
        console.log('1. Verify ALLEAVES_API_KEY is correct');
        console.log('2. Check network access to api.alleaves.com');
        console.log('3. Ensure location is properly configured');
        console.log('4. Check Firebase permissions');
        process.exit(1);
    }
}

// Run sync
manualSync()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
