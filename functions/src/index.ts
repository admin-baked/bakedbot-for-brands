/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// This is a workaround to initialize Genkit on Cloud Functions.
// It's not ideal, but it's the current recommended approach.
import { generateReviewEmbeddings } from "./ai/tools/generate-review-embeddings";
import { findProductsByReviewContent } from "./ai/tools/find-products-by-review";


// Initialize Firebase Admin SDK
initializeApp();


/**
 * A Cloud Function that triggers whenever a product review is written (created, updated, or deleted).
 * It calls the `generateReviewEmbeddings` tool to regenerate the summary and embedding for the affected product.
 */
export const updateReviewEmbeddingsOnChange = onDocumentWritten(
    "products/{productId}/reviews/{reviewId}",
    async (event) => {
        const productId = event.params.productId;
        const productSnap = await getFirestore().collection("products").doc(productId).get();
        
        if (!productSnap.exists) {
            logger.error(`Product with ID ${productId} not found.`);
            return;
        }

        const brandId = productSnap.data()?.brandId || "bakedbot-brand-id";
        
        logger.info(`Review changed for product ${productId}. Regenerating embeddings...`);

        try {
            // We use .run() here because we are calling the tool directly as a function.
            await generateReviewEmbeddings.run({ productId, brandId });
            logger.info(`Successfully regenerated embeddings for product ${productId}.`);
        } catch (error) {
            logger.error(`Failed to regenerate embeddings for product ${productId}:`, error);
        }
    }
);


/**
 * A scheduled function that can be run manually to refresh all embeddings.
 * This is useful for backfilling data or recovering from errors.
 */
export const refreshAllReviewEmbeddings = onSchedule("every 24 hours", async () => {
    logger.info("Starting scheduled job to refresh all review embeddings...");
    const firestore = getFirestore();
    const productsSnapshot = await firestore.collection("products").get();

    for (const doc of productsSnapshot.docs) {
        const productId = doc.id;
        const brandId = doc.data().brandId || "bakedbot-brand-id";
        try {
            await generateReviewEmbeddings.run({ productId, brandId });
            logger.info(`Refreshed embeddings for product ${productId}`);
        } catch (error) {
            logger.error(`Failed to refresh embeddings for product ${productId}:`, error);
        }
    }
    logger.info("Finished refreshing all review embeddings.");
});
