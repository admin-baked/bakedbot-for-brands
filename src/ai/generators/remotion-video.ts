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

export async function generateRemotionVideo(
    input: RemotionVideoInput
): Promise<GenerateVideoOutput> {
    const region = (process.env.REMOTION_AWS_REGION || 'us-east-1') as any;
    const REMOTION_VERSION = '4.0.438';
    const functionName = process.env.REMOTION_AWS_FUNCTION_NAME || `remotion-render-${REMOTION_VERSION.replace(/\./g, '-')}-mem2048mb-disk2048mb-300sec`;
    const bucketName = 'remotionlambda-useast1-5hg2s7ajg0';
    const TIMEOUT_SECONDS = 300; // Increased to 5 minutes for "Solo Mode" reliability 
    
    // Detect composition type
    const type = input.videoSrc
        ? 'remix'
        : input.clipUrls?.length
            ? 'longform'
            : (input.screenshotUrls?.length || input.kineticHeadline)
                ? 'tool'
                : 'slideshow';

    const compositionId = input.compositionId || COMPOSITION_MAP[type][input.aspectRatio || '16:9'] || COMPOSITION_MAP[type]['16:9'];

    // Build props based on composition type
    const baseProps = {
        brandName: input.brandName || 'BakedBot AI',
        headline: (input.kineticHeadline || input.headline || input.prompt.substring(0, 40)).toUpperCase(),
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        ctaText: input.ctaText || 'Shop Now',
        websiteUrl: input.websiteUrl,
    };

    const props = type === 'remix'
        ? {
            ...baseProps,
            videoSrc: input.videoSrc!,
            showHeadline: input.showHeadline ?? true,
            showLowerThird: input.showLowerThird ?? true,
            showOutro: input.showOutro ?? true,
            muted: input.muted ?? false,
            durationOverride: input.durationOverride,
        }
        : {
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

    try {
        // 1. Trigger render
        const { renderId } = await renderMediaOnLambda({
            region,
            functionName,
            composition: compositionId,
            serveUrl: 'bakedbot-creative', // The site name deployed to S3/sites/
            codec: 'h264',
            inputProps: props as Record<string, unknown>,
            privacy: 'no-acl',
            // Limit to 1 concurrent Lambda invocation to avoid AWS ThrottlingException.
            // Renders take longer but reliably complete without 429s on this account.
            concurrencyPerLambda: 1,
        });

        logger.info('[Remotion] Render triggered', { renderId, bucketName });

        // 2. Poll for completion (up to 300s)
        let progress = 0;
        let finalUrl = null;
        let attempts = 0;

        while (progress < 1 && attempts < 300) { // 300 attempts * 2s = 600s
            logger.info('[Remotion] Polling attempt', { attempts, renderId });
            const status = await getRenderProgress({
                renderId,
                bucketName,
                region,
                functionName,
            });
            logger.info('[Remotion] Polling status', { 
                progress: status.overallProgress,
                done: !!status.outputFile,
                error: !!status.fatalErrorEncountered
            });

            if (status.fatalErrorEncountered) {
                throw new Error(`[Remotion] Lambda render failed: ${status.errors[0]?.message}`);
            }

            progress = status.overallProgress;
            
            if (status.outputFile) {
                finalUrl = status.outputFile;
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        }

        if (!finalUrl) {
            throw new Error('[Remotion] Render timed out after 300 seconds.');
        }

        // Presign the S3 URL so clients can access it (no-acl bucket)
        let accessibleUrl = finalUrl;
        try {
            // Extract bucket and key from the S3 URL
            const s3Match = finalUrl.match(/s3\.[\w-]+\.amazonaws\.com\/([^/]+)\/(.+)/);
            if (s3Match) {
                accessibleUrl = await presignUrl({
                    region,
                    bucketName: s3Match[1],
                    objectKey: s3Match[2],
                    expiresInSeconds: 7 * 24 * 60 * 60, // 7 days
                });
            }
        } catch (presignErr) {
            logger.warn('[Remotion] Presign failed, using raw URL', {
                error: presignErr instanceof Error ? presignErr.message : String(presignErr),
            });
        }

        return {
            videoUrl: accessibleUrl,
            thumbnailUrl: undefined,
            duration: 10,
            provider: 'remotion',
            model: compositionId,
        };

    } catch (error) {
        logger.error('[Remotion] Lambda error', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}

