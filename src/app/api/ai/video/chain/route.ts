import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { generateChainVideoClips } from '@/ai/generators/chain-video';
import { generateRemotionVideo } from '@/ai/generators/remotion-video';
import { ChainGenerationRequestSchema } from '@/types/creative-video';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
// Chain generation: ~6 Kling clips (each up to 6 min) + Remotion render.
// Next.js default is 60s — raise limit for long-running video jobs.
export const maxDuration = 600;

const SCENE_COUNTS: Record<string, number> = {
    '60': 6,
    '90': 9,
};

export async function POST(request: NextRequest) {
    try {
        await requireUser();

        const body = await request.json() as unknown;
        const parsed = ChainGenerationRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
        }

        const { prompt, aspectRatio, styleMode, kineticHeadline, backgroundImageUrl } = parsed.data;
        const targetDuration = (body as Record<string, unknown>)['targetDuration'];
        const sceneCount = SCENE_COUNTS[String(targetDuration)] ?? 6;

        logger.info('[API/video/chain] Starting chain generation', {
            prompt: prompt.substring(0, 60),
            sceneCount,
            aspectRatio,
        });

        // Step 1: Generate Kling clips (in parallel via chain-video generator)
        const { clips } = await generateChainVideoClips(prompt, sceneCount, { aspectRatio });

        logger.info('[API/video/chain] Clips ready, starting Remotion render', { clipCount: clips.length });

        // Step 2: Render with Remotion LongFormVideo
        const result = await generateRemotionVideo({
            prompt,
            aspectRatio,
            // LongFormVideo-specific fields (picked up by 'longform' type detection)
            clipUrls: clips.map((c) => c.url),
            sceneTitles: clips.map((c) => c.sceneTitle),
            // Brand context forwarded from UI
            kineticHeadline: kineticHeadline || prompt.substring(0, 40).toUpperCase(),
            styleMode,
            backgroundImageUrl,
        });

        logger.info('[API/video/chain] Render complete', { videoUrl: result.videoUrl, duration: result.duration });

        return NextResponse.json({
            videoUrl: result.videoUrl,
            duration: result.duration,
            clipCount: clips.length,
            provider: result.provider,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Chain video generation failed';
        logger.error('[API/video/chain] Generation failed', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
