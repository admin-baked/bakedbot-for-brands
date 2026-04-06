import { Tool } from '@/types/tool';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { discovery } from '@/server/services/firecrawl';

// Input Schema
const DiscoveryInputSchema = z.object({
    url: z.string().url(),
    mode: z.enum(['basic', 'markdown', 'html']).optional().default('markdown'),
});

type DiscoveryInput = z.infer<typeof DiscoveryInputSchema>;

export const getWebDiscoveryTool = (): any => {
    return {
        id: 'web.discover',
        name: 'Web Discovery',
        description: 'Discover and extract content from a URL. Uses advanced discovery for paid tiers.',
        category: 'research',
        version: '1.0.0',
        enabled: true,
        visible: true,
        isDefault: true,
        requiresAuth: true, // Requires user context to determine tier
        authType: 'none',
        capabilities: [{
            name: 'web_discovery',
            description: 'Extract content from web pages',
            examples: ['Discover product page', 'Get page text']
        }],
        supportedFormats: ['text', 'html', 'markdown'],
        inputSchema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to discover' },
                mode: { type: 'string', description: 'Output format', enum: ['basic', 'markdown', 'html'] }
            },
            required: ['url']
        },
        outputSchema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', description: 'Whether discovery succeeded' },
                data: { type: 'object', description: 'Discovered content' }
            }
        },
        estimatedDuration: 5000,
        
        execute: async (input: DiscoveryInput, context: any) => {
            const { url, mode } = input;
            const userRole = context?.user?.role || 'guest';
            const isSuperUser = userRole === 'super_admin' || userRole === 'owner'; // Assuming owner is high tier
            
            // Tiered Logic
            // Super Users / Paid -> Firecrawl
            // Free / Guest -> Basic Cheerio
            
            if (isSuperUser && discovery.isConfigured()) {
                console.log(`[WebDiscovery] Using BakedBot Discovery for ${userRole} at ${url}`);
                try {
                    const formats = mode === 'html' ? ['html'] : ['markdown'];
                    const result = await discovery.discoverUrl(url, formats as any);
                    const resultData = result as any;
                    return {
                        success: true,
                        source: 'bakedbot_discovery',
                        data: resultData.data || resultData // Handle SDK response variations
                    };
                } catch (error: any) {
                    console.error('[WebDiscovery] Discovery failed, falling back to basic:', error);
                    // Fallback to basic if Discovery fails
                }
            }

            // Basic Discovery (Cheerio)
            console.log(`[WebDiscovery] Using Basic Discovery for ${userRole} at ${url}`);
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
                const markdown = `# ${title}\n\n${description}\n\n${text.substring(0, 10000)}...`; // Truncate basic discovery

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
