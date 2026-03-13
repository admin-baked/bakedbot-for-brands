import { google, analyticsdata_v1beta } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { logger } from '@/lib/logger';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { getGoogleAnalyticsToken } from '@/server/integrations/google-analytics/token-storage';

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

interface AnalyticsResolution {
    analytics: analyticsdata_v1beta.Analyticsdata;
    authMode: Exclude<GoogleIntegrationMode, 'disconnected'>;
    propertyId: string;
}

type AnalyticsAuth = analyticsdata_v1beta.Options['auth'];

export class GoogleAnalyticsService {
    private readonly propertyId = process.env.GA4_PROPERTY_ID;
    private readonly scope = 'https://www.googleapis.com/auth/analytics.readonly';

    private async resolveOauthAnalytics(userId: string): Promise<AnalyticsResolution | null> {
        if (!this.propertyId) {
            return null;
        }

        const tokens = await getGoogleAnalyticsToken(userId);
        if (!tokens?.refresh_token) {
            return null;
        }

        const oauth2Client = await getOAuth2ClientAsync();
        oauth2Client.setCredentials(tokens);

        return {
            analytics: google.analyticsdata({ version: 'v1beta', auth: oauth2Client }),
            authMode: 'oauth',
            propertyId: this.propertyId,
        };
    }

    private async resolveServiceAccountAnalytics(): Promise<AnalyticsResolution | null> {
        if (!this.propertyId) {
            return null;
        }

        const auth = new GoogleAuth({
            scopes: [this.scope],
        });

        await auth.getClient();

        return {
            analytics: google.analyticsdata({ version: 'v1beta', auth: auth as AnalyticsAuth }),
            authMode: 'service_account',
            propertyId: this.propertyId,
        };
    }

    private async resolveAnalytics(userId?: string): Promise<AnalyticsResolution | null> {
        if (userId) {
            try {
                const oauthResolution = await this.resolveOauthAnalytics(userId);
                if (oauthResolution) {
                    return oauthResolution;
                }
            } catch (error) {
                logger.warn('[GA4] OAuth resolution failed, falling back to service account', {
                    userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        try {
            return await this.resolveServiceAccountAnalytics();
        } catch (error) {
            logger.warn('[GA4] Service account resolution failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async getConnectionStatus(userId?: string): Promise<GoogleAnalyticsConnectionStatus> {
        if (userId) {
            try {
                const oauthResolution = await this.resolveOauthAnalytics(userId);
                if (oauthResolution) {
                    return {
                        connected: true,
                        mode: 'oauth',
                        propertyId: oauthResolution.propertyId,
                        propertyConfigured: true,
                    };
                }
            } catch (error) {
                logger.warn('[GA4] Failed to resolve OAuth status', {
                    userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        try {
            const serviceAccountResolution = await this.resolveServiceAccountAnalytics();
            if (serviceAccountResolution) {
                return {
                    connected: true,
                    mode: 'service_account',
                    propertyId: serviceAccountResolution.propertyId,
                    propertyConfigured: true,
                };
            }
        } catch (error) {
            logger.warn('[GA4] Failed to resolve service-account status', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        return {
            connected: false,
            mode: 'disconnected',
            propertyId: this.propertyId ?? null,
            propertyConfigured: Boolean(this.propertyId),
        };
    }

    async getTrafficReport(
        startDate: string = '7daysAgo',
        endDate: string = 'today',
        options?: { userId?: string }
    ): Promise<GoogleAnalyticsTrafficReport> {
        const resolution = await this.resolveAnalytics(options?.userId);
        if (!resolution) {
            return {
                rows: [],
                authMode: 'disconnected',
                error: this.propertyId ? 'Google Analytics authentication is not configured' : 'GA4 property is not configured',
            };
        }

        try {
            const response = await resolution.analytics.properties.runReport({
                property: `properties/${resolution.propertyId}`,
                requestBody: {
                    dateRanges: [{ startDate, endDate }],
                    dimensions: [{ name: 'sessionSource' }, { name: 'pagePath' }],
                    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
                },
            });

            const rows = (response.data.rows || []).map((row: analyticsdata_v1beta.Schema$Row) => ({
                source: row.dimensionValues?.[0]?.value || 'unknown',
                path: row.dimensionValues?.[1]?.value || '/',
                users: Number(row.metricValues?.[0]?.value || 0),
                sessions: Number(row.metricValues?.[1]?.value || 0),
            }));

            return {
                rows,
                authMode: resolution.authMode,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('[GA4] Report failed', {
                authMode: resolution.authMode,
                error: message,
            });
            return {
                rows: [],
                authMode: resolution.authMode,
                error: message,
            };
        }
    }

    async getSearchConsoleStats(): Promise<{ message: string }> {
        return { message: 'Use searchConsoleService for Search Console reporting.' };
    }
}

export const googleAnalyticsService = new GoogleAnalyticsService();
