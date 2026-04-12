/**
 * Google Search Console Service
 *
 * Provides SEO performance data to Day Day, Pops, and the Super User dashboards.
 * Uses user OAuth when available and falls back to platform service-account auth.
 *
 * Service account path uses raw fetch — googleapis library fails to attach
 * tokens in Cloud Run even with JWT client.
 */

import { google, webmasters_v3 } from 'googleapis';
import { logger } from '@/lib/logger';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getGoogleSearchConsoleToken } from '@/server/integrations/google-search-console/token-storage';
import { createServerClient } from '@/firebase/server-client';
import { buildAuthFromServiceKey } from './google-auth-helpers';
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

// Resolution types — OAuth uses googleapis client; SA uses raw fetch with Bearer token
interface OAuthResolution {
    kind: 'oauth';
    oauth2Client: Awaited<ReturnType<typeof getOAuth2ClientAsync>>;
    siteUrl: string;
}

interface ServiceAccountResolution {
    kind: 'service_account';
    token: string;
    siteUrl: string;
}

type Resolution = OAuthResolution | ServiceAccountResolution;

/**
 * Raw fetch for GSC Search Analytics API.
 * googleapis library fails to attach tokens in Cloud Run even with JWT client.
 */
async function gscQuery(
    token: string,
    siteUrl: string,
    body: Record<string, unknown>
): Promise<{ rows?: webmasters_v3.Schema$ApiDataRow[] }> {
    const encodedSite = encodeURIComponent(siteUrl);
    const resp = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    );
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message || resp.statusText);
    }
    return resp.json() as Promise<{ rows?: webmasters_v3.Schema$ApiDataRow[] }>;
}

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

    private async resolveOauth(userId: string, orgId?: string): Promise<OAuthResolution | null> {
        const { siteUrl } = await this.getTenantConfig(orgId);
        if (!siteUrl) return null;
        const tokens = await getGoogleSearchConsoleToken(userId);
        if (!tokens?.refresh_token) return null;
        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(tokens);
        return { kind: 'oauth', oauth2Client, siteUrl };
    }

    private async resolveServiceAccount(orgId?: string): Promise<ServiceAccountResolution | null> {
        const { siteUrl } = await this.getTenantConfig(orgId);
        if (!siteUrl) return null;
        // Get Bearer token directly — googleapis library fails to attach tokens in Cloud Run
        const auth = buildAuthFromServiceKey(this.scope);
        const client = await auth.getClient();
        const tokenResp = await client.getAccessToken();
        if (!tokenResp.token) return null;
        return { kind: 'service_account', token: tokenResp.token, siteUrl };
    }

    private async resolve(userId?: string, orgId?: string): Promise<Resolution | null> {
        if (userId) {
            try {
                const r = await this.resolveOauth(userId, orgId);
                if (r) return r;
            } catch (error) {
                logger.warn('[GSC] OAuth resolution failed, falling back to service account', {
                    userId, error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        try {
            return await this.resolveServiceAccount(orgId);
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
                const r = await this.resolveOauth(userId, orgId);
                if (r) return { connected: true, mode: 'oauth', siteUrl: r.siteUrl, siteConfigured: true };
            } catch (error) {
                logger.warn('[GSC] Failed to resolve OAuth status', {
                    userId, error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        try {
            const r = await this.resolveServiceAccount(orgId);
            if (r) return { connected: true, mode: 'service_account', siteUrl: r.siteUrl, siteConfigured: true };
        } catch (error) {
            logger.warn('[GSC] Failed to resolve service-account status', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        const { siteUrl } = await this.getTenantConfig(orgId);
        return { connected: false, mode: 'disconnected', siteUrl: siteUrl ?? null, siteConfigured: Boolean(siteUrl) };
    }

    private buildEmptyReport(startDate: string, endDate: string): TopQueriesReport {
        return { queries: [], totalClicks: 0, totalImpressions: 0, avgPosition: 0, dateRange: { start: startDate, end: endDate } };
    }

    private mapRows(rows: webmasters_v3.Schema$ApiDataRow[] | undefined, defaultPage = ''): SearchPerformanceData[] {
        return (rows || []).map((row) => ({
            query: row.keys?.[0] || '',
            page: row.keys?.[1] || defaultPage,
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        }));
    }

    private async runQuery(resolution: Resolution, body: Record<string, unknown>): Promise<webmasters_v3.Schema$ApiDataRow[]> {
        if (resolution.kind === 'service_account') {
            const data = await gscQuery(resolution.token, resolution.siteUrl, body);
            return data.rows || [];
        }
        // OAuth path — googleapis client works fine with user credentials
        const webmasters = google.webmasters({ version: 'v3', auth: resolution.oauth2Client });
        const response = await webmasters.searchanalytics.query({
            siteUrl: resolution.siteUrl,
            requestBody: body as webmasters_v3.Schema$SearchAnalyticsQueryRequest,
        });
        return response.data.rows || [];
    }

    async getTopQueries(
        startDate: string = this.getDateDaysAgo(28),
        endDate: string = this.getDateDaysAgo(1),
        limit: number = 50,
        options?: { userId?: string; orgId?: string }
    ): Promise<TopQueriesReport> {
        const resolution = await this.resolve(options?.userId, options?.orgId);
        if (!resolution) return this.buildEmptyReport(startDate, endDate);
        try {
            const rows = await this.runQuery(resolution, {
                startDate, endDate, dimensions: ['query', 'page'], rowLimit: limit, dimensionFilterGroups: [],
            });
            const queries = this.mapRows(rows);
            return {
                queries,
                totalClicks: queries.reduce((s, q) => s + q.clicks, 0),
                totalImpressions: queries.reduce((s, q) => s + q.impressions, 0),
                avgPosition: queries.length > 0 ? queries.reduce((s, q) => s + q.position, 0) / queries.length : 0,
                dateRange: { start: startDate, end: endDate },
            };
        } catch (error) {
            logger.error('[GSC] Query failed', { authMode: resolution.kind, error: error instanceof Error ? error.message : String(error) });
            return this.buildEmptyReport(startDate, endDate);
        }
    }

    async findLowCompetitionOpportunities(
        limit: number = 20,
        options?: { userId?: string; orgId?: string }
    ): Promise<LowCompetitionOpportunity[]> {
        const report = await this.getTopQueries(this.getDateDaysAgo(28), this.getDateDaysAgo(1), 500, options);
        return report.queries
            .filter((q) => q.impressions >= 10 && q.position > 4 && q.position < 30)
            .map((q) => {
                let opportunity: 'high' | 'medium' | 'low' = 'low';
                let reason = '';
                if (q.impressions >= 100 && q.ctr < 0.03 && q.position <= 10) {
                    opportunity = 'high';
                    reason = 'High impressions with low CTR - improve title/description';
                } else if (q.impressions >= 50 && q.position > 10 && q.position <= 20) {
                    opportunity = 'medium';
                    reason = 'Close to page 1 - content optimization could boost rankings';
                } else {
                    reason = 'Some search visibility - monitor for growth';
                }
                return { ...q, opportunity, reason };
            })
            .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.opportunity] !== order[b.opportunity]
                    ? order[a.opportunity] - order[b.opportunity]
                    : b.impressions - a.impressions;
            })
            .slice(0, limit);
    }

    async getPagePerformance(
        pagePaths: string[],
        startDate: string = this.getDateDaysAgo(7),
        endDate: string = this.getDateDaysAgo(1),
        options?: { userId?: string; orgId?: string }
    ): Promise<Record<string, SearchPerformanceData[]>> {
        const resolution = await this.resolve(options?.userId, options?.orgId);
        if (!resolution) return {};
        const results: Record<string, SearchPerformanceData[]> = {};
        for (const pagePath of pagePaths) {
            try {
                const rows = await this.runQuery(resolution, {
                    startDate, endDate, dimensions: ['query'],
                    dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: pagePath }] }],
                    rowLimit: 10,
                });
                results[pagePath] = this.mapRows(rows, pagePath);
            } catch (error) {
                logger.error('[GSC] Page query failed', { authMode: resolution.kind, pagePath, error: error instanceof Error ? error.message : String(error) });
                results[pagePath] = [];
            }
        }
        return results;
    }

    async getSiteSummary(
        days: number = 7,
        options?: { userId?: string; orgId?: string }
    ): Promise<{ clicks: number; impressions: number; ctr: number; avgPosition: number; dateRange: { start: string; end: string } }> {
        const startDate = this.getDateDaysAgo(days);
        const endDate = this.getDateDaysAgo(1);
        const resolution = await this.resolve(options?.userId, options?.orgId);
        if (!resolution) return { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, dateRange: { start: startDate, end: endDate } };
        try {
            const rows = await this.runQuery(resolution, { startDate, endDate, dimensions: [], rowLimit: 1 });
            const row = rows[0];
            return {
                clicks: row?.clicks || 0,
                impressions: row?.impressions || 0,
                ctr: row?.ctr || 0,
                avgPosition: row?.position || 0,
                dateRange: { start: startDate, end: endDate },
            };
        } catch (error) {
            logger.error('[GSC] Summary failed', { authMode: resolution.kind, error: error instanceof Error ? error.message : String(error) });
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
