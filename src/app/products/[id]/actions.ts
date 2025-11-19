
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
import { reviewConverter as clientReviewConverter } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';


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
 * This prevents server-side code from being bundled with the client.
 */
export async function getReviewSummary(input: {
  productId: string;
}): Promise<SummarizeReviewsOutput | null> {
  const { productId } = input;
  const cookieStore = cookies();
  const isDemo = cookieStore.get('isUsingDemoData')?.value === 'true';

  let product: Product | null = null;
  let reviews: Review[] = [];

  try {
    if (isDemo) {
      product = demoProducts.find(p => p.id === productId) || null;
      reviews = demoCustomer.reviews.filter(r => r.productId === productId) as Review[];
    } else {
      const { firestore } = await createServerClient();
      const productRepo = makeProductRepo(firestore);
      product = await productRepo.getById(productId);

      if (product) {
          const reviewsSnap = await firestore.collection(`products/${productId}/reviews`).withConverter(reviewConverter).get();
          reviews = reviewsSnap.docs.map(d => d.data());
      }
    }

    if (!product) {
      console.error(`Product with ID ${productId} not found for review summary.`);
      return null;
    }

    const brandId = product.brandId || 'bakedbot-brand-id';

    const summary = await runSummarizeReviews({ productId, brandId, reviewTexts: reviews.map(r => r.text), productName: product.name });
    return summary;
  } catch (error) {
    console.error(`Failed to get review summary for product ${productId}:`, error);
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
    console.error('Invalid feedback input:', validatedFields.error);
    return { error: true, message: 'Invalid input provided.' };
  }
  
  const { productId, feedbackType } = validatedFields.data;
  
  let user;
  try {
      user = await requireUser();
  } catch(e) {
      return { error: true, message: 'You must be logged in to provide feedback.' };
  }
  
  const { firestore } = await createServerClient();
  const userId = user.uid;
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
    revalidatePath(`/menu/${productDoc.data()?.brandId}/products/${productId}`);
    revalidatePath('/dashboard');

    return { error: false, message: 'Thanks for your feedback!' };

  } catch (error) {
    console.error(`[updateProductFeedback] Firestore error:`, error);
    return { error: true, message: 'Could not submit feedback due to a database error.' };
  }
}
