'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSEOMetadataInputSchema = z.object({
    productName: z.string().describe('The name of the product.'),
    description: z.string().describe('The products description or key details.'),
    category: z.string().describe('Product category (e.g. Flower, Edible).'),
    brandName: z.string().describe('The brand name.'),
    keywords: z.string().optional().describe('Target keywords.'),
});

export type GenerateSEOMetadataInput = z.infer<typeof GenerateSEOMetadataInputSchema>;

const GenerateSEOMetadataOutputSchema = z.object({
    titleTag: z.string().describe('SEO Title Tag (50-60 chars).'),
    metaDescription: z.string().describe('Meta Description (150-160 chars).'),
    targetKeywords: z.array(z.string()).describe('List of 5 prioritized keywords.'),
    jsonLd: z.string().describe('JSON-LD Schema.org markup snippet.'),
});

export type GenerateSEOMetadataOutput = z.infer<typeof GenerateSEOMetadataOutputSchema>;

export async function generateSEOMetadata(input: GenerateSEOMetadataInput): Promise<GenerateSEOMetadataOutput> {
    return generateSEOFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateSEOMetadataPrompt',
    input: { schema: GenerateSEOMetadataInputSchema },
    output: { schema: GenerateSEOMetadataOutputSchema },
    prompt: `You are an SEO Expert specializing in e-commerce ranking.
  Generate high-converting SEO metadata for this cannabis product.

  Product: {{{productName}}}
  Brand: {{{brandName}}}
  Category: {{{category}}}
  Details: {{{description}}}
  Initial Keywords: {{{keywords}}}

  **Requirements:**
  1. **Title Tag**: Compelling, includes main keyword + Brand. Max 60 chars.
  2. **Meta Description**: Persuasive hook, includes CTA (e.g. "Order now"). Max 160 chars. No medical claims.
  3. **Keywords**: 5 high-intent keywords (local or product specific).
  4. **JSON-LD**: Generate a valid 'Product' schema snippet including name, description, and brand.

  Ensure compliance: No health claims ("cure", "treat"). Focus on experience and quality.
`,
});

const generateSEOFlow = ai.defineFlow(
    {
        name: 'generateSEOFlow',
        inputSchema: GenerateSEOMetadataInputSchema,
        outputSchema: GenerateSEOMetadataOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        return output!;
    }
);
