
import { z } from 'zod';

export const GenerateVideoInputSchema = z.object({
    prompt: z.string().describe('A detailed description of the video to generate.'),
    duration: z.enum(['5', '10']).optional().default('5').describe('Video duration in seconds (5 or 10).'),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9').describe('Video aspect ratio.'),
    brandName: z.string().optional().describe('Brand name for watermark/context.'),
});

export type GenerateVideoInput = z.infer<typeof GenerateVideoInputSchema>;

export const GenerateVideoOutputSchema = z.object({
    videoUrl: z.string().describe('URL of the generated video.'),
    thumbnailUrl: z.string().optional().describe('URL of the video thumbnail.'),
    duration: z.number().describe('Actual duration in seconds.'),
});

export type GenerateVideoOutput = z.infer<typeof GenerateVideoOutputSchema>;
