
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { getRTRVRClient } from './rtrvr/client';
import { executeAgentTask, extractFromUrl } from './rtrvr/agent';
import type { AgentResult } from './rtrvr/agent';

/**
 * BakedBot Discovery Service (Singleton)
 *
 * Fallback chain for discoverUrl():
 *   1. Firecrawl  — best quality, JS rendering, structured JSON (paid, credits-based)
 *   2. Jina AI    — free (20 RPM no key / 100 RPM with JINA_API_KEY), clean markdown + metadata
 *   3. RTRVR      — browser automation agent (RTRVR_API_KEY required)
 *
 * Capabilities:
 * - Discovery: Get markdown/HTML from a URL
 * - Search: Find pages matching a query (Firecrawl → RTRVR fallback)
 * - Map: Crawl a site to find links (Firecrawl → RTRVR fallback)
 * - Extract: LLM-based structured data extraction (Firecrawl → RTRVR fallback)
 */
export class DiscoveryService {
    private app: FirecrawlApp | null = null;
    private static instance: DiscoveryService;

    private constructor() {
        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        const rtrvrKey = process.env.RTRVR_API_KEY;
        const jinaKey = process.env.JINA_API_KEY;

        if (firecrawlKey) {
            this.app = new FirecrawlApp({ apiKey: firecrawlKey });
        }

        logger.info('[Discovery] Service initialized', {
            firecrawlAvailable: !!this.app,
            jinaAvailable: true, // always available; key optional (100 RPM with key, 20 without)
            jinaKeyConfigured: !!jinaKey,
            rtrvrAvailable: this.isRTRVRAvailable(),
            rtrvrKeyLength: rtrvrKey?.length || 0
        });
    }

    public static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    public isConfigured(): boolean {
        return true; // Jina AI is always available as fallback
    }

    private isFirecrawlAvailable(): boolean {
        return !!this.app;
    }

    private isRTRVRAvailable(): boolean {
        return getRTRVRClient().isAvailable();
    }

    /**
     * Jina AI Reader fallback
     * Free tier: 20 RPM (no key) or 100 RPM (JINA_API_KEY set)
     * Returns title + description + clean markdown — no API key required.
     */
    private async discoverViaJina(url: string): Promise<{ success: true; markdown: string; metadata: { title?: string; description?: string } }> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };
        const jinaKey = process.env.JINA_API_KEY;
        if (jinaKey) {
            headers['Authorization'] = `Bearer ${jinaKey}`;
        }

        const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
            headers,
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
            throw new Error(`Jina AI returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json() as any;
        if (data.code !== 200 || !data.data) {
            throw new Error(`Jina AI error: ${data.status || JSON.stringify(data)}`);
        }

        logger.info('[Discovery] Jina AI discoverUrl succeeded', {
            url,
            title: data.data.title,
            contentChars: (data.data.content || '').length,
            tokens: data.data.usage?.tokens,
        });

        return {
            success: true,
            markdown: data.data.content || '',
            metadata: {
                title: data.data.title || undefined,
                description: data.data.description || undefined,
            },
        };
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
     *
     * Priority order:
     *   1. Jina AI  — always-on, free, fast, clean markdown (primary)
     *   2. RTRVR    — browser automation for JS-heavy / age-gated pages
     *   3. Firecrawl — premium JS rendering; last resort (credits-based)
     */
    public async discoverUrl(url: string, formats: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[] = ['markdown']) {
        // ── 1. Jina AI (primary) ─────────────────────────────────────────────
        try {
            logger.info('[Discovery] Using Jina AI for discoverUrl', { url });
            return await this.discoverViaJina(url);
        } catch (jinaError: any) {
            logger.warn('[Discovery] Jina AI failed, trying RTRVR', { url, error: jinaError.message });
        }

        // ── 2. RTRVR (browser automation fallback) ────────────────────────────
        if (this.isRTRVRAvailable()) {
            try {
                logger.info('[Discovery] Using RTRVR fallback for discoverUrl', { url });
                const res = await extractFromUrl(
                    url,
                    'Extract the full page content as clean readable markdown text. Also extract: the page title (from <title> tag or og:title), and a description (prefer meta description, fall back to og:description, then the first meaningful paragraph from the page body).',
                    {
                        type: 'object',
                        properties: {
                            markdown:    { type: 'string', description: 'Full page content as markdown' },
                            title:       { type: 'string', description: 'Page <title> or og:title' },
                            description: { type: 'string', description: 'Meta description, og:description, or first paragraph' },
                        }
                    }
                );
                if (res.success) {
                    const result = res.data?.result as any;
                    const markdown = typeof result?.markdown === 'string'
                        ? result.markdown
                        : this.extractRTRVRContent(res.data);
                    const title       = typeof result?.title       === 'string' ? result.title       : undefined;
                    const description = typeof result?.description === 'string' ? result.description : undefined;
                    return { success: true, markdown, metadata: { title, description } };
                }
                logger.warn('[Discovery] RTRVR failed, trying Firecrawl', { url, error: res.error });
            } catch (rtrvrError: any) {
                logger.warn('[Discovery] RTRVR threw, trying Firecrawl', { url, error: rtrvrError.message });
            }
        }

        // ── 3. Firecrawl (last resort — JS rendering, credits-based) ──────────
        if (this.isFirecrawlAvailable()) {
            try {
                const response = await this.app!.scrape(url, { formats }) as any;
                if (!response.success) throw new Error(`Firecrawl failed: ${response.error}`);
                logger.info('[Discovery] discoverUrl succeeded via Firecrawl', { url });
                return response;
            } catch (error: any) {
                logger.warn('[Discovery] Firecrawl failed', { url, error: error.message });
            }
        }

        throw new Error('discoverUrl failed: Jina AI, RTRVR, and Firecrawl all unavailable or errored');
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
