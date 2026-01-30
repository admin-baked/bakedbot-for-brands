/**
 * Detailed analysis of products with $0 prices
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

async function analyzeMissingPrices() {
    console.log('🔍 Analyzing Products with $0 Prices\n');
    console.log('═'.repeat(70));

    const orgId = 'org_thrive_syracuse';

    try {
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        const productsWithZero = productsSnapshot.docs.filter(doc => {
            const price = doc.data().price;
            return price === 0;
        });

        console.log(`\n📊 Overall Stats:\n`);
        console.log(`   Total Products: ${productsSnapshot.size}`);
        console.log(`   Products with $0: ${productsWithZero.length} (${((productsWithZero.length / productsSnapshot.size) * 100).toFixed(1)}%)`);

        // 1. Analyze by Category
        console.log('\n\n1️⃣  BREAKDOWN BY CATEGORY\n');
        const categoryStats = new Map<string, { total: number; withZero: number }>();

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const category = product.category || 'uncategorized';
            const price = product.price || 0;

            if (!categoryStats.has(category)) {
                categoryStats.set(category, { total: 0, withZero: 0 });
            }

            const stats = categoryStats.get(category)!;
            stats.total++;
            if (price === 0) {
                stats.withZero++;
            }
        });

        const sortedCategories = Array.from(categoryStats.entries()).sort((a, b) => b[1].total - a[1].total);
        sortedCategories.forEach(([category, stats]) => {
            const percentage = ((stats.withZero / stats.total) * 100).toFixed(0);
            const status = stats.withZero === 0 ? '✅' : stats.withZero === stats.total ? '❌' : '⚠️';
            console.log(`   ${status} ${category.padEnd(20)} ${String(stats.withZero).padStart(3)}/${String(stats.total).padStart(3)} missing (${percentage}%)`);
        });

        // 2. Analyze by Brand
        console.log('\n\n2️⃣  TOP BRANDS WITH MISSING PRICES\n');
        const brandStats = new Map<string, { total: number; withZero: number }>();

        productsWithZero.forEach(doc => {
            const product = doc.data();
            const brand = product.brandName || 'Unknown';

            if (!brandStats.has(brand)) {
                brandStats.set(brand, { total: 0, withZero: 0 });
            }

            brandStats.get(brand)!.withZero++;
        });

        // Count total products per brand
        productsSnapshot.docs.forEach(doc => {
            const brand = doc.data().brandName || 'Unknown';
            if (!brandStats.has(brand)) {
                brandStats.set(brand, { total: 0, withZero: 0 });
            }
            brandStats.get(brand)!.total++;
        });

        const sortedBrands = Array.from(brandStats.entries())
            .filter(([_, stats]) => stats.withZero > 0)
            .sort((a, b) => b[1].withZero - a[1].withZero)
            .slice(0, 15);

        sortedBrands.forEach(([brand, stats]) => {
            const percentage = ((stats.withZero / stats.total) * 100).toFixed(0);
            console.log(`   ${brand.padEnd(30)} ${String(stats.withZero).padStart(3)} missing (${percentage}% of their products)`);
        });

        // 3. Sample Products with $0
        console.log('\n\n3️⃣  SAMPLE PRODUCTS WITH $0 (First 25)\n');
        productsWithZero.slice(0, 25).forEach((doc, idx) => {
            const product = doc.data();
            console.log(`   ${idx + 1}. ${product.name}`);
            console.log(`      Brand: ${product.brandName || 'Unknown'} | Category: ${product.category}`);
            console.log(`      THC: ${product.thcPercent || 'N/A'}% | CBD: ${product.cbdPercent || 'N/A'}%`);
            console.log('');
        });

        // 4. Check for patterns in product names
        console.log('\n4️⃣  PATTERN ANALYSIS\n');

        const patterns = {
            'Pre-rolls/Joints': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('pre roll') || name.includes('preroll') || name.includes('joint');
            }).length,
            'Cartridges': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('cartridge') || name.includes('cart ');
            }).length,
            'Flower': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('flower') || name.includes('bud ');
            }).length,
            'Concentrates': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('concentrate') || name.includes('wax') || name.includes('shatter') || name.includes('rosin');
            }).length,
            'Edibles': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('gummies') || name.includes('gummy') || name.includes('edible');
            }).length,
            'Vapes/AIO': productsWithZero.filter(doc => {
                const name = doc.data().name.toLowerCase();
                return name.includes('aio') || name.includes('vape') || name.includes('pen');
            }).length,
        };

        Object.entries(patterns).forEach(([pattern, count]) => {
            if (count > 0) {
                console.log(`   ${pattern.padEnd(25)} ${count} products`);
            }
        });

        // 5. Export list for further investigation
        console.log('\n\n5️⃣  EXPORTING DETAILED LIST\n');

        const exportData = productsWithZero.map(doc => {
            const product = doc.data();
            return {
                id: doc.id,
                name: product.name,
                brand: product.brandName || 'Unknown',
                category: product.category,
                thc: product.thcPercent,
                cbd: product.cbdPercent,
            };
        });

        const exportPath = path.join(process.cwd(), 'dev', 'products-missing-prices.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        console.log(`   ✅ Exported ${exportData.length} products to:`);
        console.log(`      ${exportPath}`);

        // 6. Recommendations
        console.log('\n\n' + '═'.repeat(70));
        console.log('\n💡 RECOMMENDATIONS\n');

        const categoriesWithMostMissing = sortedCategories
            .filter(([_, stats]) => stats.withZero > 10)
            .map(([cat, stats]) => ({ cat, stats }));

        if (categoriesWithMostMissing.length > 0) {
            console.log('   1. Focus on these categories first:');
            categoriesWithMostMissing.forEach(({ cat, stats }) => {
                console.log(`      - ${cat}: ${stats.withZero} products missing prices`);
            });
        }

        if (sortedBrands.length > 0) {
            console.log('\n   2. Top brands to check in Alleaves:');
            sortedBrands.slice(0, 5).forEach(([brand, stats]) => {
                console.log(`      - ${brand}: ${stats.withZero} products`);
            });
        }

        console.log('\n   3. Check Alleaves admin for:');
        console.log('      - Are retail prices configured for these SKUs?');
        console.log('      - Is cost_of_good populated in inventory?');
        console.log('      - Are these products marked as "active" in POS?');

        console.log('\n   4. Verify in dev/investigate-pricing.ts:');
        console.log('      - Run to check raw API data for specific products');
        console.log('      - See if Alleaves API returns pricing fields');

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

analyzeMissingPrices()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
