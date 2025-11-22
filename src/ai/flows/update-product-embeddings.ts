
'use server';
/**
 * @fileOverview An AI flow that generates and stores a vector embedding for a product
 * based on a summary of its customer reviews. This action is now responsible for
 * fetching its own data before calling the pure AI flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import type { Review } from '@/types/domain';
import { reviewConverter } from '@/firebase/converters';

// --- Input and Output Schemas for the Server Action ---

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

const EMBEDDING_MODEL_NAME = 'text-embedding-004';

// This prompt is specifically tuned to generate a summary for embedding purposes.
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

// --- Pure AI Flow ---

const generateEmbeddingFromReviewsFlow = ai.defineFlow(
  {
    name: 'generateEmbeddingFromReviewsFlow',
    inputSchema: z.object({
      productName: z.string(),
      reviewTexts: z.array(z.string()),
    }),
    outputSchema: z.object({
      summary: z.string(),
      embedding: z.array(z.number()),
      model: z.string(),
    }),
  },
  async ({ productName, reviewTexts }) => {
    // 1. Generate a data-rich summary using the AI prompt
    const summaryResponse = await summarizeReviewsForEmbeddingPrompt({
        productName: productName,
        reviews: reviewTexts,
    });
    
    const summaryText = summaryResponse.output?.summary;
    if (!summaryText) {
        throw new Error('Failed to generate a review summary for embedding.');
    }

    // 2. Generate the vector embedding from the summary
    const embedding = await generateEmbedding(summaryText);
    
    return { summary: summaryText, embedding, model: EMBEDDING_MODEL_NAME };
  }
);


// --- The Main Server Action ---

export async function updateProductEmbeddings(input: UpdateProductEmbeddingsInput): Promise<UpdateProductEmbeddingsOutput> {
    const { productId } = input;
    const { firestore } = await createServerClient();
    const productRepo = makeProductRepo(firestore);

    // 1. Fetch Product and Reviews
    const [product, reviewsSnap] = await Promise.all([
        productRepo.getById(productId),
        (firestore as any).collection(`products/${productId}/reviews`).withConverter(reviewConverter as any).get()
    ]);
    
    if (!product) {
        throw new Error(`Product with ID ${productId} not found.`);
    }

    const reviews: Review[] = reviewsSnap.docs.map((doc: any) => doc.data() as Review);

    // 2. Handle case with no reviews
    if (reviews.length === 0) {
        await productRepo.updateEmbedding(productId, null);
        return { productId, status: 'No reviews; embedding cleared.', reviewCount: 0 };
    }

    // 3. Call the pure AI flow to get the summary and embedding
    const { summary, embedding, model } = await generateEmbeddingFromReviewsFlow({
        productName: product.name,
        reviewTexts: reviews.map(r => r.text)
    });

    // 4. Save the new embedding and summary to the new versioned subcollection
    await productRepo.updateEmbedding(productId, {
        model,
        embedding: embedding,
        reviewCount: reviews.length,
        updatedAt: new Date(),
        summary: summary,
    });
    
    return {
        productId,
        status: `Embedding updated for model ${model}.`,
        reviewCount: reviews.length,
        summary: summary,
    };
}
