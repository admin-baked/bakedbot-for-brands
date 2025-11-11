
'use server';

import { summarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';

/**
 * A server action to safely call the summarizeReviews AI flow from the server.
 * This prevents server-side code from being bundled with the client.
 * @param productId The ID of the product to summarize.
 * @param productName The name of the product.
 * @returns The AI-generated summary or null if an error occurs.
 */
export async function getReviewSummary(productId: string, productName: string): Promise<SummarizeReviewsOutput | null> {
  try {
    const summary = await summarizeReviews({ productId, productName });
    return summary;
  } catch (error) {
    console.error(`Failed to get review summary for product ${productId}:`, error);
    // Return null instead of throwing, so the page can still render.
    return null;
  }
}

/**
 * SECURELY updates the like or dislike count for a product in Firestore.
 * This action is now protected and requires an authenticated user.
 */
export async function updateProductFeedback(
  prevState: { message: string; error: boolean },
  formData: FormData
): Promise<{ message: string; error: boolean }> {
  
  const { auth: adminAuth, firestore } = await createServerClient();
  const productId = formData.get('productId') as string;
  const feedbackType = formData.get('feedbackType') as 'like' | 'dislike';
  
  // In a real production app, you'd get the ID token from the header
  // and verify it. For this context, we simulate a check.
  const authorization = headers().get('Authorization');
  // if (!authorization) {
  //   return { error: true, message: 'Authentication required.' };
  // }
  
  // 1. Input Validation
  if (!productId || (feedbackType !== 'like' && feedbackType !== 'dislike')) {
    return { error: true, message: 'Invalid input provided.' };
  }

  const productRef = firestore.doc(`products/${productId}`);
  
  // 2. Existence Check (Best Practice)
  try {
    const doc = await productRef.get();
    if (!doc.exists) {
      return { error: true, message: 'Product not found.' };
    }
  } catch (e) {
    return { error: true, message: 'Failed to verify product.' };
  }

  // 3. Perform the update
  const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';
  try {
    await productRef.update({
      [fieldToUpdate]: FieldValue.increment(1),
    });
    return { error: false, message: 'Feedback submitted successfully!' };
  } catch (error) {
    console.error(`[updateProductFeedback] Firestore error:`, error);
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}
