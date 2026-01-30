/**
 * Analyze brands from Thrive Syracuse product catalog
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

async function analyzeThriveBrands() {
    console.log('🔍 Analyzing Brands from Thrive Syracuse Catalog\n');
    console.log('═'.repeat(70));

    const orgId = 'org_thrive_syracuse';

    try {
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        console.log(`\n📊 Total Products: ${productsSnapshot.size}\n`);

        // Analyze brands
        const brandStats = new Map<string, {
            count: number;
            totalPrice: number;
            categories: Set<string>;
            avgPrice: number;
        }>();

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const brand = product.brandName || 'Unknown';
            const price = product.price || 0;
            const category = product.category || 'other';

            if (!brandStats.has(brand)) {
                brandStats.set(brand, {
                    count: 0,
                    totalPrice: 0,
                    categories: new Set(),
                    avgPrice: 0
                });
            }

            const stats = brandStats.get(brand)!;
            stats.count++;
            stats.totalPrice += price;
            stats.categories.add(category);
        });

        // Calculate averages and sort
        brandStats.forEach((stats, brand) => {
            stats.avgPrice = stats.totalPrice / stats.count;
        });

        const sortedBrands = Array.from(brandStats.entries())
            .sort((a, b) => b[1].count - a[1].count);

        console.log('🏢 TOP BRANDS BY PRODUCT COUNT\n');
        sortedBrands.slice(0, 20).forEach(([brand, stats], idx) => {
            const categoryList = Array.from(stats.categories).join(', ');
            console.log(`${idx + 1}. ${brand.padEnd(30)} ${String(stats.count).padStart(3)} products`);
            console.log(`   Avg Price: $${stats.avgPrice.toFixed(2).padStart(6)} | Categories: ${categoryList}`);
            console.log('');
        });

        // Featured brands (top 8 by product count, excluding "Unknown")
        console.log('\n' + '═'.repeat(70));
        console.log('\n✨ FEATURED BRANDS (Top 8, excluding Unknown)\n');

        const featuredBrands = sortedBrands
            .filter(([brand]) => brand !== 'Unknown')
            .slice(0, 8);

        const featuredBrandsJson = featuredBrands.map(([brand, stats]) => ({
            name: brand,
            productCount: stats.count,
            avgPrice: Math.round(stats.avgPrice * 100) / 100,
            categories: Array.from(stats.categories)
        }));

        console.log(JSON.stringify(featuredBrandsJson, null, 2));

        // Export featured brands
        const exportPath = path.join(process.cwd(), 'dev', 'thrive-featured-brands.json');
        fs.writeFileSync(exportPath, JSON.stringify(featuredBrandsJson, null, 2));
        console.log(`\n✅ Exported to: ${exportPath}`);

        // Category analysis
        console.log('\n' + '═'.repeat(70));
        console.log('\n📂 CATEGORY BREAKDOWN\n');

        const categoryStats = new Map<string, number>();
        productsSnapshot.docs.forEach(doc => {
            const category = doc.data().category || 'other';
            categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
        });

        const sortedCategories = Array.from(categoryStats.entries()).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, count]) => {
            const percentage = ((count / productsSnapshot.size) * 100).toFixed(1);
            console.log(`   ${category.padEnd(20)} ${String(count).padStart(3)} products (${percentage}%)`);
        });

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

analyzeThriveBrands()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
