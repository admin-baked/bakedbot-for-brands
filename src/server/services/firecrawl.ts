
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRTRVRClient } from './rtrvr/client';
import { executeAgentTask, extractFromUrl } from './rtrvr/agent';
import type { AgentResult } from './rtrvr/agent';

/**
 * BakedBot Discovery Service (Singleton)
 *
 * Capabilities:
 * - Discovery: Get markdown/HTML from a URL (Firecrawl → RTRVR fallback)
 * - Search: Find pages matching a query (Firecrawl → RTRVR fallback)
 * - Map: Crawl a site to find links (Firecrawl → RTRVR fallback)
 * - Extract: LLM-based structured data extraction (Firecrawl → RTRVR fallback)
 *
 * Note: Uses FIRECRAWL_API_KEY from env (set via Firebase Secrets).
 * Automatically falls back to RTRVR.ai if Firecrawl is unavailable.
 */
export class DiscoveryService {
    private app: FirecrawlApp | null = null;
    private static instance: DiscoveryService;

    private constructor() {
        // DEBUG: Logging to see if env is loaded
        const apiKey = process.env.FIRECRAWL_API_KEY;
        console.log('[DiscoveryService] Initializing...');
        console.log('[DiscoveryService] Env Key Exists:', !!apiKey);
        if (apiKey) console.log('[DiscoveryService] Key Length:', apiKey.length);

        if (apiKey) {
            this.app = new FirecrawlApp({ apiKey });
            console.log('[DiscoveryService] App Initialized Successfully');
        } else {
            console.warn('[Discovery] API Key not found. BakedBot Discovery service will be disabled.');
            console.warn('[Discovery] Checked process.env.FIRECRAWL_API_KEY');
        }

        logger.info('[Discovery] Service initialized', {
            firecrawlAvailable: !!this.app,
            rtrvrAvailable: this.isRTRVRAvailable()
        });
    }

    public static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    public isConfigured(): boolean {
        return !!this.app || this.isRTRVRAvailable();
    }

    private isFirecrawlAvailable(): boolean {
        return !!this.app;
    }

    private isRTRVRAvailable(): boolean {
        return getRTRVRClient().isAvailable();
    }

    /**
     * Extract content from RTRVR agent result
     */
    private extractRTRVRContent(data: AgentResult | undefined): string {
        if (!data) return '';
        if (typeof data.result === 'string') return data.result;
        if (data.output?.length) {
            const textOut = data.output.find(o => o.type === 'text');
            if (textOut) return String(textOut.content);
            const jsonOut = data.output.find(o => o.type === 'json');
            if (jsonOut) return typeof jsonOut.content === 'string' ? jsonOut.content : JSON.stringify(jsonOut.content);
        }
        return JSON.stringify(data.result ?? '');
    }

