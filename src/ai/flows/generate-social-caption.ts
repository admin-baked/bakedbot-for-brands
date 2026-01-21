'use server';

/**
 * @fileOverview Generates social media captions with Craig's marketing expertise.
 *
 * Uses Gemini for fast, high-quality caption generation with multiple style variations.
 * Integrates with the Creative Command Center for social content workflows.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Input Schema ---

const GenerateSocialCaptionInputSchema = z.object({
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'])
        .describe('Target social media platform'),
    prompt: z.string().describe('The content theme or product to create caption for'),
    style: z.enum(['professional', 'playful', 'educational', 'hype'])
        .default('professional')
        .describe('Tone style for the caption'),
    brandVoice: z.string().optional().describe('Brand personality description'),
    productName: z.string().optional().describe('Product being featured'),
    targetAudience: z.string().optional().describe('Target demographic'),
    includeHashtags: z.boolean().default(true).describe('Whether to include hashtags'),
    includeEmojis: z.boolean().default(true).describe('Whether to include emojis'),
    maxLength: z.number().optional().describe('Maximum character count'),
});

export type GenerateSocialCaptionInput = z.infer<typeof GenerateSocialCaptionInputSchema>;

// --- Output Schema ---

const CaptionVariationSchema = z.object({
    style: z.string().describe('Style name (Professional, Hype, Educational)'),
    caption: z.string().describe('The generated caption text'),
    hashtags: z.array(z.string()).describe('Relevant hashtags'),
    estimatedEngagement: z.enum(['low', 'medium', 'high'])
        .describe('Predicted engagement level based on best practices'),
});

const GenerateSocialCaptionOutputSchema = z.object({
    primaryCaption: z.string().describe('The main recommended caption'),
    hashtags: z.array(z.string()).describe('Primary hashtags to use'),
    variations: z.array(CaptionVariationSchema).describe('Alternative caption variations'),
    complianceNotes: z.array(z.string()).optional()
        .describe('Any compliance warnings or notes'),
});

export type GenerateSocialCaptionOutput = z.infer<typeof GenerateSocialCaptionOutputSchema>;

// --- Prompt Definition ---

const prompt = ai.definePrompt({
    name: 'generateSocialCaptionPrompt',
    input: { schema: GenerateSocialCaptionInputSchema },
    output: { schema: GenerateSocialCaptionOutputSchema },
    prompt: `You are Craig, the "Growth Engine" and Chief Marketing Officer (CMO) of BakedBot AI.
You are a high-energy, premium marketing and content strategist specializing in cannabis industry social media.

Your expertise:
- Turning product features into compelling social narratives
- Platform-specific optimization (character limits, hashtag strategies, trending formats)
- Compliance-aware cannabis marketing (no health claims, proper age-gating language)
- A/B testing mindset - always provide variations

**CRITICAL COMPLIANCE RULES:**
1. NEVER make medical claims (no "treat," "cure," "diagnose," "heal")
2. NEVER target minors or use youth-appealing language
3. ALWAYS imply 21+ audience
4. NEVER guarantee effects or results
5. Focus on experience, quality, craft, and community

**Platform Guidelines:**
- Instagram: Visual storytelling, 2200 char max, 20-30 hashtags work well
- TikTok: Trendy, casual, 150 char ideal, 3-5 hashtags max
- LinkedIn: Professional, industry insights, thought leadership
- Twitter: Concise, punchy, 280 char max, 2-3 hashtags
- Facebook: Conversational, community-focused, longer form ok

Generate captions for:
- Platform: {{{platform}}}
- Content Theme: {{{prompt}}}
- Style: {{{style}}}
{{#if productName}}
- Product: {{{productName}}}
{{/if}}
{{#if brandVoice}}
- Brand Voice: {{{brandVoice}}}
{{/if}}
{{#if targetAudience}}
- Target Audience: {{{targetAudience}}}
{{/if}}
{{#if maxLength}}
- Max Length: {{{maxLength}}} characters
{{/if}}

Include hashtags: {{{includeHashtags}}}
Include emojis: {{{includeEmojis}}}

Provide:
1. A PRIMARY caption optimized for the platform and style
2. THREE variations with different tones (Professional, Hype, Educational)
3. Platform-optimized hashtags
4. Any compliance notes if content needs adjustment

Remember: Be authentic, engaging, and compliance-aware. Quality over quantity.`,
});

// --- Flow Definition ---

const generateSocialCaptionFlow = ai.defineFlow(
    {
        name: 'generateSocialCaptionFlow',
        inputSchema: GenerateSocialCaptionInputSchema,
        outputSchema: GenerateSocialCaptionOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);

/**
 * Generate social media captions using Craig's marketing expertise
 */
export async function generateSocialCaption(
    input: GenerateSocialCaptionInput
): Promise<GenerateSocialCaptionOutput> {
    return generateSocialCaptionFlow(input);
}

/**
 * Simple wrapper that returns just the primary caption string
 * Useful for quick integrations
 */
export async function generateCaptionText(
    platform: GenerateSocialCaptionInput['platform'],
    prompt: string,
    style: GenerateSocialCaptionInput['style'] = 'professional'
): Promise<string> {
    const result = await generateSocialCaption({
        platform,
        prompt,
        style,
        includeHashtags: true,
        includeEmojis: true,
    });

    // Combine caption with hashtags
    const hashtagString = result.hashtags.slice(0, 10).join(' ');
    return `${result.primaryCaption}\n\n${hashtagString}`;
}
