
"use server";

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue, Transaction, FirestoreDataConverter, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { makeProductRepo } from '@/server/repos/productRepo';
import { runSummarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { cookies } from 'next/headers';
import { demoProducts, demoCustomer } from '@/lib/demo/demo-data';
import type { Product, Review } from '@/types/domain';
import { FeedbackSchema } from '@/types/actions';
import { requireUser } from '@/server/auth/auth';
import { DEMO_BRAND_ID } from '@/lib/config';


import { logger } from '@/lib/logger';
const reviewConverter: FirestoreDataConverter<Review> = {
  toFirestore(review: Review): DocumentData {
    const { id, ...data } = review;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Review {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
    } as Review;
  },
};


/**
 * A server action to safely call the summarizeReviews AI flow from the server.
 * This now implements a read-through cache for the summaries.
 */
export async function getReviewSummary(input: {
  productId: string;
}): Promise<SummarizeReviewsOutput | null> {
  const { productId } = input;
  const { firestore } = await createServerClient();
  const cookieStore = cookies();
  const isDemo = (await cookieStore).get('isUsingDemoData')?.value === 'true';

  const productRepo = makeProductRepo(firestore);

  // Define the model used for summaries to version the cache
  const SUMMARY_MODEL_VERSION = 'gemini-1.0-pro-summary-v1';
  const summaryRef = firestore.collection(`products/${productId}/reviewSummaries`).doc(SUMMARY_MODEL_VERSION);


  try {
    let product: Product | null = null;
    let reviews: Review[] = [];

    if (isDemo) {
      product = demoProducts.find(p => p.id === productId) || null;
      reviews = demoCustomer.reviews.filter(r => r.productId === productId) as Review[];
    } else {
      // 1. Check for a cached summary first
      const cachedSummarySnap = await summaryRef.get();
      if (cachedSummarySnap.exists) {
        // In a real app, you might add logic here to check if the review count has changed
        // and re-generate if necessary. For now, we return the cached version.
        return cachedSummarySnap.data() as SummarizeReviewsOutput;
      }

      // If no cache, fetch the data needed for generation
      product = await productRepo.getById(productId);

      if (product) {
        const reviewsSnap = await firestore.collection(`products/${productId}/reviews`).withConverter(reviewConverter).get();
        reviews = reviewsSnap.docs.map((d: any) => d.data());
      }
    }

    if (!product) {
      logger.error(`Product with ID ${productId} not found for review summary.`);
      return null;
    }

    const brandId = product.brandId || DEMO_BRAND_ID;

    // 2. Generate the summary since it wasn't in the cache
    const summary = await runSummarizeReviews({ productId, brandId, reviewTexts: reviews.map(r => r.text), productName: product.name });

    // 3. Save the newly generated summary to the cache for next time (but don't block the response)
    if (summary && !isDemo) {
      // Use set() instead of a floating promise to ensure it completes,
      // but don't await it so we can return to the user faster.
      summaryRef.set(summary);
    }

    return summary;

  } catch (error) {
    logger.error(`Failed to get review summary for product ${productId}:`, error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * SECURELY updates the like or dislike count for a product in Firestore.
 */
export async function updateProductFeedback(
  prevState: { message: string; error: boolean } | null,
  formData: FormData
): Promise<{ message: string; error: boolean }> {

  const validatedFields = FeedbackSchema.safeParse({
    productId: formData.get('productId'),
    feedbackType: formData.get('feedbackType'),
  });

  if (!validatedFields.success) {
    logger.error('Invalid feedback input:', { error: validatedFields.error });
    return { error: true, message: 'Invalid input provided.' };
  }

  const { productId, feedbackType } = validatedFields.data;

  let user;
  try {
    // Require any authenticated user.
    user = await requireUser();
  } catch (e) {
    return { error: true, message: 'You must be logged in to provide feedback.' };
  }

  const { firestore } = await createServerClient();
  const userId = user.uid;
  const productRef = firestore.doc(`products/${productId}`);
  const feedbackRef = firestore.doc(`products/${productId}/feedback/${userId}`);

  try {
    await firestore.runTransaction(async (transaction: any) => {
      const feedbackDoc = await transaction.get(feedbackRef);
      const productDoc = await transaction.get(productRef);

      if (!(productDoc as any).exists) {
        throw new Error('Product not found.');
      }

      const existingVote = (feedbackDoc as any).exists ? (feedbackDoc as any).data()?.vote : null;

      let likeIncrement = 0;
      let dislikeIncrement = 0;

      if (existingVote === feedbackType) {
        transaction.delete(feedbackRef);
        if (feedbackType === 'like') likeIncrement = -1;
        else dislikeIncrement = -1;
      } else {
        transaction.set(feedbackRef, { vote: feedbackType, date: FieldValue.serverTimestamp() });
        if (feedbackType === 'like') {
          likeIncrement = 1;
          if (existingVote === 'dislike') dislikeIncrement = -1;
        } else {
          dislikeIncrement = 1;
          if (existingVote === 'like') likeIncrement = -1;
        }
      }

      transaction.update(productRef, {
        likes: FieldValue.increment(likeIncrement),
        dislikes: FieldValue.increment(dislikeIncrement),
      });
    });

    const productDoc = await productRef.get();
    revalidatePath(`/menu/${(productDoc.data() as any)?.brandId || 'default'}/products/${productId}`);
    revalidatePath('/dashboard');

    return { error: false, message: 'Thanks for your feedback!' };

  } catch (error) {
    logger.error(`[updateProductFeedback] Firestore error:`, error instanceof Error ? error : new Error(String(error)));
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}
