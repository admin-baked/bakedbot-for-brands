/**
 * Test the full POS sync for Thrive Syracuse
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { syncPOSProducts } from '../src/server/actions/pos-sync';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
if (apps.length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ firebase-service-account.json not found');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function testPOSSync() {
    console.log('🧪 Testing POS Sync for Thrive Syracuse\n');

    const brandId = 'thrivesyracuse';
    const orgId = 'org_thrive_syracuse';
    const locationId = 'loc_thrive_syracuse_main';

    // Set environment variables for testing
    process.env.ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
    process.env.ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!';
    process.env.ALLEAVES_PIN = '1234';

    try {
        console.log('1️⃣  Fetching brand configuration...');
        const brandDoc = await db.collection('brands').doc(brandId).get();
        if (!brandDoc.exists) {
            throw new Error(`Brand ${brandId} not found`);
        }
        console.log('   ✅ Brand found\n');

        console.log('2️⃣  Fetching location configuration...');
        const locationDoc = await db.collection('locations').doc(locationId).get();

        if (!locationDoc.exists) {
            throw new Error(`Location ${locationId} not found`);
        }

        const location = locationDoc.data();
        console.log('   ✅ Location found:', location?.id);
        console.log('   📍 POS Provider:', location?.posConfig?.provider);
        console.log('   📍 Alleaves Location ID:', location?.posConfig?.locationId);
        console.log('');

        console.log('3️⃣  Starting POS sync...');
        console.log('   This will fetch 395 products from Alleaves API\n');

        const result = await syncPOSProducts(locationId, orgId);

        console.log('\n✅ POS Sync Complete!\n');
        console.log('═'.repeat(60));
        console.log('📊 SYNC RESULTS');
        console.log('═'.repeat(60));
        console.log(`Total Products: ${result.totalProducts}`);
        console.log(`Added:          ${result.added}`);
        console.log(`Updated:        ${result.updated}`);
        console.log(`Errors:         ${result.errors.length}`);
        console.log('═'.repeat(60));

        if (result.errors.length > 0) {
            console.log('\n⚠️  Errors encountered:\n');
            result.errors.forEach((err, idx) => {
                console.log(`${idx + 1}. ${err}`);
            });
        }

        console.log('\n4️⃣  Verifying products in Firestore...');
        const productsSnapshot = await db.collection('brands')
            .doc(brandId)
            .collection('products')
            .limit(5)
            .get();

        console.log(`   ✅ Found ${productsSnapshot.size} products (showing first 5):\n`);

        productsSnapshot.forEach((doc, idx) => {
            const product = doc.data();
            console.log(`   ${idx + 1}. ${product.name}`);
            console.log(`      Brand: ${product.brand}`);
            console.log(`      Category: ${product.category}`);
            console.log(`      Price: $${product.price?.toFixed(2) || '0.00'}`);
            console.log(`      Stock: ${product.stock}`);
            if (product.thcPercent) {
                console.log(`      THC: ${product.thcPercent}%`);
            }
            console.log('');
        });

        console.log('✅ POS Sync test completed successfully!');
        console.log('\n🎯 Next: Visit https://bakedbot.ai/thrivesyracuse to see products in Smokey widget');

    } catch (error) {
        console.error('\n❌ POS Sync failed:', error);
        throw error;
    }
}

testPOSSync()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
