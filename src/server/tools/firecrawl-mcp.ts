'use server';

/**
 * Firecrawl MCP Tools
 * 
 * Wraps Firecrawl API capabilities as Genkit-compatible tools for agent use.
 * These complement RTRVR (interactive browser) with static content extraction.
 * 
 * Tools:
 * - firecrawlSearch: Web search with content extraction
 * - firecrawlBatchScrape: Scrape multiple URLs efficiently
 * - firecrawlMap: Discover all URLs on a site
 * - firecrawlExtract: LLM-based structured data extraction
 */

import { z } from 'zod';
import { tool } from 'genkit';
import { discovery } from '@/server/services/firecrawl';

// ============================================================================
// TOOL: Web Search
// ============================================================================
export const firecrawlSearch = tool({
    name: 'firecrawl_search',
    description: 'Search the web and extract content from results. Use when you need to find information across multiple websites.',
    inputSchema: z.object({
        query: z.string().describe('The search query (e.g., "cannabis strain reviews 2024")'),
        limit: z.number().optional().default(5).describe('Max results to return'),
        scrapeContent: z.boolean().optional().default(true).describe('Whether to scrape full content from results')
    }),
    outputSchema: z.any(),
}, async ({ query, limit, scrapeContent }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured. Contact admin.' };
        }

        const results = await discovery.search(query);
        
        if (!Array.isArray(results)) {
            return { results: [], query };
        }

        // Limit results
        const limited = results.slice(0, limit);

        return {
            query,
            resultCount: limited.length,
            results: limited.map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.description || r.snippet,
                content: scrapeContent ? r.markdown || r.content : undefined
            }))
        };
    } catch (e: any) {
        return { error: `Search failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Batch Scrape
// ============================================================================
export const firecrawlBatchScrape = tool({
    name: 'firecrawl_batch_scrape',
    description: 'Scrape multiple URLs efficiently. Use when you have a list of known URLs to extract content from.',
    inputSchema: z.object({
        urls: z.array(z.string()).describe('Array of URLs to scrape'),
        format: z.enum(['markdown', 'html']).optional().default('markdown')
    }),
    outputSchema: z.any(),
}, async ({ urls, format }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }

        // Process URLs in parallel with rate limiting
        const results = await Promise.all(
            urls.slice(0, 10).map(async (url) => { // Limit to 10 for safety
                try {
                    const scraped = await discovery.discoverUrl(url, [format]);
                    return {
                        url,
                        success: true,
                        content: scraped.markdown || scraped.html || scraped.content
                    };
                } catch (e: any) {
                    return { url, success: false, error: e.message };
                }
            })
        );

        return {
            totalRequested: urls.length,
            scraped: results.filter(r => r.success).length,
            results
        };
    } catch (e: any) {
        return { error: `Batch scrape failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Map Site
// ============================================================================
export const firecrawlMap = tool({
    name: 'firecrawl_map',
    description: 'Discover all URLs on a website. Use to explore site structure before scraping specific pages.',
    inputSchema: z.object({
        url: z.string().describe('Root URL to map (e.g., "https://competitor.com")')
    }),
    outputSchema: z.any(),
}, async ({ url }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }

        const result = await discovery.mapSite(url);
        
        return {
            url,
            urlCount: result.links?.length || 0,
            urls: result.links || []
        };
    } catch (e: any) {
        return { error: `Map failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Extract Structured Data
// ============================================================================
export const firecrawlExtract = tool({
    name: 'firecrawl_extract',
    description: 'Extract structured data from a page using LLM. Use when you need specific fields in a defined format.',
    inputSchema: z.object({
        url: z.string().describe('URL to extract data from'),
        fields: z.array(z.string()).describe('Fields to extract (e.g., ["price", "product_name", "thc_percent"])')
    }),
    outputSchema: z.any(),
}, async ({ url, fields }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }

        // Build schema from fields
        const schemaProperties: Record<string, any> = {};
        for (const field of fields) {
            schemaProperties[field] = { type: 'string' };
        }

        const schema = z.object(
            Object.fromEntries(fields.map(f => [f, z.string().optional()]))
        );

        const result = await discovery.extractData(url, schema);

        return {
            url,
            extractedFields: fields,
            data: result
        };
    } catch (e: any) {
        return { error: `Extract failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Scrape Menu with Age Gate Bypass
// ============================================================================
export const firecrawlScrapeMenu = tool({
    name: 'firecrawl_scrape_menu',
    description: 'Scrape a dispensary menu page with automatic age gate bypass. Use for cannabis dispensary websites that have 21+ verification.',
    inputSchema: z.object({
        url: z.string().describe('URL of the dispensary menu page'),
        waitMs: z.number().optional().default(5000).describe('Time in ms to wait for page content to load after age gate')
    }),
    outputSchema: z.any(),
}, async ({ url, waitMs }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }

        // Import Firecrawl SDK for actions
        const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
            return { error: 'FIRECRAWL_API_KEY not configured.' };
        }
        const app = new FirecrawlApp({ apiKey });

        // Scrape with actions to bypass age gate
        const response = await app.scrape(url, {
            formats: ['markdown'],
            actions: [
                { type: 'wait', milliseconds: 2000 },
                { type: 'click', selector: 'a[href*="#yes"]' },
                { type: 'click', selector: 'button:contains("Yes")' },
                { type: 'click', selector: '[data-age-gate="yes"]' },
                { type: 'wait', milliseconds: waitMs },
                { type: 'scroll', direction: 'down', amount: 1000 },
                { type: 'wait', milliseconds: 2000 },
            ],
            timeout: 60000,
        } as any) as any;

        if (response.success || response.markdown) {
            const content = response.markdown || response.data?.markdown || '';
            
            // Extract product indicators
            const hasProducts = content.toLowerCase().includes('flower') ||
                               content.toLowerCase().includes('edible') ||
                               content.toLowerCase().includes('thc');
            const priceCount = (content.match(/\$[\d,.]+/g) || []).length;

            return {
                url,
                success: true,
                contentLength: content.length,
                hasProducts,
                priceCount,
                markdown: content
            };
        } else {
            return { 
                url, 
                success: false, 
                error: response.error || 'Unknown error' 
            };
        }
    } catch (e: any) {
        return { error: `Menu scrape failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Scrape with Custom Actions
// ============================================================================
export const firecrawlScrapeWithActions = tool({
    name: 'firecrawl_scrape_with_actions',
    description: 'Scrape a page using custom browser actions. Use for complex JS-rendered pages that require clicks, scrolls, or waits.',
    inputSchema: z.object({
        url: z.string().describe('URL to scrape'),
        actions: z.array(z.object({
            type: z.enum(['wait', 'click', 'scroll', 'type']),
            selector: z.string().optional().describe('CSS selector for click/type actions'),
            milliseconds: z.number().optional().describe('Wait time in ms'),
            direction: z.enum(['up', 'down']).optional().describe('Scroll direction'),
            amount: z.number().optional().describe('Scroll amount in pixels'),
            text: z.string().optional().describe('Text to type')
        })).describe('Array of browser actions to perform before scraping'),
        format: z.enum(['markdown', 'html']).optional().default('markdown')
    }),
    outputSchema: z.any(),
}, async ({ url, actions, format }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }

        const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
            return { error: 'FIRECRAWL_API_KEY not configured.' };
        }
        const app = new FirecrawlApp({ apiKey });

        const response = await app.scrape(url, {
            formats: [format],
            actions: actions,
            timeout: 60000,
        } as any) as any;

        if (response.success || response.markdown || response.html) {
            const content = format === 'markdown' 
                ? (response.markdown || response.data?.markdown || '')
                : (response.html || response.data?.html || '');

            return {
                url,
                success: true,
                format,
                contentLength: content.length,
                content
            };
        } else {
            return { 
                url, 
                success: false, 
                error: response.error || 'Unknown error' 
            };
        }
    } catch (e: any) {
        return { error: `Scrape with actions failed: ${e.message}` };
    }
});

// Export all tools
export const firecrawlMCPTools = [
    firecrawlSearch,
    firecrawlBatchScrape,
    firecrawlMap,
    firecrawlExtract,
    firecrawlScrapeMenu,
    firecrawlScrapeWithActions
];
