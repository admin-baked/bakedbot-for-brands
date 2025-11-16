
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue, Transaction } from 'firebase-admin/firestore';
import { makeProductRepo } from '@/server/repos/productRepo';
import { runSummarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { demoProducts } from '@/lib/data';
import type { Product } from '@/types/domain';

/**
 * A server action to safely call the summarizeReviews AI flow from the server.
 * This prevents server-side code from being bundled with the client.
 */
export async function getReviewSummary(input: {
  productId: string;
}): Promise<SummarizeReviewsOutput | null> {
  const { productId } = input;
  const cookieStore = cookies();
  const isDemo = cookieStore.get('isUsingDemoData')?.value === 'true';

  let product: Product | null = null;

  try {
    if (isDemo) {
      product = demoProducts.find(p => p.id === productId) || null;
    } else {
      const { firestore } = await createServerClient();
      const productRepo = makeProductRepo(firestore);
      product = await productRepo.getById(productId);
    }

    if (!product) {
      console.error(`Product with ID ${productId} not found for review summary.`);
      return null;
    }

    // Use the brandId from the product if it exists, otherwise use a placeholder.
    const brandId = product.brandId || 'bakedbot-brand-id';

    const summary = await runSummarizeReviews({ productId, brandId });
    return summary;
  } catch (error) {
    console.error(`Failed to get review summary for product ${productId}:`, error);
    // Return null instead of throwing, so the page can still render.
    return null;
  }
}


const FeedbackSchema = z.object({
  productId: z.string().min(1),
  feedbackType: z.enum(['like', 'dislike']),
});

/**
 * SECURELY updates the like or dislike count for a product in Firestore.
 * This action is now idempotent and tracks user votes to prevent spamming.
 */
export async function updateProductFeedback(
  prevState: { message: string; error: boolean },
  formData: FormData
): Promise<{ message: string; error: boolean }> {
  
  const validatedFields = FeedbackSchema.safeParse({
    productId: formData.get('productId'),
    feedbackType: formData.get('feedbackType'),
  });

  if (!validatedFields.success) {
    console.error('Invalid feedback input:', validatedFields.error);
    return { error: true, message: 'Invalid input provided.' };
  }
  
  const { productId, feedbackType } = validatedFields.data;
  const { firestore, auth: adminAuth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return { error: true, message: 'You must be logged in to provide feedback.' };
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error("Feedback Auth Error:", error);
    return { error: true, message: 'Authentication failed.' };
  }
  
  const userId = decodedToken.uid;
  const productRef = firestore.doc(`products/${productId}`);
  const feedbackRef = firestore.doc(`products/${productId}/feedback/${userId}`);

  try {
    await firestore.runTransaction(async (transaction: Transaction) => {
      const feedbackDoc = await transaction.get(feedbackRef);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists) {
        throw new Error('Product not found.');
      }
      
      const existingVote = feedbackDoc.exists ? feedbackDoc.data()?.vote : null;

      let likeIncrement = 0;
      let dislikeIncrement = 0;

      if (existingVote === feedbackType) {
        // User is clicking the same button again, so we'll undo their vote.
        transaction.delete(feedbackRef);
        if (feedbackType === 'like') likeIncrement = -1;
        else dislikeIncrement = -1;
      } else {
        // This is a new vote or a changed vote.
        transaction.set(feedbackRef, { vote: feedbackType, date: FieldValue.serverTimestamp() });
        if (feedbackType === 'like') {
          likeIncrement = 1;
          if (existingVote === 'dislike') dislikeIncrement = -1;
        } else { // feedbackType is 'dislike'
          dislikeIncrement = 1;
          if (existingVote === 'like') likeIncrement = -1;
        }
      }
      
      // Atomically update the aggregate counts on the product.
      transaction.update(productRef, {
        likes: FieldValue.increment(likeIncrement),
        dislikes: FieldValue.increment(dislikeIncrement),
      });
    });

    const productDoc = await productRef.get();
    revalidatePath(`/menu/${productDoc.data()?.brandId}/products/${productId}`);
    revalidatePath('/dashboard');

    return { error: false, message: 'Thanks for your feedback!' };

  } catch (error) {
    console.error(`[updateProductFeedback] Firestore error:`, error);
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}
