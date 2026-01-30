/**
 * Verify all products have price (either real or $0)
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

async function checkZeroPrices() {
    console.log('💰 Verifying All Products Have Price Field\n');

    const orgId = 'org_thrive_syracuse';

    try {
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        console.log(`Total products: ${productsSnapshot.size}\n`);

        let withRealPrices = 0;
        let withZeroPrices = 0;
        let withUndefinedPrices = 0;
        let withNullPrices = 0;

        const priceStats = new Map<number, number>();

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const price = product.price;

            if (price === undefined) {
                withUndefinedPrices++;
            } else if (price === null) {
                withNullPrices++;
            } else if (price === 0) {
                withZeroPrices++;
            } else if (price > 0) {
                withRealPrices++;
                // Track price distribution
                const rounded = Math.floor(price / 10) * 10;
                priceStats.set(rounded, (priceStats.get(rounded) || 0) + 1);
            }
        });

        console.log('📊 Price Field Status:\n');
        console.log(`   ✅ Products with real prices:  ${withRealPrices} (${((withRealPrices / productsSnapshot.size) * 100).toFixed(1)}%)`);
        console.log(`   💲 Products with $0 price:     ${withZeroPrices} (${((withZeroPrices / productsSnapshot.size) * 100).toFixed(1)}%)`);
        console.log(`   ⚠️  Products with undefined:    ${withUndefinedPrices}`);
        console.log(`   ⚠️  Products with null:         ${withNullPrices}`);

        if (withUndefinedPrices === 0 && withNullPrices === 0) {
            console.log('\n   ✅ SUCCESS! All products have a price field (either real or $0)');
        } else {
            console.log('\n   ⚠️  WARNING! Some products missing price field');
        }

        if (withRealPrices > 0) {
            console.log('\n📈 Price Distribution (for products with real prices):\n');
            const sortedPrices = Array.from(priceStats.entries()).sort((a, b) => a[0] - b[0]);
            sortedPrices.forEach(([range, count]) => {
                console.log(`   $${range}-${range + 9}: ${count} products`);
            });
        }

        // Show some examples
        console.log('\n📝 Sample Products:\n');
        let realCount = 0;
        let zeroCount = 0;

        for (const doc of productsSnapshot.docs) {
            if (realCount >= 5 && zeroCount >= 5) break;

            const product = doc.data();
            const price = product.price;

            if (price > 0 && realCount < 5) {
                realCount++;
                console.log(`   ✅ ${product.name}`);
                console.log(`      Price: $${price.toFixed(2)} | Category: ${product.category}`);
            } else if (price === 0 && zeroCount < 5) {
                zeroCount++;
                console.log(`   💲 ${product.name}`);
                console.log(`      Price: $0.00 | Category: ${product.category}`);
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('\n🎯 Summary:\n');
        console.log(`   Total Products: ${productsSnapshot.size}`);
        console.log(`   With Real Prices: ${withRealPrices}`);
        console.log(`   Marked as $0: ${withZeroPrices}`);
        console.log(`   Status: ${withUndefinedPrices === 0 && withNullPrices === 0 ? '✅ All products have price field' : '⚠️ Some products missing price'}`);

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

checkZeroPrices()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