    /**
     * Basic Discovery: Get content from a URL
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async discoverUrl(url: string, formats: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[] = ['markdown']) {
        if (this.isFirecrawlAvailable()) {
            try {
                const response = await this.app!.scrape(url, {
                    formats: formats
                }) as any;

                if (!response.success) {
                    throw new Error(`Discovery failed: ${response.error}`);
                }

                logger.info('[Discovery] discoverUrl succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl discoverUrl failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Retrieval error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for discoverUrl', { url });
        const res = await extractFromUrl(url, 'Extract the full content of this page as clean readable markdown text.', {
            type: 'object',
            properties: {
                markdown: { type: 'string' },
                title: { type: 'string' }
            }
        });

        if (!res.success) {
            throw new Error(`RTRVR fallback failed: ${res.error}`);
        }

        const content = this.extractRTRVRContent(res.data);
        return { success: true, markdown: content };
    }

    /**
     * Advanced Discovery with Actions (Reference: Cloud-only feature)
     * useful for age gates, clicking buttons, etc.
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async discoverWithActions(url: string, actions: any[]) {
        if (this.isFirecrawlAvailable()) {
            try {
                // @ts-ignore - Actions are supported in API but strictly typed in some SDK versions
                const response = await this.app!.scrape(url, {
                    formats: ['markdown'],
                    actions: actions
                }) as any;

                if (!response.success) {
                    throw new Error(`Discovery action failed: ${response.error}`);
                }

                logger.info('[Discovery] discoverWithActions succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl discoverWithActions failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Action retrieval error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback: convert actions to natural language instruction
        logger.info('[Discovery] Using RTRVR fallback for discoverWithActions', { url, actionCount: actions.length });
        const actionDescription = actions
            .map((a: any) => {
                if (a.type === 'click') return `Click on element matching: ${a.selector}`;
                if (a.type === 'scroll') return `Scroll ${a.direction || 'down'} by ${a.amount || 'to bottom'}`;
                if (a.type === 'type') return `Type text: "${a.text}"`;
                if (a.type === 'wait') return `Wait ${a.milliseconds}ms`;
                return `Execute action: ${JSON.stringify(a)}`;
            })
            .join('; ');

        const res = await executeAgentTask({
            input: `Go to this page and perform these actions in order: ${actionDescription}. Then extract the main content as markdown.`,
            urls: [url],
            verbosity: 'final'
        });

        if (!res.success || !res.data) {
            throw new Error(`RTRVR fallback failed: ${res.error}`);
        }

        const content = this.extractRTRVRContent(res.data);
        return { success: true, markdown: content };
    }

    /**
     * Search the web (Discovery Search)
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async search(query: string) {
        if (this.isFirecrawlAvailable()) {
            try {
                const response = await this.app!.search(query) as any;
                console.log('[DiscoveryService] Search Raw Response:', JSON.stringify(response, null, 2));

                // Handle different SDK response shapes
                const data = response.data || response.web || (response.success ? response : null);

                if (!data && !response.success) {
                    const errMsg = response.error || JSON.stringify(response);
                    throw new Error(`Discovery search failed: ${errMsg}`);
                }

                logger.info('[Discovery] search succeeded via Firecrawl', { query, resultCount: Array.isArray(data) ? data.length : 0 });
                return data || [];
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl search failed, trying RTRVR fallback', { query, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Search error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for search', { query });
        const res = await executeAgentTask({
            input: `Search the web for: "${query}". Return results as a JSON array with objects containing: title (string), url (string), and snippet (string).`,
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        url: { type: 'string' },
                        snippet: { type: 'string' }
                    },
                    required: ['title', 'url']
                }
            },
            verbosity: 'final'
        });

        if (!res.success || !res.data?.result) {
            throw new Error(`RTRVR search fallback failed: ${res.error}`);
        }

        const results = res.data.result;
        return Array.isArray(results) ? results : [];
    }

    /**
     * Map a website (Discovery)
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async mapSite(url: string) {
        if (this.isFirecrawlAvailable()) {
            try {
                // @ts-ignore - mapUrl exists in API but may not be in SDK types
                const response = await this.app!.mapUrl(url) as any;

                if (!response.success) {
                    throw new Error(`Discovery map failed: ${response.error}`);
                }

                logger.info('[Discovery] mapSite succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl mapSite failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Map error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for mapSite', { url });
        const res = await executeAgentTask({
            input: `Visit this website and find all internal links/URLs. Return as JSON array of strings with the full URLs.`,
            urls: [url],
            schema: {
                type: 'array',
                items: { type: 'string' }
            },
            verbosity: 'final'
        });

        if (!res.success || !res.data?.result) {
            throw new Error(`RTRVR mapSite fallback failed: ${res.error}`);
        }

        const links = res.data.result;
        return { success: true, links: Array.isArray(links) ? links : [] };
    }

    /**
     * Extract structured data from a URL using LLM
     * Falls back to RTRVR if Firecrawl is unavailable
     */
    public async extractData(url: string, schema: z.ZodSchema<any>) {
        if (this.isFirecrawlAvailable()) {
            try {
                // Updated to use the correct object format for JSON extraction
                // Reference: debug-json-obj.ts success
                console.log('[Discovery] Extracting with schema:', JSON.stringify(schema));
                const response = await this.app!.scrape(url, {
                    formats: [
                        {
                            type: "json",
                            schema: schema,
                            prompt: "Extract structured data from the page content matching the schema."
                        }
                    ]
                }) as any;
                console.log('[Discovery] Extract raw response:', JSON.stringify(response, null, 2));

                // If response has json property, it's successful (SDK behavior verify)
                if ((response as any).json || response.data?.json) {
                    logger.info('[Discovery] extractData succeeded via Firecrawl', { url });
                    return (response as any).json || response.data?.json;
                }

                if (!response.success) {
                    const errMsg = response.error || JSON.stringify(response);
                    throw new Error(`Discovery extraction failed: ${errMsg}`);
                }

                logger.info('[Discovery] extractData succeeded via Firecrawl', { url });
                // Return the parsed JSON from the response
                return response.json || response.data?.json || response.data;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl extractData failed, trying RTRVR fallback', { url, error: error.message });
                if (!this.isRTRVRAvailable()) {
                    console.error('[Discovery] Extract error:', error);
                    throw error;
                }
            }
        } else if (!this.isRTRVRAvailable()) {
            throw new Error('Discovery not configured (neither Firecrawl nor RTRVR available)');
        }

        // RTRVR fallback
        logger.info('[Discovery] Using RTRVR fallback for extractData', { url });
        const schemaStr = schema._def?.description || JSON.stringify(schema);
        const res = await extractFromUrl(
            url,
            `Extract structured data from the page matching this schema: ${schemaStr}. Return data as JSON object.`,
            {
                type: 'object',
                properties: { data: { type: 'object' } }
            }
        );

        if (!res.success || !res.data) {
            throw new Error(`RTRVR extractData fallback failed: ${res.error}`);
        }

        const extracted = res.data.result as any;
        return extracted?.data || extracted || {};
    }
}

export const discovery = DiscoveryService.getInstance();
