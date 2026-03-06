var mockRequireUser = jest.fn();
var mockRecommendProducts = jest.fn();
var mockGenerateAIBundleSuggestions = jest.fn();
var mockParseNaturalLanguageRule = jest.fn();

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/ai/ai-powered-product-recommendations', () => ({
    recommendProducts: (...args: unknown[]) => mockRecommendProducts(...args),
}));

jest.mock('@/app/actions/bundle-suggestions', () => ({
    generateAIBundleSuggestions: (...args: unknown[]) => mockGenerateAIBundleSuggestions(...args),
    parseNaturalLanguageRule: (...args: unknown[]) => mockParseNaturalLanguageRule(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { generateInboxProductDiscoveryInsight } from '@/server/actions/inbox-product-discovery';

describe('inbox product discovery server action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            role: 'brand_admin',
            currentOrgId: 'org-1',
        });
    });

    it('returns grounded product recommendations', async () => {
        mockRecommendProducts.mockResolvedValue({
            products: [
                {
                    productId: 'prod-1',
                    productName: 'Blue Dream Cart',
                    reasoning: 'Popular uplifting profile with familiar flavor notes.',
                },
            ],
            overallReasoning: 'This recommendation matches the requested daytime profile.',
        });

        const result = await generateInboxProductDiscoveryInsight({
            orgId: 'org-1',
            mode: 'recommend_products',
            prompt: 'Recommend a daytime cart',
            customerHistory: 'Prefers fruity terpene profiles.',
        });

        expect(mockRecommendProducts).toHaveBeenCalledWith({
            query: 'Recommend a daytime cart',
            brandId: 'org-1',
            customerHistory: 'Prefers fruity terpene profiles.',
        });
        expect(result.success).toBe(true);
        expect(result.insight).toMatchObject({
            mode: 'recommend_products',
            title: 'Recommended Product Matches',
            recommendedProducts: [
                {
                    productId: 'prod-1',
                    productName: 'Blue Dream Cart',
                },
            ],
        });
    });

    it('falls back to auto bundle ideas when a targeted brief does not match inventory', async () => {
        mockParseNaturalLanguageRule.mockResolvedValue({
            success: false,
            error: 'No products match your criteria.',
        });
        mockGenerateAIBundleSuggestions.mockResolvedValue({
            success: true,
            suggestions: [
                {
                    name: 'Weekend Lift Kit',
                    description: 'Citrus-forward daytime pairing.',
                    savingsPercent: 15,
                    badgeText: 'POPULAR',
                    marginImpact: 28,
                    products: [
                        { id: 'p1', name: 'Lemon Mint Cart', category: 'Vape', price: 42 },
                        { id: 'p2', name: 'Sunrise Flower', category: 'Flower', price: 38 },
                    ],
                },
            ],
        });

        const result = await generateInboxProductDiscoveryInsight({
            orgId: 'org-1',
            mode: 'bundle_ideas',
            prompt: 'Build bundle ideas for citrus weekend shoppers.',
        });

        expect(mockParseNaturalLanguageRule).toHaveBeenCalledWith('org-1', 'Build bundle ideas for citrus weekend shoppers.', 15);
        expect(mockGenerateAIBundleSuggestions).toHaveBeenCalledWith('org-1');
        expect(result.success).toBe(true);
        expect(result.insight).toMatchObject({
            mode: 'bundle_ideas',
            title: 'Grounded Bundle Ideas',
            bundleIdeas: [
                expect.objectContaining({
                    name: 'Weekend Lift Kit',
                    savingsPercent: 15,
                }),
            ],
            actions: [
                expect.objectContaining({
                    kind: 'bundle',
                    label: 'Open Bundle Builder',
                }),
            ],
        });
    });
});
