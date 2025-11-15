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
 */
export const updateReviewEmbeddingsOnChange = onDocumentWritten(
    "products/{productId}/reviews/{reviewId}",
    async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
        const productId = event.params.productId;
        logger.info(`Review changed for product ${productId}. Embedding regeneration is disabled.`);
    }
);


/**
 * A scheduled function that can be run manually to refresh all embeddings.
 * This is useful for backfilling data or recovering from errors.
 */
export const refreshAllReviewEmbeddings = onSchedule("every 24 hours", async () => {
    logger.info("Skipping scheduled job to refresh all review embeddings.");
});
