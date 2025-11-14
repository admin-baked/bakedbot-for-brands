
'use server';
/**
 * @fileOverview A Genkit tool for retrieving product reviews from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import type { Review } from '@/firebase/converters';
import { Query, collectionGroup } from 'firebase/firestore';

const GetProductReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product for which to retrieve reviews.'),
  brandId: z.string().optional().describe('The unique ID of the brand that owns the product. This is optional.'),
});

// Define a schema for the review text and rating
const ReviewSchema = z.object({
  text: z.string(),
  rating: z.number(),
});

// We'll return a simple array of strings for the LLM to process easily.
const GetProductReviewsOutputSchema = z.array(ReviewSchema);

export const getProductReviews = ai.defineTool(
  {
    name: 'getProductReviews',
    description: 'Returns all review text for a given product ID. If a brandId is provided, it filters by that as well. It will return an empty array if the product ID is not valid.',
    inputSchema: GetProductReviewsInputSchema,
    outputSchema: GetProductReviewsOutputSchema,
  },
  async ({ productId, brandId }) => {
    try {
      const { firestore } = await createServerClient();

      // Start with a base query on the 'reviews' collection group.
      let reviewsQuery: Query = firestore.collectionGroup('reviews');
      
      // Always filter by the product ID.
      reviewsQuery = reviewsQuery.where('productId', '==', productId);

      // **CRITICAL FIX**: Only add the brandId filter if it's actually provided.
      // This allows the tool to work for products without a specific brand context.
      if (brandId) {
        reviewsQuery = reviewsQuery.where('brandId', '==', brandId);
      }
      
      const querySnapshot = await reviewsQuery.get();

      if (querySnapshot.empty) {
        return [];
      }

      const reviews = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Assuming 'text' and 'rating' fields exist on the review document.
        return {
            text: data.text,
            rating: data.rating
        };
      });
      
      return reviews;

    } catch (error) {
      console.error('Error fetching product reviews:', error);
      // In case of an error, return an empty array to prevent the flow from breaking.
      return [];
    }
  }
);
