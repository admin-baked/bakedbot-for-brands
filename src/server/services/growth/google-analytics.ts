import { google, analyticsdata_v1beta } from 'googleapis';
import { logger } from '@/lib/logger';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getGoogleAnalyticsToken } from '@/server/integrations/google-analytics/token-storage';
import { createServerClient } from '@/firebase/server-client';
import { buildAuthFromServiceKey } from './google-auth-helpers';

export type GoogleIntegrationMode = 'oauth' | 'service_account' | 'disconnected';

export interface GoogleAnalyticsConnectionStatus {
    connected: boolean;
    mode: GoogleIntegrationMode;
    propertyId: string | null;
    propertyConfigured: boolean;
}

export interface GoogleAnalyticsTrafficRow {
    source: string;
    path: string;
    users: number;
    sessions: number;
}

export interface GoogleAnalyticsTrafficReport {
    rows: GoogleAnalyticsTrafficRow[];
    authMode: GoogleIntegrationMode;
    error?: string;
}

// Resolution types — OAuth uses googleapis client; SA uses raw fetch with Bearer token
interface OAuthResolution {
    kind: 'oauth';
    oauth2Client: Awaited<ReturnType<typeof getOAuth2ClientAsync>>;
    propertyId: string;
}

interface ServiceAccountResolution {
    kind: 'service_account';
    token: string;
    propertyId: string;
}

type AnalyticsResolution = OAuthResolution | ServiceAccountResolution;

/**
 * Raw fetch for GA4 Data API.
 * googleapis library fails to attach tokens in Cloud Run even with JWT client.
 */
async function ga4RunReport(
    token: string,
    propertyId: string,
    body: Record<string, unknown>
): Promise<analyticsdata_v1beta.Schema$RunReportResponse> {
    const resp = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
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
    return resp.json() as Promise<analyticsdata_v1beta.Schema$RunReportResponse>;
}

export class GoogleAnalyticsService {
    private readonly scope = 'https://www.googleapis.com/auth/analytics.readonly';

    private async getTenantConfig(orgId?: string): Promise<{ propertyId: string | null }> {
        if (orgId) {
            try {
                const { firestore } = await createServerClient();
                const doc = await firestore.collection('tenants').doc(orgId).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data?.ga4PropertyId) {
                        return { propertyId: data.ga4PropertyId };
                    }
                }
            } catch (error) {
                logger.warn('[GA4] Failed to fetch tenant config', { error: error instanceof Error ? error.message : String(error) });
            }
        }
        return { propertyId: process.env.GA4_PROPERTY_ID || null };
    }

    private async resolveOauth(userId: string, orgId?: string): Promise<OAuthResolution | null> {
        const { propertyId } = await this.getTenantConfig(orgId);
        if (!propertyId) return null;
        const tokens = await getGoogleAnalyticsToken(userId);
        if (!tokens?.refresh_token) return null;
        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(tokens);
        return { kind: 'oauth', oauth2Client, propertyId };
    }

    private async resolveServiceAccount(orgId?: string): Promise<ServiceAccountResolution | null> {
        const { propertyId } = await this.getTenantConfig(orgId);
        if (!propertyId) return null;
        // Get Bearer token directly — googleapis library fails to attach tokens in Cloud Run
        const auth = buildAuthFromServiceKey(this.scope);
        const client = await auth.getClient();
        const tokenResp = await client.getAccessToken();
        if (!tokenResp.token) return null;
        return { kind: 'service_account', token: tokenResp.token, propertyId };
    }

    private async resolve(userId?: string, orgId?: string): Promise<AnalyticsResolution | null> {
        if (userId) {
            try {
                const r = await this.resolveOauth(userId, orgId);
                if (r) return r;
            } catch (error) {
                logger.warn('[GA4] OAuth resolution failed, falling back to service account', {
                    userId, error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        try {
            return await this.resolveServiceAccount(orgId);
        } catch (error) {
            logger.warn('[GA4] Service account resolution failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async getConnectionStatus(userId?: string, orgId?: string): Promise<GoogleAnalyticsConnectionStatus> {
        if (userId) {
            try {
                const r = await this.resolveOauth(userId, orgId);
                if (r) return { connected: true, mode: 'oauth', propertyId: r.propertyId, propertyConfigured: true };
            } catch (error) {
                logger.warn('[GA4] Failed to resolve OAuth status', {
                    userId, error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        try {
            const r = await this.resolveServiceAccount(orgId);
            if (r) return { connected: true, mode: 'service_account', propertyId: r.propertyId, propertyConfigured: true };
        } catch (error) {
            logger.warn('[GA4] Failed to resolve service-account status', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        const { propertyId } = await this.getTenantConfig(orgId);
        return { connected: false, mode: 'disconnected', propertyId: propertyId ?? null, propertyConfigured: Boolean(propertyId) };
    }

    async getTrafficReport(
        startDate: string = '7daysAgo',
        endDate: string = 'today',
        options?: { userId?: string; orgId?: string }
    ): Promise<GoogleAnalyticsTrafficReport> {
        const resolution = await this.resolve(options?.userId, options?.orgId);
        if (!resolution) {
            const { propertyId } = await this.getTenantConfig(options?.orgId);
            return {
                rows: [],
                authMode: 'disconnected',
                error: propertyId ? 'Google Analytics authentication is not configured' : 'GA4 property is not configured',
            };
        }

        const requestBody = {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionSource' }, { name: 'pagePath' }],
            metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        };

        try {
            let rawRows: analyticsdata_v1beta.Schema$Row[] = [];

            if (resolution.kind === 'service_account') {
                const data = await ga4RunReport(resolution.token, resolution.propertyId, requestBody);
                rawRows = data.rows || [];
            } else {
                const analytics = google.analyticsdata({ version: 'v1beta', auth: resolution.oauth2Client });
                const response = await analytics.properties.runReport({
                    property: `properties/${resolution.propertyId}`,
                    requestBody,
                });
                rawRows = response.data.rows || [];
            }

            const rows = rawRows.map((row) => ({
                source: row.dimensionValues?.[0]?.value || 'unknown',
                path: row.dimensionValues?.[1]?.value || '/',
                users: Number(row.metricValues?.[0]?.value || 0),
                sessions: Number(row.metricValues?.[1]?.value || 0),
            }));

            return { rows, authMode: resolution.kind === 'service_account' ? 'service_account' : 'oauth' };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('[GA4] Report failed', { authMode: resolution.kind, error: message });
            return { rows: [], authMode: resolution.kind === 'service_account' ? 'service_account' : 'oauth', error: message };
        }
    }

    async getSearchConsoleStats(): Promise<{ message: string }> {
        return { message: 'Use searchConsoleService for Search Console reporting.' };
    }
}

export const googleAnalyticsService = new GoogleAnalyticsService();
