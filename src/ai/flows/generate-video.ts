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

import { 
    GenerateVideoInputSchema, 
    GenerateVideoInput, 
    GenerateVideoOutputSchema, 
    GenerateVideoOutput 
} from '@/ai/video-types';

export type { GenerateVideoInput, GenerateVideoOutput };

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
    model: 'googleai/veo-3.0-generate-001',
});

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

// ... imports
import { generateSoraVideo } from '../generators/sora';
import { getVideoProviderAction } from '@/server/actions/super-admin/global-settings';

const generateVideoFlow = ai.defineFlow(
    {
        name: 'generateMarketingVideoFlow',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: GenerateVideoOutputSchema,
    },
    async (input) => {
        let provider = 'veo';
        try {
            provider = await getVideoProviderAction();
        } catch (e) {
            console.warn('[generateVideoFlow] Failed to fetch provider setting, defaulting to Veo.');
        }

        console.log(`[generateVideoFlow] Primary Provider: ${provider.toUpperCase()}`);

        if (provider === 'sora') {
            // Priority: Sora -> Veo -> Fallback
            try {
                console.log('[generateVideoFlow] Attempting Sora 2...');
                return await generateSoraVideo(input);
            } catch (soraError: unknown) {
                console.error('[generateVideoFlow] Sora Failed:', (soraError as Error).message);
                
                try {
                    console.log('[generateVideoFlow] Fallback to Veo 3.0...');
                    const response = await videoPrompt(input);
                    const video = response.media;
                    if (video && video.url) {
                        return {
                            videoUrl: video.url,
                            thumbnailUrl: undefined,
                            duration: parseInt(input.duration || '5', 10),
                        };
                    }
                } catch (veoError: unknown) {
                    console.error('[generateVideoFlow] Veo 3.0 Fallback Failed:', (veoError as Error).message);
                }
            }
        } else {
            // Priority: Veo -> Sora -> Fallback (Default)
            try {
                console.log('[generateVideoFlow] Attempting Veo 3.0...');
                const response = await videoPrompt(input);
                const video = response.media;

                if (video && video.url) {
                    return {
                        videoUrl: video.url,
                        thumbnailUrl: undefined,
                        duration: parseInt(input.duration || '5', 10),
                    };
                }
                console.warn('[generateVideoFlow] Veo returned no URL.');
            } catch (veoError: unknown) {
                console.error('[generateVideoFlow] Veo 3.0 Failed:', (veoError as Error).message);
            }

            try {
                console.log('[generateVideoFlow] Fallback to Sora 2...');
                return await generateSoraVideo(input);
            } catch (soraError: unknown) {
                console.error('[generateVideoFlow] Sora Fallback Failed:', (soraError as Error).message);
            }
        }

        // Ultimate Fallback
        console.warn('[generateVideoFlow] All providers failed. Using Fallback Demo.');
        return {
            videoUrl: FALLBACK_VIDEO_URL,
            thumbnailUrl: undefined,
            duration: parseInt(input.duration || '5', 10),
        };
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
