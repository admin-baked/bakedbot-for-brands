
/**
 * @fileoverview A one-time script to iterate through all existing products
 * and generate the initial review summary embeddings.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServerClient } from '../src/firebase/server-client';
import { generateReviewEmbeddings } from '../src/ai/tools/generate-review-embeddings';

async function initializeReviewEmbeddings() {
  console.log('Starting one-time initialization of review embeddings...');
  
  const { firestore } = await createServerClient();
  const productsSnapshot = await firestore.collection('products').get();
  
  if (productsSnapshot.empty) {
    console.log('No products found in the database. Exiting.');
    return;
  }

  console.log(`Found ${productsSnapshot.size} products to process.`);

  const promises = productsSnapshot.docs.map(async (doc) => {
    const productId = doc.id;
    console.log(`- Processing product: ${productId}`);
    try {
      // Use the existing tool to generate the embedding
      const result = await generateReviewEmbeddings.run({ productId });
      console.log(`  ✅ Success! Generated embedding for ${result.reviewCount} reviews.`);
    } catch (error: any) {
      // The tool throws an error if no reviews exist, which is expected.
      if (error.message.includes('No reviews found')) {
        console.log(`  ⚪️ Skipped (no reviews found).`);
      } else {
        console.error(`  ❌ Error processing product ${productId}:`, error.message);
      }
    }
  });

  await Promise.all(promises);

  console.log('\nInitialization complete. All products have been processed.');
}

initializeReviewEmbeddings().catch(console.error);

    