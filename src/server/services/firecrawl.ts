
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';

/**
 * Firecrawl Service (Singleton)
 * 
 * Capabilities:
 * - Scrape: Get markdown/HTML from a URL
 * - Search: Find pages matching a query
 * - Map: Crawl a site to find links
 * - Extract: LLM-based structured data extraction
 * 
 * Note: Uses FIRECRAWL_API_KEY from env (set via Firebase Secrets)
 */
export class FirecrawlService {
    private app: FirecrawlApp | null = null;
    private static instance: FirecrawlService;

    private constructor() {
        // DEBUG: Logging to see if env is loaded
        const apiKey = process.env.FIRECRAWL_API_KEY;
        console.log('[FirecrawlService] Initializing...');
        console.log('[FirecrawlService] Env Key Exists:', !!apiKey);
        if (apiKey) console.log('[FirecrawlService] Key Length:', apiKey.length);
        
        if (apiKey) {
            this.app = new FirecrawlApp({ apiKey });
            console.log('[FirecrawlService] App Initialized Successfully');
        } else {
            console.warn('[Firecrawl] API Key not found. Service will be disabled.');
            console.warn('[Firecrawl] Checked process.env.FIRECRAWL_API_KEY');
        }
    }

    public static getInstance(): FirecrawlService {
        if (!FirecrawlService.instance) {
            FirecrawlService.instance = new FirecrawlService();
        }
        return FirecrawlService.instance;
    }

    public isConfigured(): boolean {
        return !!this.app;
    }

    /**
     * Basic Scrape: Get content from a URL
     */
    public async scrapeUrl(url: string, formats: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[] = ['markdown']) {
        if (!this.app) throw new Error('Firecrawl not configured');

        try {
            const response = await this.app.scrape(url, {
                formats: formats
            });

            if (!response.success) {
                throw new Error(`Firecrawl scrape failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
            console.error('[Firecrawl] Scrape error:', error);
            throw error;
        }
    }

    /**
     * Advanced Scrape with Actions (Reference: Cloud-only feature)
     * useful for age gates, clicking buttons, etc.
     */
    public async scrapeWithActions(url: string, actions: any[]) {
        if (!this.app) throw new Error('Firecrawl not configured');
        
        try {
            // @ts-ignore - Actions are supported in API but strictly typed in some SDK versions
            const response = await this.app.scrape(url, {
                formats: ['markdown'],
                actions: actions
            });
            
             if (!response.success) {
                throw new Error(`Firecrawl action scrape failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
             console.error('[Firecrawl] Action scrape error:', error);
             throw error;
        }
    }

    /**
     * Search the web (Firecrawl Search)
     */
    public async search(query: string) {
        if (!this.app) throw new Error('Firecrawl not configured');

        try {
            const response = await this.app.search(query);
            console.log('[FirecrawlService] Search Raw Response:', JSON.stringify(response, null, 2));
            
            // Handle different SDK response shapes
            const data = response.data || response.web || (response.success ? response : null);

            if (!data && !response.success) {
                 const errMsg = response.error || JSON.stringify(response);
                 throw new Error(`Firecrawl search failed: ${errMsg}`);
            }

            return data || [];
        } catch (error: any) {
            console.error('[Firecrawl] Search error:', error);
            throw error;
        }
    }

    /**
     * Map a website (Discovery)
     */
    public async mapSite(url: string) {
        if (!this.app) throw new Error('Firecrawl not configured');

        try {
            const response = await this.app.mapUrl(url);
            
            if (!response.success) {
                 throw new Error(`Firecrawl map failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
            console.error('[Firecrawl] Map error:', error);
            throw error;
        }
    }

    /**
     * Extract structured data from a URL using LLM
     */
    public async extractData(url: string, schema: z.ZodSchema<any>) {
        if (!this.app) throw new Error('Firecrawl not configured');

        try {
            // Updated to use JSON Mode as 'extract' is deprecated/unrecognized
            const response = await this.app.scrape(url, {
                formats: ['json'],
                jsonOptions: {
                    schema: schema
                }
            });

            if (!response.success) {
                 const errMsg = response.error || JSON.stringify(response);
                 throw new Error(`Firecrawl extraction failed: ${errMsg}`);
            }

            // Return the parsed JSON from the response
            return response.json || response.data?.json || response.data;
        } catch (error: any) {
            console.error('[Firecrawl] Extract error:', error);
            throw error; 
        }
    }
}

export const firecrawl = FirecrawlService.getInstance();
