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

// ... (existing helper tools) ...

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
