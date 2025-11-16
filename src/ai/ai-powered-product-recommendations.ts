'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { productSearch } from '@/ai/tools/product-search';

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
  tools: [productSearch],
  input: { schema: z.object({
    query: z.string(),
    customerHistory: z.string().optional(),
  }) },
  output: {schema: RecommendProductsOutputSchema},
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request.

The user is looking for: {{{query}}}
{{#if customerHistory}}
Their preferences are: {{{customerHistory}}}
{{/if}}

Use the productSearch tool to find a list of relevant products. Then, from that list, select up to a maximum of 3 products to recommend to the user.

You must provide a compelling, one-sentence reason for each product recommendation.
Most importantly, you MUST also provide an 'overallReasoning' for why this specific collection of products was chosen.

If the product search tool returns no results, or if you cannot find a suitable product, inform the user that you couldn't find a good match and ask them to rephrase their request.
`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async (input) => {
    const { output } = await recommendProductsPrompt(input);
    
    // Handle the case where the AI decides no products are suitable from the tool's output.
    if (!output || !output.products || output.products.length === 0) {
        return {
            products: [],
            overallReasoning: "I couldn't find a perfect match in our current inventory based on your request. Could you try describing what you're looking for in a different way?"
        };
    }
    
    return output;
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
