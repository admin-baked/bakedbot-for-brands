/**
 * Inbox Tools Tests
 *
 * Tests for the inbox artifact creation tool definitions.
 */

import {
    createCarouselArtifactSchema,
    createBundleArtifactSchema,
    createCreativeArtifactSchema,
    createCarouselArtifactToolDef,
    createBundleArtifactToolDef,
    createCreativeArtifactToolDef,
    inboxToolDefs,
    smokeyInboxToolDefs,
    moneyMikeInboxToolDefs,
    craigInboxToolDefs,
    formatCarouselArtifactMarker,
    formatBundleArtifactMarker,
    formatCreativeArtifactMarker,
} from '../../../src/server/tools/inbox-tools';

describe('Inbox Tools', () => {
    describe('createCarouselArtifactSchema', () => {
        it('should validate valid carousel artifact input', () => {
            const validInput = {
                title: 'Weekend Specials',
                description: 'Best deals for the weekend',
                productIds: ['prod-1', 'prod-2', 'prod-3'],
                displayOrder: 1,
                rationale: 'High-margin products with good customer reviews',
            };

            const result = createCarouselArtifactSchema.safeParse(validInput);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.title).toBe('Weekend Specials');
                expect(result.data.productIds).toHaveLength(3);
            }
        });

        it('should require at least one product ID', () => {
            const invalidInput = {
                title: 'Empty Carousel',
                productIds: [],
                rationale: 'Test rationale',
            };

            const result = createCarouselArtifactSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should require title and rationale', () => {
            const invalidInput = {
                productIds: ['prod-1'],
            };

            const result = createCarouselArtifactSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });

        it('should allow optional description and displayOrder', () => {
            const minimalInput = {
                title: 'Simple Carousel',
                productIds: ['prod-1'],
                rationale: 'Test',
            };

            const result = createCarouselArtifactSchema.safeParse(minimalInput);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.description).toBeUndefined();
                expect(result.data.displayOrder).toBeUndefined();
            }
        });
    });

    describe('createBundleArtifactSchema', () => {
        it('should validate valid bundle artifact input', () => {
            const validInput = {
                name: 'Chill Weekend Pack',
                description: 'Everything you need for a relaxing weekend',
                type: 'fixed_price' as const,
                products: [
                    {
                        productId: 'prod-1',
                        name: 'Relaxing Gummies',
                        category: 'edible',
                        requiredQty: 1,
                        originalPrice: 25.00,
                        bundlePrice: 20.00,
                    },
                    {
                        productId: 'prod-2',
                        name: 'Sleep Drops',
                        category: 'tincture',
                        requiredQty: 1,
                        originalPrice: 35.00,
                        bundlePrice: 30.00,
                    },
                ],
                bundlePrice: 50.00,
                originalTotal: 60.00,
                savingsAmount: 10.00,
                savingsPercent: 16.67,
                rationale: 'Complementary products for relaxation with good margin',
            };

            const result = createBundleArtifactSchema.safeParse(validInput);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.name).toBe('Chill Weekend Pack');
                expect(result.data.products).toHaveLength(2);
                expect(result.data.savingsPercent).toBeCloseTo(16.67);
            }
        });

        it('should validate all bundle types', () => {
            const bundleTypes = ['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered'] as const;

            for (const type of bundleTypes) {
                const input = {
                    name: `${type} Bundle`,
                    description: 'Test bundle',
                    type,
                    products: [{
                        productId: 'prod-1',
                        name: 'Test Product',
                        category: 'flower',
                        requiredQty: 1,
                        originalPrice: 50.00,
                    }],
                    bundlePrice: 45.00,
                    originalTotal: 50.00,
                    savingsAmount: 5.00,
                    savingsPercent: 10,
                    rationale: 'Test rationale',
                };

                const result = createBundleArtifactSchema.safeParse(input);
                expect(result.success).toBe(true);
            }
        });

        it('should require at least one product', () => {
            const invalidInput = {
                name: 'Empty Bundle',
                description: 'No products',
                type: 'fixed_price',
                products: [],
                bundlePrice: 0,
                originalTotal: 0,
                savingsAmount: 0,
                savingsPercent: 0,
                rationale: 'Test',
            };

            const result = createBundleArtifactSchema.safeParse(invalidInput);
            expect(result.success).toBe(false);
        });
    });

    describe('createCreativeArtifactSchema', () => {
        it('should validate valid creative artifact input', () => {
            const validInput = {
                platform: 'instagram' as const,
                caption: 'Check out our latest drops! 🌿',
                hashtags: ['cannabis', 'wellness', 'dispensary'],
                mediaType: 'image' as const,
                mediaUrls: ['https://example.com/image1.jpg'],
                thumbnailUrl: 'https://example.com/thumb1.jpg',
                style: 'playful' as const,
                targetAudience: 'Young adults interested in wellness',
                rationale: 'High engagement post format for weekend audience',
            };

            const result = createCreativeArtifactSchema.safeParse(validInput);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.platform).toBe('instagram');
                expect(result.data.hashtags).toHaveLength(3);
            }
        });

        it('should validate all social platforms', () => {
            const platforms = ['instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'] as const;

            for (const platform of platforms) {
                const input = {
                    platform,
                    caption: 'Test post',
                    mediaType: 'text' as const,
                    rationale: 'Test rationale',
                };

                const result = createCreativeArtifactSchema.safeParse(input);
                expect(result.success).toBe(true);
            }
        });

        it('should validate all media types', () => {
            const mediaTypes = ['image', 'video', 'carousel', 'text'] as const;

            for (const mediaType of mediaTypes) {
                const input = {
                    platform: 'instagram' as const,
                    caption: 'Test post',
                    mediaType,
                    rationale: 'Test rationale',
                };

                const result = createCreativeArtifactSchema.safeParse(input);
                expect(result.success).toBe(true);
            }
        });

        it('should validate all style options', () => {
            const styles = ['professional', 'playful', 'educational', 'hype'] as const;

            for (const style of styles) {
                const input = {
                    platform: 'instagram' as const,
                    caption: 'Test post',
                    mediaType: 'text' as const,
                    style,
                    rationale: 'Test rationale',
                };

                const result = createCreativeArtifactSchema.safeParse(input);
                expect(result.success).toBe(true);
            }
        });
    });

    describe('Tool Definitions', () => {
        it('should have correct structure for carousel tool', () => {
            expect(createCarouselArtifactToolDef.name).toBe('createCarouselArtifact');
            expect(createCarouselArtifactToolDef.description).toContain('carousel');
            expect(createCarouselArtifactToolDef.schema).toBe(createCarouselArtifactSchema);
        });

        it('should have correct structure for bundle tool', () => {
            expect(createBundleArtifactToolDef.name).toBe('createBundleArtifact');
            expect(createBundleArtifactToolDef.description).toContain('bundle');
            expect(createBundleArtifactToolDef.schema).toBe(createBundleArtifactSchema);
        });

        it('should have correct structure for creative tool', () => {
            expect(createCreativeArtifactToolDef.name).toBe('createCreativeArtifact');
            expect(createCreativeArtifactToolDef.description).toContain('social media');
            expect(createCreativeArtifactToolDef.schema).toBe(createCreativeArtifactSchema);
        });

        it('should export combined inbox tool definitions', () => {
            expect(inboxToolDefs).toHaveLength(3);
            expect(inboxToolDefs).toContain(createCarouselArtifactToolDef);
            expect(inboxToolDefs).toContain(createBundleArtifactToolDef);
            expect(inboxToolDefs).toContain(createCreativeArtifactToolDef);
        });

        it('should export agent-specific tool sets', () => {
            expect(smokeyInboxToolDefs).toHaveLength(1);
            expect(smokeyInboxToolDefs).toContain(createCarouselArtifactToolDef);

            expect(moneyMikeInboxToolDefs).toHaveLength(1);
            expect(moneyMikeInboxToolDefs).toContain(createBundleArtifactToolDef);

            expect(craigInboxToolDefs).toHaveLength(1);
            expect(craigInboxToolDefs).toContain(createCreativeArtifactToolDef);
        });
    });

    describe('Artifact Marker Formatters', () => {
        it('should format carousel artifact marker correctly', () => {
            const result = {
                success: true,
                artifactId: 'art-123',
                carousel: {
                    title: 'Featured Products',
                    description: 'Our best sellers',
                    productIds: ['p1', 'p2'],
                    displayOrder: 0,
                },
                rationale: 'High-margin products',
            };

            const marker = formatCarouselArtifactMarker(result);

            expect(marker).toContain(':::artifact:carousel:Featured Products');
            expect(marker).toContain(':::');
            expect(marker).toContain('"productIds":["p1","p2"]');
            expect(marker).toContain('"rationale":"High-margin products"');
        });

        it('should format bundle artifact marker correctly', () => {
            const result = {
                success: true,
                artifactId: 'art-456',
                bundle: {
                    name: 'Weekend Pack',
                    description: 'Relaxation bundle',
                    type: 'fixed_price' as const,
                    products: [{
                        productId: 'p1',
                        name: 'Product 1',
                        category: 'edible',
                        requiredQty: 1,
                        originalPrice: 25,
                    }],
                    bundlePrice: 40,
                    originalTotal: 50,
                    savingsAmount: 10,
                    savingsPercent: 20,
                },
                marginAnalysis: {
                    isViable: true,
                    marginPercent: 35,
                    warnings: [],
                },
                rationale: 'Good margin preservation',
            };

            const marker = formatBundleArtifactMarker(result);

            expect(marker).toContain(':::artifact:bundle:Weekend Pack');
            expect(marker).toContain(':::');
            expect(marker).toContain('"bundlePrice":40');
            expect(marker).toContain('"savingsPercent":20');
        });

        it('should format creative artifact marker correctly', () => {
            const result = {
                success: true,
                artifactId: 'art-789',
                content: {
                    platform: 'instagram' as const,
                    caption: 'Check out our latest!',
                    hashtags: ['cannabis', 'wellness'],
                    mediaType: 'image' as const,
                },
                complianceCheck: {
                    status: 'active' as const,
                    issues: [],
                },
                rationale: 'High engagement format',
            };

            const marker = formatCreativeArtifactMarker(result);

            expect(marker).toContain(':::artifact:creative_content:instagram Post');
            expect(marker).toContain(':::');
            expect(marker).toContain('"platform":"instagram"');
            expect(marker).toContain('"hashtags":["cannabis","wellness"]');
        });
    });
});
