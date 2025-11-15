/**
 * @fileOverview An AI tool that generates and saves a product review embedding.
 * This file lives in the `functions` directory and is deployed as part of the
 * Cloud Function environment.
 */
import { ai } from '../genkit';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { Review } from '../../../../types/domain';

// Initialize Firebase Admin SDK if it hasn't been already
if (!initializeApp.length) {
    initializeApp();
}

const firestore = getFirestore();

export const GenerateReviewEmbeddingsInputSchema = z.object({
  productId: z.string(),
  brandId: z.string(),
});
export type GenerateReviewEmbeddingsInput = z.infer<typeof GenerateReviewEmbeddingsInputSchema>;

export const GenerateReviewEmbeddingsOutputSchema = z.object({
  productId: z.string(),
  reviewCount: z.number(),
  summary: z.string(),
});
export type GenerateReviewEmbeddingsOutput = z.infer<typeof GenerateReviewEmbeddingsOutputSchema>;

const summaryPrompt = ai.definePrompt({
    name: 'reviewSummaryForEmbeddingPrompt',
    input: { schema: z.object({ productName: z.string(), reviewsText: z.string() }) },
    prompt: `Concisely summarize the key themes, pros, and cons from the following customer reviews for the product "{{productName}}". Focus on actionable insights about effects, taste, and experience.
    
    Reviews:
    {{{reviewsText}}}
    
    Summary:`,
});

export const generateReviewEmbeddings = ai.defineTool(
  {
    name: 'generateReviewEmbeddings',
    description: 'Summarizes all reviews for a product, generates a vector embedding from the summary, and saves it to Firestore.',
    inputSchema: GenerateReviewEmbeddingsInputSchema,
    outputSchema: GenerateReviewEmbeddingsOutputSchema,
  },
  async ({ productId, brandId }) => {
    const productRef = firestore.collection('products').doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      throw new Error(`Product with ID ${productId} not found.`);
    }
    const productName = productSnap.data()?.name || 'Unknown Product';

    const reviewsRef = productRef.collection('reviews');
    const reviewsSnap = await reviewsRef.get();
    const reviews = reviewsSnap.docs.map(doc => doc.data() as Review);

    if (reviews.length === 0) {
        // If there are no reviews, delete any existing embedding doc
        await firestore.collection(`products/${productId}/productReviewEmbeddings`).doc('summary').delete().catch(() => {});
        return { productId, reviewCount: 0, summary: "No reviews found." };
    }

    const reviewsText = reviews
      .map(r => `- Rating: ${r.rating}/5, Review: ${r.text}`)
      .join('\n');

    const { output: summary } = await summaryPrompt({ productName, reviewsText });

    if (!summary) {
        throw new Error('Failed to generate summary from reviews.');
    }
    
    const embedding = await ai.embed({
        content: summary,
        model: 'googleai/text-embedding-004',
    });

    const embeddingData = {
        productId,
        reviewCount: reviews.length,
        summary: summary,
        embedding: embedding,
        updatedAt: FieldValue.serverTimestamp(),
        brandId: brandId,
    };

    await firestore.collection(`products/${productId}/productReviewEmbeddings`).doc('summary').set(embeddingData);

    return { productId, reviewCount: reviews.length, summary: summary };
  }
);
