'use server';
/**
 * @fileOverview Generates short marketing videos using Veo 3.1.
 *
 * - generateMarketingVideo - A function that generates a marketing video from a text prompt.
 * - GenerateVideoInput - The input type for the generateMarketingVideo function.
 * - GenerateVideoOutput - The return type for the generateMarketingVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateVideoInputSchema = z.object({
    prompt: z.string().describe('A detailed description of the video to generate.'),
    duration: z.enum(['5', '10']).optional().default('5').describe('Video duration in seconds (5 or 10).'),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9').describe('Video aspect ratio.'),
    brandName: z.string().optional().describe('Brand name for watermark/context.'),
});

export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

const GenerateVideoOutputSchema = z.object({
    videoUrl: z.string().describe('URL of the generated video.'),
    thumbnailUrl: z.string().optional().describe('URL of the video thumbnail.'),
    duration: z.number().describe('Actual duration in seconds.'),
});

export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;

/**
 * Generates a marketing video using Veo 3.1.
 */
export async function generateMarketingVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    return generateVideoFlow(input);
}

const videoPrompt = ai.definePrompt({
    name: 'generateMarketingVideoPrompt',
    input: { schema: GenerateVideoInputSchema },
    output: { format: 'media' }, // Expect media output, not JSON
    prompt: `You are a specialized AI assistant for creating product-focused marketing videos.
    Your task is to generate a compelling, eye-catching short video for a cannabis brand.
    The video should be vibrant, modern, and suitable for social media platforms.

    **IMPORTANT RULES:**
    - You MUST ONLY generate videos that are directly related to the product concept provided.
    - You MUST refuse any request to generate videos of unrelated subjects, harmful content, or medical claims.
    - Keep the video professional and compliant with cannabis advertising guidelines.

    Video Request:
    - Prompt: {{{prompt}}}
    - Duration: {{{duration}}} seconds
    - Aspect Ratio: {{{aspectRatio}}}
    {{#if brandName}}
    - Brand: {{{brandName}}}
    {{/if}}

    Generate a video that captures attention in the first 2 seconds and maintains engagement throughout.
    `,
    model: 'googleai/veo-3.1-generate-preview',
});

const generateVideoFlow = ai.defineFlow(
    {
        name: 'generateMarketingVideoFlow',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: GenerateVideoOutputSchema,
    },
    async (input) => {
        try {
            const response = await videoPrompt(input);
            const video = response.media;
            
            if (!video || !video.url) {
                throw new Error('Video generation failed to return a URL. This may be due to content safety policies or a temporary model issue.');
            }
            
            return {
                videoUrl: video.url,
                thumbnailUrl: undefined, // Veo preview might not return separate thumbnail
                duration: parseInt(input.duration || '5', 10),
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[generateVideoFlow] Error:', errorMessage);
            throw new Error(`Video generation failed: ${errorMessage}`);
        }
    }
);

/**
 * Simple wrapper for chat-based video generation.
 * Takes a simple prompt and returns the video URL.
 */
export async function generateVideoFromPrompt(
    prompt: string, 
    options?: { duration?: '5' | '10'; aspectRatio?: '16:9' | '9:16' | '1:1'; brandName?: string }
): Promise<string> {
    const result = await generateMarketingVideo({
        prompt,
        duration: options?.duration || '5',
        aspectRatio: options?.aspectRatio || '16:9',
        brandName: options?.brandName,
    });
    return result.videoUrl;
}
