
'use server';
/**
 * @fileOverview An AI flow that generates and stores a vector embedding for a product
 * based on a summary of its customer reviews.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import { Timestamp } from 'firebase-admin/firestore';
import type { Review } from '@/types/domain';

// --- Input and Output Schemas ---

const UpdateProductEmbeddingsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product to process.'),
});
export type UpdateProductEmbeddingsInput = z.infer<typeof UpdateProductEmbeddingsInputSchema>;

const UpdateProductEmbeddingsOutputSchema = z.object({
  productId: z.string(),
  status: z.string(),
  reviewCount: z.number(),
  summary: z.string().optional(),
});
export type UpdateProductEmbeddingsOutput = z.infer<typeof UpdateProductEmbeddingsOutputSchema>;

// --- AI Prompts ---

// This prompt is specifically tuned to generate a summary for embedding purposes.
// It's more data-rich and less conversational than the one for the UI.
const summarizeReviewsForEmbeddingPrompt = ai.definePrompt(
  {
    name: 'summarizeReviewsForEmbeddingPrompt',
    input: { schema: z.object({ productName: z.string(), reviews: z.array(z.string()) }) },
    output: { schema: z.object({ summary: z.string() }) },
    prompt: `You are an expert data analyst. Your task is to synthesize customer reviews for "{{productName}}" into a dense, keyword-rich summary suitable for vector embedding.
    Focus on objective qualities, effects, use cases, and flavor profiles mentioned.
    Do not use conversational language. List facts and common themes.

    Reviews:
    {{#each reviews}}
    - {{{this}}}
    {{/each}}
    `,
  }
);

// --- The Main Flow ---

const updateProductEmbeddingsFlow = ai.defineFlow(
  {
    name: 'updateProductEmbeddingsFlow',
    inputSchema: UpdateProductEmbeddingsInputSchema,
    outputSchema: UpdateProductEmbeddingsOutputSchema,
  },
  async (input) => {
    const { productId } = input;
    const { firestore } = await createServerClient();
    const productRepo = makeProductRepo(firestore);

    // 1. Fetch Product and Reviews
    const [product, reviewsSnap] = await Promise.all([
        productRepo.getById(productId),
        firestore.collection(`products/${productId}/reviews`).get()
    ]);
    
    if (!product) {
        throw new Error(`Product with ID ${productId} not found.`);
    }

    const reviews: Review[] = reviewsSnap.docs.map(doc => doc.data() as Review);

    // 2. Handle case with no reviews
    if (reviews.length === 0) {
        await productRepo.updateEmbedding(productId, null);
        return { productId, status: 'No reviews found, embedding cleared.', reviewCount: 0 };
    }

    // 3. Generate a data-rich summary using the AI prompt
    const reviewTexts = reviews.map(r => r.text);
    const summaryResponse = await summarizeReviewsForEmbeddingPrompt({
        productName: product.name,
        reviews: reviewTexts,
    });
    
    const summaryText = summaryResponse.output?.summary;
    if (!summaryText) {
        throw new Error('Failed to generate a review summary for embedding.');
    }

    // 4. Generate the vector embedding from the summary
    const embedding = await generateEmbedding(summaryText);

    // 5. Save the new embedding and summary to the product document
    await productRepo.updateEmbedding(productId, {
        embedding: embedding,
        reviewCount: reviews.length,
        updatedAt: Timestamp.now() as unknown as Timestamp,
    });
    
    return {
        productId,
        status: 'Embedding generated and saved successfully.',
        reviewCount: reviews.length,
        summary: summaryText,
    };
  }
);

export async function updateProductEmbeddings(input: UpdateProductEmbeddingsInput): Promise<UpdateProductEmbeddingsOutput> {
    return updateProductEmbeddingsFlow(input);
}
