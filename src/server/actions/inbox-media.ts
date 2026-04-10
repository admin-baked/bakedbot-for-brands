'use server';

import { z } from '@/ai/z3';
import { ai } from '@/ai/genkit';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateMarketingVideo } from '@/ai/flows/generate-video';
import { getServerSessionUser } from '@/server/auth/session';
import { logger } from '@/lib/logger';
import { withImageTracking, withVideoTracking } from '@/server/services/media-tracking';
import type { CreativeContent } from '@/types/creative-content';
import type {
    GenerateInboxImageDraftInput,
    GenerateInboxVideoConceptInput,
    GenerateInboxVideoDraftInput,
    InboxVideoConcept,
} from '@/types/inbox-media';

const ImageDraftInputSchema = z.object({
    tenantId: z.string().min(1),
    brandId: z.string().min(1),
    createdBy: z.string().min(1),
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube']),
    prompt: z.string().min(1),
    style: z.enum(['product_photo', 'lifestyle', 'flat_lay', 'menu_promo']),
});

const VideoConceptInputSchema = z.object({
    tenantId: z.string().min(1),
    brandId: z.string().min(1),
    createdBy: z.string().min(1),
    prompt: z.string().min(1),
    style: z.enum(['educational', 'trending', 'behind_the_scenes', 'product_showcase', 'comedy']),
    platform: z.enum(['instagram', 'tiktok', 'youtube']),
    brandName: z.string().optional(),
});

const VideoConceptSchema = z.object({
    title: z.string().min(1),
    hook: z.string().min(1),
    visuals: z.string().min(1),
    audio: z.string().optional(),
    script: z.string().min(1),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).default([]),
    generationPrompt: z.string().min(1),
});

const VideoDraftInputSchema = VideoConceptInputSchema.extend({
    duration: z.enum(['5', '10']),
    concept: VideoConceptSchema.optional(),
});

const IMAGE_STYLE_GUIDANCE: Record<GenerateInboxImageDraftInput['style'], string> = {
    product_photo: 'Studio-quality cannabis product photography with premium lighting, crisp packaging detail, and zero text overlays.',
    lifestyle: 'Lifestyle marketing image with real-world context, warm editorial lighting, and a premium cannabis retail feel.',
    flat_lay: 'Flat-lay merchandising shot with styled props, clean composition, and e-commerce clarity.',
    menu_promo: 'Menu-ready promotional image focused on clarity, appetite appeal, and easy product recognition without on-image text.',
};

const VIDEO_STYLE_GUIDANCE: Record<GenerateInboxVideoConceptInput['style'], string> = {
    educational: 'Teach one clear takeaway with quick, credible visuals and a concise expert voice.',
    trending: 'Use fast pacing, contemporary visual rhythm, and a hook engineered for short-form retention.',
    behind_the_scenes: 'Show process, personality, and authenticity with documentary-style cuts.',
    product_showcase: 'Feature the product hero with closeups, benefits, and a clean retail CTA.',
    comedy: 'Use a light skit or punchline structure while staying brand-safe and compliant.',
};

const IMAGE_ASPECT_RATIO_BY_PLATFORM: Record<GenerateInboxImageDraftInput['platform'], '1:1' | '16:9' | '9:16'> = {
    instagram: '1:1',
    tiktok: '9:16',
    linkedin: '16:9',
    facebook: '1:1',
    youtube: '16:9',
};

const VIDEO_ASPECT_RATIO_BY_PLATFORM: Record<GenerateInboxVideoConceptInput['platform'], '9:16'> = {
    instagram: '9:16',
    tiktok: '9:16',
    youtube: '9:16',
};

