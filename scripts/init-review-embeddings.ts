

/**
 * @fileoverview One-time script to generate and store review embeddings for existing products.
 *
 * This script iterates through all products in the 'products' collection,
 * calls the 'generateReviewEmbeddings' tool for each one, and populates the
 * 'productReviewEmbeddings' subcollection. This is used to backfill embeddings
 * for products that existed before the automated Cloud Function was deployed.
 *
 * Usage:
 * npx tsx scripts/init-review-embeddings.ts
 */

import { createServerClient } from '@/firebase/server-client';
import admin from 'firebase-admin';
import { generateReviewEmbeddings } from '@/ai/tools/generate-review-embeddings';

const main = async () => {
    console.log('🚀 Starting one-time initialization of review embeddings...');

    try {
        const { firestore } = await createServerClient();
        const productsSnapshot = await firestore.collection('products').get();

        if (productsSnapshot.empty) {
            console.log('No products found. Exiting.');
            return;
        }
        
        console.log(`Found ${productsSnapshot.docs.length} products to process.`);

        for (const productDoc of productsSnapshot.docs) {
            const productId = productDoc.id;
            const productName = productDoc.data().name;
            const brandId = productDoc.data().brandId || 'bakedbot-brand-id';
            
            process.stdout.write(`- Processing product: ${productName} (${productId})... `);

            try {
                // Call the existing tool to perform the generation and saving
                const result = await generateReviewEmbeddings.run({ productId, brandId });
                
                if (result.reviewCount === 0) {
                     process.stdout.write('⚪️ Skipped (no reviews found).\n');
                } else {
                     process.stdout.write(`✅ Success! Generated embedding for ${result.reviewCount} reviews.\n`);
                }

            } catch (error) {
                 process.stdout.write(`❌ Error: ${(error as Error).message}\n`);
            }
             // Add a small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('✅ Initialization complete. All products have been processed.');
        process.exit(0);

    } catch (error) {
        console.error('A fatal error occurred during initialization:', error);
        process.exit(1);
    }
};

main();
