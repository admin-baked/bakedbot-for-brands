'use server';

/**
 * Remotion video generator — renders React compositions on AWS Lambda.
 * 
 * Production: @remotion/lambda client -> S3
 */

import { logger } from '@/lib/logger';
import {
    renderMediaOnLambda,
    getRenderProgress,
    presignUrl,
} from '@remotion/lambda/client';
import type { GenerateVideoInput, GenerateVideoOutput } from '../video-types';
import type { VideoStyle } from '@/types/creative-video';

// Map aspect ratio to Remotion composition ID
const COMPOSITION_MAP: Record<string, Record<string, string>> = {
    slideshow: {
        '16:9': 'BrandedSlideshow-16x9',
        '9:16': 'BrandedSlideshow-9x16',
        '1:1': 'BrandedSlideshow-1x1',
    },
    tool: {
        '16:9': 'ToolShowcase-16x9',
        '9:16': 'ToolShowcase-9x16',
        '1:1': 'ToolShowcase-1x1',
    },
    longform: {
        '16:9': 'LongFormVideo-16x9',
        '9:16': 'LongFormVideo-9x16',
        '1:1': 'LongFormVideo-1x1',
    },
    remix: {
        '16:9': 'VideoRemix-16x9',
        '9:16': 'VideoRemix-9x16',
        '1:1': 'VideoRemix-1x1',
    },
};
const REMOTION_POLL_INTERVAL_MS = 2_000;
const REMOTION_MAX_POLL_ATTEMPTS = 180;
const REMOTION_POLL_TIMEOUT_SECONDS = Math.floor(
    (REMOTION_POLL_INTERVAL_MS * REMOTION_MAX_POLL_ATTEMPTS) / 1000,
);

export interface RemotionVideoInput extends GenerateVideoInput {
    productImageUrl?: string;
    screenshotUrls?: string[];
    backgroundImageUrl?: string;
    styleMode?: VideoStyle;
    kineticHeadline?: string;
    ctaText?: string;
    websiteUrl?: string;
    headline?: string;
    clipUrls?: string[];
    sceneTitles?: string[];
    compositionId?: string;
    /** Source video URL for remix mode */
    videoSrc?: string;
    /** Remix overlay toggles */
    showHeadline?: boolean;
    showLowerThird?: boolean;
    showOutro?: boolean;
    /** Mute source video audio */
    muted?: boolean;
    /** Override total duration in frames */
    durationOverride?: number;
}

export interface RemotionRenderSession {
    renderId: string;
    duration: number;
    provider: 'remotion';
    model: string;
}

export interface RemotionRenderStatus {
    status: 'pending' | 'completed' | 'failed';
    progress: number;
    duration: number;
    provider: 'remotion';
    model: string;
    videoUrl?: string;
    error?: string;
}

interface RemotionLambdaConfig {
    region: string;
    functionName: string;
    bucketName: string;
}

type RemotionCompositionType = keyof typeof COMPOSITION_MAP;

function getRemotionLambdaConfig(): RemotionLambdaConfig {
    const REMOTION_VERSION = '4.0.438';

    return {
        region: process.env.REMOTION_AWS_REGION || 'us-east-1',
        functionName: process.env.REMOTION_AWS_FUNCTION_NAME || `remotion-render-${REMOTION_VERSION.replace(/\./g, '-')}-mem2048mb-disk2048mb-300sec`,
        bucketName: 'remotionlambda-useast1-5hg2s7ajg0',
    };
}

function getRemotionCompositionType(input: RemotionVideoInput): RemotionCompositionType {
    if (input.videoSrc) {
        return 'remix';
    }

    if (input.clipUrls?.length) {
        return 'longform';
    }

    if (input.screenshotUrls?.length || input.kineticHeadline) {
        return 'tool';
    }

    return 'slideshow';
}

function getRemotionDurationSeconds(input: RemotionVideoInput): number {
    if (typeof input.durationOverride === 'number' && Number.isFinite(input.durationOverride) && input.durationOverride > 0) {
        return Math.max(1, Math.ceil(input.durationOverride / 30));
    }

    return Number.parseInt(input.duration || '5', 10);
}

function getRemotionCompositionId(
    input: RemotionVideoInput,
    type: RemotionCompositionType,
): string {
    return input.compositionId
        || COMPOSITION_MAP[type][input.aspectRatio || '16:9']
        || COMPOSITION_MAP[type]['16:9'];
}

