// Web Search Tool - uses Google Custom Search API

import { BaseTool } from '../base-tool';
import type { ToolContext, ToolResult, WebSearchInput, WebSearchOutput } from '@/types/tool';

/**
 * Web Search Tool
 * Searches the web using Google Custom Search API
 */
export class WebSearchTool extends BaseTool<WebSearchInput, WebSearchOutput> {
    readonly id = 'web_search';
    readonly name = 'Web Search';
    readonly description = 'Search the web for information using Google Search';
    readonly category = 'research' as const;

    readonly capabilities = [
        {
            name: 'general_search',
            description: 'Search the web for any topic',
            examples: [
                'cannabis dispensaries in New York',
                'cannabis industry trends 2024',
                'CBD regulations California'
            ]
        },
        {
            name: 'date_filtered_search',
            description: 'Search with date range filtering',
            examples: [
                'recent cannabis legislation',
                'new cannabis products this month'
            ]
        }
    ];

    readonly inputSchema = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query'
            },
            numResults: {
                type: 'number',
                description: 'Number of results to return (default: 10)',
                default: 10
            },
            dateRange: {
                type: 'string',
                enum: ['day', 'week', 'month', 'year', 'all'],
                description: 'Filter results by date',
                default: 'all'
            },
            country: {
                type: 'string',
                description: 'Country code for localized results (e.g., "us")',
                default: 'us'
            }
        },
        required: ['query']
    };

    readonly outputSchema = {
        type: 'object',
        properties: {
            results: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        url: { type: 'string' },
                        snippet: { type: 'string' },
                        date: { type: 'string' }
                    }
                }
            },
            totalResults: { type: 'number' }
        }
    };

    readonly authType = 'api_key' as const;
    readonly requiresAuth = true;

    visible = true;
    icon = '🔍';
    color = '#4285F4'; // Google blue

    estimatedDuration = 2000; // 2 seconds
    estimatedCost = 0.005; // $0.005 per search

    rateLimit = {
        maxCallsPerMinute: 60,
        maxCallsPerHour: 1000,
        maxCallsPerDay: 10000
    };

    async execute(
        input: WebSearchInput,
        context: ToolContext
    ): Promise<ToolResult<WebSearchOutput>> {
        const startTime = Date.now();

        try {
            // Validate input
            this.validateInput(input);

            // Get API credentials from environment or context
            const apiKey = process.env.GOOGLE_SEARCH_API_KEY || context.credentials?.googleSearchApiKey;
            const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || context.credentials?.searchEngineId;

            if (!apiKey || !searchEngineId) {
                throw this.createError(
                    'AUTH_REQUIRED',
                    'Google Search API key and Search Engine ID are required',
                    false
                );
            }

            // Build search URL
            const params = new URLSearchParams({
                key: apiKey,
                cx: searchEngineId,
                q: input.query,
                num: (input.numResults || 10).toString(),
                gl: input.country || 'us'
            });

            // Add date range if specified
            if (input.dateRange && input.dateRange !== 'all') {
                params.append('dateRestrict', this.getDateRestrict(input.dateRange));
            }

            // Make API request
            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?${params.toString()}`
            );

            if (!response.ok) {
                const error = await response.json();
                throw this.createError(
                    'API_ERROR',
                    `Google Search API error: ${error.error?.message || response.statusText}`,
                    response.status === 429 // Retryable if rate limited
                );
            }

            const data = await response.json();

            // Parse results
            const results = (data.items || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                date: item.pagemap?.metatags?.[0]?.['article:published_time']
            }));

            const output: WebSearchOutput = {
                results,
                totalResults: parseInt(data.searchInformation?.totalResults || '0')
            };

            const executionTime = Date.now() - startTime;

            return this.createResult(
                output,
                {
                    executionTime,
                    apiCalls: 1,
                    cost: this.estimatedCost
                },
                {
                    type: 'table',
                    title: `Search Results for "${input.query}"`,
                    content: results.map(r => ({
                        Title: r.title,
                        URL: r.url,
                        Snippet: r.snippet
                    })),
                    preview: `Found ${results.length} results`,
                    icon: '🔍'
                },
                0.85 // High confidence for web search
            );

        } catch (error: any) {
            if (error.code) {
                return this.createFailedResult(error);
            }

            return this.createFailedResult(
                this.createError(
                    'EXECUTION_ERROR',
                    error.message || 'Web search failed',
                    true
                )
            );
        }
    }

    /**
     * Convert date range to Google Search API format
     */
    private getDateRestrict(range: string): string {
        const mapping: Record<string, string> = {
            'day': 'd1',
            'week': 'd7',
            'month': 'm1',
            'year': 'y1'
        };

        return mapping[range] || '';
    }
}

// Export singleton instance
export const webSearchTool = new WebSearchTool();
