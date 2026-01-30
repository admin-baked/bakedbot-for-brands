/**
 * Simple test of brand page data - what the menu uses
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

async function testBrandPage() {
    console.log('🧪 Testing Thrive Syracuse Brand Page\n');
    console.log('═'.repeat(60));

    try {
        // 1. Check brand configuration
        console.log('\n1️⃣  BRAND CONFIGURATION\n');
        const brandSnapshot = await db.collection('brands')
            .where('id', '==', 'thrivesyracuse')
            .limit(1)
            .get();

        if (brandSnapshot.empty) {
            console.log('   ❌ Brand not found');
            return;
        }

        const brand = brandSnapshot.docs[0].data();
        console.log(`   ✅ Brand: ${brand.name}`);
        console.log(`   📍 Org ID: ${brand.orgId}`);
        console.log(`   🎨 Menu Design: ${brand.menuDesign}`);

        // 2. Check products accessible via brand.orgId
        console.log('\n2️⃣  PRODUCT ACCESS (Menu & Chatbot)\n');
        if (brand.orgId) {
            const productsSnapshot = await db
                .collection('tenants')
                .doc(brand.orgId)
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .get();

            console.log(`   📦 Total Products: ${productsSnapshot.size}`);

            // Sample products
            const withPrices = productsSnapshot.docs.filter(doc => doc.data().price > 0);
            console.log(`   💰 Products with prices: ${withPrices.length} (${((withPrices.length / productsSnapshot.size) * 100).toFixed(1)}%)`);

            console.log(`\n   Sample Products (first 5 with prices):\n`);
            let count = 0;
            for (const doc of productsSnapshot.docs) {
                if (count >= 5) break;
                const product = doc.data();
                if (product.price && product.price > 0) {
                    count++;
                    console.log(`   ${count}. ${product.name}`);
                    console.log(`      Category: ${product.category}`);
                    console.log(`      Price: $${product.price.toFixed(2)}`);
                    console.log(`      Brand: ${product.brandName || 'Unknown'}`);
                    console.log('');
                }
            }

            // 3. Category breakdown
            console.log('\n3️⃣  CATEGORY BREAKDOWN\n');
            const categories = new Map<string, number>();
            productsSnapshot.docs.forEach(doc => {
                const category = doc.data().category || 'uncategorized';
                categories.set(category, (categories.get(category) || 0) + 1);
            });

            const sortedCategories = Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
            sortedCategories.forEach(([category, count]) => {
                console.log(`   ${category.padEnd(20)} ${count} products`);
            });

            // 4. Production readiness
            console.log('\n\n4️⃣  PRODUCTION READINESS\n');
            const readinessChecks = {
                'Brand has orgId configured': !!brand.orgId,
                'Menu design is dispensary': brand.menuDesign === 'dispensary',
                'Products available': productsSnapshot.size > 0,
                'Significant product count': productsSnapshot.size >= 300,
                'Pricing available': (withPrices.length / productsSnapshot.size) >= 0.4,
            };

            Object.entries(readinessChecks).forEach(([check, passed]) => {
                console.log(`   ${passed ? '✅' : '❌'} ${check}`);
            });

            const allPassed = Object.values(readinessChecks).every(v => v);
            console.log(`\n   ${allPassed ? '🎉 READY FOR PRODUCTION' : '⚠️  NEEDS ATTENTION'}`);

            console.log('\n' + '═'.repeat(60));
            console.log('\n📝 SUMMARY\n');
            console.log(`URL: https://bakedbot.ai/thrivesyracuse`);
            console.log(`Products: ${productsSnapshot.size}`);
            console.log(`With Prices: ${withPrices.length} (${((withPrices.length / productsSnapshot.size) * 100).toFixed(1)}%)`);
            console.log(`Categories: ${categories.size}`);

            if (allPassed) {
                console.log('\n✅ Menu and Chatbot are both production-ready!');
                console.log('   - Menu will display all products');
                console.log('   - Smokey AI chatbot will have access to all products');
                console.log('   - Both use the same data source (tenant publicViews)');
            }

        } else {
            console.log('   ❌ Brand does not have orgId configured');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
    }
}

testBrandPage()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
