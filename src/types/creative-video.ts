import { z } from 'zod';

export const VideoStyleSchema = z.enum(['stop-motion', 'slow-motion', 'fast-paced', 'cinematic']);
export type VideoStyle = z.infer<typeof VideoStyleSchema>;

export interface ToolShowcaseProps extends Record<string, unknown> {
    brandName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    screenshotUrls: string[];
    backgroundImageUrl?: string;
    styleMode: VideoStyle;
    kineticHeadline: string;
    websiteUrl?: string;
    ctaText?: string;
}

export const ChainGenerationRequestSchema = z.object({
    orgId: z.string(),
    prompt: z.string(),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']),
    styleMode: VideoStyleSchema.default('stop-motion'),
    screenshotUrls: z.array(z.string()).max(10),
    kineticHeadline: z.string(),
    backgroundImageUrl: z.string().optional(),
    targetDuration: z.enum(['60', '90']).default('60'),
    /** 'premium' = premium quality ($0.28/s) | 'budget' = fast draft ($0.01/s) */
    videoModel: z.enum(['premium', 'budget']).default('budget'),
});

export type ChainGenerationRequest = z.infer<typeof ChainGenerationRequestSchema>;
