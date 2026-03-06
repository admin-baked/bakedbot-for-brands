var mockVideoConceptPromptRunner = jest.fn();

jest.mock('@/ai/genkit', () => ({
    ai: {
        definePrompt: jest.fn(() => async (...args: unknown[]) => mockVideoConceptPromptRunner(...args)),
    },
}));

jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn(),
}));

jest.mock('@/ai/flows/generate-social-image', () => ({
    generateImageFromPrompt: jest.fn(),
}));

jest.mock('@/ai/flows/generate-video', () => ({
    generateMarketingVideo: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { getServerSessionUser } from '@/server/auth/session';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';
import { generateMarketingVideo } from '@/ai/flows/generate-video';
import {
    generateInboxImageDraft,
    generateInboxVideoConcept,
    generateInboxVideoDraft,
} from '@/server/actions/inbox-media';

describe('inbox media server actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getServerSessionUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            role: 'brand_admin',
        });
        mockVideoConceptPromptRunner.mockResolvedValue({
            output: {
                title: 'Launch reel',
                hook: 'Fresh drop just landed.',
                visuals: 'Close-up product shots with retail shelf movement.',
                audio: 'Upbeat lo-fi beat',
                script: 'Shot 1: hook. Shot 2: product. Shot 3: CTA.',
                caption: 'Fresh drop on deck.',
                hashtags: ['#FreshDrop', '#DispensaryLife'],
                generationPrompt: 'Vertical premium cannabis retail reel, close-up product shots, soft neon lighting, fast pacing, no text.',
            },
        });
    });

    it('generates an image draft using the FLUX pipeline', async () => {
        (generateImageFromPrompt as jest.Mock).mockResolvedValue('https://cdn.example.com/image.png');

        const result = await generateInboxImageDraft({
            tenantId: 'org-1',
            brandId: 'org-1',
            createdBy: 'user-1',
            platform: 'instagram',
            prompt: 'Moody product shot of our newest live resin cart',
            style: 'product_photo',
        });

        expect(result.success).toBe(true);
        expect(result.media).toEqual({
            type: 'image',
            url: 'https://cdn.example.com/image.png',
            prompt: expect.stringContaining('Moody product shot'),
            model: 'flux-schnell',
        });
        expect(result.draft).toMatchObject({
            mediaType: 'image',
            generatedBy: 'flux-schnell',
            aspectRatio: '1:1',
            thumbnailUrl: 'https://cdn.example.com/image.png',
        });
    });

    it('generates a structured video concept with Gemini', async () => {
        const result = await generateInboxVideoConcept({
            tenantId: 'org-1',
            brandId: 'org-1',
            createdBy: 'user-1',
            prompt: 'Show the difference between distillate and live resin carts',
            style: 'educational',
            platform: 'instagram',
        });

        expect(result.success).toBe(true);
        expect(result.concept).toMatchObject({
            title: 'Launch reel',
            hook: 'Fresh drop just landed.',
            generationPrompt: expect.stringContaining('Vertical premium cannabis retail reel'),
        });
    });

    it('generates a strict video draft and preserves provider metadata', async () => {
        (generateMarketingVideo as jest.Mock).mockResolvedValue({
            videoUrl: 'https://cdn.example.com/video.mp4',
            thumbnailUrl: 'https://cdn.example.com/video.jpg',
            duration: 10,
            provider: 'sora-pro',
            model: 'sora-2-pro',
        });

        const result = await generateInboxVideoDraft({
            tenantId: 'org-1',
            brandId: 'org-1',
            createdBy: 'user-1',
            prompt: 'Highlight the new rosin gummies',
            style: 'product_showcase',
            platform: 'tiktok',
            duration: '10',
            concept: {
                title: 'Rosin gummies reel',
                hook: 'These gummies sold out fast.',
                visuals: 'Macro gummy shots and packaging closeups.',
                audio: 'Punchy electronic beat',
                script: 'Hook, texture shot, packaging shot, CTA.',
                caption: 'Rosin gummies are back.',
                hashtags: ['#Rosin', '#Edibles'],
                generationPrompt: 'Vertical product showcase, macro gummy shots, premium retail lighting, smooth handheld motion, no text.',
            },
        });

        expect(generateMarketingVideo).toHaveBeenCalledWith(
            expect.objectContaining({
                prompt: 'Vertical product showcase, macro gummy shots, premium retail lighting, smooth handheld motion, no text.',
                duration: '10',
                aspectRatio: '9:16',
            }),
            { allowFallbackDemo: false }
        );
        expect(result.success).toBe(true);
        expect(result.draft).toMatchObject({
            mediaType: 'video',
            generatedBy: 'sora-pro',
            durationSeconds: 10,
            aspectRatio: '9:16',
        });
        expect(result.media?.model).toBe('sora-2-pro');
    });

    it('returns a user-visible error when the video provider fails', async () => {
        (generateMarketingVideo as jest.Mock).mockRejectedValue(new Error('Provider offline'));

        const result = await generateInboxVideoDraft({
            tenantId: 'org-1',
            brandId: 'org-1',
            createdBy: 'user-1',
            prompt: 'Create a reel',
            style: 'trending',
            platform: 'instagram',
            duration: '5',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Provider offline');
    });
});
