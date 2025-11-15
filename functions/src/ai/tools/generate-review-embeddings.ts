

/**
 * @fileoverview An AI tool that summarizes all reviews for a product and generates a single vector embedding.
 * This is a copy of the main app's tool, intended for use within the Cloud Functions environment.
 */
'use server';

import { ai } from '../genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import { textEmbeddingGecko } from '@genkit-ai/google-genai';

const GenerateReviewEmbeddingsInputSchema = z.object({
  productId: z.string().describe('The ID of the product to process.'),
  brandId: z.string().describe('The ID of the brand owning the product.'),
});

const GenerateReviewEmbeddingsOutputSchema = z.object({
  productId: z.string(),
  reviewCount: z.number(),
  summary: z.string().nullable(),
  embeddingGenerated: z.boolean(),
});

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
    const firestore = getFirestore();

    const reviewsSnapshot = await firestore
      .collection(`products/${productId}/reviews`)
      .get();
      
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const reviewCount = reviews.length;

    const embeddingRef = firestore.collection(`products/${productId}/productReviewEmbeddings`).doc('summary');

    if (reviewCount === 0) {
      await embeddingRef.delete();
      return { productId, reviewCount, summary: null, embeddingGenerated: false };
    }

    const reviewTexts = reviews.map(r => r.text).filter(Boolean);

    const summaryResponse = await summarizePrompt({ reviewTexts });
    const summary = summaryResponse.output || '';

    const embedding = await ai.embed({
      embedder: textEmbeddingGecko,
      content: summary,
    });

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

