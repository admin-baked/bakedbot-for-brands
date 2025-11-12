
'use server';
/**
 * @fileOverview A Genkit tool for retrieving product reviews from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';

const GetProductReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product for which to retrieve reviews.'),
  brandId: z.string().describe('The unique ID of the brand that owns the product.'),
});

// We'll return a simple array of strings for the LLM to process easily.
const GetProductReviewsOutputSchema = z.array(z.string());

export const getProductReviews = ai.defineTool(
  {
    name: 'getProductReviews',
    description: 'Returns all review text for a given product ID owned by a specific brand. It will return an empty array if the product or brand ID is not valid.',
    inputSchema: GetProductReviewsInputSchema,
    outputSchema: GetProductReviewsOutputSchema,
  },
  async ({ productId, brandId }) => {
    try {
      const { firestore } = await createServerClient();

      // Securely query a subcollection across all documents (a collection group).
      // The 'where' clauses ensure we only query reviews for the specified product AND brand.
      // This is critical for security and performance.
      const reviewsQuery = firestore.collectionGroup('reviews')
        .where('productId', '==', productId)
        .where('brandId', '==', brandId);
      
      const querySnapshot = await reviewsQuery.get();

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
