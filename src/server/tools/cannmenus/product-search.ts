// CannMenus Product Search Tool - searches competitor products via CannMenus API
// NOTE: This tool is for Ezal (competitive intel) ONLY.
// Thrive Syracuse uses Alleaves POS for internal inventory — do NOT use this for Smokey/Craig/Pops.

import { BaseTool } from '../base-tool';
import type { ToolContext, ToolResult, CannMenusProductSearchInput, CannMenusProductSearchOutput } from '@/types/tool';
import { getProducts } from '@/lib/cannmenus-api';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';

/**
 * CannMenus Product Search Tool
 * Searches cannabis products using the CannMenus API
 */
export class CannMenusProductSearchTool extends BaseTool<CannMenusProductSearchInput, CannMenusProductSearchOutput> {
    readonly id = 'cannmenus_product_search';
    readonly name = 'CannMenus Product Search';
    readonly description = 'Search cannabis products in the CannMenus database';
    readonly category = 'integration' as const;

    readonly appId = 'cannmenus';
    readonly isDefault = true; // CannMenus is a default integration

    readonly capabilities = [
        {
            name: 'product_search',
            description: 'Search products by name, category, brand, or effects',
            examples: [
                'uplifting sativa gummies under $25',
                'Cookies brand products',
                'high CBD products in California'
            ]
        },
        {
            name: 'category_filter',
            description: 'Filter by product category',
            examples: ['edibles', 'flower', 'concentrates', 'vapes']
        },
        {
            name: 'price_filter',
            description: 'Filter by price range',
            examples: ['products under $30', 'premium products over $50']
        }
    ];

    readonly inputSchema = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query for product name or description'
            },
            category: {
                type: 'string',
                description: 'Product category filter'
            },
            brand: {
                type: 'string',
                description: 'Brand name filter'
            },
            state: {
                type: 'string',
                description: 'State abbreviation (e.g., "CA", "NY")'
            },
            minPrice: {
                type: 'number',
                description: 'Minimum price filter'
            },
            maxPrice: {
                type: 'number',
                description: 'Maximum price filter'
            },
            effects: {
                type: 'array',
                items: { type: 'string' },
                description: 'Desired effects (e.g., "uplifting", "relaxing")'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results',
                default: 20
            }
        }
    };

    readonly outputSchema = {
        type: 'object',
        properties: {
            products: { type: 'array' },
            totalResults: { type: 'number' }
        }
    };

    readonly authType = 'api_key' as const;
    readonly requiresAuth = true;

    visible = true;
    icon = '🌿';
    color = '#4CAF50';

    estimatedDuration = 1500;
    estimatedCost = 0.001;

    async execute(
        input: CannMenusProductSearchInput,
        context: ToolContext
    ): Promise<ToolResult<CannMenusProductSearchOutput>> {
        const startTime = Date.now();

        try {
            const brandId = context.brandId || 'default';
            const state = input.state || 'NY'; // Default to NY for Thrive Syracuse market

            // Build a deterministic cache key from state + query parameters.
            // CannMenus competitor data changes slowly — 15 min TTL is fine.
            const querySuffix = [state, input.query, input.category, input.brand, input.minPrice, input.maxPrice]
                .filter(Boolean)
                .join(':');
            const cacheId = `${brandId}:${querySuffix}`;

            const products = await withCache(
                CachePrefix.COMPETITOR_INTEL,
                cacheId,
                () => getProducts(brandId, state),
                CacheTTL.COMPETITOR_INTEL,
            );

            // Filter products based on input criteria
            let filtered = products;

            if (input.query) {
                const query = input.query.toLowerCase();
                filtered = filtered.filter(p =>
                    p.name?.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query)
                );
            }

            if (input.category) {
                filtered = filtered.filter(p =>
                    p.category?.toLowerCase() === input.category?.toLowerCase()
                );
            }

            if (input.brand) {
                filtered = filtered.filter(p =>
                    p.brand?.toLowerCase().includes(input.brand!.toLowerCase())
                );
            }

            if (input.minPrice !== undefined) {
                filtered = filtered.filter(p => p.price >= input.minPrice!);
            }

            if (input.maxPrice !== undefined) {
                filtered = filtered.filter(p => p.price <= input.maxPrice!);
            }

            if (input.effects && input.effects.length > 0) {
                filtered = filtered.filter(p =>
                    input.effects!.some(effect =>
                        p.effects?.includes(effect.toLowerCase())
                    )
                );
            }

            // Limit results
            const limit = input.limit || 20;
            const results = filtered.slice(0, limit);

            const output: CannMenusProductSearchOutput = {
                products: results.map(p => ({
                    id: p.id,
                    name: p.name,
                    brand: p.brand,
                    category: p.category,
                    price: p.price,
                    image: p.image,
                    description: p.description,
                    effects: p.effects
                })),
                totalResults: filtered.length
            };

            const executionTime = Date.now() - startTime;

            return this.createResult(
                output,
                {
                    executionTime,
                    apiCalls: 1
                },
                {
                    type: 'table',
                    title: `Found ${results.length} Products`,
                    content: results.map(p => ({
                        Name: p.name,
                        Brand: p.brand,
                        Category: p.category,
                        Price: `$${p.price}`,
                        Effects: p.effects?.join(', ')
                    })),
                    preview: `${results.length} of ${filtered.length} products`,
                    icon: '🌿'
                },
                0.85
            );

        } catch (error: any) {
            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error.message || 'CannMenus search failed',
                    true
                )
            );
        }
    }
}

export const cannMenusProductSearchTool = new CannMenusProductSearchTool();
