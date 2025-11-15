'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 *
 * - recommendProducts - A function that handles the product recommendation process.
 * - RecommendProductsInput - The input type for the recommendProducts function.
 * - RecommendProductsOutput - The return type for the recommendProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { GoogleAuth } from 'google-auth-library';
import type { Product } from '@/lib/types';


const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
});
export type RecommendProductsInput = z.infer<typeof RecommendProductsInputSchema>;

const RecommendedProductSchema = z.object({
  productId: z.string().describe('The unique ID of the recommended product.'),
  productName: z.string().describe('The name of the recommended product.'),
  reasoning: z.string().describe('A brief, one-sentence, user-facing reason why this specific product was recommended based on the user query.'),
});

const RecommendProductsOutputSchema = z.object({
  products: z.array(RecommendedProductSchema).describe('A list of products recommended for the user.'),
  overallReasoning: z.string().describe('The overall reasoning behind the set of product recommendations.'),
});
export type RecommendProductsOutput = z.infer<typeof RecommendProductsOutputSchema>;


async function generateQueryEmbedding(text: string): Promise<number[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await client.request({
    url,
    method: 'POST',
    data: { instances: [{ content: text }] },
  });

  const data = response.data as any;
  return data.predictions[0].embeddings.values;
}


async function findSimilarProducts(query: string, limit: number = 5): Promise<Product[]> {
    const { firestore } = await createServerClient();
    const queryEmbedding = await generateQueryEmbedding(query);

    const vectorQuery = firestore.collectionGroup('productReviewEmbeddings').findNearest('embedding', queryEmbedding, {
        limit,
        distanceMeasure: 'COSINE',
    });

    const results = await vectorQuery.get();

    if (results.empty) {
        return [];
    }
    
    // Fetch the full product documents
    const productIds = results.docs.map(doc => doc.data().productId);
    
    if (productIds.length === 0) return [];
    
    const productsRef = firestore.collection('products');
    const productsQuery = await productsRef.where('id', 'in', productIds).get();
    
    const productsById = new Map(productsQuery.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Product]));
    
    // Return products in the order of similarity
    return productIds.map(id => productsById.get(id)).filter((p): p is Product => !!p);
}


const recommendProductsPrompt = ai.definePrompt({
  name: 'recommendProductsPrompt',
  input: { schema: z.object({
    query: z.string(),
    customerHistory: z.string().optional(),
    availableProducts: z.string(),
  }) },
  output: {schema: RecommendProductsOutputSchema},
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request, history, and a pre-selected list of relevant products.

The user is looking for: {{{query}}}
{{#if customerHistory}}
Their preferences are: {{{customerHistory}}}
{{/if}}

Based on this, choose up to a maximum of 3 products from the following JSON list of semantically similar products.

Available Products (JSON):
{{{availableProducts}}}

You must provide a compelling, one-sentence reason for each product recommendation.
Most importantly, you MUST also provide an 'overallReasoning' for why this specific collection of products was chosen.
`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async input => {
    // Step 1: Use the vector search tool to find the most relevant products first.
    const similarProducts = await findSimilarProducts(input.query, 10);
    
    if (similarProducts.length === 0) {
      return {
        products: [],
        overallReasoning: "I couldn't find any products that matched your request. Could you try describing it a different way?",
      };
    }

    // Step 2: Pass the query and the curated list of similar products to the LLM for the final recommendation.
    const {output} = await recommendProductsPrompt({
      ...input,
      availableProducts: JSON.stringify(similarProducts),
    });

    return output!;
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
