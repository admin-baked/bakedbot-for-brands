// src/server/services/growth/search-console.ts
/**
 * Google Search Console Service
 * 
 * Provides SEO performance data to Day Day for optimization decisions.
 * Uses service account authentication via GOOGLE_APPLICATION_CREDENTIALS.
 */

import { google } from 'googleapis';
import { logger } from '@/lib/logger';
import { GoogleAuth } from 'google-auth-library';

export interface SearchPerformanceData {
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export interface TopQueriesReport {
    queries: SearchPerformanceData[];
    totalClicks: number;
    totalImpressions: number;
    avgPosition: number;
    dateRange: { start: string; end: string };
}

export interface LowCompetitionOpportunity {
    query: string;
    impressions: number;
    clicks: number;
    position: number;
    opportunity: 'high' | 'medium' | 'low';
    reason: string;
}

export class SearchConsoleService {
    private webmasters: any = null;
    private siteUrl: string | undefined;

    constructor() {
        try {
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
            });
            
            this.webmasters = google.webmasters({ version: 'v3', auth: auth as any });
            this.siteUrl = process.env.SEARCH_CONSOLE_SITE_URL; // e.g., 'https://bakedbot.ai'
            
            if (!this.siteUrl) {
                logger.warn('[GSC] Missing SEARCH_CONSOLE_SITE_URL env var');
            }
        } catch (e: any) {
            logger.error(`[GSC] Init failed: ${e.message}`);
        }
    }

    /**
     * Get top search queries for the site
     */
    async getTopQueries(
        startDate: string = this.getDateDaysAgo(28),
        endDate: string = this.getDateDaysAgo(1),
        limit: number = 50
    ): Promise<TopQueriesReport> {
        if (!this.webmasters || !this.siteUrl) {
            return {
                queries: [],
                totalClicks: 0,
                totalImpressions: 0,
                avgPosition: 0,
                dateRange: { start: startDate, end: endDate }
            };
        }

        try {
            const response = await this.webmasters.searchanalytics.query({
                siteUrl: this.siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['query', 'page'],
                    rowLimit: limit,
                    dimensionFilterGroups: []
                }
            });

            const rows = response.data.rows || [];
            const queries: SearchPerformanceData[] = rows.map((row: any) => ({
                query: row.keys[0],
                page: row.keys[1],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position
            }));

            return {
                queries,
                totalClicks: queries.reduce((sum, q) => sum + q.clicks, 0),
                totalImpressions: queries.reduce((sum, q) => sum + q.impressions, 0),
                avgPosition: queries.length > 0 
                    ? queries.reduce((sum, q) => sum + q.position, 0) / queries.length 
                    : 0,
                dateRange: { start: startDate, end: endDate }
            };

        } catch (e: any) {
            logger.error(`[GSC] Query failed: ${e.message}`);
            return {
                queries: [],
                totalClicks: 0,
                totalImpressions: 0,
                avgPosition: 0,
                dateRange: { start: startDate, end: endDate }
            };
        }
    }

    /**
     * Find low-competition opportunities (high impressions, low clicks, position 5-20)
     * These are keywords where we're showing but not ranking well - easy wins!
     */
    async findLowCompetitionOpportunities(
        limit: number = 20
    ): Promise<LowCompetitionOpportunity[]> {
        const report = await this.getTopQueries(this.getDateDaysAgo(28), this.getDateDaysAgo(1), 500);
        
        const opportunities: LowCompetitionOpportunity[] = report.queries
            .filter(q => q.impressions >= 10 && q.position > 4 && q.position < 30)
            .map(q => {
                let opportunity: 'high' | 'medium' | 'low' = 'low';
                let reason = '';
                
                // High opportunity: lots of impressions but low CTR, position 5-10
                if (q.impressions >= 100 && q.ctr < 0.03 && q.position <= 10) {
                    opportunity = 'high';
                    reason = 'High impressions with low CTR - improve title/description';
                }
                // Medium: decent impressions, position 10-20 (one optimization away from page 1)
                else if (q.impressions >= 50 && q.position > 10 && q.position <= 20) {
                    opportunity = 'medium';
                    reason = 'Close to page 1 - content optimization could boost rankings';
                }
                // Low: some potential but lower priority
                else {
                    reason = 'Some search visibility - monitor for growth';
                }
                
                return { ...q, opportunity, reason };
            })
            .sort((a, b) => {
                const opOrder = { high: 0, medium: 1, low: 2 };
                if (opOrder[a.opportunity] !== opOrder[b.opportunity]) {
                    return opOrder[a.opportunity] - opOrder[b.opportunity];
                }
                return b.impressions - a.impressions;
            })
            .slice(0, limit);
        
        return opportunities;
    }

    /**
     * Get performance for specific pages (like our SEO pages)
     */
    async getPagePerformance(
        pagePaths: string[],
        startDate: string = this.getDateDaysAgo(7),
        endDate: string = this.getDateDaysAgo(1)
    ): Promise<Record<string, SearchPerformanceData[]>> {
        if (!this.webmasters || !this.siteUrl) {
            return {};
        }

        const results: Record<string, SearchPerformanceData[]> = {};

        for (const pagePath of pagePaths) {
            try {
                const response = await this.webmasters.searchanalytics.query({
                    siteUrl: this.siteUrl,
                    requestBody: {
                        startDate,
                        endDate,
                        dimensions: ['query'],
                        dimensionFilterGroups: [{
                            filters: [{
                                dimension: 'page',
                                operator: 'contains',
                                expression: pagePath
                            }]
                        }],
                        rowLimit: 10
                    }
                });

                results[pagePath] = (response.data.rows || []).map((row: any) => ({
                    query: row.keys[0],
                    page: pagePath,
                    clicks: row.clicks,
                    impressions: row.impressions,
                    ctr: row.ctr,
                    position: row.position
                }));

            } catch (e: any) {
                logger.error(`[GSC] Page query failed for ${pagePath}: ${e.message}`);
                results[pagePath] = [];
            }
        }

        return results;
    }

    /**
     * Get site-wide summary stats
     */
    async getSiteSummary(days: number = 7): Promise<{
        clicks: number;
        impressions: number;
        ctr: number;
        avgPosition: number;
        dateRange: { start: string; end: string };
    }> {
        const startDate = this.getDateDaysAgo(days);
        const endDate = this.getDateDaysAgo(1);

        if (!this.webmasters || !this.siteUrl) {
            return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, dateRange: { start: startDate, end: endDate } };
        }

        try {
            const response = await this.webmasters.searchanalytics.query({
                siteUrl: this.siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: [], // No dimensions = site-wide totals
                    rowLimit: 1
                }
            });

            const row = response.data.rows?.[0];
            return {
                clicks: row?.clicks || 0,
                impressions: row?.impressions || 0,
                ctr: row?.ctr || 0,
                avgPosition: row?.position || 0,
                dateRange: { start: startDate, end: endDate }
            };

        } catch (e: any) {
            logger.error(`[GSC] Summary failed: ${e.message}`);
            return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, dateRange: { start: startDate, end: endDate } };
        }
    }

    private getDateDaysAgo(days: number): string {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }
}

export const searchConsoleService = new SearchConsoleService();
