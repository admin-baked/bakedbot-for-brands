
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';

/**
 * BakedBot Discovery Service (Singleton)
 * 
 * Capabilities:
 * - Discovery: Get markdown/HTML from a URL
 * - Search: Find pages matching a query
 * - Map: Crawl a site to find links
 * - Extract: LLM-based structured data extraction
 * 
 * Note: Uses FIRECRAWL_API_KEY from env (set via Firebase Secrets)
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
    }

    public static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    public isConfigured(): boolean {
        return !!this.app;
    }

    /**
     * Basic Discovery: Get content from a URL
     */
    public async discoverUrl(url: string, formats: ('markdown' | 'html' | 'rawHtml' | 'screenshot')[] = ['markdown']) {
        if (!this.app) throw new Error('Discovery not configured');

        try {
            const response = await this.app.scrape(url, {
                formats: formats
            }) as any;

            if (!response.success) {
                throw new Error(`Discovery failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
            console.error('[Discovery] Retrieval error:', error);
            throw error;
        }
    }

    /**
     * Advanced Discovery with Actions (Reference: Cloud-only feature)
     * useful for age gates, clicking buttons, etc.
     */
    public async discoverWithActions(url: string, actions: any[]) {
        if (!this.app) throw new Error('Discovery not configured');
        
        try {
            // @ts-ignore - Actions are supported in API but strictly typed in some SDK versions
            const response = await this.app.scrape(url, {
                formats: ['markdown'],
                actions: actions
            }) as any;
            
             if (!response.success) {
                throw new Error(`Discovery action failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
             console.error('[Discovery] Action retrieval error:', error);
             throw error;
        }
    }

    /**
     * Search the web (Discovery Search)
     */
    public async search(query: string) {
        if (!this.app) throw new Error('Discovery not configured');

        try {
            const response = await this.app.search(query) as any;
            console.log('[DiscoveryService] Search Raw Response:', JSON.stringify(response, null, 2));
            
            // Handle different SDK response shapes
            const data = response.data || response.web || (response.success ? response : null);

            if (!data && !response.success) {
                 const errMsg = response.error || JSON.stringify(response);
                 throw new Error(`Discovery search failed: ${errMsg}`);
            }

            return data || [];
        } catch (error: any) {
            console.error('[Discovery] Search error:', error);
            throw error;
        }
    }

    /**
     * Map a website (Discovery)
     */
    public async mapSite(url: string) {
        if (!this.app) throw new Error('Discovery not configured');

        try {
            // @ts-ignore - mapUrl exists in API but may not be in SDK types
            const response = await this.app.mapUrl(url) as any;
            
            if (!response.success) {
                 throw new Error(`Discovery map failed: ${response.error}`);
            }

            return response;
        } catch (error: any) {
            console.error('[Discovery] Map error:', error);
            throw error;
        }
    }

    /**
     * Extract structured data from a URL using LLM
     */
    public async extractData(url: string, schema: z.ZodSchema<any>) {
        if (!this.app) throw new Error('Discovery not configured');

        try {
            // Updated to use the correct object format for JSON extraction
            // Reference: debug-json-obj.ts success
            console.log('[Discovery] Extracting with schema:', JSON.stringify(schema));
            const response = await this.app.scrape(url, {
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
                return (response as any).json || response.data?.json;
            }

            if (!response.success) {
                 const errMsg = response.error || JSON.stringify(response);
                 throw new Error(`Discovery extraction failed: ${errMsg}`);
            }

            // Return the parsed JSON from the response
            return response.json || response.data?.json || response.data;
        } catch (error: any) {
            console.error('[Discovery] Extract error:', error);
            throw error; 
        }
    }
}

export const discovery = DiscoveryService.getInstance();
