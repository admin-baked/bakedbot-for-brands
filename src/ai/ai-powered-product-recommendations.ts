'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Product } from '@/firebase/converters';

const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
  // NEW: Products are now passed in as context.
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number(),
  })).describe('A list of available products for the brand.'),
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
  // The 'tools' parameter is removed as we are no longer using the productSearch tool.
  input: { schema: RecommendProductsInputSchema },
  output: { schema: RecommendProductsOutputSchema },
  // The prompt is updated to work with a provided list of products.
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user based on their request from the provided list of available products.

The user is looking for: {{{query}}}

{{#if customerHistory}}
Their preferences are: {{{customerHistory}}}
{{/if}}

Here is the list of available products:
{{#each products}}
- ID: {{{id}}}, Name: {{{name}}}, Description: {{{description}}}, Category: {{{category}}}, Price: {{{price}}}
{{/each}}

From that list, select up to a maximum of 3 products to recommend to the user.

You must provide a compelling, one-sentence reason for each product recommendation.
Most importantly, you MUST also provide an 'overallReasoning' for why this specific collection of products was chosen.

If you cannot find a suitable product from the list, inform the user that you couldn't find a good match and ask them to rephrase their request.
`,
});

// The flow is now simpler, as it directly calls the prompt without a tool.
const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async (input) => {
    const { output } = await recommendProductsPrompt(input);
    
    if (!output || !output.products || output.products.length === 0) {
        return {
            products: [],
            overallReasoning: "I couldn't find a perfect match in our current inventory based on your request. Could you try describing what you're looking for in a different way?"
        };
    }
    
    return output;
  }
);

// The exported function signature is updated to match the new input schema.
export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
