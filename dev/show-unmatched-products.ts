/**
 * Show products that didn't match with Dispense API
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
if (apps.length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

async function showUnmatchedProducts() {
    console.log('🔍 Finding products that didn\'t match with Dispense API...\n');
    console.log('═'.repeat(70));

    const productsSnapshot = await db.collection('tenants')
        .doc('org_thrive_syracuse')
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    const unmatchedProducts: any[] = [];
    const matchedProducts: any[] = [];

    productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        if (product.imageSource === 'dispense_api') {
            matchedProducts.push({
                id: doc.id,
                name: product.name,
                category: product.category,
                brandName: product.brandName,
                imageUrl: product.imageUrl,
            });
        } else {
            unmatchedProducts.push({
                id: doc.id,
                name: product.name,
                category: product.category,
                brandName: product.brandName,
                imageUrl: product.imageUrl,
                imageSource: product.imageSource || 'none',
            });
        }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total products: ${productsSnapshot.size}`);
    console.log(`   Matched with Dispense: ${matchedProducts.length}`);
    console.log(`   Unmatched: ${unmatchedProducts.length}`);

    console.log(`\n\n📋 Unmatched Products (${unmatchedProducts.length}):`);
    console.log('═'.repeat(70));

    unmatchedProducts.forEach((product, idx) => {
        console.log(`\n${idx + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Brand: ${product.brandName || 'N/A'}`);
        console.log(`   Category: ${product.category || 'N/A'}`);
        console.log(`   Image Source: ${product.imageSource}`);
        console.log(`   Current Image: ${product.imageUrl?.substring(0, 80)}...`);
    });

    // Save to file for easier inspection
    fs.writeFileSync(
        'dev/unmatched-products.json',
        JSON.stringify(unmatchedProducts, null, 2)
    );

    console.log('\n\n💾 Saved full list to dev/unmatched-products.json');

    // Show Thrive menu link for manual verification
    console.log('\n\n🔗 Manual Verification Links:');
    console.log('   Thrive Menu: https://thrivesyracuse.com/menu');
    console.log('   Search products by name to verify if they exist\n');
}

showUnmatchedProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
