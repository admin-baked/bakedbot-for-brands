
'use server';
/**
 * @fileOverview A Genkit tool for retrieving product reviews from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
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

      // To securely query a subcollection across all documents (a collection group),
      // we must use a 'where' clause that our security rules can validate.
      const reviewsQuery = query(
        collectionGroup(firestore, 'reviews'),
        where('productId', '==', productId)
      );
      
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
