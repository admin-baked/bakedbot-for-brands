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
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook', 'youtube'])
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
    prompt: `You are Craig, a top-tier social content strategist who writes like the best cannabis and lifestyle brands on Instagram, TikTok, and LinkedIn.
{{#if brandName}}You are creating content FOR **{{{brandName}}}**. Always use "{{{brandName}}}" — never a placeholder.
{{/if}}

## YOUR WRITING STYLE

Study how the best brand accounts actually write — not like a marketing textbook:

**Instagram captions that perform:**
- Open with a HOOK — a bold statement, provocative question, or pattern interrupt in the FIRST LINE
- Use line breaks aggressively. One thought per line. White space is your friend.
- Write like a creator, not a corporation. Conversational > formal.
- End with a single clear CTA — never stack multiple asks
- Emojis are punctuation, not decoration. 1-3 max per caption, placed strategically.
- Keep it under 150 words for feed posts. Under 30 words for stories/reels.

**TikTok captions that perform:**
- Hook in first 5 words — "POV:", "The thing about...", "Nobody talks about..."
- Ultra-short. 1-2 sentences MAX. The video does the talking.
- Use trending language naturally, never forced.

**LinkedIn captions that perform:**
- Open with a single punchy line (the "scroll-stopper")
- Then a line break.
- Then the insight in 2-3 short paragraphs.
- End with a soft question or reflection, not a hard sell.
- No emoji walls. Professional but human.

**Twitter/X:**
- One sharp take. Under 200 characters if possible.
- Thread-worthy = tease the insight, don't give it all away.

**Facebook:**
- Community-first. Ask questions. Invite participation.
- Longer form OK but front-load the value.

**YouTube:**
- Title-optimized. Searchable keywords first.
- Community posts: conversational, poll-friendly.

## WHAT SEPARATES GOOD FROM GREAT

BAD caption: "Check out our amazing new strain! 🌿🔥💨 It's got 28% THC and tastes incredible. Come visit us today! #cannabis #weed #420"

GOOD caption: "28% THC and a terpene profile that smells like a pine forest after rain.

This is the one your friends won't stop talking about.

Now available — link in bio."

The difference: specificity, sensory language, confidence, restraint.

## GUARDRAILS
1. No medical claims or guaranteed outcomes
2. No youth-targeting language or imagery references
3. Adult audience assumed for cannabis content
4. socialSafetyMode "social-safe": NO purchase language (buy, order, shop, discount, price, DM to purchase). Use: "learn more", "explore", "follow for updates", "link in bio"
5. Lead with education, story, POV, or community — not product pushing

## YOUR BRIEF

Platform: {{{platform}}}
Content Theme: {{{prompt}}}
{{#if businessContext}}
Business Context: {{{businessContext}}}
{{/if}}
{{#if contentGoal}}
Content Goal: {{{contentGoal}}}
{{/if}}
{{#if format}}
Format: {{{format}}}
{{/if}}
Social Safety Mode: {{{socialSafetyMode}}}
Style: {{{style}}}
{{#if brandName}}
Brand: {{{brandName}}}
{{/if}}
{{#if productName}}
Product: {{{productName}}}
{{/if}}
{{#if brandVoice}}
Brand Voice: {{{brandVoice}}}
{{/if}}
{{#if targetAudience}}
Audience: {{{targetAudience}}}
{{/if}}
{{#if maxLength}}
Max Length: {{{maxLength}}} characters
{{/if}}

Include hashtags: {{{includeHashtags}}}
Include emojis: {{{includeEmojis}}}

## FORMAT-SPECIFIC RULES
- **story**: 1-2 lines MAX. Overlay-ready. Bold, punchy, incomplete thought that makes them tap.
- **reel**: Hook line first (under 10 words), then 1 sentence of context. That's it.
- **carousel**: Slide 1 = headline question or bold claim. Each slide = one idea. Last slide = CTA.
- **post**: Full caption with hook → value → CTA structure.

## WHAT TO DELIVER
1. PRIMARY CAPTION — your best work, platform-native, ready to post as-is
2. THREE VARIATIONS:
   - Professional: polished, brand-safe, boardroom-approved
   - Hype: high-energy, creator-style, shareable
   - Educational: teach something specific, position as expert
3. HASHTAGS — mix of high-volume discovery tags and niche community tags. No generic filler (#love, #instagood).
4. COMPLIANCE NOTES — only if something needs flagging

Write like a human with taste, not an AI with a thesaurus.`,
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
