import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Cloud Function that listens for writes to the /users/{userId} collection.
 * When a user document is created or updated, it reads the role, brandId, and locationId
 * and sets them as custom claims on the corresponding Firebase Auth user.
 */
export const setUserClaims = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const afterData = event.data?.after.data();

  // If there's no data after the write (e.g., a delete), we can't do anything.
  if (!afterData) {
    logger.info(`User document for ${userId} was deleted, no claims to update.`);
    return null;
  }

  // Extract the claims from the document.
  // Ensure they are strings or null, as custom claims have type limitations.
  const role = afterData.role || null;
  const brandId = afterData.brandId || null;
  const locationId = afterData.locationId || null;

  try {
    // Construct the claims object, filtering out any null values.
    const claimsToSet: { [key: string]: any } = {};
    if (role) claimsToSet.role = role;
    if (brandId) claimsToSet.brandId = brandId;
    if (locationId) claimsToSet.locationId = locationId;
    
    // If there are no claims to set, we can exit early.
    if (Object.keys(claimsToSet).length === 0) {
        logger.info(`No new claims to set for user ${userId}.`);
        return null;
    }

    // Set the custom claims on the user's authentication token.
    await getAuth().setCustomUserClaims(userId, claimsToSet);

    logger.info(`Successfully set custom claims for user ${userId}:`, claimsToSet);
    return { result: `Custom claims set for ${userId}` };

  } catch (error) {
    logger.error(`Error setting custom claims for user ${userId}:`, error);
    // Re-throwing the error will cause the function to retry if it's a transient issue.
    throw error;
  }
});
