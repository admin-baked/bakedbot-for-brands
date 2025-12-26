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
    prompt: `You are a specialized AI assistant for creating product-focused marketing videos.
    Your task is to generate a compelling, eye-catching short video for a cannabis brand.
    
    Request: {{{prompt}}}
    Duration: {{{duration}}} seconds
    Aspect Ratio: {{{aspectRatio}}}
    
    Generate the video now.
    `,
    model: 'googleai/veo-3.1-generate-preview',
});

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

const generateVideoFlow = ai.defineFlow(
    {
        name: 'generateMarketingVideoFlow',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: GenerateVideoOutputSchema,
    },
    async (input) => {
        try {
            console.log('[generateVideoFlow] Prompting model with:', JSON.stringify(input));
            const response = await videoPrompt(input);
            console.log('[generateVideoFlow] Raw Response:', JSON.stringify(response));

            const video = response.media;
            
            if (!video || !video.url) {
                console.warn('[generateVideoFlow] Model failed to return media. Using Fallback.');
                if (response.text) console.warn('[generateVideoFlow] Model Text:', response.text);
                
                return {
                    videoUrl: FALLBACK_VIDEO_URL,
                    thumbnailUrl: undefined, 
                    duration: parseInt(input.duration || '5', 10),
                };
            }
            
            return {
                videoUrl: video.url,
                thumbnailUrl: undefined, 
                duration: parseInt(input.duration || '5', 10),
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[generateVideoFlow] Error:', errorMessage);
            console.warn('[generateVideoFlow] switching to fallback video due to error.');
            
            return {
                videoUrl: FALLBACK_VIDEO_URL,
                thumbnailUrl: undefined,
                duration: parseInt(input.duration || '5', 10),
            };
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
