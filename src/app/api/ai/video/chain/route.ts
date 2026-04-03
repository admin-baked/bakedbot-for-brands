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

const SCENE_COUNTS: Record<string, number> = { '60': 6, '90': 9 };

export async function POST(request: NextRequest) {
    try {
        await requireUser();

        const parsed = ChainGenerationRequestSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
        }

        const { prompt, aspectRatio, styleMode, kineticHeadline, backgroundImageUrl, targetDuration, videoModel } = parsed.data;
        const sceneCount = SCENE_COUNTS[targetDuration] ?? 6;

        logger.info('[API/video/chain] Starting chain generation', { prompt: prompt.substring(0, 60), sceneCount, aspectRatio, videoModel });

        const { clips } = await generateChainVideoClips(prompt, sceneCount, { aspectRatio, videoModel });

        logger.info('[API/video/chain] Clips ready, starting Remotion render', { clipCount: clips.length });

        const result = await generateRemotionVideo({
            prompt,
            aspectRatio,
            clipUrls: clips.map((c) => c.url),
            sceneTitles: clips.map((c) => c.sceneTitle),
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
