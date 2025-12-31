import { Tool } from '@/types/tool';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { firecrawl } from '@/server/services/firecrawl';

// Input Schema
const ScrapeInputSchema = z.object({
    url: z.string().url(),
    mode: z.enum(['basic', 'markdown', 'html']).optional().default('markdown'),
});

type ScrapeInput = z.infer<typeof ScrapeInputSchema>;

export const getWebScraperTool = (): any => {
    return {
        id: 'web.scrape',
        name: 'Web Scraper',
        description: 'Scrape content from a URL. Uses advanced scraping for paid tiers.',
        category: 'research',
        version: '1.0.0',
        enabled: true,
        visible: true,
        isDefault: true,
        requiresAuth: true, // Requires user context to determine tier
        authType: 'none',
        capabilities: [{
            name: 'web_scraping',
            description: 'Extract content from web pages',
            examples: ['Scrape product page', 'Get page text']
        }],
        supportedFormats: ['text', 'html', 'markdown'],
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to scrape' },
                mode: { type: 'string', description: 'Output format', enum: ['basic', 'markdown', 'html'] }
            },
            required: ['url']
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', description: 'Whether scrape succeeded' },
                data: { type: 'object', description: 'Scraped content' }
            }
        },
        estimatedDuration: 5000,
        
        execute: async (input: ScrapeInput, context: any) => {
            const { url, mode } = input;
            const userRole = context?.user?.role || 'guest';
            const isSuperUser = userRole === 'super_admin' || userRole === 'owner'; // Assuming owner is high tier
            
            // Tiered Logic
            // Super Users / Paid -> Firecrawl
            // Free / Guest -> Basic Cheerio
            
            if (isSuperUser && firecrawl.isConfigured()) {
                console.log(`[WebScraper] Using Firecrawl for ${userRole} at ${url}`);
                try {
                    const formats = mode === 'html' ? ['html'] : ['markdown'];
                    const result = await firecrawl.scrapeUrl(url, formats as any);
                    const resultData = result as any;
                    return {
                        success: true,
                        source: 'firecrawl',
                        data: resultData.data || resultData // Handle SDK response variations
                    };
                } catch (error: any) {
                    console.error('[WebScraper] Firecrawl failed, falling back to basic:', error);
                    // Fallback to basic if Firecrawl fails
                }
            }

            // Basic Scraper (Cheerio)
            console.log(`[WebScraper] Using Basic Scraper for ${userRole} at ${url}`);
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'BakedBot/1.0 (Compatible; BasicClient)'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${url}: ${response.status}`);
                }

                const html = await response.text();
                
                if (mode === 'html') {
                    return { success: true, source: 'basic', data: { html } };
                }

                // Convert to basic text/markdown approximation
                const $ = cheerio.load(html);
                
                // Remove scripts, styles
                $('script').remove();
                $('style').remove();
                
                // key metadata
                const title = $('title').text().trim();
                const description = $('meta[name="description"]').attr('content') || '';
                
                // Get body text
                const text = $('body').text().replace(/\s+/g, ' ').trim();
                const markdown = `# ${title}\n\n${description}\n\n${text.substring(0, 10000)}...`; // Truncate basic scraper

                return {
                    success: true,
                    source: 'basic',
                    data: { markdown, metadata: { title, description } }
                };

            } catch (error: any) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
};
