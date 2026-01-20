
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

export class SitemapManager {
    private baseUrl: string;
    private searchConsoleUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
        // GSC requires the exact property URL as registered
        this.searchConsoleUrl = process.env.SEARCH_CONSOLE_SITE_URL || 'https://bakedbot.ai';
    }

    /**
     * Submits the sitemap to Google Search Console via API (Authenticated)
     */
    async pingGoogle(sitemapIndexUrl: string = `${this.baseUrl}/sitemap.xml`): Promise<boolean> {
        try {
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/webmasters'], // Write access needed
            });
            
            const webmasters = google.webmasters({ version: 'v3', auth: auth as any });
            
            logger.info(`[Sitemap] Submitting ${sitemapIndexUrl} to GSC for ${this.searchConsoleUrl}...`);

            await webmasters.sitemaps.submit({
                siteUrl: this.searchConsoleUrl,
                feedpath: sitemapIndexUrl
            });

            logger.info(`[Sitemap] Successfully submitted sitemap to GSC.`);
            return true;
        } catch (e: any) {
            logger.error(`[Sitemap] GSC Submit Error: ${e.message}`);
            return false;
        }
    }

    /**
     * Generates a dynamic notification that a new page exists (internal log)
     * Real sitemap generation happens at /sitemap.xml route (dynamic)
     */
    async registerNewPage(url: string, priority: number = 0.8): Promise<void> {
        // Logic to track "pending submission" pages if we want to batch ping
        // For now, efficient dynamic sitemaps (Next.js) handle reading from DB
        logger.info(`[Sitemap] Page registered for indexing: ${url} (p=${priority})`);
        
        // Optionally trigger instant ping for high priority
        if (priority >= 0.9) {
            await this.pingGoogle();
        }
    }
}

export const sitemapManager = new SitemapManager();
