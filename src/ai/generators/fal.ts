'use server';

/**
 * fal.ai FLUX.1 image generator
 *
 * Cannabis-friendly image generation via fal.ai's REST API.
 * FLUX.1 models have no content restrictions for legal cannabis businesses,
 * making them ideal as a primary image provider over Gemini/OpenAI.
 *
 * Tiers:
 *   free  → FLUX.1 Schnell (4-step, ~1-3s, ~$0.003/image)
 *   paid  → FLUX.1 [pro]   (28-step, ~5-10s, ~$0.05/image, higher quality)
 *   super → FLUX.1 [pro]   (same as paid)
 */

import { logger } from '@/lib/logger';

// fal.ai FLUX.1 endpoints
const FAL_ENDPOINTS = {
    schnell: 'https://fal.run/fal-ai/flux/schnell',  // free tier — ultra-fast
    pro: 'https://fal.run/fal-ai/flux-pro',           // paid/super tier — pro quality
} as const;

// Map social platform to fal.ai image_size parameter
// Options: square_hd (1024×1024), portrait_4_3 (768×1024),
//          portrait_16_9 (576×1024), landscape_4_3 (1024×768), landscape_16_9 (1024×576)
const PLATFORM_IMAGE_SIZE: Record<string, string> = {
    instagram: 'square_hd',       // 1024×1024 (standard post)
    tiktok: 'portrait_16_9',      // 576×1024 (9:16 vertical)
    linkedin: 'landscape_16_9',   // 1024×576 (professional wide)
    twitter: 'landscape_16_9',    // 1024×576 (wide card)
    facebook: 'square_hd',        // 1024×1024 (feed post)
};

export type FalImageTier = 'free' | 'paid' | 'super';

interface FalImageOptions {
    tier?: FalImageTier;
    platform?: string;
}

interface FalResponse {
    images?: Array<{
        url: string;
        content_type?: string;
        width?: number;
        height?: number;
    }>;
    error?: string;
}

/**
 * Sanitize a user prompt for image generation.
 *
 * FLUX.1 Schnell (4-step) is a photography/art model — it has poor text rendering
 * and garbles any words it tries to write. We explicitly forbid text in the image
 * and let the caller's prompt drive the visual style (e.g. template imageStyle hints).
 */
function buildImagePrompt(userPrompt: string, tier: FalImageTier): string {
    const noText = 'no text, no words, no letters, no watermarks, no captions, no overlays';
    const quality = tier === 'free'
        ? 'sharp focus, vibrant colors, high quality'
        : 'ultra-detailed, 8k, award-winning commercial photography';

    // Strip any instruction that would cause the model to render text
    const sanitized = userPrompt
        .replace(/\b(text|caption|slogan|headline|title|label|banner|ad copy)\b/gi, '')
        .trim();

    // Let the user's prompt (which includes imageStyle from campaign templates) drive the
    // visual direction instead of always prepending a fixed photoStyle prefix.
    return `${sanitized}, ${quality}, ${noText}.`;
}

/**
 * Generate an image using fal.ai FLUX.1.
 * Throws if the API key is not set or the request fails.
 */
export async function generateImageWithFal(
    prompt: string,
    options?: FalImageOptions
): Promise<string> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) {
        throw new Error('FAL_API_KEY not configured');
    }

    const tier = options?.tier ?? 'free';
    const endpoint = tier === 'free' ? FAL_ENDPOINTS.schnell : FAL_ENDPOINTS.pro;
    const imageSize = PLATFORM_IMAGE_SIZE[options?.platform ?? 'instagram'] ?? 'square_hd';

    // FLUX.1 Schnell uses 4 steps (baked-in quality for speed),
    // FLUX.1 Pro uses 28 steps for higher quality
    const numSteps = tier === 'free' ? 4 : 28;

    // Sanitize the prompt — FLUX.1 garbles any text it tries to render.
    // Steer toward clean product photography with no text overlays.
    const safePrompt = buildImagePrompt(prompt, tier);

    logger.info('[fal] Generating image', {
        tier,
        platform: options?.platform,
        imageSize,
        numSteps,
        promptPreview: safePrompt.substring(0, 80),
    });

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: safePrompt,
            image_size: imageSize,
            num_inference_steps: numSteps,
            enable_safety_checker: false,  // legal cannabis business — no content restrictions
        }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown error');
        throw new Error(`fal.ai request failed (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json() as FalResponse;

    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
        throw new Error('fal.ai returned no image URL in response');
    }

    logger.info('[fal] Image generated successfully', {
        tier,
        width: data.images?.[0]?.width,
        height: data.images?.[0]?.height,
    });

    return imageUrl;
}
