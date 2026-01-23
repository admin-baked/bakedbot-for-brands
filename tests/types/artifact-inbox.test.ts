/**
 * Artifact Inbox Parsing Tests
 *
 * Tests for parsing inbox-specific artifacts (carousel, bundle, creative_post)
 * from agent response content.
 */

import {
    parseArtifactsFromContent,
    isCarouselArtifact,
    isBundleArtifact,
    isCreativePostArtifact,
    isInboxArtifact,
    getArtifactIcon,
    getArtifactLabel,
    createArtifactId,
    ARTIFACT_TYPES,
} from '../../src/types/artifact';

describe('Artifact Inbox Parsing', () => {
    describe('parseArtifactsFromContent - Carousel Artifacts', () => {
        it('should parse carousel artifact from block format', () => {
            const content = `Here's a carousel I created for you:

:::artifact:carousel:Weekend Specials
{
    "title": "Weekend Specials",
    "description": "Best deals for the weekend",
    "productIds": ["prod-1", "prod-2", "prod-3"],
    "displayOrder": 1,
    "rationale": "High-margin products with good reviews"
}
:::

Let me know if you'd like any changes!`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('carousel');
            expect(result.artifacts[0].title).toBe('Weekend Specials');
            expect(result.artifacts[0].metadata?.inboxData?.carousel?.productIds).toEqual(['prod-1', 'prod-2', 'prod-3']);
            expect(result.artifacts[0].metadata?.inboxData?.rationale).toBe('High-margin products with good reviews');
            expect(result.cleanedContent).toContain('[View Artifact: Weekend Specials]');
            expect(result.cleanedContent).not.toContain(':::artifact:carousel');
        });

        it('should set carousel status to draft by default', () => {
            const content = `:::artifact:carousel:New Carousel
{"productIds": ["p1"], "rationale": "Test"}
:::`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts[0].metadata?.inboxData?.status).toBe('draft');
        });
    });

    describe('parseArtifactsFromContent - Bundle Artifacts', () => {
        it('should parse bundle artifact from block format', () => {
            const content = `Here's a bundle deal for you:

:::artifact:bundle:Chill Weekend Pack
{
    "name": "Chill Weekend Pack",
    "description": "Relaxation bundle",
    "type": "fixed_price",
    "products": [
        {"productId": "p1", "name": "Gummies", "requiredQty": 1, "originalPrice": 25},
        {"productId": "p2", "name": "Tincture", "requiredQty": 1, "originalPrice": 35}
    ],
    "originalTotal": 60,
    "bundlePrice": 50,
    "savingsPercent": 16.67,
    "marginAnalysis": {"marginPercent": 35, "isViable": true},
    "rationale": "Complementary products with good margin"
}
:::

This bundle maintains a 35% margin.`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('bundle');
            expect(result.artifacts[0].title).toBe('Chill Weekend Pack');
            expect(result.artifacts[0].metadata?.inboxData?.bundle?.type).toBe('fixed_price');
            expect(result.artifacts[0].metadata?.inboxData?.bundle?.products).toHaveLength(2);
            expect(result.artifacts[0].metadata?.inboxData?.bundle?.savingsPercent).toBeCloseTo(16.67);
            expect(result.artifacts[0].metadata?.inboxData?.bundle?.marginImpact).toBe(35);
        });

        it('should handle bundle with minimal data', () => {
            const content = `:::artifact:bundle:Simple Bundle
{"products": [{"productId": "p1", "name": "Test", "requiredQty": 1, "originalPrice": 20}], "originalTotal": 20, "bundlePrice": 18, "savingsPercent": 10, "rationale": "Test"}
:::`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts[0].metadata?.inboxData?.bundle?.type).toBe('fixed_price'); // Default
            expect(result.artifacts[0].metadata?.inboxData?.status).toBe('draft');
        });
    });

    describe('parseArtifactsFromContent - Creative Post Artifacts', () => {
        it('should parse creative_post artifact from block format', () => {
            const content = `Here's an Instagram post for you:

:::artifact:creative_post:Summer Vibes Post
{
    "platform": "instagram",
    "caption": "Summer is here! Check out our latest drops 🌿",
    "hashtags": ["cannabis", "summer", "wellness"],
    "mediaType": "image",
    "mediaUrls": ["https://example.com/summer.jpg"],
    "complianceCheck": {"status": "active", "issues": []},
    "rationale": "High engagement format for summer audience"
}
:::

Ready to schedule!`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('creative_post');
            expect(result.artifacts[0].title).toBe('Summer Vibes Post');
            expect(result.artifacts[0].metadata?.inboxData?.creativePost?.platform).toBe('instagram');
            expect(result.artifacts[0].metadata?.inboxData?.creativePost?.hashtags).toEqual(['cannabis', 'summer', 'wellness']);
            expect(result.artifacts[0].metadata?.inboxData?.creativePost?.complianceStatus).toBe('active');
        });

        it('should handle creative post with compliance warning', () => {
            const content = `:::artifact:creative_post:Promo Post
{
    "platform": "tiktok",
    "caption": "Get 20% off!",
    "mediaType": "video",
    "complianceCheck": {"status": "warning", "issues": ["Medical claims need review"]},
    "rationale": "Promotional content"
}
:::`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts[0].metadata?.inboxData?.creativePost?.complianceStatus).toBe('warning');
        });
    });

    describe('parseArtifactsFromContent - Multiple Artifacts', () => {
        it('should parse multiple inbox artifacts from content', () => {
            const content = `Here are some marketing assets:

:::artifact:carousel:Featured Products
{"productIds": ["p1", "p2"], "rationale": "Top sellers"}
:::

:::artifact:bundle:Value Pack
{"products": [{"productId": "p1", "name": "Product", "requiredQty": 1, "originalPrice": 30}], "originalTotal": 30, "bundlePrice": 25, "savingsPercent": 16, "rationale": "Good value"}
:::

:::artifact:creative_post:Announcement
{"platform": "instagram", "caption": "New arrivals!", "mediaType": "text", "rationale": "Engagement post"}
:::

Let me know which ones you want to publish!`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(3);
            expect(result.artifacts.map(a => a.type)).toEqual(['carousel', 'bundle', 'creative_post']);
            expect(result.cleanedContent).toContain('[View Artifact: Featured Products]');
            expect(result.cleanedContent).toContain('[View Artifact: Value Pack]');
            expect(result.cleanedContent).toContain('[View Artifact: Announcement]');
        });
    });

    describe('parseArtifactsFromContent - Invalid JSON', () => {
        it('should handle invalid JSON gracefully', () => {
            const content = `:::artifact:carousel:Bad Carousel
{not valid json}
:::`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('carousel');
            expect(result.artifacts[0].metadata?.inboxData).toBeUndefined();
            expect(result.artifacts[0].content).toBe('{not valid json}');
        });
    });

    describe('parseArtifactsFromContent - Non-inbox artifacts', () => {
        it('should parse code artifacts without inbox metadata', () => {
            const content = '```artifact:code:typescript\nconst x = 1;\n```';

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('code');
            expect(result.artifacts[0].metadata?.inboxData).toBeUndefined();
        });

        it('should parse markdown artifacts without inbox metadata', () => {
            const content = `:::artifact:markdown:Documentation
# Title
Some content
:::`;

            const result = parseArtifactsFromContent(content);

            expect(result.artifacts).toHaveLength(1);
            expect(result.artifacts[0].type).toBe('markdown');
            expect(result.artifacts[0].metadata?.inboxData).toBeUndefined();
        });
    });

    describe('Type Guards', () => {
        it('isCarouselArtifact should identify carousel artifacts', () => {
            const carouselArtifact = {
                id: 'art-1',
                type: 'carousel' as const,
                title: 'Test',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isCarouselArtifact(carouselArtifact)).toBe(true);
            expect(isBundleArtifact(carouselArtifact)).toBe(false);
            expect(isCreativePostArtifact(carouselArtifact)).toBe(false);
            expect(isInboxArtifact(carouselArtifact)).toBe(true);
        });

        it('isBundleArtifact should identify bundle artifacts', () => {
            const bundleArtifact = {
                id: 'art-2',
                type: 'bundle' as const,
                title: 'Test',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isBundleArtifact(bundleArtifact)).toBe(true);
            expect(isCarouselArtifact(bundleArtifact)).toBe(false);
            expect(isCreativePostArtifact(bundleArtifact)).toBe(false);
            expect(isInboxArtifact(bundleArtifact)).toBe(true);
        });

        it('isCreativePostArtifact should identify creative_post artifacts', () => {
            const creativeArtifact = {
                id: 'art-3',
                type: 'creative_post' as const,
                title: 'Test',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isCreativePostArtifact(creativeArtifact)).toBe(true);
            expect(isCarouselArtifact(creativeArtifact)).toBe(false);
            expect(isBundleArtifact(creativeArtifact)).toBe(false);
            expect(isInboxArtifact(creativeArtifact)).toBe(true);
        });

        it('isInboxArtifact should return false for non-inbox types', () => {
            const codeArtifact = {
                id: 'art-4',
                type: 'code' as const,
                title: 'Test',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            expect(isInboxArtifact(codeArtifact)).toBe(false);
        });
    });

    describe('ARTIFACT_TYPES Configuration', () => {
        it('should include inbox artifact types', () => {
            const inboxTypes = ARTIFACT_TYPES.filter(t =>
                ['carousel', 'bundle', 'creative_post'].includes(t.type)
            );

            expect(inboxTypes).toHaveLength(3);
        });

        it('should have correct icons for inbox types', () => {
            expect(getArtifactIcon('carousel')).toBe('Images');
            expect(getArtifactIcon('bundle')).toBe('PackagePlus');
            expect(getArtifactIcon('creative_post')).toBe('Palette');
        });

        it('should have correct labels for inbox types', () => {
            expect(getArtifactLabel('carousel')).toBe('Carousel');
            expect(getArtifactLabel('bundle')).toBe('Bundle');
            expect(getArtifactLabel('creative_post')).toBe('Social Post');
        });
    });

    describe('createArtifactId', () => {
        it('should generate unique IDs', () => {
            const id1 = createArtifactId();
            const id2 = createArtifactId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^artifact-/);
            expect(id2).toMatch(/^artifact-/);
        });
    });
});
