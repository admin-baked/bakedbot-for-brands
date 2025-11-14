
import * as functions from 'firebase-functions';
import { generateReviewEmbeddings } from '../tools/generate-review-embeddings';

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

    