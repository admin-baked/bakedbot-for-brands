'use server';

/**
 * @fileOverview Generates social media captions with Craig's marketing expertise.
 *
 * Uses Gemini for fast, high-quality caption generation with multiple style variations.
 * Integrates with the Creative Command Center for social content workflows.
 */

import { ai } from '@/ai/genkit';
import { z, ZodInfer } from '@/ai/z3';

// --- Input Schema ---

const GenerateSocialCaptionInputSchema = z.object({
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'])
        .describe('Target social media platform'),
    prompt: z.string().describe('The content theme or product to create caption for'),
    businessContext: z.enum(['company', 'dispensary', 'brand'])
        .optional()
        .describe('Whether this is company content, dispensary content, or consumer brand content'),
    contentGoal: z.enum(['thought-leadership', 'education', 'behind-the-scenes', 'community', 'customer-proof', 'event'])
        .optional()
        .describe('Primary social content goal'),
    format: z.enum(['post', 'story', 'reel', 'carousel'])
        .optional()
        .describe('Target social format'),
    socialSafetyMode: z.enum(['social-safe', 'standard'])
        .default('social-safe')
        .describe('How strongly to avoid direct selling language'),
    style: z.enum(['professional', 'playful', 'educational', 'hype'])
        .default('professional')
        .describe('Tone style for the caption'),
    brandName: z.string().optional().describe('The name of the brand this content is for'),
    brandVoice: z.string().optional().describe('Brand personality description'),
    productName: z.string().optional().describe('Product being featured'),
    targetAudience: z.string().optional().describe('Target demographic'),
    includeHashtags: z.boolean().default(true).describe('Whether to include hashtags'),
    includeEmojis: z.boolean().default(true).describe('Whether to include emojis'),
    maxLength: z.number().optional().describe('Maximum character count'),
});

export type GenerateSocialCaptionInput = ZodInfer<typeof GenerateSocialCaptionInputSchema>;

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

export type GenerateSocialCaptionOutput = ZodInfer<typeof GenerateSocialCaptionOutputSchema>;

// --- Prompt Definition ---

const prompt = ai.definePrompt({
    name: 'generateSocialCaptionPrompt',
    input: { schema: GenerateSocialCaptionInputSchema },
    output: { schema: GenerateSocialCaptionOutputSchema },
    prompt: `You are Craig, a social content strategist for regulated consumer brands and B2B operator software.
{{#if brandName}}You are creating content FOR a client brand called **{{{brandName}}}**. Always use "{{{brandName}}}" as the brand name in your captions, never a placeholder brand name.
{{/if}}

You can write for:
- B2B or software companies like BakedBot AI
- Dispensaries and licensed operators
- Consumer brands in regulated markets

Your expertise:
- Turning education, operator wins, founder POV, and community moments into social content
- Adapting one idea into platform-specific posts, stories, reels, and carousels
- Staying compliance-aware in restrictive social environments
- Driving interest toward safe CTAs like learn more, visit the site, book a demo, RSVP, or follow for updates

Critical guardrails:
1. Never make medical claims or guaranteed outcome claims
2. Never target minors or use youth-appealing language
3. When the content is cannabis-adjacent, assume an adult audience
4. If socialSafetyMode is "social-safe", do not use direct purchase language such as buy, order, shop now, discounts, pricing, DM to purchase, or explicit sales offers for regulated goods
5. Prefer education, founder POV, behind-the-scenes, community, customer proof, and event storytelling over direct selling

Platform guidelines:
- Instagram: visual storytelling, punchy hooks, creator-style captions, stories and reels should feel fast and clear
- TikTok: short hook first, conversational, trend-aware but still brand-safe
- LinkedIn: thoughtful, credible, educational, leadership-forward
- Twitter: concise, sharp, insight-led
- Facebook: community-oriented and event-friendly

Generate captions for:
- Platform: {{{platform}}}
- Content Theme: {{{prompt}}}
{{#if businessContext}}
- Business Context: {{{businessContext}}}
{{/if}}
{{#if contentGoal}}
- Content Goal: {{{contentGoal}}}
{{/if}}
{{#if format}}
- Format: {{{format}}}
{{/if}}
- Social Safety Mode: {{{socialSafetyMode}}}
- Style: {{{style}}}
{{#if brandName}}
- Brand Name: {{{brandName}}}
{{/if}}
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

Additional formatting guidance:
- If format is "story", write in short frames or short punchy copy that works as an overlay
- If format is "reel", lead with a hook and keep the body compact
- If format is "carousel", make the opener headline-driven and educational
- If businessContext is "company", do not write like a dispensary menu or cannabis sales ad

Remember: Be authentic, useful, credible, and compliance-aware. Quality over quantity.`,
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
    promptText: string,
    style: GenerateSocialCaptionInput['style'] = 'professional'
): Promise<string> {
    const result = await generateSocialCaption({
        platform,
        prompt: promptText,
        style,
        includeHashtags: true,
        includeEmojis: true,
    });

    const hashtagString = result.hashtags.slice(0, 10).join(' ');
    return `${result.primaryCaption}\n\n${hashtagString}`;
}
