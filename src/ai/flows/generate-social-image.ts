
'use server';
/**
 * @fileOverview Generates social media images for products.
 *
 * - generateSocialMediaImage - A function that generates a social media image.
 * - GenerateSocialMediaImageInput - The input type for the generateSocialMediaImage function.
 * - GenerateSocialMediaImageOutput - The return type for the generateSocialMediaImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateSocialMediaImageInputSchema = z.object({
  productName: z.string().describe('The name of the product or a title for the image.'),
  features: z.string().describe('The key features of the product or a text prompt describing the desired image.'),
  brandVoice: z.string().describe('The brand voice (e.g., Playful, Professional).'),
  logoDataUri: z.string().describe("The brand's logo, as a data URI."),
  imageUrl: z.string().optional().describe("A URL to an image of the product's packaging, which can be used as a reference."),
});

export type GenerateSocialMediaImageInput = z.infer<typeof GenerateSocialMediaImageInputSchema>;

const GenerateSocialMediaImageOutputSchema = z.object({
  imageUrl: z.string().describe('URL of the generated image.'),
});

export type GenerateSocialMediaImageOutput = z.infer<typeof GenerateSocialMediaImageOutputSchema>;

export async function generateSocialMediaImage(input: GenerateSocialMediaImageInput): Promise<GenerateSocialMediaImageOutput> {
  return generateSocialMediaImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSocialMediaImagePrompt',
  input: {schema: GenerateSocialMediaImageInputSchema},
  output: {schema: GenerateSocialMediaImageOutputSchema},
  prompt: `You are a creative director for a cutting-edge social media marketing agency.
  Your task is to generate a compelling, eye-catching image that has viral potential for a social media post about a cannabis product.
  The image should be vibrant, modern, share-worthy, and suitable for platforms like Instagram and Twitter.

  Incorporate the provided brand logo as a prominent watermark on the generated image. The watermark must be tastefully placed but clearly visible.
  If a product packaging image is provided, use its style, colors, and branding as inspiration for the new image you create.

  Image Prompt:
  - Product Name: {{{productName}}}
  - Concept/Features: {{{features}}}
  - Brand Voice: {{{brandVoice}}}

  Logo to use as watermark:
  {{media url=logoDataUri}}
  {{#if imageUrl}}
  
  Reference packaging image (use for inspiration):
  {{media url=imageUrl}}
  {{/if}}
  `,
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
  model: 'googleai/gemini-2.5-flash-image-preview',
});

const generateSocialMediaImageFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaImageFlow',
    inputSchema: GenerateSocialMediaImageInputSchema,
    outputSchema: GenerateSocialMediaImageOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output?.imageUrl) {
        throw new Error('Image generation failed to return a URL. This may be due to content safety policies or a temporary model issue.');
    }
    return output;
  }
);
