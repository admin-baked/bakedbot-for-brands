'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 *
 * - recommendProducts - A function that handles the product recommendation process.
 * - RecommendProductsInput - The input type for the recommendProducts function.
 * - RecommendProductsOutput - The return type for the recommendProducts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getProductReviews } from '@/ai/tools/get-product-reviews';

const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
  availableProducts: z.string().describe('A list of available products with descriptions, provided in JSON format.'),
});
export type RecommendProductsInput = z.infer<typeof RecommendProductsInputSchema>;

const RecommendedProductSchema = z.object({
  productId: z.string().describe('The unique ID of the recommended product.'),
  productName: z.string().describe('The name of the recommended product.'),
  reasoning: z.string().describe('A brief, user-facing reason why this specific product was recommended.'),
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
  tools: [getProductReviews],
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request and history.

Analyze the user's query and their customer history to understand their needs and preferences.
Based on this analysis, select the most suitable products from the list of available products.
You can use the getProductReviews tool to see what other customers are saying.

User Query: {{{query}}}
{{#if customerHistory}}
Customer History: {{{customerHistory}}}
{{/if}}
Available Products (JSON):
{{{availableProducts}}}

Provide a list of recommended products and a compelling reason for each recommendation. Keep the reasoning for each product concise and user-friendly.
Also provide an overall reasoning for why this collection of products was chosen.
Limit your recommendations to a maximum of 3 products.
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
