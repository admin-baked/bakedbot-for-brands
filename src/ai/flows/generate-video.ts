'use server';
/**
 * @fileOverview Generates short marketing videos using Veo 3.1 or Sora.
 *
 * - generateMarketingVideo - A function that generates a marketing video from a text prompt.
 * - GenerateVideoInput - The input type for the generateMarketingVideo function.
 * - GenerateVideoOutput - The return type for the generateMarketingVideo function.
 */

import { ai } from '@/ai/genkit';

import { 
    GenerateVideoInputSchema, 
    GenerateVideoInput, 
    GenerateVideoOutputSchema, 
    GenerateVideoOutput 
} from '@/ai/video-types';

import { generateSoraVideo } from '../generators/sora';
import { generateVeoVideo } from '../generators/veo';
import { getSafeVideoProviderAction } from '@/server/actions/super-admin/safe-settings';

export type { GenerateVideoInput, GenerateVideoOutput };

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

/**
 * Generates a marketing video using Veo 3.1 or Sora based on system settings.
 */
export async function generateMarketingVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    return generateVideoFlow(input);
}

const generateVideoFlow = ai.defineFlow(
    {
        name: 'generateMarketingVideoFlow',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: GenerateVideoOutputSchema,
    },
    async (input) => {
        let provider = 'veo';
        try {
            provider = await getSafeVideoProviderAction();
        } catch (e) {
            console.warn('[generateVideoFlow] Failed to fetch provider setting, defaulting to Veo.');
        }

        console.log(`[generateVideoFlow] ========================================`);
        console.log(`[generateVideoFlow] Primary Provider: ${provider.toUpperCase()}`);
        console.log(`[generateVideoFlow] Input: ${JSON.stringify(input)}`);
        console.log(`[generateVideoFlow] ========================================`);

        if (provider === 'sora' || provider === 'sora-pro') {
            const isPro = provider === 'sora-pro';
            const modelId = isPro ? 'sora-2-pro' : 'sora-2';

            // Priority: Sora (Standard or Pro) -> Veo -> Fallback
            try {
                console.log(`[generateVideoFlow] Attempting Sora (${isPro ? 'Pro' : 'Standard'})...`);
                return await generateSoraVideo(input, { model: modelId });
            } catch (soraError: unknown) {
                const err = soraError as Error;
                console.error('[generateVideoFlow] Sora Failed:', err.message);
                console.error('[generateVideoFlow] Sora Error Details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
                
                try {
                    console.log('[generateVideoFlow] Fallback to Veo 3.1...');
                    return await generateVeoVideo(input);
                } catch (veoError: unknown) {
                    const veoErr = veoError as Error;
                    console.error('[generateVideoFlow] Veo 3.1 Fallback Failed:', veoErr.message);
                    console.error('[generateVideoFlow] Veo Error Details:', JSON.stringify(veoErr, Object.getOwnPropertyNames(veoErr)));
                }
            }
        } else {
            // Priority: Veo -> Sora -> Fallback (Default)
            try {
                console.log('[generateVideoFlow] Attempting Veo 3.1...');
                return await generateVeoVideo(input);
            } catch (veoError: unknown) {
                const veoErr = veoError as Error;
                console.error('[generateVideoFlow] Veo 3.1 Failed:', veoErr.message);
                console.error('[generateVideoFlow] Veo Error Details:', JSON.stringify(veoErr, Object.getOwnPropertyNames(veoErr)));
            }

            try {
                console.log('[generateVideoFlow] Fallback to Sora 2...');
                return await generateSoraVideo(input, { model: 'sora-2' });
            } catch (soraError: unknown) {
                const soraErr = soraError as Error;
                console.error('[generateVideoFlow] Sora Fallback Failed:', soraErr.message);
                console.error('[generateVideoFlow] Sora Error Details:', JSON.stringify(soraErr, Object.getOwnPropertyNames(soraErr)));
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
