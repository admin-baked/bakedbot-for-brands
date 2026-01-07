
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { logger } from '@/lib/logger';

export class GoogleAnalyticsService {
    private client: BetaAnalyticsDataClient | null = null;
    private propertyId: string | undefined;

    constructor() {
        // Authenticates using GOOGLE_APPLICATION_CREDENTIALS env var automatically
        // OR checks for explicit key handling if implemented.
        try {
            this.client = new BetaAnalyticsDataClient();
            this.propertyId = process.env.GA4_PROPERTY_ID;
            
            if (!this.propertyId) {
                logger.warn('[GA4] Missing GA4_PROPERTY_ID');
            }
        } catch (e) {
            logger.error(`[GA4] Client init failed: ${e}`);
        }
    }

    async getTrafficReport(startDate: string = '7daysAgo', endDate: string = 'today'): Promise<any> {
        if (!this.client || !this.propertyId) {
             return { error: 'GA4 not configured' };
        }

        try {
            const [response] = await this.client.runReport({
                property: `properties/${this.propertyId}`,
                dateRanges: [
                    { startDate, endDate }
                ],
                dimensions: [
                    { name: 'sessionSource' },
                    { name: 'pagePath' }
                ],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' }
                ]
            });

            return {
                rows: response.rows?.map(row => ({
                    source: row.dimensionValues?.[0]?.value,
                    path: row.dimensionValues?.[1]?.value,
                    users: row.metricValues?.[0]?.value,
                    sessions: row.metricValues?.[1]?.value
                })) || []
            };

        } catch (e: any) {
            logger.error(`[GA4] Report failed: ${e.message}`);
            return { error: e.message };
        }
    }

    // Placeholder for GSC - Requires separated 'googleapis' package usually
    async getSearchConsoleStats(): Promise<any> {
        // Implementing full GSC requires OAUTH or robust Service Account delegation.
        // For this step, we'll mark as todo or basic stub if key allows.
        return { message: 'GSC requires separate googleapis setup. Focus on GA4 first.' };
    }
}

export const googleAnalyticsService = new GoogleAnalyticsService();
