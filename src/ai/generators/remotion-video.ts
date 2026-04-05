'use server';

/**
 * Remotion video generator — renders React compositions to MP4.
 *
 * Render path:
 *   Dev/Cloud Run: @remotion/renderer renderMedia() (needs Chromium in container)
 *   Production:    TODO — @remotion/cloudrun (separate Cloud Run render service)
 *
 * Composition IDs (from src/remotion/Root.tsx):
 *   BrandedSlideshow-16x9  (1280×720)
 *   BrandedSlideshow-9x16  (720×1280)
 *   BrandedSlideshow-1x1   (1080×1080)
 *
 * Cost: $0 render cost (compute only). ~5-15s render time locally.
 */

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/lib/logger';
import type { GenerateVideoInput, GenerateVideoOutput } from '../video-types';
import type { BrandedSlideshowProps } from '@/remotion/compositions/BrandedSlideshow';
import type { ToolShowcaseProps } from '@/remotion/compositions/ToolShowcase';
import type { LongFormVideoProps } from '@/remotion/compositions/LongFormVideo';
import type { VideoStyle } from '@/types/creative-video';

type RemotionRendererModule = typeof import('@remotion/renderer');

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
    // Remotion-specific fields
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

async function resolveBrowserExecutable(): Promise<string | undefined> {
    if (process.env.NODE_ENV !== 'production') {
        return undefined;
    }

    try {
        const chromium = (await import('@sparticuz/chromium')).default;
        return await chromium.executablePath();
    } catch (error) {
        logger.warn('[Remotion] Failed to load bundled Chromium, using renderer default', {
            error: error instanceof Error ? error.message : String(error),
        });
        return undefined;
    }
}

