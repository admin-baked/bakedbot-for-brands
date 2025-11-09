
'use server';
/**
 * @fileOverview A Genkit tool for retrieving product reviews from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { createServerClient } from '@/firebase/server-client';

const GetProductReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product for which to retrieve reviews.'),
});

// We'll return a simple array of strings for the LLM to process easily.
const GetProductReviewsOutputSchema = z.array(z.string());

export const getProductReviews = ai.defineTool(
  {
    name: 'getProductReviews',
    description: 'Returns all review text for a given product ID. It will return an empty array if the product ID is not valid.',
    inputSchema: GetProductReviewsInputSchema,
    outputSchema: GetProductReviewsOutputSchema,
  },
  async ({ productId }) => {
    try {
      const { firestore } = await createServerClient();

      // SECURITY FIX: First, validate that the product exists before querying for its sub-collection.
      const productRef = doc(firestore, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        console.warn(`[getProductReviews] Attempted to get reviews for non-existent product ID: "${productId}"`);
        return []; // Return empty array if product does not exist.
      }

      // Now that we know the product is valid, proceed to get reviews.
      const reviewsRef = collection(firestore, 'products', productId, 'reviews');
      const reviewsQuery = query(reviewsRef);
      const querySnapshot = await getDocs(reviewsQuery);

      if (querySnapshot.empty) {
        return [];
      }

      const reviewTexts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Assuming 'text' and 'rating' fields exist on the review document.
        return `Rating: ${data.rating}/5 - "${data.text}"`;
      });
      
      return reviewTexts;

    } catch (error) {
      console.error('Error fetching product reviews:', error);
      // In case of an error, return an empty array to prevent the flow from breaking.
      return [];
    }
  }
);
