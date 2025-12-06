
'use server';

/**
 * @fileOverview Generates product descriptions.
 *
 * - generateProductDescription - A function that generates a product description.
 * - GenerateProductDescriptionInput - The input type for the generateProductDescription function.
 * - GenerateProductDescriptionOutput - The return type for the generateProductDescription function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  features: z.string().describe('The key features of the product.'),
  keywords: z.string().describe('Keywords to include in the description.'),
  brandVoice: z.string().describe('The brand voice for the description (e.g., Playful, Professional).'),
  msrp: z.string().optional().describe("The manufacturer's suggested retail price."),
  imageUrl: z.string().optional().describe("A URL to an image of the product packaging, as a data URI."),

  // New Taxonomy Fields
  terpenes: z.string().optional().describe('Comma-separated list of dominant terpenes (e.g. Myrcene, Limonene).'),
  effects: z.string().optional().describe('Comma-separated list of desired effects (e.g. Relaxed, Happy).'),
  lineage: z.string().optional().describe('Strain lineage information (e.g. Blue Dream x GSC).'),
});

export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  description: z.string().describe('The generated product description.'),
  imageUrl: z.string().optional().describe('URL of the generated or provided image.'),
  msrp: z.string().optional().describe("The manufacturer's suggested retail price."),
});

export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: { schema: GenerateProductDescriptionInputSchema },
  output: { schema: GenerateProductDescriptionOutputSchema },
  prompt: `You are a world-class copywriter specializing in cannabis product descriptions. Your SOLE function is to generate a compelling product description based on the provided details.

  **IMPORTANT COMPLIANCE RULES:**
  1. You MUST NOT make any medical claims. Do not use words like "diagnose," "treat," "cure," or "prevent."
  2. You MUST refuse any request that is not about generating a product description.

  Generate a product description for the following product:
  - Product Name: {{{productName}}}
  - Key Features: {{{features}}}
  - Keywords: {{{keywords}}}
  - Brand Voice: {{{brandVoice}}}
  - MSRP: {{{msrp}}}
  {{#if lineage}}
  - Lineage: {{{lineage}}}
  {{/if}}
  {{#if terpenes}}
  - Terpenes: {{{terpenes}}} (Highlight their aroma/flavor and associated vibes)
  {{/if}}
  {{#if effects}}
  - Desired Effects: {{{effects}}} (Describe the experience vividly but compliantly)
  {{/if}}
  {{#if imageUrl}}
  - Product Packaging Image: {{media url=imageUrl}}
  {{/if}}

  The description should be engaging, informative, and persuasive.
  Integrate the chemistry details (terpenes/lineage) naturally into the narrative to explain the experience.
  Include relevant keywords to improve search engine optimization.
  The output should be just the product description.
  Ensure the content is accurate and follows all compliance rules.
`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