async function loadRemotionRenderer(): Promise<Pick<RemotionRendererModule, 'renderMedia' | 'selectComposition'>> {
    try {
        const mod = await import(/* webpackIgnore: true */ '@remotion/renderer' as string);
        return {
            renderMedia: mod.renderMedia,
            selectComposition: mod.selectComposition,
        };
    } catch (error) {
        logger.warn('[Remotion] Renderer package unavailable', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('[Remotion] @remotion/renderer not available in this environment. Falling back to Kling.');
    }
}

/**
 * Render a branded slideshow using Remotion and upload to Firebase Storage.
 */
export async function generateRemotionVideo(
    input: RemotionVideoInput
): Promise<GenerateVideoOutput> {
    logger.info('[Remotion] Starting render', {
        aspectRatio: input.aspectRatio,
        brandName: input.brandName,
        hasScreenshots: !!input.screenshotUrls?.length,
    });

    // Detect composition type: longform > tool > slideshow
    const type = input.clipUrls?.length
        ? 'longform'
        : (input.screenshotUrls?.length || input.kineticHeadline)
            ? 'tool'
            : 'slideshow';
    const compositionId = COMPOSITION_MAP[type][input.aspectRatio || '16:9'] || COMPOSITION_MAP[type]['16:9'];
    const outputPath = path.join(os.tmpdir(), `remotion-${Date.now()}-${compositionId}.mp4`);

    // Build props from input — fallback to sensible defaults
    const props: BrandedSlideshowProps | ToolShowcaseProps | LongFormVideoProps = type === 'longform' ? {
        brandName: input.brandName || 'BakedBot AI',
        headline: (input.kineticHeadline || input.headline || input.prompt.substring(0, 40)).toUpperCase(),
        tagline: input.tagline || input.prompt.substring(0, 60),
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        clipUrls: input.clipUrls || [],
        sceneTitles: input.sceneTitles || [],
        ctaText: input.ctaText || 'Shop Now',
        websiteUrl: input.websiteUrl,
    } : type === 'tool' ? {
        brandName: input.brandName || 'BakedBot AI',
        tagline: input.tagline || '',
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        screenshotUrls: input.screenshotUrls || [],
        backgroundImageUrl: input.backgroundImageUrl,
        styleMode: input.styleMode || 'stop-motion',
        kineticHeadline: input.kineticHeadline || input.headline || 'INTRODUCING',
        ctaText: input.ctaText || 'Get Started',
        websiteUrl: input.websiteUrl,
    } : {
        brandName: input.brandName || 'BakedBot AI',
        tagline: input.tagline || input.prompt.substring(0, 80),
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#27272a',
        accentColor: input.accentColor || '#22c55e',
        logoUrl: input.logoUrl,
        productImageUrl: input.productImageUrl,
        ctaText: input.ctaText || 'Shop Now',
        websiteUrl: input.websiteUrl,
        headline: input.headline,
    };

    // Dynamic import — @remotion/renderer is heavy and server-only.
    // webpackIgnore keeps Next/App Hosting from resolving it during the framework build.
    const { renderMedia, selectComposition } = await loadRemotionRenderer();

    // Path to the compiled Remotion bundle
    // In dev + CI builds: `npm run remotion:bundle` writes the static bundle.
    const bundlePath = path.resolve(process.cwd(), '.remotion/bundle/index.html');
    const ciSkipPath = path.resolve(process.cwd(), '.remotion/bundle/.ci-skip');

    // Check if bundle was skipped in CI — provide a clear error instead of crashing
    const isCiSkip = await fs.access(ciSkipPath).then(() => true).catch(() => false);
    if (isCiSkip) {
        throw new Error('[Remotion] Bundle was skipped at build time (CI environment). Video rendering via Remotion requires a pre-built bundle. Use the Kling fallback or run remotion:bundle separately.');
    }

    await fs.access(bundlePath).catch(() => {
        throw new Error('[Remotion] Bundle missing. Run "npm run remotion:bundle" before rendering slideshows.');
    });
    const browserExecutable = await resolveBrowserExecutable();

    let selectedComposition;
    try {
        selectedComposition = await selectComposition({
            serveUrl: bundlePath,
            id: compositionId,
            inputProps: props as Record<string, unknown>,
            browserExecutable,
        });
    } catch (err) {
        throw new Error(
            `[Remotion] Could not select composition "${compositionId}". ` +
            `Run "npm run remotion:bundle" first to generate the bundle. Error: ${(err as Error).message}`
        );
    }

    logger.info('[Remotion] Rendering composition', {
        compositionId,
        width: selectedComposition.width,
        height: selectedComposition.height,
        durationInFrames: selectedComposition.durationInFrames,
        outputPath,
    });

    await renderMedia({
        composition: selectedComposition,
        serveUrl: bundlePath,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: props as Record<string, unknown>,
        browserExecutable,
        onProgress: ({ progress }) => {
            logger.info('[Remotion] Render progress', { progress: Math.round(progress * 100) });
        },
    });

    logger.info('[Remotion] Render complete, uploading to Firebase Storage');

    // Upload to Firebase Storage
    const { getStorage } = await import('firebase-admin/storage');
    const storage = getStorage();
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';
    const bucket = storage.bucket(bucketName);
    const fileName = `generated-videos/remotion-${Date.now()}.mp4`;

    await bucket.upload(outputPath, {
        destination: fileName,
        contentType: 'video/mp4',
        metadata: {
            metadata: {
                generatedBy: 'remotion',
                compositionId,
                brandName: props.brandName,
            },
        },
    });

    // Signed URLs keep Creative Center renders working on buckets with uniform access enabled.
    const [publicUrl] = await bucket.file(fileName).getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
    });

    // Clean up temp file
    await fs.unlink(outputPath).catch(() => { /* ignore cleanup errors */ });

    logger.info('[Remotion] Video ready', { publicUrl });

    return {
        videoUrl: publicUrl,
        thumbnailUrl: undefined,
        duration: Math.round(selectedComposition.durationInFrames / selectedComposition.fps),
        provider: 'remotion',
        model: compositionId,
    };
}

// Bundling is a build-time CLI operation: npm run remotion:bundle
// Do not call @remotion/bundler from server code.
