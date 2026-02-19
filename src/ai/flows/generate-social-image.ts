
'use server';
/**
 * @fileOverview Generates social media images for products.
 *
 * Provider cascade (cannabis-friendly first):
 *   1. fal.ai FLUX.1 — primary, no cannabis restrictions, fast
 *   2. Gemini 2.5/3 Flash Image — fallback (may be blocked for cannabis content)
 *
 * Tiers:
 *   free  → fal.ai FLUX.1 Schnell → Gemini 2.5 Flash Image
 *   paid  → fal.ai FLUX.1 Pro     → Gemini 3 Pro Image
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { logger } from '@/lib/logger';
import { generateImageWithFal } from '@/ai/generators/fal';

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

// Base prompt template (shared between models)
const imagePromptTemplate = `You are a specialized AI assistant for creating product-focused social media marketing images.
Your task is to generate a compelling, eye-catching image that has viral potential for a social media post about a cannabis product.
The image should be vibrant, modern, share-worthy, and suitable for platforms like Instagram and Twitter.

**IMPORTANT RULE:** You MUST ONLY generate images that are directly related to the product concept provided.
You MUST refuse any request to generate images of unrelated subjects, including but not limited to people, animals, documents, diagrams, or harmful content.

Using the provided brand logo, place it as a tasteful, subtle watermark in one of the corners of the generated image.
If a product packaging image is also provided, use its style as a secondary source of inspiration for the main image content.

Image Prompt - Product Concept:
- Product Name: {{{productName}}}
- Description/Features: {{{features}}}
- Brand Voice: {{{brandVoice}}}

Assets to Use:
- Watermark: {{media url=logoDataUri}}
{{#if imageUrl}}
- Reference packaging image: {{media url=imageUrl}}
{{/if}}
`;

// FREE TIER: Gemini 2.5 Flash Image (Nano Banana) - Fast & efficient
const promptFree = ai.definePrompt({
  name: 'generateSocialMediaImagePromptFree',
  input: {schema: GenerateSocialMediaImageInputSchema},
  output: { format: 'media' },
  prompt: imagePromptTemplate,
  config: {
    responseModalities: ['IMAGE'],
    safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
    ]
  },
  model: 'googleai/gemini-2.5-flash-image',
});

// PAID/SUPERUSER TIER: Gemini 3 Pro Image (Nano Banana Pro) - Professional quality
const promptPro = ai.definePrompt({
  name: 'generateSocialMediaImagePromptPro',
  input: {schema: GenerateSocialMediaImageInputSchema},
  output: { format: 'media' },
  prompt: imagePromptTemplate,
  config: {
    responseModalities: ['IMAGE'],
    safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
    ]
  },
  model: 'googleai/gemini-3-pro-image-preview',
});

export type ImageTier = 'free' | 'paid' | 'super';

export async function generateSocialMediaImage(
  input: GenerateSocialMediaImageInput,
  tier: ImageTier = 'free'
): Promise<GenerateSocialMediaImageOutput> {
  // Select prompt based on tier
  const selectedPrompt = tier === 'free' ? promptFree : promptPro;
  
  const response = await selectedPrompt(input);
  const image = response.media;
  
  if (!image || !image.url) {
      throw new Error('Image generation failed to return a URL. The model may have blocked the request or returned no media.');
  }
  
  return {
      imageUrl: image.url
  };
}

/**
 * Generate a social image with a cannabis-friendly provider cascade.
 *
 * Cascade: fal.ai FLUX.1 → Gemini → throw (caller handles placeholder)
 *
 * @param promptText - The image description / campaign prompt
 * @param options.tier - 'free' (Schnell), 'paid'/'super' (Pro)
 * @param options.platform - Social platform for correct aspect ratio
 */
export async function generateImageFromPrompt(
    promptText: string,
    options?: {
        aspectRatio?: string;
        brandName?: string;
        tier?: ImageTier;
        platform?: string;
    }
): Promise<string> {
    // 1. Try fal.ai FLUX.1 first — cannabis-friendly, fast, no safety filter issues
    try {
        const falTier = (options?.tier === 'free' || !options?.tier) ? 'free' : 'paid';
        return await generateImageWithFal(promptText, {
            tier: falTier,
            platform: options?.platform,
        });
    } catch (falErr) {
        logger.warn('[image-gen] fal.ai failed, falling back to Gemini', {
            error: String(falErr).substring(0, 200),
        });
    }

    // 2. Fall back to Gemini (may be blocked for cannabis content)
    const logoPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await generateSocialMediaImage({
        productName: promptText,
        features: promptText,
        brandVoice: 'Professional',
        logoDataUri: logoPlaceholder,
    }, options?.tier || 'free');

    return result.imageUrl;
}
