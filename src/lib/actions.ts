
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
  const { firestore, auth } = await createServerClient();
  const user = auth.currentUser;

  // This check is commented out, but if we require auth, this is where it would be.
  // if (!user) {
  //   return { success: false, message: 'You must be logged in to provide feedback.' };
  // }

  const productRef = doc(firestore, 'products', productId);
  const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';
  const updatePayload = { [fieldToUpdate]: increment(1) };

  // Use non-blocking updateDoc and chain a .catch for error handling.
  updateDoc(productRef, updatePayload)
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
          path: productRef.path,
          operation: 'update',
          // For increments, the data is computed on the server.
          // We can represent this conceptually in the error.
          requestResourceData: { [fieldToUpdate]: 'increment(1)' } 
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });

  return { success: true, message: 'Feedback submitted successfully.' };
}

