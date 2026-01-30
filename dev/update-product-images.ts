/**
 * Update existing Thrive Syracuse products with placeholder images
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { getPlaceholderImageForCategory } from '../src/lib/product-images';

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

async function updateProductImages() {
    console.log('🖼️  Updating Product Images for Thrive Syracuse\n');
    console.log('═'.repeat(70));

    const orgId = 'org_thrive_syracuse';

    try {
        // Fetch all products from publicViews
        const productsSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        console.log(`\n📊 Found ${productsSnapshot.size} products\n`);

        let updated = 0;
        let errors = 0;

        // Update each product with placeholder image
        for (const doc of productsSnapshot.docs) {
            try {
                const product = doc.data();
                const category = product.category || 'other';
                const imageUrl = getPlaceholderImageForCategory(category);

                await doc.ref.update({
                    imageUrl,
                    updatedAt: new Date().toISOString()
                });

                updated++;

                if (updated % 50 === 0) {
                    console.log(`   Updated ${updated}/${productsSnapshot.size} products...`);
                }
            } catch (error) {
                console.error(`   ❌ Failed to update ${doc.id}:`, error);
                errors++;
            }
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Update Complete!\n`);
        console.log(`   Successfully updated: ${updated} products`);
        if (errors > 0) {
            console.log(`   Errors: ${errors} products`);
        }

        // Show sample of updated products
        console.log('\n📸 Sample Updated Products:\n');
        const sampleDocs = productsSnapshot.docs.slice(0, 5);
        for (const doc of sampleDocs) {
            const refreshed = await doc.ref.get();
            const product = refreshed.data();
            console.log(`   ${product?.name}`);
            console.log(`      Category: ${product?.category}`);
            console.log(`      Image: ${product?.imageUrl}`);
            console.log('');
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

updateProductImages()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
