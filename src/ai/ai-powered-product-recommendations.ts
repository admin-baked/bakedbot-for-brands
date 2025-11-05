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

const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  customerHistory: z.string().optional().describe('A summary of the customer purchase history and preferences.'),
  availableProducts: z.string().describe('A list of available products with descriptions.'),
});
export type RecommendProductsInput = z.infer<typeof RecommendProductsInputSchema>;

const RecommendProductsOutputSchema = z.object({
  products: z.array(z.string()).describe('A list of product names that are recommended for the user.'),
  reasoning: z.string().describe('The AI reasoning behind the product recommendations.'),
});
export type RecommendProductsOutput = z.infer<typeof RecommendProductsOutputSchema>;


const getProductRecommendations = ai.defineTool({
  name: 'getProductRecommendations',
  description: 'Recommends products to the user based on their query, preferences, and past interactions.',
  inputSchema: RecommendProductsInputSchema,
  outputSchema: RecommendProductsOutputSchema,
}, async (input) => {
  // This can call any typescript function.
  // Return the recommended products.
  return {
    products: ['Product 1', 'Product 2'],
    reasoning: 'These products are recommended based on your query and past interactions.',
  };
});

const recommendProductsPrompt = ai.definePrompt({
  name: 'recommendProductsPrompt',
  tools: [getProductRecommendations],
  prompt: `Based on the user's query and customer history, recommend products from the available products list.\n\nUser Query: {{{query}}}\nCustomer History: {{{customerHistory}}}\nAvailable Products: {{{availableProducts}}}\n\nUse the getProductRecommendations tool to get the product recommendations.`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async input => {
    const {output} = await recommendProductsPrompt(input);
    // @ts-expect-error - output should not be nullable, but the type system doesn't know that
    return output!;
  }
);

export async function recommendProducts(input: RecommendProductsInput): Promise<RecommendProductsOutput> {
  return recommendProductsFlow(input);
}
