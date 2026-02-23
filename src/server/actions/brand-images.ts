'use server';

/**
 * Brand image pre-generation server actions.
 *
 * Generates a set of brand-specific background images when a brand guide is
 * first created. Images are uploaded to Firebase Storage via DriveStorageService,
 * written to the `drive_files` Firestore collection (so they appear in BakedBot Drive),
 * and indexed in `tenants/{brandId}/brand_images` for fast lookup by brandId.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { DriveStorageService } from '@/server/services/drive-storage';
import type { BrandGuide } from '@/types/brand-guide';

const BRAND_IMAGE_CONFIGS = [
    {
        type: 'hero',
        prompt: 'brand lifestyle hero image, aspirational, editorial photography, wide shot',
        label: 'Brand Hero',
    },
    {
        type: 'product_bg',
        prompt: 'clean product photography background, studio lighting, minimal, neutral tones',
        label: 'Product Background',
    },
    {
        type: 'ambient',
        prompt: 'ambient mood brand atmosphere, warm inviting environment, soft bokeh',
        label: 'Ambient Mood',
    },
    {
        type: 'texture',
        prompt: 'premium brand texture background, subtle organic pattern, professional',
        label: 'Brand Texture',
    },
] as const;

/**
 * Generate 4 brand-kit images and save them to Drive + Firestore.
 * Called fire-and-forget after a brand guide is created.
 */
export async function generateBrandImagesForNewAccount(
    brandId: string,
    brandGuide: BrandGuide
): Promise<void> {
    const { firestore } = await createServerClient();
    const driveService = new DriveStorageService();

    const brandName = (brandGuide as any).brandName || brandId;
    const primaryColor = brandGuide.visualIdentity?.colors?.primary?.hex || '#4ade80';
    const voiceTone = Array.isArray(brandGuide.voice?.tone)
        ? (brandGuide.voice.tone as string[]).join(', ')
        : typeof brandGuide.voice?.tone === 'string'
        ? brandGuide.voice.tone
        : 'professional';

    logger.info('[BrandImages] Starting pre-generation', { brandId, brandName, voiceTone });

    for (const config of BRAND_IMAGE_CONFIGS) {
        try {
            const prompt = `${brandName} cannabis brand, ${config.prompt}, ${voiceTone} aesthetic, primary color accent ${primaryColor}, no text, no words, no letters`;

            const imageUrl = await generateImageFromPrompt(prompt, { tier: 'free', platform: 'instagram' });

            const uploadResult = await driveService.uploadFromUrl(imageUrl, {
                userId: brandId,
                userEmail: `brand-${brandId}@bakedbot.system`,
                category: 'images',
                tags: ['brand-kit', 'auto-generated', config.type],
                description: `${config.label} — Auto-generated for ${brandName}`,
                metadata: {
                    brandId,
                    imageType: config.type,
                    generatedAt: new Date().toISOString(),
                },
            });

            if (!uploadResult.success || !uploadResult.storagePath || !uploadResult.downloadUrl) {
                logger.warn('[BrandImages] Upload failed', { brandId, type: config.type, error: uploadResult.error });
                continue;
            }

            // Write drive_files doc — required for image to appear in BakedBot Drive UI
            const now = Date.now();
            const filename = `brand-kit-${config.type}-${brandId.slice(-6)}.jpg`;
            const fileDoc = {
                id: '',
                name: filename,
                mimeType: 'image/jpeg',
                size: 0,
                storagePath: uploadResult.storagePath,
                downloadUrl: uploadResult.downloadUrl,
                folderId: null,
                path: `/${filename}`,
                ownerId: brandId,
                ownerEmail: `brand-${brandId}@bakedbot.system`,
                category: 'images',
                tags: ['brand-kit', 'auto-generated', config.type],
                description: `${config.label} — Auto-generated for ${brandName}`,
                metadata: { brandId, imageType: config.type },
                isShared: false,
                shareIds: [],
                viewCount: 0,
                downloadCount: 0,
                createdAt: now,
                updatedAt: now,
                isDeleted: false,
            };
            const fileRef = await firestore.collection('drive_files').add(fileDoc);
            await fileRef.update({ id: fileRef.id });

            // Index in tenant sub-collection for fast lookup by brandId
            await firestore
                .collection('tenants')
                .doc(brandId)
                .collection('brand_images')
                .doc(config.type)
                .set({
                    imageType: config.type,
                    label: config.label,
                    downloadUrl: uploadResult.downloadUrl,
                    driveFileId: fileRef.id,
                    createdAt: new Date(),
                });

            logger.info('[BrandImages] Generated and saved', { brandId, type: config.type });
        } catch (err) {
            // Log but continue — don't fail the whole batch over one image
            logger.error('[BrandImages] Failed for type', { brandId, type: config.type, error: String(err) });
        }
    }

    logger.info('[BrandImages] Pre-generation complete', { brandId });
}

/**
 * Fetch the brand kit images saved for a given brandId.
 * Returns empty array if none exist (e.g. pre-gen hasn't run yet).
 */
export async function getBrandKitImages(
    brandId: string
): Promise<{ url: string; name: string; type: string }[]> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection('tenants')
            .doc(brandId)
            .collection('brand_images')
            .get();

        return snapshot.docs.map(doc => ({
            url: doc.data().downloadUrl as string,
            name: (doc.data().label || doc.data().imageType) as string,
            type: doc.data().imageType as string,
        }));
    } catch (err) {
        logger.error('[BrandImages] getBrandKitImages failed', { brandId, error: String(err) });
        return [];
    }
}
