/**
 * Unit tests for generate-social-caption flow
 * Tests Craig's AI-powered social media caption generation
 *
 * Note: We test the schema and structure, the actual Genkit flow
 * is tested via integration tests.
 */

import { z } from 'zod';

// Define the schemas inline for testing (matching the actual implementation)
const GenerateSocialCaptionInputSchema = z.object({
    platform: z.enum(['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook']),
    prompt: z.string(),
    style: z.enum(['professional', 'playful', 'educational', 'hype']).default('professional'),
    brandVoice: z.string().optional(),
    productName: z.string().optional(),
    targetAudience: z.string().optional(),
    includeHashtags: z.boolean().default(true),
    includeEmojis: z.boolean().default(true),
    maxLength: z.number().optional(),
});

const CaptionVariationSchema = z.object({
    style: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    estimatedEngagement: z.enum(['low', 'medium', 'high']),
});

const GenerateSocialCaptionOutputSchema = z.object({
    primaryCaption: z.string(),
    hashtags: z.array(z.string()),
    variations: z.array(CaptionVariationSchema),
    complianceNotes: z.array(z.string()).optional(),
});

type GenerateSocialCaptionInput = z.infer<typeof GenerateSocialCaptionInputSchema>;
type GenerateSocialCaptionOutput = z.infer<typeof GenerateSocialCaptionOutputSchema>;

