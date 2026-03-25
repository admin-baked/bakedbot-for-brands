'use server';
/**
 * @fileOverview Generates short marketing videos using Veo 3.1 or Sora.
 *
 * - generateMarketingVideo - A function that generates a marketing video from a text prompt.
 * - GenerateVideoInput - The input type for the generateMarketingVideo function.
 * - GenerateVideoOutput - The return type for the generateMarketingVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

import { 
    GenerateVideoInputSchema, 
    GenerateVideoOutputSchema 
} from '@/ai/video-types';

import { generateSoraVideo } from '../generators/sora';
import { generateVeoVideo } from '../generators/veo';
import { generateKlingVideo, generateWanVideo } from '../generators/fal-video';
import { generateRemotionVideo } from '../generators/remotion-video';
import { getSafeVideoProviderAction } from '@/server/actions/super-admin/safe-settings';
import type { SafeVideoProvider } from '@/server/actions/super-admin/safe-settings-types';

const FALLBACK_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

/**
 * Generates a marketing video using Veo 3.1 or Sora based on system settings.
 */
export async function generateMarketingVideo(
    input: z.infer<typeof GenerateVideoInputSchema>,
    options?: { allowFallbackDemo?: boolean; forceProvider?: SafeVideoProvider }
): Promise<z.infer<typeof GenerateVideoOutputSchema>> {
    if (options?.allowFallbackDemo === false || options?.forceProvider) {
        return runVideoGeneration(input, options);
    }
    return generateVideoFlow(input);
}

const generateVideoFlow = ai.defineFlow(
    {
        name: 'generateMarketingVideoFlow',
        inputSchema: GenerateVideoInputSchema,
        outputSchema: GenerateVideoOutputSchema,
    },
    async (input) => runVideoGeneration(input, { allowFallbackDemo: true })
);

async function runVideoGeneration(
    input: z.infer<typeof GenerateVideoInputSchema>,
    options?: { allowFallbackDemo?: boolean; forceProvider?: SafeVideoProvider }
): Promise<z.infer<typeof GenerateVideoOutputSchema>> {
    // forceProvider bypasses CEO settings — used by Creative Center to route
    // Kling (cinematic AI footage) vs Remotion (branded text slideshows) explicitly.
    let provider = options?.forceProvider ?? 'veo';
    if (!options?.forceProvider) {
        try {
            provider = await getSafeVideoProviderAction();
        } catch (e) {
            console.warn('[generateVideoFlow] Failed to fetch provider setting, defaulting to Veo.');
        }
    }

    console.log(`[generateVideoFlow] ========================================`);
    console.log(`[generateVideoFlow] Primary Provider: ${provider.toUpperCase()}`);
    console.log(`[generateVideoFlow] Input: ${JSON.stringify(input)}`);
    console.log(`[generateVideoFlow] ========================================`);

    // fal.ai providers — Kling v2 Master and Wan 2.1
    if (provider === 'kling') {
        try {
            console.log('[generateVideoFlow] Attempting Kling v2 Master (fal.ai)...');
            return await generateKlingVideo(input);
        } catch (err: unknown) {
            console.error('[generateVideoFlow] Kling failed:', (err as Error).message);
        }
        // Fallback: Wan
        try {
            console.log('[generateVideoFlow] Kling fallback → Wan 2.1...');
            return await generateWanVideo(input);
        } catch (err: unknown) {
            console.error('[generateVideoFlow] Wan fallback failed:', (err as Error).message);
        }
    } else if (provider === 'wan') {
        try {
            console.log('[generateVideoFlow] Attempting Wan 2.1 (fal.ai)...');
            return await generateWanVideo(input);
        } catch (err: unknown) {
            console.error('[generateVideoFlow] Wan failed:', (err as Error).message);
        }
    } else if (provider === 'remotion') {
        try {
            console.log('[generateVideoFlow] Attempting Remotion branded render...');
            return await generateRemotionVideo(input);
        } catch (err: unknown) {
            console.error('[generateVideoFlow] Remotion failed:', (err as Error).message);
            // Fallback: Kling
            try {
                console.log('[generateVideoFlow] Remotion fallback → Kling v2...');
                return await generateKlingVideo(input);
            } catch (klingErr: unknown) {
                console.error('[generateVideoFlow] Kling fallback failed:', (klingErr as Error).message);
            }
        }
    } else if (provider === 'sora' || provider === 'sora-pro') {
        const isPro = provider === 'sora-pro';
        const modelId = isPro ? 'sora-2-pro' : 'sora-2';

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

    if (options?.allowFallbackDemo === false) {
        throw new Error('All video providers failed. Demo fallback disabled.');
    }

    console.warn('[generateVideoFlow] All providers failed. Using Fallback Demo.');
    return {
        videoUrl: FALLBACK_VIDEO_URL,
        thumbnailUrl: undefined,
        duration: parseInt(input.duration || '5', 10),
    };
}

/**
 * Simple wrapper for chat-based video generation.
 * Takes a simple prompt and returns the video URL.
 */
export async function generateVideoFromPrompt(
    prompt: string, 
    options?: {
        duration?: '5' | '10';
        aspectRatio?: '16:9' | '9:16' | '1:1';
        brandName?: string;
        allowFallbackDemo?: boolean;
    }
): Promise<string> {
    const result = await generateMarketingVideo({
        prompt,
        duration: options?.duration || '5',
        aspectRatio: options?.aspectRatio || '16:9',
        brandName: options?.brandName,
    }, { allowFallbackDemo: options?.allowFallbackDemo });
    return result.videoUrl;
}