const buildInboxVideoConceptPrompt = ai.definePrompt({
    name: 'buildInboxVideoConceptPrompt',
    input: {
        schema: z.object({
            prompt: z.string(),
            style: z.string(),
            platform: z.enum(['instagram', 'tiktok', 'youtube']),
            brandName: z.string().optional(),
        }),
    },
    output: { schema: VideoConceptSchema },
    model: 'googleai/gemini-3-pro-preview',
    prompt: `You are Craig, a cannabis marketing creative director building short-form video concepts.

Create a production-ready concept for a compliant social video.

User brief:
{{{prompt}}}

Style direction:
{{{style}}}

Platform:
{{{platform}}}

{{#if brandName}}
Brand:
{{{brandName}}}
{{/if}}

Requirements:
- Keep the concept compliant for legal cannabis marketing.
- Avoid medical claims, consumption instructions, or underage cues.
- Write for a vertical short-form video.
- Return a strong title, a first-line hook, visual direction, audio direction, and a shot-by-shot script.
- Include a caption and 4-8 hashtags.
- The generationPrompt must be a clean video-model prompt describing visuals, pacing, camera movement, lighting, subject, and desired outcome.
- Do not mention overlays, subtitles, or on-screen text in the generationPrompt.
`,
});

function createDraftId(prefix: 'image' | 'video'): string {
    return `${prefix}-draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function requireInboxMediaUser() {
    const user = await getServerSessionUser();
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

function buildInboxImagePrompt(input: GenerateInboxImageDraftInput): string {
    return [
        input.prompt.trim(),
        IMAGE_STYLE_GUIDANCE[input.style],
        `Target platform: ${input.platform}.`,
        'Photorealistic marketing asset, premium composition, no text overlays, no watermarks, no collage layout.',
    ].join(' ');
}

function normalizeHashtags(tags?: string[]): string[] {
    return (tags || [])
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag.replace(/\s+/g, '')}`));
}

function getTrackedImageProvider(
    input: GenerateInboxImageDraftInput,
): 'gemini-flash' | 'gemini-pro' {
    return input.platform === 'linkedin' ? 'gemini-pro' : 'gemini-flash';
}

function getTrackedVideoProvider(
    result: Awaited<ReturnType<typeof generateMarketingVideo>>,
): 'veo' | 'sora' {
    if (result.provider === 'sora' || result.provider === 'sora-pro') {
        return 'sora';
    }
    if (typeof result.model === 'string' && result.model.toLowerCase().includes('sora')) {
        return 'sora';
    }
    return 'veo';
}

function buildFallbackVideoPrompt(input: GenerateInboxVideoDraftInput): string {
    return [
        input.prompt.trim(),
        VIDEO_STYLE_GUIDANCE[input.style],
        `Vertical ${input.duration}-second cannabis marketing video for ${input.platform}.`,
        'Fast hook, polished retail visuals, premium lighting, natural motion, no on-screen text.',
    ].join(' ');
}

