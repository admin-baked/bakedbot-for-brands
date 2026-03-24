/**
 * Google Search Console Service
 *
 * Provides SEO performance data to Day Day, Pops, and the Super User dashboards.
 * Uses user OAuth when available and falls back to platform service-account auth.
 */

import { google, webmasters_v3 } from 'googleapis';
import { logger } from '@/lib/logger';
import { GoogleAuth } from 'google-auth-library';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getGoogleSearchConsoleToken } from '@/server/integrations/google-search-console/token-storage';
import { createServerClient } from '@/firebase/server-client';
import type { GoogleIntegrationMode } from './google-analytics';

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
    page: string;
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
    opportunity: 'high' | 'medium' | 'low';
    reason: string;
}

export interface SearchConsoleConnectionStatus {
    connected: boolean;
    mode: GoogleIntegrationMode;
    siteUrl: string | null;
    siteConfigured: boolean;
}

interface SearchConsoleResolution {
    webmasters: webmasters_v3.Webmasters;
    authMode: Exclude<GoogleIntegrationMode, 'disconnected'>;
    siteUrl: string;
}

type SearchConsoleAuth = webmasters_v3.Options['auth'];

export class SearchConsoleService {
    private readonly scope = 'https://www.googleapis.com/auth/webmasters.readonly';

