
'use server';
/**
 * @fileOverview Generates social media images for products.
 * 
 * Supports tiered image generation:
 * - Free tier: Gemini 2.5 Flash Image (Nano Banana) - fast & efficient
 * - Paid/SuperUser: Gemini 3 Pro Image (Nano Banana Pro) - professional quality
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
 * Simple wrapper for chat-based image generation.
 * Takes a simple prompt and returns the image URL.
 * 
 * @param promptText - The image description
 * @param options.tier - 'free' (2.5 Flash), 'paid' or 'super' (3 Pro)
 */
export async function generateImageFromPrompt(
    promptText: string, 
    options?: { 
      aspectRatio?: string; 
      brandName?: string;
      tier?: ImageTier;
    }
): Promise<string> {
    // Create a simple logo placeholder for chat use
    const logoPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await generateSocialMediaImage({
        productName: promptText,
        features: promptText,
        brandVoice: 'Professional',
        logoDataUri: logoPlaceholder,
    }, options?.tier || 'free');
    
    return result.imageUrl;
}