function buildImageDraft(
    input: GenerateInboxImageDraftInput,
    imageUrl: string,
    generationPrompt: string
): CreativeContent {
    return {
        id: createDraftId('image'),
        tenantId: input.tenantId,
        brandId: input.brandId,
        platform: input.platform,
        status: 'draft',
        complianceStatus: 'review_needed',
        caption: '',
        hashtags: [],
        mediaUrls: [imageUrl],
        thumbnailUrl: imageUrl,
        mediaType: 'image',
        generatedBy: 'flux-schnell',
        generationPrompt,
        aspectRatio: IMAGE_ASPECT_RATIO_BY_PLATFORM[input.platform],
        createdBy: input.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

function buildVideoDraft(
    input: GenerateInboxVideoDraftInput,
    concept: InboxVideoConcept | undefined,
    result: Awaited<ReturnType<typeof generateMarketingVideo>>,
    generationPrompt: string
): CreativeContent {
    return {
        id: createDraftId('video'),
        tenantId: input.tenantId,
        brandId: input.brandId,
        platform: input.platform,
        status: 'draft',
        complianceStatus: 'review_needed',
        caption: concept?.caption || concept?.hook || input.prompt,
        hashtags: normalizeHashtags(concept?.hashtags),
        mediaUrls: [result.videoUrl],
        thumbnailUrl: result.thumbnailUrl || result.videoUrl,
        mediaType: 'video',
        generatedBy: result.provider || 'veo',
        generationPrompt,
        aspectRatio: VIDEO_ASPECT_RATIO_BY_PLATFORM[input.platform],
        durationSeconds: result.duration,
        creativeDirection: concept
            ? {
                title: concept.title,
                hook: concept.hook,
                visuals: concept.visuals,
                audio: concept.audio,
                script: concept.script,
            }
            : undefined,
        createdBy: input.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

export async function generateInboxImageDraft(input: GenerateInboxImageDraftInput): Promise<{
    success: boolean;
    draft?: CreativeContent;
    media?: { type: 'image'; url: string; prompt: string; model: string };
    error?: string;
}> {
    try {
        await requireInboxMediaUser();
        const parsed = ImageDraftInputSchema.parse(input);
        const generationPrompt = buildInboxImagePrompt(parsed);
        const trackedProvider = getTrackedImageProvider(parsed);
        const trackedImage = await withImageTracking(
            parsed.tenantId,
            parsed.createdBy,
            trackedProvider,
            generationPrompt,
            () => generateImageFromPrompt(generationPrompt, {
                platform: parsed.platform,
                tier: 'free',
            }).then((imageUrl) => ({ imageUrl })),
            {
                metadata: {
                    source: 'inbox_media',
                    platform: parsed.platform,
                    style: parsed.style,
                    brandId: parsed.brandId,
                },
            },
        );
        const draft = buildImageDraft(parsed, trackedImage.imageUrl, generationPrompt);

        return {
            success: true,
            draft,
            media: {
                type: 'image',
                url: trackedImage.imageUrl,
                prompt: generationPrompt,
                model: draft.generatedBy,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate image draft';
        logger.error('[InboxMedia] generateInboxImageDraft failed', { error: message });
        return { success: false, error: message };
    }
}

export async function generateInboxVideoConcept(input: GenerateInboxVideoConceptInput): Promise<{
    success: boolean;
    concept?: InboxVideoConcept;
    error?: string;
}> {
    try {
        await requireInboxMediaUser();
        const parsed = VideoConceptInputSchema.parse(input);
        const { output } = await buildInboxVideoConceptPrompt({
            prompt: parsed.prompt,
            style: VIDEO_STYLE_GUIDANCE[parsed.style],
            platform: parsed.platform,
            brandName: parsed.brandName,
        });

        if (!output) {
            throw new Error('Video concept generation returned no structured output.');
        }

        return {
            success: true,
            concept: {
                title: output.title,
                hook: output.hook,
                visuals: output.visuals,
                audio: output.audio,
                script: output.script,
                caption: output.caption,
                hashtags: normalizeHashtags(output.hashtags),
                generationPrompt: output.generationPrompt,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate video concept';
        logger.error('[InboxMedia] generateInboxVideoConcept failed', { error: message });
        return { success: false, error: message };
    }
}

export async function generateInboxVideoDraft(input: GenerateInboxVideoDraftInput): Promise<{
    success: boolean;
    draft?: CreativeContent;
    media?: { type: 'video'; url: string; prompt: string; duration: number; model: string };
    error?: string;
}> {
    try {
        await requireInboxMediaUser();
        const parsed = VideoDraftInputSchema.parse(input);
        const generationPrompt = parsed.concept?.generationPrompt || buildFallbackVideoPrompt(parsed);
        const rawResult = await generateMarketingVideo({
            prompt: generationPrompt,
            duration: parsed.duration,
            aspectRatio: VIDEO_ASPECT_RATIO_BY_PLATFORM[parsed.platform],
            brandName: parsed.brandName,
        }, { allowFallbackDemo: false });
        const trackedProvider = getTrackedVideoProvider(rawResult);
        const result = await withVideoTracking(
            parsed.tenantId,
            parsed.createdBy,
            trackedProvider,
            generationPrompt,
            rawResult.duration,
            async () => rawResult,
            {
                aspectRatio: VIDEO_ASPECT_RATIO_BY_PLATFORM[parsed.platform],
                contentId: undefined,
                metadata: {
                    source: 'inbox_media',
                    platform: parsed.platform,
                    style: parsed.style,
                    brandId: parsed.brandId,
                },
            },
        );

        const draft = buildVideoDraft(parsed, parsed.concept, result, generationPrompt);

        return {
            success: true,
            draft,
            media: {
                type: 'video',
                url: result.videoUrl,
                prompt: generationPrompt,
                duration: result.duration,
                model: result.model || result.provider || 'video-model',
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate video draft';
        logger.error('[InboxMedia] generateInboxVideoDraft failed', { error: message });
        return { success: false, error: message };
    }
}
