

/**
 * @fileOverview An AI flow that summarizes customer reviews for a product.
 *
 * - summarizeReviews - A function that takes a product ID and returns an AI-generated summary of its reviews.
 * - SummarizeReviewsInput - The input type for the summarizeReviews function.
 * - SummarizeReviewsOutput - The return type for the summarizeReviews function.
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const SummarizeReviewsInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product whose reviews should be summarized.'),
  brandId: z.string().describe('The unique ID of the brand that owns the product.'),
  productName: z.string().describe('The name of the product.'),
  reviewTexts: z.array(z.string()).describe('An array of customer review texts.'),
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
    // Input is now pre-validated and data is passed in directly.
    const { productName, reviewTexts } = input;
    
    // Step 1: If there are no reviews, return a default response.
    if (reviewTexts.length === 0) {
      return {
        summary: `There are no reviews for ${productName || 'this product'} yet. You could be the first to share your experience!`,
        pros: [],
        cons: [],
        reviewCount: 0,
      };
    }
    
    // Step 2: Pass the reviews to the AI prompt for summarization.
    const { output } = await prompt({
        productName: productName || 'this product',
        reviews: reviewTexts,
    });
    
    return output;
  }
);

export async function runSummarizeReviews(input: SummarizeReviewsInput): Promise<SummarizeReviewsOutput | null> {
  const result = await summarizeReviewsFlow(input);
  // Ensure we return null if the output is nullish, matching the updated return type
  return result ?? null;
}
