
import { z } from 'zod';
import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { sitemapManager } from '@/server/services/growth/sitemap-manager';
import { logger } from '@/lib/logger';

// --- Tool Definitions (Schema) ---

export const analyticsToolDefs = [
    {
        name: "getSearchConsoleStats",
        description: "Get Google Search Console performance data - rankings, clicks, impressions for the last 7 days.",
        schema: z.object({})
    },
    {
        name: "getGA4Traffic",
        description: "Get Google Analytics 4 traffic stats - sessions, users, engagement for the last 28 days.",
        schema: z.object({})
    },
    {
        name: "findSEOOpportunities",
        description: "Find low-competition keywords and markets with high potential.",
        schema: z.object({
            limit: z.number().optional().describe("Number of opportunities to return (default 10)")
        })
    },
    {
        name: "refreshSitemap",
        description: "Ping Google to refresh the sitemap index.",
        schema: z.object({})
    }
];

// --- Tool Implementations ---

export const analyticsToolImplementations = {
    getSearchConsoleStats: async () => {
        try {
            return await searchConsoleService.getSiteSummary(7);
        } catch (e: any) {
            logger.error(`[AnalyticsTools] GSC Error: ${e.message}`);
            return { error: `Failed to fetch GSC stats: ${e.message}` };
        }
    },
    getGA4Traffic: async () => {
        try {
            return await googleAnalyticsService.getTrafficReport('28daysAgo', 'today');
        } catch (e: any) {
            logger.error(`[AnalyticsTools] GA4 Error: ${e.message}`);
            return { error: `Failed to fetch GA4 stats: ${e.message}` };
        }
    },
    findSEOOpportunities: async ({ limit = 10 }: { limit?: number }) => {
        try {
            return await searchConsoleService.findLowCompetitionOpportunities(limit);
        } catch (e: any) {
            logger.error(`[AnalyticsTools] Opportunity Error: ${e.message}`);
            return { error: `Failed to find opportunities: ${e.message}` };
        }
    },
    refreshSitemap: async () => {
        try {
            const success = await sitemapManager.pingGoogle();
            return { success, message: success ? 'Pinged Google successfully' : 'Ping failed (check logs)' };
        } catch (e: any) {
             return { success: false, error: e.message };
        }
    }
};
