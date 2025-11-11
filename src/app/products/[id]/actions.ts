
'use server';

import { revalidatePath } from 'next/cache';
import { summarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const FeedbackSchema = z.object({
  productId: z.string().min(1),
  feedbackType: z.enum(['like', 'dislike']),
});


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
  prevState: { message: string; error: boolean } | null,
  formData: FormData
): Promise<{ message:string; error: boolean }> {
  
  const validatedFields = FeedbackSchema.safeParse({
    productId: formData.get('productId'),
    feedbackType: formData.get('feedbackType'),
  });

  if (!validatedFields.success) {
    return { error: true, message: 'Invalid input provided.' };
  }

  const { productId, feedbackType } = validatedFields.data;
  const { firestore } = await createServerClient();
  const productRef = firestore.doc(`products/${productId}`);
  const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';

  try {
    await productRef.update({
      [fieldToUpdate]: FieldValue.increment(1),
    });
    
    revalidatePath(`/products/${productId}`);
    revalidatePath('/dashboard');
    
    return { error: false, message: 'Feedback submitted successfully!' };
  } catch (error) {
    console.error(`[updateProductFeedback] Firestore error:`, error);
     // In a real app, this is where you would emit a contextual error
    // For this example, we return a generic server error message.
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}

    