    private async getTenantConfig(orgId?: string): Promise<{ siteUrl: string | null }> {
        if (orgId) {
            try {
                const { firestore } = await createServerClient();
                const doc = await firestore.collection('tenants').doc(orgId).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data?.searchConsoleSiteUrl) {
                        return { siteUrl: data.searchConsoleSiteUrl };
                    }
                }
            } catch (error) {
                logger.warn('[GSC] Failed to fetch tenant config', { error: error instanceof Error ? error.message : String(error) });
            }
        }
        return { siteUrl: process.env.SEARCH_CONSOLE_SITE_URL || null };
    }

    private async resolveOauthWebmasters(userId: string, orgId?: string): Promise<SearchConsoleResolution | null> {
        const { siteUrl } = await this.getTenantConfig(orgId);
        if (!siteUrl) {
            return null;
        }

        const tokens = await getGoogleSearchConsoleToken(userId);
        if (!tokens?.refresh_token) {
            return null;
        }

        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(tokens);

        return {
            webmasters: google.webmasters({ version: 'v3', auth: oauth2Client }),
            authMode: 'oauth',
            siteUrl: siteUrl,
        };
    }

    private async resolveServiceAccountWebmasters(orgId?: string): Promise<SearchConsoleResolution | null> {
        const { siteUrl } = await this.getTenantConfig(orgId);
        if (!siteUrl) {
            return null;
        }

        const auth = new GoogleAuth({
            scopes: [this.scope],
        });

        await auth.getClient();

        return {
            webmasters: google.webmasters({ version: 'v3', auth: auth as SearchConsoleAuth }),
            authMode: 'service_account',
            siteUrl: siteUrl,
        };
    }

    private async resolveWebmasters(userId?: string, orgId?: string): Promise<SearchConsoleResolution | null> {
        if (userId) {
            try {
                const oauthResolution = await this.resolveOauthWebmasters(userId, orgId);
                if (oauthResolution) {
                    return oauthResolution;
                }
            } catch (error) {
                logger.warn('[GSC] OAuth resolution failed, falling back to service account', {
                    userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        try {
            return await this.resolveServiceAccountWebmasters(orgId);
        } catch (error) {
            logger.warn('[GSC] Service-account resolution failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async getConnectionStatus(userId?: string, orgId?: string): Promise<SearchConsoleConnectionStatus> {
        if (userId) {
            try {
                const oauthResolution = await this.resolveOauthWebmasters(userId, orgId);
                if (oauthResolution) {
                    return {
                        connected: true,
                        mode: 'oauth',
                        siteUrl: oauthResolution.siteUrl,
                        siteConfigured: true,
                    };
                }
            } catch (error) {
                logger.warn('[GSC] Failed to resolve OAuth status', {
                    userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        try {
            const serviceAccountResolution = await this.resolveServiceAccountWebmasters(orgId);
            if (serviceAccountResolution) {
                return {
                    connected: true,
                    mode: 'service_account',
                    siteUrl: serviceAccountResolution.siteUrl,
                    siteConfigured: true,
                };
            }
        } catch (error) {
            logger.warn('[GSC] Failed to resolve service-account status', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        const { siteUrl } = await this.getTenantConfig(orgId);
        return {
            connected: false,
            mode: 'disconnected',
            siteUrl: siteUrl ?? null,
            siteConfigured: Boolean(siteUrl),
        };
    }

    private buildEmptyTopQueriesReport(startDate: string, endDate: string): TopQueriesReport {
        return {
            queries: [],
            totalClicks: 0,
            totalImpressions: 0,
            avgPosition: 0,
            dateRange: { start: startDate, end: endDate },
        };
    }

    private mapQueryRows(rows: webmasters_v3.Schema$ApiDataRow[] | undefined): SearchPerformanceData[] {
        return (rows || []).map((row) => ({
            query: row.keys?.[0] || '',
            page: row.keys?.[1] || '',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        }));
    }

    /**
     * Get top search queries for the site
     */
    async getTopQueries(
        startDate: string = this.getDateDaysAgo(28),
        endDate: string = this.getDateDaysAgo(1),
        limit: number = 50,
        options?: { userId?: string, orgId?: string }
    ): Promise<TopQueriesReport> {
        const resolution = await this.resolveWebmasters(options?.userId, options?.orgId);
        if (!resolution) {
            return this.buildEmptyTopQueriesReport(startDate, endDate);
        }

        try {
            const response = await resolution.webmasters.searchanalytics.query({
                siteUrl: resolution.siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: ['query', 'page'],
                    rowLimit: limit,
                    dimensionFilterGroups: [],
                },
            });

            const queries = this.mapQueryRows(response.data.rows);

            return {
                queries,
                totalClicks: queries.reduce((sum, query) => sum + query.clicks, 0),
                totalImpressions: queries.reduce((sum, query) => sum + query.impressions, 0),
                avgPosition: queries.length > 0
                    ? queries.reduce((sum, query) => sum + query.position, 0) / queries.length
                    : 0,
                dateRange: { start: startDate, end: endDate },
            };
        } catch (error) {
            logger.error('[GSC] Query failed', {
                authMode: resolution.authMode,
                error: error instanceof Error ? error.message : String(error),
            });
            return this.buildEmptyTopQueriesReport(startDate, endDate);
        }
    }

    /**
     * Find low-competition opportunities (high impressions, low clicks, position 5-20)
     */
    async findLowCompetitionOpportunities(
        limit: number = 20,
        options?: { userId?: string, orgId?: string }
    ): Promise<LowCompetitionOpportunity[]> {
        const report = await this.getTopQueries(this.getDateDaysAgo(28), this.getDateDaysAgo(1), 500, options);

        const opportunities: LowCompetitionOpportunity[] = report.queries
            .filter((query) => query.impressions >= 10 && query.position > 4 && query.position < 30)
            .map((query) => {
                let opportunity: 'high' | 'medium' | 'low' = 'low';
                let reason = '';

                if (query.impressions >= 100 && query.ctr < 0.03 && query.position <= 10) {
                    opportunity = 'high';
                    reason = 'High impressions with low CTR - improve title/description';
                } else if (query.impressions >= 50 && query.position > 10 && query.position <= 20) {
                    opportunity = 'medium';
                    reason = 'Close to page 1 - content optimization could boost rankings';
                } else {
                    reason = 'Some search visibility - monitor for growth';
                }

                return { ...query, opportunity, reason };
            })
            .sort((left, right) => {
                const opportunityOrder = { high: 0, medium: 1, low: 2 };
                if (opportunityOrder[left.opportunity] !== opportunityOrder[right.opportunity]) {
                    return opportunityOrder[left.opportunity] - opportunityOrder[right.opportunity];
                }
                return right.impressions - left.impressions;
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
        endDate: string = this.getDateDaysAgo(1),
        options?: { userId?: string, orgId?: string }
    ): Promise<Record<string, SearchPerformanceData[]>> {
        const resolution = await this.resolveWebmasters(options?.userId, options?.orgId);
        if (!resolution) {
            return {};
        }

        const results: Record<string, SearchPerformanceData[]> = {};

        for (const pagePath of pagePaths) {
            try {
                const response = await resolution.webmasters.searchanalytics.query({
                    siteUrl: resolution.siteUrl,
                    requestBody: {
                        startDate,
                        endDate,
                        dimensions: ['query'],
                        dimensionFilterGroups: [{
                            filters: [{
                                dimension: 'page',
                                operator: 'contains',
                                expression: pagePath,
                            }],
                        }],
                        rowLimit: 10,
                    },
                });

                results[pagePath] = (response.data.rows || []).map((row) => ({
                    query: row.keys?.[0] || '',
                    page: pagePath,
                    clicks: row.clicks || 0,
                    impressions: row.impressions || 0,
                    ctr: row.ctr || 0,
                    position: row.position || 0,
                }));
            } catch (error) {
                logger.error('[GSC] Page query failed', {
                    authMode: resolution.authMode,
                    pagePath,
                    error: error instanceof Error ? error.message : String(error),
                });
                results[pagePath] = [];
            }
        }

        return results;
    }

    /**
     * Get site-wide summary stats
     */
    async getSiteSummary(
        days: number = 7,
        options?: { userId?: string, orgId?: string }
    ): Promise<{
        clicks: number;
        impressions: number;
        ctr: number;
        avgPosition: number;
        dateRange: { start: string; end: string };
    }> {
        const startDate = this.getDateDaysAgo(days);
        const endDate = this.getDateDaysAgo(1);
        const resolution = await this.resolveWebmasters(options?.userId, options?.orgId);

        if (!resolution) {
            return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, dateRange: { start: startDate, end: endDate } };
        }

        try {
            const response = await resolution.webmasters.searchanalytics.query({
                siteUrl: resolution.siteUrl,
                requestBody: {
                    startDate,
                    endDate,
                    dimensions: [],
                    rowLimit: 1,
                },
            });

            const row = response.data.rows?.[0];
            return {
                clicks: row?.clicks || 0,
                impressions: row?.impressions || 0,
                ctr: row?.ctr || 0,
                avgPosition: row?.position || 0,
                dateRange: { start: startDate, end: endDate },
            };
        } catch (error) {
            logger.error('[GSC] Summary failed', {
                authMode: resolution.authMode,
                error: error instanceof Error ? error.message : String(error),
            });
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
