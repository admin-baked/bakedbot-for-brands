
'use server';

import { createServerClient } from '@/firebase/server-client';
import { doc, increment, updateDoc } from 'firebase/firestore';

/**
 * Updates the like or dislike count for a product in Firestore.
 * @param productId The ID of the product to update.
 * @param feedbackType Whether to increment 'likes' or 'dislikes'.
 */
export async function updateProductFeedback(
  productId: string,
  feedbackType: 'like' | 'dislike'
) {
  try {
    const { firestore } = await createServerClient();
    const productRef = doc(firestore, 'products', productId);

    const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';

    // Use the non-blocking updateDoc for a fire-and-forget experience
    updateDoc(productRef, {
      [fieldToUpdate]: increment(1),
    });

    return { success: true, message: 'Feedback submitted successfully.' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error(`Failed to update feedback for product ${productId}:`, errorMessage);
    return { success: false, message: 'Failed to submit feedback.' };
  }
}
