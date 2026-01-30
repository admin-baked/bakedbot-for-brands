/**
 * Comprehensive verification of Thrive Syracuse product data
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

async function verifyProducts() {
    console.log('🔍 Comprehensive Product Verification\n');
    console.log('═'.repeat(60));

    const orgId = 'org_thrive_syracuse';

    try {
        // 1. Check Brand Configuration
        console.log('\n1️⃣  BRAND CONFIGURATION\n');
        const brandSnapshot = await db.collection('brands').where('id', '==', 'thrivesyracuse').get();

        if (brandSnapshot.empty) {
            console.log('   ❌ Brand not found');
            return;
        }

        const brand = brandSnapshot.docs[0].data();
        console.log(`   ✅ Brand: ${brand.name}`);
        console.log(`   📍 Org ID: ${brand.orgId || 'NOT SET'}`);
        console.log(`   🎨 Menu Design: ${brand.menuDesign || 'brand'}`);
        console.log(`   🔗 Slug: ${brand.slug}`);

        // 2. Check Total Products in publicViews
        console.log('\n2️⃣  PRODUCT CATALOG\n');
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        console.log(`   📦 Total Products: ${productsSnapshot.size}`);

        // 3. Category Breakdown
        console.log('\n3️⃣  CATEGORY BREAKDOWN\n');
        const categoryCount = new Map<string, number>();
        const categoriesWithPrices = new Map<string, { withPrice: number; total: number }>();

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const category = product.category || 'uncategorized';

            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);

            if (!categoriesWithPrices.has(category)) {
                categoriesWithPrices.set(category, { withPrice: 0, total: 0 });
            }

            const stats = categoriesWithPrices.get(category)!;
            stats.total++;
            if (product.price && product.price > 0) {
                stats.withPrice++;
            }
        });

        const sortedCategories = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, count]) => {
            const priceStats = categoriesWithPrices.get(category)!;
            const pricePercentage = ((priceStats.withPrice / priceStats.total) * 100).toFixed(0);
            console.log(`   ${category.padEnd(20)} ${String(count).padStart(3)} products (${pricePercentage}% with prices)`);
        });

        // 4. Pricing Statistics
        console.log('\n4️⃣  PRICING STATISTICS\n');
        let totalWithPrices = 0;
        let totalWithoutPrices = 0;
        const priceRanges = {
            '0-20': 0,
            '20-40': 0,
            '40-60': 0,
            '60+': 0
        };

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const price = product.price || 0;

            if (price > 0) {
                totalWithPrices++;
                if (price < 20) priceRanges['0-20']++;
                else if (price < 40) priceRanges['20-40']++;
                else if (price < 60) priceRanges['40-60']++;
                else priceRanges['60+']++;
            } else {
                totalWithoutPrices++;
            }
        });

        console.log(`   Products with prices:    ${totalWithPrices} (${((totalWithPrices / productsSnapshot.size) * 100).toFixed(1)}%)`);
        console.log(`   Products without prices: ${totalWithoutPrices} (${((totalWithoutPrices / productsSnapshot.size) * 100).toFixed(1)}%)`);
        console.log(`\n   Price Distribution:`);
        console.log(`   $0-20:    ${priceRanges['0-20']} products`);
        console.log(`   $20-40:   ${priceRanges['20-40']} products`);
        console.log(`   $40-60:   ${priceRanges['40-60']} products`);
        console.log(`   $60+:     ${priceRanges['60+']} products`);

        // 5. Sample Products
        console.log('\n5️⃣  SAMPLE PRODUCTS (First 10 with prices)\n');
        let samplesShown = 0;
        for (const doc of productsSnapshot.docs) {
            if (samplesShown >= 10) break;

            const product = doc.data();
            if (product.price && product.price > 0) {
                samplesShown++;
                console.log(`   ${samplesShown}. ${product.name}`);
                console.log(`      Category: ${product.category}`);
                console.log(`      Brand: ${product.brandName || 'Unknown'}`);
                console.log(`      Price: $${product.price.toFixed(2)}`);
                console.log('');
            }
        }

        // 6. Data Quality Check
        console.log('\n6️⃣  DATA QUALITY\n');
        let missingNames = 0;
        let missingCategories = 0;
        let missingBrands = 0;

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            if (!product.name) missingNames++;
            if (!product.category) missingCategories++;
            if (!product.brandName) missingBrands++;
        });

        console.log(`   ✅ Products with names:      ${productsSnapshot.size - missingNames}/${productsSnapshot.size}`);
        console.log(`   ✅ Products with categories: ${productsSnapshot.size - missingCategories}/${productsSnapshot.size}`);
        console.log(`   ⚠️  Products with brands:     ${productsSnapshot.size - missingBrands}/${productsSnapshot.size}`);

        // 7. Production Readiness
        console.log('\n7️⃣  PRODUCTION READINESS\n');
        const readinessChecks = {
            'Brand configured with orgId': brand.orgId === orgId,
            'Menu design set to dispensary': brand.menuDesign === 'dispensary',
            'Products synced': productsSnapshot.size > 0,
            'Majority have prices': totalWithPrices / productsSnapshot.size > 0.3,
            'Data quality good': missingNames === 0 && missingCategories === 0
        };

        Object.entries(readinessChecks).forEach(([check, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${check}`);
        });

        const allPassed = Object.values(readinessChecks).every(v => v);
        console.log(`\n   ${allPassed ? '🎉 READY FOR PRODUCTION' : '⚠️  NEEDS ATTENTION'}`);

        console.log('\n' + '═'.repeat(60));

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

verifyProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
