
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
import { getProductReviews } from '@/ai/tools/get-product-reviews';
import { getProduct } from '@/ai/tools/get-product';

const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
  availableProducts: z.string().describe('A list of available products with descriptions, provided in JSON format. The AI should use the `getProduct` tool to get more details on promising candidates.'),
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
  input: {schema: RecommendProductsInputSchema},
  output: {schema: RecommendProductsOutputSchema},
  tools: [getProductReviews, getProduct],
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request and history.

Analyze the user's query and their customer history to understand their needs and preferences.
Based on this analysis, select up to a maximum of 3 suitable products from the list of available products.
You can use the getProduct tool to get more details, and the getProductReviews tool to see what other customers are saying.

User Query: {{{query}}}
{{#if customerHistory}}
Customer History: {{{customerHistory}}}
{{/if}}
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
    const {output} = await recommendProductsPrompt(input);
    return output!;
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
