
'use server';
/**
 * @fileOverview Recommends products to users based on their queries, preferences, and past interactions.
 * This flow now uses vector search to find relevant products first.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { Product } from '@/firebase/converters';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { cookies } from 'next/headers';
import { demoProducts } from '@/lib/data';


// The input now only requires the query and brand context.
const RecommendProductsInputSchema = z.object({
  query: z.string().describe('The user query or description of what they are looking for.'),
  brandId: z.string().describe('The ID of the brand for which to recommend products.'),
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

// The prompt now works with a list of *candidate* products.
const recommendProductsPrompt = ai.definePrompt({
  name: 'recommendProductsPrompt',
  input: { schema: z.object({
      query: z.string(),
      customerHistory: z.string().optional(),
      products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        price: z.number(),
      }))
  }) },
  output: { schema: RecommendProductsOutputSchema },
  prompt: `You are an expert AI budtender. Your goal is to recommend the best products to a user from a pre-filtered list of candidate products that match their request.

The user is looking for: {{{query}}}

{{#if customerHistory}}
Their preferences are: {{{customerHistory}}}
{{/if}}

Here is the list of candidate products:
{{#each products}}
- ID: {{{id}}}, Name: {{{name}}}, Description: {{{description}}}, Category: {{{category}}}, Price: {{{price}}}
{{/each}}

From that list, select up to a maximum of 3 products to recommend to the user.

You must provide a compelling, one-sentence reason for each product recommendation.
Most importantly, you MUST also provide an 'overallReasoning' for why this specific collection of products was chosen.

If you cannot find a suitable product from the list, inform the user that you couldn't find a good match and ask them to rephrase their request.
`,
});

const recommendProductsFlow = ai.defineFlow(
  {
    name: 'recommendProductsFlow',
    inputSchema: RecommendProductsInputSchema,
    outputSchema: RecommendProductsOutputSchema,
  },
  async (input) => {
    const isDemo = input.brandId === 'default' || cookies().get('isUsingDemoData')?.value === 'true';

    let candidateProducts: Product[];

    if (isDemo) {
        candidateProducts = demoProducts;
    } else {
        // 1. Use the Product Repository to perform a vector search
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        candidateProducts = await productRepo.searchByVector(input.query, input.brandId);

        // 2. Fallback to keyword search if vector search yields no results
        if (candidateProducts.length === 0) {
            console.log('Vector search returned no results. Falling back to all products for the brand.');
            candidateProducts = await productRepo.getAllByBrand(input.brandId);
        }
    }
    
    // 3. If still no products, return a clear message.
    if (candidateProducts.length === 0) {
         return {
            products: [],
            overallReasoning: "I couldn't find any products for this brand. The catalog might be empty."
        };
    }
    
    // 4. Pass the candidate products to the LLM for final selection and reasoning.
    const { output } = await recommendProductsPrompt({
        query: input.query,
        customerHistory: input.customerHistory,
        products: candidateProducts.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            price: p.price,
        }))
    });
    
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
