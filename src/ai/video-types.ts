
import { z } from 'zod';
import { ZodInfer } from '@/ai/z3';

export const GenerateVideoInputSchema = z.object({
    prompt: z.string().describe('A detailed description of the video to generate.'),
    duration: z.enum(['5', '10']).optional().default('5').describe('Video duration in seconds (5 or 10).'),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9').describe('Video aspect ratio.'),
    brandName: z.string().optional().describe('Brand name for watermark/context.'),
    // Brand guide fields — used by Remotion renderer for fully branded video output
    primaryColor: z.string().optional().describe('Hex brand primary color, e.g. #2E7D32'),
    secondaryColor: z.string().optional().describe('Hex brand secondary color'),
    accentColor: z.string().optional().describe('Hex brand accent color'),
    logoUrl: z.string().optional().describe('Absolute URL to brand logo image'),
    tagline: z.string().optional().describe('Brand tagline shown in outro slide'),
    headline: z.string().optional().describe('Primary branded slideshow headline'),
    productImageUrl: z.string().optional().describe('Absolute URL to the selected product image'),
    ctaText: z.string().optional().describe('Call-to-action text for branded slideshow outro'),
    websiteUrl: z.string().optional().describe('Website URL shown on the branded slideshow outro'),
});

export type GenerateVideoInput = ZodInfer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
    videoUrl: z.string().describe('URL of the generated video.'),
    thumbnailUrl: z.string().optional().describe('URL of the video thumbnail.'),
    duration: z.number().describe('Actual duration in seconds.'),
    provider: z.enum(['veo', 'sora', 'sora-pro', 'kling', 'wan', 'remotion']).optional().describe('Provider that successfully rendered the video.'),
    model: z.string().optional().describe('Concrete provider model used for rendering.'),
});

export type GenerateVideoOutput = ZodInfer<typeof GenerateVideoOutputSchema>;


