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
class FirecrawlService {
    private app: FirecrawlApp | null = null;
    private static instance: FirecrawlService;

    private constructor() {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (apiKey) {
            this.app = new FirecrawlApp({ apiKey });
        } else {
            console.warn('[Firecrawl] API Key not found. Service will be disabled.');
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
            const response = await this.app.scrapeUrl(url, {
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
        
        // Note: The SDK might not expose actions directly in 'scrapeUrl' depending on version,
        // but the API supports it. Passing in the options object.
        try {
             // @ts-ignore - Actions are supported in API but strictly typed in some SDK versions
            const response = await this.app.scrapeUrl(url, {
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
            
            if (!response.success) {
                 throw new Error(`Firecrawl search failed: ${response.error}`);
            }

            return response;
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
}

export const firecrawl = FirecrawlService.getInstance();
