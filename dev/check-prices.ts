/**
 * Verify that products now have prices
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

async function checkPrices() {
    console.log('💰 Checking Product Prices\n');

    const orgId = 'org_thrive_syracuse';

    try {
        // Check public views
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .limit(20)
            .get();

        console.log(`Total products checked: ${productsSnapshot.size}\n`);

        let withPrices = 0;
        let withoutPrices = 0;

        console.log('Sample Products:\n');
        productsSnapshot.docs.forEach((doc, idx) => {
            const product = doc.data();
            const price = product.price;

            if (price && price > 0) {
                withPrices++;
            } else {
                withoutPrices++;
            }

            if (idx < 10) {
                console.log(`${idx + 1}. ${product.name}`);
                console.log(`   Category: ${product.category}`);
                console.log(`   Price: $${price || 0}`);
                console.log(`   Brand: ${product.brandName || 'Unknown'}`);
                console.log('');
            }
        });

        console.log('═'.repeat(60));
        console.log(`\n📊 Summary:`);
        console.log(`   Products with prices: ${withPrices}/${productsSnapshot.size}`);
        console.log(`   Products without prices: ${withoutPrices}/${productsSnapshot.size}`);

        if (withPrices > 0) {
            console.log(`\n✅ SUCCESS! Prices are now being saved correctly!`);
        } else {
            console.log(`\n❌ ISSUE: No products have prices`);
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

checkPrices()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
