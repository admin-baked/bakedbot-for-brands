'use server';
/**
 * @fileOverview A Genkit tool for retrieving product reviews from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { createServerClient } from '@/firebase/server-client';

const GetProductReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product for which to retrieve reviews.'),
});

// We'll return a simple array of strings for the LLM to process easily.
const GetProductReviewsOutputSchema = z.array(z.string());

export const getProductReviews = ai.defineTool(
  {
    name: 'getProductReviews',
    description: 'Returns all review text for a given product ID.',
    inputSchema: GetProductReviewsInputSchema,
    outputSchema: GetProductReviewsOutputSchema,
  },
  async ({ productId }) => {
    // Dummy data for testing
    const dummyReviews: { [key: string]: string[] } = {
        '1': [
            'Rating: 5/5 - "Absolutely amazing! The Cosmic Caramels sent me to another dimension. So tasty and the effect was perfect for a chill evening."',
            'Rating: 4/5 - "Really enjoyed these. The flavor is top-notch, though I wish they were a little stronger. Still, a great buy."',
            'Rating: 5/5 - "My go-to for relaxing after a long week. Consistent and delicious."',
        ],
        '2': [
            'Rating: 5/5 - "The Galaxy Gummies taste just like my favorite childhood candy but with a grown-up kick. Love them!"',
            'Rating: 3/5 - "They are okay. The effect is good but the flavor was a bit too artificial for my liking."',
            'Rating: 4/5 - "Potent and effective. A solid choice for edibles."',
        ],
        '4': [
            'Rating: 5/5 - "Orion Originals is a classic for a reason. Smooth smoke, great relaxing high. Never disappoints."',
            'Rating: 4/5 - "Good, solid flower. Not the most potent I\'ve had, but it\'s reliable and has a nice earthy taste."',
        ],
    };

    console.log(`[getProductReviews Tool] Fetching dummy reviews for productId: ${productId}`);

    // Return dummy reviews if the productId exists in our dummy data, otherwise return empty.
    const reviews = dummyReviews[productId] || [];
    console.log(`[getProductReviews Tool] Found ${reviews.length} reviews.`);
    return reviews;

    /*
    // Original Firestore logic is commented out below for easy restoration.
    try {
      const { firestore } = await createServerClient();
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
    */
  }
);
