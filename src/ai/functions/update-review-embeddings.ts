
import * as functions from 'firebase-functions';
import { generateReviewEmbeddings } from '../tools/generate-review-embeddings';
import { createServerClient } from '@/firebase/server-client';

/**
 * A Cloud Function that automatically triggers when a review is written (created, updated, or deleted).
 * It then calls the `generateReviewEmbeddings` tool to regenerate the embedding for the associated product.
 */
export const updateReviewEmbeddingsOnChange = functions.firestore
  .document('products/{productId}/reviews/{reviewId}')
  .onWrite(async (change, context) => {
    const { productId } = context.params;

    // We don't need the review data itself, just the product ID to trigger the regeneration.
    console.log(`Review changed for product: ${productId}. Triggering embedding regeneration.`);

    try {
      // Run the existing Genkit tool to regenerate the summary and embedding.
      // The brandId is optional and not strictly needed for this operation.
      await generateReviewEmbeddings.run({ productId });
      console.log(`Successfully regenerated review embedding for product: ${productId}`);
      return null;
    } catch (error) {
      console.error(`Failed to regenerate review embedding for product: ${productId}`, error);
      // We don't re-throw the error, as we don't want the function to be retried indefinitely.
      return null;
    }
  });


/**
 * An HTTPS-callable function to manually refresh all review embeddings.
 * This is useful for backfilling data or fixing inconsistencies.
 */
export const refreshAllReviewEmbeddings = functions.https.onCall(async (data, context) => {
  // Optional: Add authentication check to ensure only admins can run this.
  // if (!context.auth || !context.auth.token.isAdmin) {
  //   throw new functions.https.HttpsError('permission-denied', 'Must be an admin to run this operation.');
  // }
  
  const { createServerClient } = await import('@/firebase/server-client');
  const { firestore } = await createServerClient();
  const productsSnapshot = await firestore.collection('products').get();

  const promises = productsSnapshot.docs.map(doc => {
      console.log(`Queueing embedding generation for product: ${doc.id}`);
      return generateReviewEmbeddings.run({ productId: doc.id }).catch(e => {
          console.error(`Failed to process product ${doc.id}:`, e.message);
      });
  });

  await Promise.all(promises);

  return {
    status: 'complete',
    message: `Processed ${productsSnapshot.size} products. Check logs for individual successes or failures.`,
  };
});


/**
 * A one-time, publicly-callable HTTP function to initialize review embeddings for all products.
 * SECURE THIS FUNCTION OR REMOVE IT AFTER USE.
 */
export const initializeReviewEmbeddings = functions.https.onRequest(async (req, res) => {
    // Optional: Basic secret key authentication
    const secret = process.env.INITIALIZATION_SECRET;
    if (secret && req.query.secret !== secret) {
        console.warn('Unauthorized attempt to run initializeReviewEmbeddings');
        res.status(403).send('Forbidden');
        return;
    }

    console.log('🚀 Starting one-time initialization of review embeddings...');

    try {
        const { firestore } = await createServerClient();
        const productsSnapshot = await firestore.collection('products').get();
        
        const results = [];
        let successCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const doc of productsSnapshot.docs) {
            const productId = doc.id;
            const product = doc.data();
            let status = 'skipped';
            let detail = 'No reviews found.';
            
            try {
                // The generateReviewEmbeddings tool already contains the logic
                // to fetch reviews, summarize, embed, and save.
                const result = await generateReviewEmbeddings.run({ productId });
                
                // This tool throws an error if no reviews are found, which we catch.
                status = 'success';
                detail = `Generated embedding for ${result.reviewCount} reviews.`;
                successCount++;
                results.push({ productId, productName: product.name, status, detail });
                console.log(`[${productId}] ✅ ${detail}`);
                
            } catch (e: any) {
                if (e.message.includes('No reviews found')) {
                    skippedCount++;
                    results.push({ productId, productName: product.name, status: 'skipped', detail: e.message });
                    console.log(`[${productId}] ⚪️ Skipped (no reviews).`);
                } else {
                    failedCount++;
                    results.push({ productId, productName: product.name, status: 'failed', detail: e.message });
                    console.error(`[${productId}] ❌ Failed:`, e.message);
                }
            }
            // Simple rate limiting to avoid hitting API limits too quickly
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const summary = {
            totalProducts: productsSnapshot.size,
            successful: successCount,
            skipped: skippedCount,
            failed: failedCount
        };

        console.log('✅ Initialization complete.', summary);
        res.status(200).json({
            success: true,
            message: "Review embeddings initialization completed.",
            summary,
            results,
        });

    } catch (error: any) {
        console.error('❌ Fatal error during initialization:', error);
        res.status(500).json({
            success: false,
            message: `An error occurred: ${error.message}`,
        });
    }
});
    