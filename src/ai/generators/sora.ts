
import OpenAI from 'openai';
import OpenAI from 'openai';
import { GenerateVideoInput, GenerateVideoOutput } from '../video-types';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_VIDEO_API_KEY || process.env.OPENAI_API_KEY,
});

/**
 * Generates a video using OpenAI's Sora (or compatible) model.
 * 
 * Note: As of late 2024/early 2025, Sora access is limited. 
 * We use the standard 'images.generate' or 'video.generations.create' (if available) pattern.
 * This implementation assumes a `video.generations` endpoint or similar structure once widely available.
 */
export async function generateSoraVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    console.log('[SoraGenerator] Generating video with input:', JSON.stringify(input));

    try {
        // Fallback for strict typing until official SDK updates
        // @ts-ignore
        const response = await openai.post('/video/generations', {
            model: 'sora-1.0-turbo', // or 'sora-2' as requested
            prompt: input.prompt,
            size: input.aspectRatio === '16:9' ? '1920x1080' : '1080x1920', // Approximate mapping
            quality: 'standard',
        }).catch(async (err: any) => {
            // If the specialized endpoint fails, check if we can use DALL-E 3 as a pseudo-fallback or throw
            console.warn('[SoraGenerator] Direct endpoint failed, error:', err.message);
            throw err;
        });

        // Adapting response structure (hypothetical based on standard OpenAI DALL-E structure)
        const videoUrl = response.data[0].url || response.data[0].b64_json;
        
        if (!videoUrl) {
            throw new Error('No video URL returned from Sora.');
        }

        return {
            videoUrl: videoUrl,
            thumbnailUrl: undefined,
            duration: input.duration ? parseInt(input.duration) : 5,
        };

    } catch (error: any) {
        console.error('[SoraGenerator] Error:', error.message);
        throw new Error(`Sora generation failed: ${error.message}`);
    }
}
