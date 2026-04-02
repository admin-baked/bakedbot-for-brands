'use server';

/**
 * Chain video generator — produces 60–90s marketing videos by:
 *   1. Using Claude Haiku to split one user prompt into N scene descriptions
 *   2. Generating all Kling v2 clips in parallel (each 10s)
 *   3. Returning clip URLs + scene titles for Remotion LongFormVideo rendering
 */

import { callClaude } from '@/ai/claude';
import { generateKlingVideo } from './fal-video';
import { logger } from '@/lib/logger';

export interface ChainClip {
    url: string;
    sceneTitle: string;
    duration: number;
}

export interface ChainVideoResult {
    clips: ChainClip[];
}

interface SceneDescription {
    title: string;
    prompt: string;
}

const SCENE_SYSTEM_PROMPT = `You are a cannabis marketing video director. Break the user's concept into distinct cinematic scenes for a short-form video campaign.

Rules:
- Each scene must be visually distinct (different angle, subject, or mood)
- No medical claims, no minors, no prohibited content
- Prompts are for AI video generation — be vivid and visual, no text overlays
- Return ONLY a JSON array. No markdown, no explanation.

Format: [{"title":"2-4 word label","prompt":"detailed cinematic prompt for AI video, no text, no words"}]`;

/**
 * Generate N Kling clips from a single user prompt.
 * Claude Haiku plans the scenes; Kling renders all clips in parallel.
 */
export async function generateChainVideoClips(
    prompt: string,
    sceneCount: number,
    brandContext: {
        brandName?: string;
        aspectRatio?: '16:9' | '9:16' | '1:1';
        voiceSuffix?: string;
    }
): Promise<ChainVideoResult> {
    const { brandName, aspectRatio = '16:9', voiceSuffix = '' } = brandContext;
    const brandPrefix = brandName ? `${brandName} cannabis brand. ` : 'Cannabis brand. ';

    logger.info('[ChainVideo] Planning scenes via Claude Haiku', { sceneCount, prompt: prompt.substring(0, 60) });

    let scenes: SceneDescription[] = [];
    try {
        const sceneJson = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            autoRouteModel: false,
            systemPrompt: SCENE_SYSTEM_PROMPT,
            userMessage: `Create ${sceneCount} scenes for: "${prompt}". Brand context: ${brandPrefix}${voiceSuffix}`,
            maxTokens: 1500,
            temperature: 1.0,
        });

        const jsonMatch = sceneJson.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch?.[0] ?? sceneJson) as unknown;
        if (Array.isArray(parsed)) {
            scenes = (parsed as SceneDescription[]).slice(0, sceneCount);
        }
    } catch (err) {
        logger.warn('[ChainVideo] Claude scene planning failed, using generic scenes', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    if (scenes.length === 0) {
        scenes = Array.from({ length: sceneCount }, (_, i) => ({
            title: `Scene ${i + 1}`,
            prompt: `${brandPrefix}${prompt}${voiceSuffix} Cannabis lifestyle marketing, cinematic quality, no text, no words.`,
        }));
    }

    logger.info('[ChainVideo] Generating Kling clips in parallel', { count: scenes.length });

    const clipPromises = scenes.map(async (scene): Promise<ChainClip> => {
        const result = await generateKlingVideo({
            prompt: scene.prompt,
            duration: '10',
            aspectRatio,
        });

        return {
            url: result.videoUrl,
            sceneTitle: scene.title,
            duration: result.duration,
        };
    });

    const clips = await Promise.all(clipPromises);

    logger.info('[ChainVideo] All clips ready', { count: clips.length });
    return { clips };
}
