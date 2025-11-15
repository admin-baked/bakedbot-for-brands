
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onDocumentWritten, type FirestoreEvent } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, QueryDocumentSnapshot } from "firebase-admin/firestore";


// Initialize Firebase Admin SDK
initializeApp();


/**
 * A Cloud Function that triggers whenever a product review is written (created, updated, or deleted).
 * It calls the `generateReviewEmbeddings` tool to regenerate the summary and embedding for the affected product.
 *
 * TODO: The 'generateReviewEmbeddings' tool was removed. This function needs to be updated to call a new, valid Genkit flow.
 */
export const updateReviewEmbeddingsOnChange = onDocumentWritten(
    "products/{productId}/reviews/{reviewId}",
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
        const productId = event.params.productId;
        logger.info(`Review changed for product ${productId}. Auto-embedding generation is disabled.`);
        // Original logic is commented out to prevent errors.
        /*
        try {
            logger.info(`Review changed for product ${productId}. Triggering embedding regeneration.`);
            // const brandId = (await getFirestore().doc(`products/${productId}`).get()).data()?.brandId || 'bakedbot-brand-id';
            // await generateReviewEmbeddings.run({ productId, brandId });
            logger.info(`Successfully regenerated embedding for product ${productId}.`);
        } catch (error) {
            logger.error(`Failed to regenerate embedding for product ${productId}:`, error);
        }
        */
    }
);


/**
 * A scheduled function that can be run manually to refresh all embeddings.
 * This is useful for backfilling data or recovering from errors.
 *
 * TODO: The 'generateReviewEmbeddings' tool was removed. This function needs to be updated to call a new, valid Genkit flow.
 */
export const refreshAllReviewEmbeddings = onSchedule("every 24 hours", async () => {
    logger.info("Skipping scheduled job to refresh all review embeddings. The function is currently disabled.");
    // Original logic is commented out to prevent errors.
    /*
    logger.info("Starting scheduled job to refresh all review embeddings.");
    const db = getFirestore();
    try {
        const productsSnapshot = await db.collection('products').get();
        for (const productDoc of productsSnapshot.docs) {
            const productId = productDoc.id;
            const brandId = productDoc.data().brandId || 'bakedbot-brand-id';
            logger.info(`Refreshing embedding for product ${productId}...`);
            // await generateReviewEmbeddings.run({ productId, brandId });
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        }
        logger.info("Finished refreshing all review embeddings.");
    } catch (error) {
        logger.error("Error during scheduled refresh of review embeddings:", error);
    }
    */
});
