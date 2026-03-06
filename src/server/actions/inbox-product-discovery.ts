'use server';

import { z } from 'zod';
import { requireUser } from '@/server/auth/auth';
import { recommendProducts } from '@/ai/ai-powered-product-recommendations';
import {
    generateAIBundleSuggestions,
    parseNaturalLanguageRule,
    type SuggestedBundle,
} from '@/app/actions/bundle-suggestions';
import { logger } from '@/lib/logger';
import type {
    GenerateInboxProductDiscoveryInput,
    InboxBundleIdea,
    InboxProductDiscoveryInsight,
    InboxRecommendedProduct,
} from '@/types/inbox-product-discovery';

const GenerateInboxProductDiscoveryInputSchema = z.object({
    orgId: z.string().min(3).max(128).refine((value) => !/[\/\\?#\[\]]/.test(value), 'Invalid organization ID'),
    mode: z.enum(['recommend_products', 'bundle_ideas']),
    prompt: z.string().max(1000).optional(),
    customerHistory: z.string().max(1000).optional(),
});

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.tenantId || token.organizationId || null;
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

function mapRecommendedProducts(products: Array<{
    productId: string;
    productName: string;
    reasoning: string;
}>): InboxRecommendedProduct[] {
    return products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        reasoning: product.reasoning,
    }));
}

function mapBundleIdeas(suggestions: SuggestedBundle[]): InboxBundleIdea[] {
    return suggestions.slice(0, 3).map((suggestion) => ({
        name: suggestion.name,
        description: suggestion.description,
        savingsPercent: suggestion.savingsPercent,
        badgeText: suggestion.badgeText,
        marginImpact: suggestion.marginImpact,
        products: suggestion.products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
        })),
    }));
}

function buildBundleWorkflowPrompt(prompt: string | undefined, ideas: InboxBundleIdea[]): string {
    const ideaSummary = ideas
        .map((idea) => {
            const productNames = idea.products.map((product) => product.name).join(', ');
            return `${idea.name}: ${idea.description} Products: ${productNames}. Target savings: ${idea.savingsPercent}%.`;
        })
        .join(' ');

    const trimmedPrompt = prompt?.trim();
    if (trimmedPrompt) {
        return `Create draft bundles based on this merchandising brief: ${trimmedPrompt} Use these grounded concepts as the starting point: ${ideaSummary}`;
    }

    return `Create draft bundles using these grounded concepts from the current menu: ${ideaSummary}`;
}

function buildBundleSummary(ideas: InboxBundleIdea[], usedFallback: boolean): string {
    if (ideas.length === 0) {
        return 'No grounded bundle ideas are available from the current catalog.';
    }

    const topIdea = ideas[0];
    const savings = `${topIdea.savingsPercent}%`;
    if (usedFallback) {
        return `Your exact bundle brief did not map cleanly to the current menu, so these are the strongest grounded opportunities available right now. The lead concept is "${topIdea.name}" at ${savings} savings.`;
    }

    return `These bundle ideas are grounded in the current catalog. The lead concept is "${topIdea.name}" at ${savings} savings.`;
}

export async function generateInboxProductDiscoveryInsight(input: GenerateInboxProductDiscoveryInput): Promise<{
    success: boolean;
    insight?: InboxProductDiscoveryInsight;
    error?: string;
}> {
    try {
        const parsed = GenerateInboxProductDiscoveryInputSchema.parse(input);
        const user = await requireUser();
        assertOrgAccess(user, parsed.orgId);

        if (parsed.mode === 'recommend_products') {
            const prompt = parsed.prompt?.trim();
            if (!prompt) {
                throw new Error('Tell me what kind of product you want to find.');
            }

            const result = await recommendProducts({
                query: prompt,
                brandId: parsed.orgId,
                customerHistory: parsed.customerHistory?.trim() || undefined,
            });

            return {
                success: true,
                insight: {
                    mode: 'recommend_products',
                    title: result.products.length > 0 ? 'Recommended Product Matches' : 'No Strong Product Match Yet',
                    summary: result.overallReasoning,
                    overallReasoning: result.overallReasoning,
                    recommendedProducts: mapRecommendedProducts(result.products),
                },
            };
        }

        const prompt = parsed.prompt?.trim();
        let usedFallback = false;
        let bundleResult = prompt
            ? await parseNaturalLanguageRule(parsed.orgId, prompt, 15)
            : await generateAIBundleSuggestions(parsed.orgId);

        if ((!bundleResult.success || !bundleResult.suggestions || bundleResult.suggestions.length === 0) && prompt) {
            usedFallback = true;
            bundleResult = await generateAIBundleSuggestions(parsed.orgId);
        }

        if (!bundleResult.success || !bundleResult.suggestions || bundleResult.suggestions.length === 0) {
            throw new Error(bundleResult.error || 'No grounded bundle ideas are available right now.');
        }

        const bundleIdeas = mapBundleIdeas(bundleResult.suggestions);
        const bundlePrompt = buildBundleWorkflowPrompt(prompt, bundleIdeas);

        return {
            success: true,
            insight: {
                mode: 'bundle_ideas',
                title: 'Grounded Bundle Ideas',
                summary: buildBundleSummary(bundleIdeas, usedFallback),
                overallReasoning: buildBundleSummary(bundleIdeas, usedFallback),
                bundleIdeas,
                actions: [
                    {
                        kind: 'bundle',
                        label: 'Open Bundle Builder',
                        prompt: bundlePrompt,
                    },
                ],
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load product discovery insight';
        logger.error('[InboxProductDiscovery] generateInboxProductDiscoveryInsight failed', { error: message });
        return {
            success: false,
            error: message,
        };
    }
}
