/**
 * Verify products are in Firestore after sync
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
    console.log('🔍 Verifying Products in Firestore\n');

    const brandId = 'thrivesyracuse';
    const orgId = 'org_thrive_syracuse';

    try {
        // Check products collection
        console.log('1️⃣  Checking products in brand collection...');
        const brandProductsSnapshot = await db.collection('brands')
            .doc(brandId)
            .collection('products')
            .get();

        console.log(`   ✅ Found ${brandProductsSnapshot.size} products in brands/${brandId}/products\n`);

        // Check org products collection
        console.log('2️⃣  Checking products in org collection...');
        const orgProductsSnapshot = await db.collection('orgs')
            .doc(orgId)
            .collection('products')
            .get();

        console.log(`   ✅ Found ${orgProductsSnapshot.size} products in orgs/${orgId}/products\n`);

        // Show sample products
        console.log('3️⃣  Sample products from brand collection:\n');
        const sampleProducts = brandProductsSnapshot.docs.slice(0, 10);

        sampleProducts.forEach((doc, idx) => {
            const product = doc.data();
            console.log(`   ${idx + 1}. ${product.name}`);
            console.log(`      ID: ${doc.id}`);
            console.log(`      Brand: ${product.brand || 'Unknown'}`);
            console.log(`      Category: ${product.category || 'Unknown'}`);
            console.log(`      Price: $${product.price?.toFixed(2) || '0.00'}`);
            console.log(`      Stock: ${product.stock || 0}`);
            if (product.thc) {
                console.log(`      THC: ${product.thc}%`);
            }
            if (product.cbd) {
                console.log(`      CBD: ${product.cbd}%`);
            }
            console.log('');
        });

        // Category breakdown
        console.log('4️⃣  Category breakdown:\n');
        const categories: Record<string, number> = {};
        brandProductsSnapshot.forEach(doc => {
            const product = doc.data();
            const cat = product.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                console.log(`   ${category.padEnd(20)} ${count} items`);
            });

        console.log('\n✅ Verification complete!');
        console.log(`\n🎯 Next: Visit https://bakedbot.ai/${brandId} to see products in action`);

    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        throw error;
    }
}

verifyProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
