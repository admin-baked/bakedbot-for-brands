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
}

export async function generateRemotionVideo(
    input: RemotionVideoInput
): Promise<GenerateVideoOutput> {
    const region = (process.env.REMOTION_AWS_REGION || 'us-east-1') as any;
    const functionName = process.env.REMOTION_AWS_FUNCTION_NAME || 'remotion-render-4-0-438-mem2048mb-disk10240mb-120sec';
    
    // Detect composition type
    const type = input.clipUrls?.length
        ? 'longform'
        : (input.screenshotUrls?.length || input.kineticHeadline)
            ? 'tool'
            : 'slideshow';
    
    const compositionId = COMPOSITION_MAP[type][input.aspectRatio || '16:9'] || COMPOSITION_MAP[type]['16:9'];

    // Build props
    const props = {
        brandName: input.brandName || 'BakedBot AI',
        headline: (input.kineticHeadline || input.headline || input.prompt.substring(0, 40)).toUpperCase(),
        tagline: input.tagline || input.prompt.substring(0, 80),
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        clipUrls: input.clipUrls || [],
        sceneTitles: input.sceneTitles || [],
        ctaText: input.ctaText || 'Shop Now',
        websiteUrl: input.websiteUrl,
        productImageUrl: input.productImageUrl,
        screenshotUrls: input.screenshotUrls || [],
        backgroundImageUrl: input.backgroundImageUrl,
        styleMode: input.styleMode || 'stop-motion',
        kineticHeadline: input.kineticHeadline || 'INTRODUCING',
    };

    try {
        // 1. Trigger render
        const { renderId, bucketName } = await renderMediaOnLambda({
            region,
            functionName,
            composition: compositionId,
            serveUrl: 'bakedbot-creative', // The site name deployed to S3
            codec: 'h264',
            inputProps: props as Record<string, unknown>,
            privacy: 'public',
        });

        logger.info('[Remotion] Render triggered', { renderId, bucketName });

        // 2. Poll for completion (up to 120s)
        let progress = 0;
        let finalUrl = null;
        let attempts = 0;

        while (progress < 1 && attempts < 60) {
            const status = await getRenderProgress({
                renderId,
                bucketName,
                region,
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
            throw new Error('[Remotion] Render timed out after 120 seconds.');
        }

        return {
            videoUrl: finalUrl,
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
