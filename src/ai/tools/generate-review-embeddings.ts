

'use server';
/**
 * @fileoverview An AI tool that summarizes all reviews for a product and generates a single vector embedding.
 */

import { ai } from '@/ai/genkit';
import { createServerClient } from '@/firebase/server-client';
import { reviewConverter } from '@/firebase/converters';
import { z } from 'zod';
import { textEmbeddingGecko } from '@genkit-ai/google-genai';

const GenerateReviewEmbeddingsInputSchema = z.object({
  productId: z.string().describe('The ID of the product to process.'),
  brandId: z.string().describe('The ID of the brand owning the product.'), // Kept for consistency if needed elsewhere
});

const GenerateReviewEmbeddingsOutputSchema = z.object({
  productId: z.string(),
  reviewCount: z.number(),
  summary: z.string().nullable(),
  embeddingGenerated: z.boolean(),
});

// Prompt to summarize reviews into a cohesive paragraph
const summarizePrompt = ai.definePrompt({
    name: 'reviewSummarizationPrompt',
    input: { schema: z.object({ reviewTexts: z.array(z.string()) }) },
    prompt: `Concisely summarize the following customer reviews into a single paragraph. Capture the main pros, cons, and overall sentiment.
  
  Reviews:
  {{#each reviewTexts}}
  - {{{this}}}
  {{/each}}
  `,
});
  
export const generateReviewEmbeddings = ai.defineTool(
  {
    name: 'generateReviewEmbeddings',
    description: 'Summarizes all reviews for a product and generates a representative vector embedding.',
    inputSchema: GenerateReviewEmbeddingsInputSchema,
    outputSchema: GenerateReviewEmbeddingsOutputSchema,
  },
  async (input) => {
    const { productId } = input;
    const { firestore } = await createServerClient();

    // 1. Fetch all reviews for the given product
    const reviewsSnapshot = await firestore
      .collection(`products/${productId}/reviews`)
      .withConverter(reviewConverter)
      .get();
      
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const reviewCount = reviews.length;

    const embeddingRef = firestore.collection(`products/${productId}/productReviewEmbeddings`).doc('summary');

    // 2. If there are no reviews, delete any existing embedding and return.
    if (reviewCount === 0) {
      await embeddingRef.delete();
      return { productId, reviewCount, summary: null, embeddingGenerated: false };
    }

    const reviewTexts = reviews.map(r => r.text).filter(Boolean);

    // 3. Use the AI to generate a summary of the review texts.
    const summaryResponse = await summarizePrompt({ reviewTexts });
    const summary = summaryResponse.output || '';

    // 4. Generate a vector embedding from the AI-generated summary.
    const embedding = await ai.embed({
      embedder: textEmbeddingGecko,
      content: summary,
    });

    // 5. Save the summary, embedding, and other metadata to Firestore.
    await embeddingRef.set({
      productId,
      reviewCount,
      summary,
      embedding,
      updatedAt: new Date(),
    });

    return { productId, reviewCount, summary, embeddingGenerated: true };
  }
);

