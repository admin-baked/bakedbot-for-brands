/**
 * @fileOverview An AI flow that summarizes customer reviews for a product.
 *
 * - summarizeReviews - A function that takes a product ID and returns an AI-generated summary of its reviews.
 * - SummarizeReviewsInput - The input type for the summarizeReviews function.
 * - SummarizeReviewsOutput - The return type for the summarizeReviews function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getProductReviews } from '../tools/get-product-reviews';
import { getProduct } from '../tools/get-product';

export const SummarizeReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product whose reviews should be summarized.'),
  brandId: z.string().describe('The unique ID of the brand that owns the product.'),
}).strict();
export type SummarizeReviewsInput = z.infer<typeof SummarizeReviewsInputSchema>;

export const SummarizeReviewsOutputSchema = z.object({
  summary: z.string().describe('A concise, engaging summary of the customer reviews.'),
  pros: z.array(z.string()).describe('A list of common positive points mentioned in the reviews.'),
  cons: z.array(z.string()).describe('A list of common negative points mentioned in the reviews.'),
  reviewCount: z.number().describe('The total number of reviews analyzed.'),
});
export type SummarizeReviewsOutput = z.infer<typeof SummarizeReviewsOutputSchema>;

const prompt = ai.definePrompt(
  {
    name: 'summarizeReviewsPrompt',
    input: {
      schema: z.object({
        productName: z.string(),
        reviews: z.array(z.string()),
      }),
    },
    output: { schema: SummarizeReviewsOutputSchema },
    prompt: `You are a helpful assistant that summarizes customer feedback.
Analyze the following reviews for the product "{{productName}}".

Based on these reviews, generate a balanced and informative summary.
Identify the most common pros and cons mentioned by the customers.
Count the total number of reviews provided.

Reviews:
{{#each reviews}}
- {{{this}}}
{{/each}}

If there are no reviews, state that clearly and encourage the user to be the first to leave one.
Your tone should be helpful and neutral.
`,
  }
);

const summarizeReviewsFlow = ai.defineFlow(
  {
    name: 'summarizeReviewsFlow',
    inputSchema: SummarizeReviewsInputSchema,
    outputSchema: SummarizeReviewsOutputSchema.nullable(),
  },
  async (input) => {
    // Validate input at the start of the flow
    const { productId, brandId } = SummarizeReviewsInputSchema.parse(input);

    // Step 1: Call the tool to get the raw review data.
    const reviews = await getProductReviews({ productId, brandId });
    const product = await getProduct({ productId });
    
    // Step 2: If there are no reviews, return a default response.
    if (reviews.length === 0) {
      return {
        summary: `There are no reviews for ${product?.name || 'this product'} yet. You could be the first to share your experience!`,
        pros: [],
        cons: [],
        reviewCount: 0,
      };
    }
    
    // Step 3: Pass the reviews to the AI prompt for summarization.
    const { output } = await prompt({
        productName: product?.name || 'this product',
        reviews: reviews.map(r => r.text),
    });
    
    return output;
  }
);

export async function runSummarizeReviews(input: SummarizeReviewsInput): Promise<SummarizeReviewsOutput | null> {
  const result = await summarizeReviewsFlow(input);
  // Ensure we return null if the output is nullish, matching the updated return type
  return result ?? null;
}

// Alias so older imports like { summarizeReviews } still work
export async function summarizeReviews(
  input: SummarizeReviewsInput,
): Promise<SummarizeReviewsOutput | null> {
  return runSummarizeReviews(input);
}
