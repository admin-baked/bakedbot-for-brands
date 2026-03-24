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

import path from 'path';
import os from 'os';
import { logger } from '@/lib/logger';
import type { GenerateVideoInput, GenerateVideoOutput } from '../video-types';
import type { BrandedSlideshowProps } from '@/remotion/compositions/BrandedSlideshow';

type RemotionRendererModule = typeof import('@remotion/renderer');

// Map aspect ratio to Remotion composition ID
const COMPOSITION_MAP: Record<string, string> = {
    '16:9': 'BrandedSlideshow-16x9',
    '9:16': 'BrandedSlideshow-9x16',
    '1:1': 'BrandedSlideshow-1x1',
};

export interface RemotionVideoInput extends GenerateVideoInput {
    brandName?: string;
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    productImageUrl?: string;
    ctaText?: string;
    websiteUrl?: string;
    headline?: string;
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
    logger.info('[Remotion] Starting branded slideshow render', {
        aspectRatio: input.aspectRatio,
        brandName: input.brandName,
    });

    const compositionId = COMPOSITION_MAP[input.aspectRatio || '16:9'] || 'BrandedSlideshow-16x9';
    const outputPath = path.join(os.tmpdir(), `remotion-${Date.now()}-${compositionId}.mp4`);

    // Build props from input — fallback to sensible defaults
    const props: BrandedSlideshowProps = {
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
    // In dev: `npx remotion bundle` creates dist; in prod: we pre-bundle at build time
    const bundlePath = path.resolve(process.cwd(), '.remotion/bundle/index.html');

    let selectedComposition;
    try {
        selectedComposition = await selectComposition({
            serveUrl: bundlePath,
            id: compositionId,
            inputProps: props as Record<string, unknown>,
        });
    } catch (err) {
        throw new Error(
            `[Remotion] Could not select composition "${compositionId}". ` +
            `Run "npx remotion bundle" first to generate the bundle. Error: ${(err as Error).message}`
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

    await bucket.file(fileName).makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Clean up temp file
    const fs = await import('fs/promises');
    await fs.unlink(outputPath).catch(() => { /* ignore cleanup errors */ });

    logger.info('[Remotion] Video ready', { publicUrl });

    return {
        videoUrl: publicUrl,
        thumbnailUrl: undefined,
        duration: Math.round(150 / 30), // 5 seconds
        provider: 'remotion',
        model: compositionId,
    };
}

// Bundling is a build-time CLI operation: npm run remotion:bundle
// Do not call @remotion/bundler from server code.