function buildRemotionProps(
    input: RemotionVideoInput,
    type: RemotionCompositionType,
): Record<string, unknown> {
    const baseProps = {
        brandName: input.brandName || 'BakedBot AI',
        headline: (input.kineticHeadline || input.headline || input.prompt.substring(0, 40)).toUpperCase(),
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        ctaText: input.ctaText || 'Learn More',
        websiteUrl: input.websiteUrl,
    };

    if (type === 'remix') {
        return {
            ...baseProps,
            videoSrc: input.videoSrc!,
            showHeadline: input.showHeadline ?? true,
            showLowerThird: input.showLowerThird ?? true,
            showOutro: input.showOutro ?? true,
            muted: input.muted ?? false,
            durationOverride: input.durationOverride,
        };
    }

    return {
        ...baseProps,
        tagline: input.tagline || input.prompt.substring(0, 80),
        clipUrls: input.clipUrls || [],
        sceneTitles: input.sceneTitles || [],
        productImageUrl: input.productImageUrl,
        screenshotUrls: input.screenshotUrls || [],
        backgroundImageUrl: input.backgroundImageUrl,
        styleMode: input.styleMode || 'stop-motion',
        kineticHeadline: input.kineticHeadline || 'INTRODUCING',
    };
}

async function toAccessibleRenderUrl(
    finalUrl: string,
    config: RemotionLambdaConfig,
): Promise<string> {
    let accessibleUrl = finalUrl;

    try {
        const s3Match = finalUrl.match(/s3\.[\w-]+\.amazonaws\.com\/([^/]+)\/(.+)/);
        if (s3Match) {
            accessibleUrl = await presignUrl({
                region: config.region as any,
                bucketName: s3Match[1],
                objectKey: s3Match[2],
                expiresInSeconds: 7 * 24 * 60 * 60,
            });
        }
    } catch (presignErr) {
        logger.warn('[Remotion] Presign failed, using raw URL', {
            error: presignErr instanceof Error ? presignErr.message : String(presignErr),
        });
    }

    return accessibleUrl;
}

export async function startRemotionVideoRender(
    input: RemotionVideoInput,
): Promise<RemotionRenderSession> {
    const config = getRemotionLambdaConfig();
    const type = getRemotionCompositionType(input);
    const compositionId = getRemotionCompositionId(input, type);
    const props = buildRemotionProps(input, type);

    const { renderId } = await renderMediaOnLambda({
        region: config.region as any,
        functionName: config.functionName,
        composition: compositionId,
        serveUrl: 'bakedbot-creative',
        codec: 'h264',
        inputProps: props,
        privacy: 'no-acl',
        concurrencyPerLambda: 1,
    });

    logger.info('[Remotion] Render triggered', {
        renderId,
        bucketName: config.bucketName,
        compositionId,
    });

    return {
        renderId,
        duration: getRemotionDurationSeconds(input),
        provider: 'remotion',
        model: compositionId,
    };
}

export async function getRemotionVideoRenderStatus(
    renderId: string,
    metadata?: Partial<Pick<RemotionRenderSession, 'duration' | 'model'>>,
): Promise<RemotionRenderStatus> {
    const config = getRemotionLambdaConfig();
    const duration = metadata?.duration ?? 5;
    const model = metadata?.model ?? 'remotion';

    const status = await getRenderProgress({
        renderId,
        bucketName: config.bucketName,
        region: config.region as any,
        functionName: config.functionName,
    });

    if (status.fatalErrorEncountered) {
        return {
            status: 'failed',
            progress: status.overallProgress,
            duration,
            provider: 'remotion',
            model,
            error: status.errors[0]?.message || '[Remotion] Lambda render failed.',
        };
    }

    if (status.outputFile) {
        const accessibleUrl = await toAccessibleRenderUrl(status.outputFile, config);
        return {
            status: 'completed',
            progress: 1,
            duration,
            provider: 'remotion',
            model,
            videoUrl: accessibleUrl,
        };
    }

    return {
        status: 'pending',
        progress: status.overallProgress,
        duration,
        provider: 'remotion',
        model,
    };
}

export async function generateRemotionVideo(
    input: RemotionVideoInput
): Promise<GenerateVideoOutput> {
    const session = await startRemotionVideoRender(input);

    try {
        for (let attempts = 0; attempts < REMOTION_MAX_POLL_ATTEMPTS; attempts += 1) {
            logger.info('[Remotion] Polling attempt', { attempts, renderId: session.renderId });
            const status = await getRemotionVideoRenderStatus(session.renderId, session);
            logger.info('[Remotion] Polling status', {
                progress: status.progress,
                done: status.status === 'completed',
                error: status.status === 'failed',
            });

            if (status.status === 'completed' && status.videoUrl) {
                return {
                    videoUrl: status.videoUrl,
                    thumbnailUrl: undefined,
                    duration: status.duration,
                    provider: status.provider,
                    model: status.model,
                };
            }

            if (status.status === 'failed') {
                throw new Error(status.error || '[Remotion] Lambda render failed.');
            }

            await new Promise(resolve => setTimeout(resolve, REMOTION_POLL_INTERVAL_MS));
        }

        throw new Error(`[Remotion] Render timed out after ${REMOTION_POLL_TIMEOUT_SECONDS} seconds.`);
    } catch (error) {
        logger.error('[Remotion] Lambda error', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

