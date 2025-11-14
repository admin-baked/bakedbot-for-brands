
'use server';
/**
 * @fileOverview A Genkit tool for generating a single embedding that represents
 * the semantic content of all reviews for a given product.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { getProductReviews } from './get-product-reviews';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateReviewEmbeddingsInputSchema = z.object({
  productId: z.string().describe('The ID of the product to process.'),
  brandId: z.string().optional().describe('The optional brand ID for context.'),
});

const GenerateReviewEmbeddingsOutputSchema = z.object({
  productId: z.string(),
  embedding: z.array(z.number()),
  reviewCount: z.number(),
  summary: z.string(),
});

export const generateReviewEmbeddings = ai.defineTool(
  {
    name: 'generateReviewEmbeddings',
    description: 'Summarizes all reviews for a product and generates a single vector embedding representing the overall sentiment and content.',
    inputSchema: GenerateReviewEmbeddingsInputSchema,
    outputSchema: GenerateReviewEmbeddingsOutputSchema,
  },
  async ({ productId, brandId }) => {
    // 1. Fetch all reviews for the product
    const reviews = await getProductReviews.run({ productId, brandId });

    if (reviews.length === 0) {
      throw new Error(`No reviews found for product ${productId}. Cannot generate embedding.`);
    }

    // 2. Concatenate all review texts into a single string for summarization
    const allReviewsText = reviews.map(r => r.text).join('\n\n');

    // 3. Use an LLM to create a concise summary of all reviews
    const summaryResponse = await ai.generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: `Summarize the following customer reviews into a short paragraph that captures the key points, overall sentiment, common praises, and frequent complaints:\n\n${allReviewsText}`,
    });
    const summary = summaryResponse.text;

    // 4. Generate a single embedding from the AI-generated summary
    const embeddingResponse = await ai.embed({
      model: googleAI.model('text-embedding-004'),
      content: summary,
    });
    const embedding = embeddingResponse.embedding;
    
    // 5. Save the new embedding to a subcollection on the product
    const { firestore } = await createServerClient();
    const embeddingRef = firestore.doc(`products/${productId}/productReviewEmbeddings/summary`);
    
    const embeddingData = {
        productId,
        embedding: embedding,
        reviewCount: reviews.length,
        summary: summary,
        updatedAt: new Date(),
    };

    await embeddingRef.set(embeddingData, { merge: true });

    return embeddingData;
  }
);

    