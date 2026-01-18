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
import { ai } from '@/ai/genkit';
import { discovery } from '@/server/services/firecrawl';

// ============================================================================
// TOOL: Web Search with Content Extraction
// ============================================================================
export const firecrawlSearch = ai.defineTool({
    name: 'firecrawl_search',
    description: 'Search the web and extract content from results. Use for finding information about dispensaries, brands, or products.',
    inputSchema: z.object({
        query: z.string().describe('Search query')
    }),
    outputSchema: z.any(),
}, async ({ query }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }
        const results = await discovery.search(query);
        return { success: true, results };
    } catch (e: any) {
        return { error: `Search failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Batch Scrape Multiple URLs
// ============================================================================
export const firecrawlBatchScrape = ai.defineTool({
    name: 'firecrawl_batch_scrape',
    description: 'Scrape multiple URLs efficiently in a single batch. Use for scraping multiple pages from the same site.',
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
        const results = await Promise.all(
            urls.map(async (url) => {
                try {
                    const response = await discovery.discoverUrl(url, [format]);
                    return { url, success: true, content: response.markdown || response.html };
                } catch (e: any) {
                    return { url, success: false, error: e.message };
                }
            })
        );
        return { success: true, results };
    } catch (e: any) {
        return { error: `Batch scrape failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Map Site URLs
// ============================================================================
export const firecrawlMap = ai.defineTool({
    name: 'firecrawl_map',
    description: 'Discover all URLs on a website. Use to find all pages on a dispensary or brand site before scraping.',
    inputSchema: z.object({
        url: z.string().describe('Base URL of the site to map')
    }),
    outputSchema: z.any(),
}, async ({ url }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }
        const response = await discovery.mapSite(url);
        return { success: true, urls: response.links || response.urls || [] };
    } catch (e: any) {
        return { error: `Map failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: LLM-Based Structured Data Extraction
// ============================================================================
export const firecrawlExtract = ai.defineTool({
    name: 'firecrawl_extract',
    description: 'Extract structured data from a webpage using LLM. Use for extracting specific information like product details, prices, or contact info.',
    inputSchema: z.object({
        url: z.string().describe('URL to extract data from'),
        prompt: z.string().describe('Description of what data to extract')
    }),
    outputSchema: z.any(),
}, async ({ url, prompt }) => {
    try {
        if (!discovery.isConfigured()) {
            return { error: 'Firecrawl not configured.' };
        }
        // Use a simple schema for extraction
        const schema = z.object({
            data: z.any().describe(prompt)
        });
        const result = await discovery.extractData(url, schema);
        return { success: true, data: result };
    } catch (e: any) {
        return { error: `Extract failed: ${e.message}` };
    }
});

// ============================================================================
// TOOL: Scrape Menu with Age Gate Bypass
// ============================================================================
export const firecrawlScrapeMenu = ai.defineTool({
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
export const firecrawlScrapeWithActions = ai.defineTool({
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
