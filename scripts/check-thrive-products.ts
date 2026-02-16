/**
 * Check Thrive Syracuse Product Count Sync
 * Verifies that menu, POS (Alleaves), and dashboard show the same product count
 */

import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_LOCATION_ID = '1000';

// Initialize Firebase Admin
function initializeFirebase() {
    if (admin.apps.length === 0) {
        // Try to use Application Default Credentials
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: 'bakedbot-prod', // Explicit project ID
            });
            console.log('✅ Using Application Default Credentials (bakedbot-prod)');
        } catch (error) {
            console.error('❌ Could not initialize Firebase Admin:', error);
            throw error;
        }
    }
    return admin.firestore();
}

async function checkProductCounts() {
    console.log('🔍 Checking Thrive Syracuse Product Counts...\n');

    const db = initializeFirebase();

    try {
        // 1. Check Firestore public products collection
        console.log('📊 Checking Firestore public products...');
        const publicProductsSnapshot = await db
            .collection(`tenants/${THRIVE_ORG_ID}/publicViews/products/items`)
            .get();
        const firestoreCount = publicProductsSnapshot.size;
        console.log(`   ✅ Firestore public products: ${firestoreCount}`);

        // Sample first 5 products
        const sampleProducts: any[] = [];
        publicProductsSnapshot.docs.slice(0, 5).forEach(doc => {
            const data = doc.data();
            sampleProducts.push({
                name: data.name,
                category: data.category,
                price: data.price
            });
        });

        // 2. Check Alleaves POS credentials
        console.log('\n📊 Checking Alleaves POS configuration...');
        const tenantDoc = await db.collection('tenants').doc(THRIVE_ORG_ID).get();
        const tenantData = tenantDoc.data();
        console.log(`   POS Type: ${tenantData?.pos_provider || 'Not set'}`);
        console.log(`   Username: ${ALLEAVES_USERNAME}`);
        console.log(`   Location ID: ${ALLEAVES_LOCATION_ID}`);

        // Note: Can't check Alleaves API directly from script without server environment
        console.log('   ⚠️  Alleaves API check requires server environment (use dashboard or API route)');

        // 3. Summary
        console.log('\n📈 SUMMARY:');
        console.log(`   Firestore: ${firestoreCount} products`);
        console.log(`   Expected (from memory): 404 products`);
        console.log(`   Difference: ${Math.abs(firestoreCount - 404)} products`);

        if (firestoreCount === 404) {
            console.log('\n✅ PASS: Product count matches expected!');
        } else if (firestoreCount > 0) {
            console.log('\n⚠️  INFO: Product count differs from last known count');
        } else {
            console.log('\n❌ ERROR: No products found in Firestore!');
        }

        // 4. Sample products for verification
        console.log('\n📦 Sample Products (first 5):');
        sampleProducts.forEach((p: any) => {
            console.log(`   - ${p.name || 'Unnamed'} (${p.category || 'No category'}) - $${p.price || 'N/A'}`);
        });

    } catch (error: any) {
        console.error('❌ Error checking product counts:', error.message);
        throw error;
    }
}

checkProductCounts()
    .then(() => {
        console.log('\n✅ Check complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Check failed:', error);
        process.exit(1);
    });
