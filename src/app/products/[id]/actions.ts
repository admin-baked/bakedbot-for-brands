
'use server';

import { revalidatePath } from 'next/cache';
import { summarizeReviews, type SummarizeReviewsOutput, SummarizeReviewsInputSchema } from '@/ai/flows/summarize-reviews';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { makeProductRepo } from '@/server/repos/productRepo';


/**
 * A server action to safely call the summarizeReviews AI flow from the server.
 * This prevents server-side code from being bundled with the client.
 * @param input An object containing the productId.
 * @returns The AI-generated summary or null if an error occurs.
 */
export async function getReviewSummary(input: { productId: string }): Promise<SummarizeReviewsOutput | null> {
  const { productId } = input;

  try {
    const { firestore } = await createServerClient();
    const productRepo = makeProductRepo(firestore);
    const product = await productRepo.getById(productId);

    if (!product) {
        console.error(`Product with ID ${productId} not found for review summary.`);
        return null;
    }

    const brandId = product.brandId || 'bakedbot-brand-id'; 

    const summary = await summarizeReviews({ productId, brandId });
    return summary;
  } catch (error) {
    console.error(`Failed to get review summary for product ${productId}:`, error);
    // Return null instead of throwing, so the page can still render.
    return null;
  }
}

/**
 * SECURELY updates the like or dislike count for a product in Firestore.
 * This is a server-side action that uses the Admin SDK, so it bypasses client-side rules.
 * The contextual error system is primarily for client-side operations.
 */
export async function updateProductFeedback(
  prevState: { message: string; error: boolean } | null,
  formData: FormData
): Promise<{ message:string; error: boolean }> {
  
  const FeedbackSchema = z.object({
    productId: z.string().min(1),
    feedbackType: z.enum(['like', 'dislike']),
  });
  
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
    // Admin SDK call, bypasses security rules.
    await productRef.update({
      [fieldToUpdate]: FieldValue.increment(1),
    });
    
    revalidatePath(`/products/${productId}`);
    revalidatePath('/dashboard');
    
    return { error: false, message: 'Feedback submitted successfully!' };
  } catch (error) {
    console.error(`[updateProductFeedback] Firestore error:`, error);
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}

    
