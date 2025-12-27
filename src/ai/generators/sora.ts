
import OpenAI from 'openai';import { GenerateVideoInput, GenerateVideoOutput } from '../video-types';

/**
 * Generates a video using OpenAI's Sora (or compatible) model.
 */
export async function generateSoraVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    console.log('[SoraGenerator] Generating video with input:', JSON.stringify(input));

    const apiKey = process.env.OPENAI_VIDEO_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OpenAI API Key for Video Generation');
    }

    try {
        // Attempting primary endpoint based on beta documentation
        const response = await fetch('https://api.openai.com/v1/videos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sora-1.0-turbo',
                prompt: input.prompt,
                size: input.aspectRatio === '16:9' ? '1920x1080' : '1080x1920',
                quality: 'standard',
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const videoUrl = data.data?.[0]?.url; // Adjust based on actual API shape
        
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
