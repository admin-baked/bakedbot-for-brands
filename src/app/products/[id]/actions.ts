'use server';

import { summarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';

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
