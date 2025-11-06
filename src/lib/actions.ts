
'use server';

import { createServerClient } from '@/firebase/server-client';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * Updates the like or dislike count for a product in Firestore.
 * @param productId The ID of the product to update.
 * @param feedbackType Whether to increment 'likes' or 'dislikes'.
 */
export async function updateProductFeedback(
  productId: string,
  feedbackType: 'like' | 'dislike'
): Promise<{ success: boolean; message: string }> {
  try {
    const { firestore, auth } = await createServerClient();
    // Although rules might not need the user to be logged in, it's good practice
    // to check on the server action if you intend for it to be a user-driven action.
    const user = auth.currentUser;
    if (!user) {
        // This might not be the desired behavior if anonymous feedback is allowed,
        // adjust as needed based on your application's requirements.
        // return { success: false, message: 'You must be logged in to provide feedback.' };
    }

    const productRef = doc(firestore, 'products', productId);
    const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';
    const updatePayload = { [fieldToUpdate]: increment(1) };

    // Use the non-blocking updateDoc for a fire-and-forget experience, but catch errors.
    updateDoc(productRef, updatePayload)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            requestResourceData: { /* For increments, the data is computed, not sent */ }
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });

    return { success: true, message: 'Feedback submitted successfully.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`Failed to update feedback for product ${productId}:`, errorMessage);
    // This outer catch block will handle setup errors, not Firestore rule errors.
    return { success: false, message: `Failed to submit feedback: ${errorMessage}` };
  }
}
