/**
 * Create sample bundle deals from real Thrive Syracuse product data
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

interface Product {
    id: string;
    name: string;
    brandName: string;
    category: string;
    price: number;
    thcPercent?: number;
    cbdPercent?: number;
}

async function createSampleBundles() {
    console.log('🎁 Creating Sample Bundles from Real Product Data\n');
    console.log('═'.repeat(70));

    const orgId = 'org_thrive_syracuse';
    const brandId = 'thrivesyracuse';

    try {
        // Fetch all products
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        const products: Product[] = productsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Product));

        console.log(`\n📊 Total Products: ${products.length}\n`);

        // Organize products by category
        const byCategory = new Map<string, Product[]>();
        products.forEach(product => {
            const category = product.category || 'Uncategorized';
            if (!byCategory.has(category)) {
                byCategory.set(category, []);
            }
            byCategory.get(category)!.push(product);
        });

        console.log('📂 Categories Available:');
        Array.from(byCategory.entries()).forEach(([category, items]) => {
            console.log(`   ${category}: ${items.length} products`);
        });

        // Bundle 1: Starter Pack (Flower + Vape + Edible)
        const flower = byCategory.get('flower')?.filter(p => p.price > 0)[0];
        const vape = byCategory.get('vapes')?.filter(p => p.price > 0)[0];
        const edible = byCategory.get('edibles')?.filter(p => p.price > 0)[0];

        const bundles: any[] = [];

        if (flower && vape && edible) {
            const regularPrice = flower.price + vape.price + edible.price;
            const bundlePrice = Math.round(regularPrice * 0.85 * 100) / 100; // 15% off

            bundles.push({
                id: 'bundle-starter-pack',
                brandId,
                name: 'Starter Pack',
                description: 'Perfect introduction to cannabis - flower, vape, and edible',
                products: [
                    { productId: flower.id, quantity: 1 },
                    { productId: vape.id, quantity: 1 },
                    { productId: edible.id, quantity: 1 }
                ],
                regularPrice,
                bundlePrice,
                savings: Math.round((regularPrice - bundlePrice) * 100) / 100,
                imageUrl: flower.imageUrl || '/images/bundle-placeholder.jpg',
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        // Bundle 2: Vape Lovers Pack (Multiple cartridges/AIOs)
        const vapes = byCategory.get('vapes')?.filter(p => p.price > 0).slice(0, 3) || [];

        if (vapes.length >= 2) {
            const regularPrice = vapes.reduce((sum, v) => sum + v.price, 0);
            const bundlePrice = Math.round(regularPrice * 0.80 * 100) / 100; // 20% off

            bundles.push({
                id: 'bundle-vape-pack',
                brandId,
                name: 'Vape Variety Pack',
                description: `${vapes.length} premium vape cartridges at a special price`,
                products: vapes.map(v => ({ productId: v.id, quantity: 1 })),
                regularPrice,
                bundlePrice,
                savings: Math.round((regularPrice - bundlePrice) * 100) / 100,
                imageUrl: vapes[0].imageUrl || '/images/bundle-placeholder.jpg',
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        // Bundle 3: Flower Variety Pack
        const flowers = byCategory.get('flower')?.filter(p => p.price > 0).slice(0, 4) || [];

        if (flowers.length >= 3) {
            const regularPrice = flowers.reduce((sum, p) => sum + p.price, 0);
            const bundlePrice = Math.round(regularPrice * 0.78 * 100) / 100; // 22% off

            bundles.push({
                id: 'bundle-flower-variety',
                brandId,
                name: 'Flower Variety Pack',
                description: `${flowers.length} premium flower strains to explore`,
                products: flowers.map(p => ({ productId: p.id, quantity: 1 })),
                regularPrice,
                bundlePrice,
                savings: Math.round((regularPrice - bundlePrice) * 100) / 100,
                imageUrl: flowers[0].imageUrl || '/images/bundle-placeholder.jpg',
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        // Bundle 4: Edibles Sampler
        const edibles = byCategory.get('edibles')?.filter(p => p.price > 0).slice(0, 4) || [];

        if (edibles.length >= 2) {
            const regularPrice = edibles.reduce((sum, e) => sum + e.price, 0);
            const bundlePrice = Math.round(regularPrice * 0.85 * 100) / 100; // 15% off

            bundles.push({
                id: 'bundle-edibles-sampler',
                brandId,
                name: 'Edibles Sampler',
                description: `Try ${edibles.length} different edibles and find your favorite`,
                products: edibles.map(e => ({ productId: e.id, quantity: 1 })),
                regularPrice,
                bundlePrice,
                savings: Math.round((regularPrice - bundlePrice) * 100) / 100,
                imageUrl: edibles[0].imageUrl || '/images/bundle-placeholder.jpg',
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        // Bundle 5: Weekend Warrior (High THC focus)
        const highThc = products
            .filter(p => p.price > 0 && p.thcPercent && p.thcPercent > 20)
            .sort((a, b) => (b.thcPercent || 0) - (a.thcPercent || 0))
            .slice(0, 3);

        if (highThc.length >= 2) {
            const regularPrice = highThc.reduce((sum, p) => sum + p.price, 0);
            const bundlePrice = Math.round(regularPrice * 0.82 * 100) / 100; // 18% off

            bundles.push({
                id: 'bundle-weekend-warrior',
                brandId,
                name: 'Weekend Warrior',
                description: 'High-potency products for experienced users',
                products: highThc.map(p => ({ productId: p.id, quantity: 1 })),
                regularPrice,
                bundlePrice,
                savings: Math.round((regularPrice - bundlePrice) * 100) / 100,
                imageUrl: highThc[0].imageUrl || '/images/bundle-placeholder.jpg',
                isActive: true,
                createdAt: new Date().toISOString()
            });
        }

        console.log('\n\n🎁 SAMPLE BUNDLES CREATED:\n');
        bundles.forEach((bundle, idx) => {
            console.log(`${idx + 1}. ${bundle.name}`);
            console.log(`   Description: ${bundle.description}`);
            console.log(`   Products: ${bundle.products.length} items`);
            console.log(`   Regular Price: $${bundle.regularPrice.toFixed(2)}`);
            console.log(`   Bundle Price: $${bundle.bundlePrice.toFixed(2)}`);
            console.log(`   Savings: $${bundle.savings.toFixed(2)} (${Math.round((bundle.savings / bundle.regularPrice) * 100)}% off)`);
            console.log('');
        });

        // Save bundles to Firestore
        console.log('\n💾 Saving bundles to Firestore...\n');

        for (const bundle of bundles) {
            await db.collection('bundles').doc(bundle.id).set(bundle);
            console.log(`   ✅ Saved: ${bundle.name}`);
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✨ Successfully created ${bundles.length} sample bundles!`);
        console.log('\n📍 View them at: bakedbot.ai/thrivesyracuse');

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

createSampleBundles()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
