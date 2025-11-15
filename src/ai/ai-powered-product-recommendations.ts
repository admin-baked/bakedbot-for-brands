

'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { createServerClient } from '@/firebase/server-client';
import admin from 'firebase-admin';
import type { Product } from '@/lib/types';
import { findProductsByReviewContent } from './tools/find-products-by-review';

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
    try {
      // Step 1: Use vector similarity to find the most relevant products
      const similarProducts = await findProductsByReviewContent.run({
        query: input.query,
        limit: 10
      });
      
      if (!similarProducts || similarProducts.length === 0) {
        return {
          products: [],
          overallReasoning: "I couldn't find any products that matched your request. Could you try describing it a different way?",
        };
      }

      // Step 2: Pass the query and curated list to the LLM for final recommendation
      const {output} = await recommendProductsPrompt({
        ...input,
        availableProducts: JSON.stringify(similarProducts),
      });

      return output!;
    } catch (error) {
      console.error('❌ Error in recommendProductsFlow:', error);
      throw error;
    }
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}

