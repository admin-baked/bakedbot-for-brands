'use server';

/**
 * @fileOverview Generates product descriptions.
 *
 * - generateProductDescription - A function that generates a product description.
 * - GenerateProductDescriptionInput - The input type for the generateProductDescription function.
 * - GenerateProductDescriptionOutput - The return type for the generateProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  features: z.string().describe('The key features of the product.'),
  keywords: z.string().describe('Keywords to include in the description.'),
  brandVoice: z.string().describe('The brand voice for the description (e.g., Playful, Professional).'),
});

export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  description: z.string().describe('The generated product description.'),
});

export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  prompt: `You are a copywriter specializing in product descriptions for cannabis products.

  Generate a product description for the following product:
  Product Name: {{{productName}}}
  Key Features: {{{features}}}
  Keywords: {{{keywords}}}
  Brand Voice: {{{brandVoice}}}

  The description should be engaging, informative, and persuasive, providing value to the customer.
  Include relevant keywords to improve search engine optimization.
  The output should be just the product description, not the title.
  Ensure the content is accurate.
  Your output should include the original product name.
`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