describe('generate-social-caption schemas', () => {
    describe('GenerateSocialCaptionInputSchema', () => {
        const validInput: GenerateSocialCaptionInput = {
            platform: 'instagram',
            prompt: 'New premium flower strain',
            style: 'professional',
            includeHashtags: true,
            includeEmojis: true
        };

        it('validates correct input', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse(validInput);
            expect(result.success).toBe(true);
        });

        it('accepts all valid platforms', () => {
            const platforms = ['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'] as const;

            platforms.forEach(platform => {
                const result = GenerateSocialCaptionInputSchema.safeParse({ ...validInput, platform });
                expect(result.success).toBe(true);
            });
        });

        it('rejects invalid platforms', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                platform: 'snapchat'
            });
            expect(result.success).toBe(false);
        });

        it('accepts all valid styles', () => {
            const styles = ['professional', 'playful', 'educational', 'hype'] as const;

            styles.forEach(style => {
                const result = GenerateSocialCaptionInputSchema.safeParse({ ...validInput, style });
                expect(result.success).toBe(true);
            });
        });

        it('rejects invalid styles', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                style: 'aggressive'
            });
            expect(result.success).toBe(false);
        });

        it('requires platform field', () => {
            const { platform, ...inputWithoutPlatform } = validInput;
            const result = GenerateSocialCaptionInputSchema.safeParse(inputWithoutPlatform);
            expect(result.success).toBe(false);
        });

        it('requires prompt field', () => {
            const { prompt, ...inputWithoutPrompt } = validInput;
            const result = GenerateSocialCaptionInputSchema.safeParse(inputWithoutPrompt);
            expect(result.success).toBe(false);
        });

        it('allows optional brandVoice', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                brandVoice: 'Fun and approachable cannabis lifestyle brand'
            });
            expect(result.success).toBe(true);
        });

        it('allows optional productName', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                productName: 'Blue Dream Premium'
            });
            expect(result.success).toBe(true);
        });

        it('allows optional targetAudience', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                targetAudience: 'Cannabis enthusiasts aged 25-40'
            });
            expect(result.success).toBe(true);
        });

        it('allows optional maxLength', () => {
            const result = GenerateSocialCaptionInputSchema.safeParse({
                ...validInput,
                maxLength: 150
            });
            expect(result.success).toBe(true);
        });

        it('defaults style to professional', () => {
            const { style, ...inputWithoutStyle } = validInput;
            const result = GenerateSocialCaptionInputSchema.parse(inputWithoutStyle);
            expect(result.style).toBe('professional');
        });

        it('defaults includeHashtags to true', () => {
            const { includeHashtags, ...inputWithoutHashtags } = validInput;
            const result = GenerateSocialCaptionInputSchema.parse(inputWithoutHashtags);
            expect(result.includeHashtags).toBe(true);
        });

        it('defaults includeEmojis to true', () => {
            const { includeEmojis, ...inputWithoutEmojis } = validInput;
            const result = GenerateSocialCaptionInputSchema.parse(inputWithoutEmojis);
            expect(result.includeEmojis).toBe(true);
        });
    });

    describe('GenerateSocialCaptionOutputSchema', () => {
        const validOutput: GenerateSocialCaptionOutput = {
            primaryCaption: 'Experience premium quality cannabis at its finest.',
            hashtags: ['#cannabis', '#dispensary', '#quality', '#premium'],
            variations: [
                {
                    style: 'Professional',
                    caption: 'Discover the difference quality makes.',
                    hashtags: ['#cannabisindustry', '#premium'],
                    estimatedEngagement: 'medium'
                },
                {
                    style: 'Hype',
                    caption: 'This drop is FIRE! Get yours now!',
                    hashtags: ['#newdrop', '#420'],
                    estimatedEngagement: 'high'
                }
            ],
            complianceNotes: []
        };

        it('validates correct output', () => {
            const result = GenerateSocialCaptionOutputSchema.safeParse(validOutput);
            expect(result.success).toBe(true);
        });

        it('requires primaryCaption', () => {
            const { primaryCaption, ...outputWithoutCaption } = validOutput;
            const result = GenerateSocialCaptionOutputSchema.safeParse(outputWithoutCaption);
            expect(result.success).toBe(false);
        });

        it('requires hashtags array', () => {
            const { hashtags, ...outputWithoutHashtags } = validOutput;
            const result = GenerateSocialCaptionOutputSchema.safeParse(outputWithoutHashtags);
            expect(result.success).toBe(false);
        });

        it('requires variations array', () => {
            const { variations, ...outputWithoutVariations } = validOutput;
            const result = GenerateSocialCaptionOutputSchema.safeParse(outputWithoutVariations);
            expect(result.success).toBe(false);
        });

        it('allows empty variations array', () => {
            const result = GenerateSocialCaptionOutputSchema.safeParse({
                ...validOutput,
                variations: []
            });
            expect(result.success).toBe(true);
        });

        it('allows complianceNotes to be undefined', () => {
            const { complianceNotes, ...outputWithoutNotes } = validOutput;
            const result = GenerateSocialCaptionOutputSchema.safeParse(outputWithoutNotes);
            expect(result.success).toBe(true);
        });

        it('validates estimatedEngagement enum values', () => {
            const validEngagements = ['low', 'medium', 'high'];

            validEngagements.forEach(engagement => {
                const result = GenerateSocialCaptionOutputSchema.safeParse({
                    ...validOutput,
                    variations: [{
                        style: 'Test',
                        caption: 'Test caption',
                        hashtags: [],
                        estimatedEngagement: engagement
                    }]
                });
                expect(result.success).toBe(true);
            });
        });

        it('rejects invalid estimatedEngagement values', () => {
            const result = GenerateSocialCaptionOutputSchema.safeParse({
                ...validOutput,
                variations: [{
                    style: 'Test',
                    caption: 'Test caption',
                    hashtags: [],
                    estimatedEngagement: 'very_high'
                }]
            });
            expect(result.success).toBe(false);
        });
    });

    describe('CaptionVariationSchema', () => {
        it('requires all fields', () => {
            const validVariation = {
                style: 'Professional',
                caption: 'Test caption',
                hashtags: ['#test'],
                estimatedEngagement: 'medium'
            };

            const result = CaptionVariationSchema.safeParse(validVariation);
            expect(result.success).toBe(true);
        });

        it('allows empty hashtags array', () => {
            const result = CaptionVariationSchema.safeParse({
                style: 'Test',
                caption: 'Test caption',
                hashtags: [],
                estimatedEngagement: 'low'
            });
            expect(result.success).toBe(true);
        });

        it('requires style to be string', () => {
            const result = CaptionVariationSchema.safeParse({
                style: 123,
                caption: 'Test',
                hashtags: [],
                estimatedEngagement: 'low'
            });
            expect(result.success).toBe(false);
        });

        it('requires caption to be string', () => {
            const result = CaptionVariationSchema.safeParse({
                style: 'Test',
                caption: null,
                hashtags: [],
                estimatedEngagement: 'low'
            });
            expect(result.success).toBe(false);
        });
    });
});

describe('generate-social-caption types', () => {
    it('input type matches schema', () => {
        const input: GenerateSocialCaptionInput = {
            platform: 'instagram',
            prompt: 'Test prompt',
            style: 'professional',
            brandVoice: 'Friendly',
            productName: 'Test Product',
            targetAudience: 'Adults',
            includeHashtags: true,
            includeEmojis: true,
            maxLength: 280
        };

        const result = GenerateSocialCaptionInputSchema.safeParse(input);
        expect(result.success).toBe(true);
    });

    it('output type matches schema', () => {
        const output: GenerateSocialCaptionOutput = {
            primaryCaption: 'Test caption',
            hashtags: ['#test'],
            variations: [{
                style: 'Test',
                caption: 'Variation',
                hashtags: ['#var'],
                estimatedEngagement: 'high'
            }],
            complianceNotes: ['Note 1']
        };

        const result = GenerateSocialCaptionOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
    });
});
