/**
 * Diagnostic endpoint — tests GSC + GA4 auth and returns detailed errors
 * DELETE THIS FILE after debugging is complete
 */
export async function diagnoseAnalyticsAuth(): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        env: {
            GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID ? `set (${process.env.GA4_PROPERTY_ID})` : 'MISSING',
            SEARCH_CONSOLE_SITE_URL: process.env.SEARCH_CONSOLE_SITE_URL || 'MISSING',
            FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? 'set (length: ' + process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length + ')' : 'MISSING',
        },
    };

    // Test Firebase SA key parsing
    try {
        const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (keyJson) {
            const parsed = JSON.parse(keyJson);
            results.serviceAccount = {
                client_email: parsed.client_email,
                project_id: parsed.project_id,
                type: parsed.type,
            };
        }
    } catch (e) {
        results.keyParseError = e instanceof Error ? e.message : String(e);
    }

    // Test GA4
    try {
        const { google } = await import('googleapis');
        const { GoogleAuth } = await import('google-auth-library');
        const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const propertyId = process.env.GA4_PROPERTY_ID;

        if (!keyJson) throw new Error('No FIREBASE_SERVICE_ACCOUNT_KEY');
        if (!propertyId) throw new Error('No GA4_PROPERTY_ID');

        const auth = new GoogleAuth({
            credentials: JSON.parse(keyJson),
            scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });
        const client = await auth.getClient();
        results.ga4Auth = 'client obtained';

        const analytics = google.analyticsdata({ version: 'v1beta', auth: auth as Parameters<typeof google.analyticsdata>[0]['auth'] });
        const response = await analytics.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
            },
        });
        results.ga4 = {
            connected: true,
            rowCount: response.data.rowCount || 0,
            users: response.data.rows?.[0]?.metricValues?.[0]?.value || '0',
        };
    } catch (e) {
        results.ga4 = { connected: false, error: e instanceof Error ? e.message : String(e) };
    }

    // Test GSC
    try {
        const { google } = await import('googleapis');
        const { GoogleAuth } = await import('google-auth-library');
        const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;

        if (!keyJson) throw new Error('No FIREBASE_SERVICE_ACCOUNT_KEY');
        if (!siteUrl) throw new Error('No SEARCH_CONSOLE_SITE_URL');

        const auth = new GoogleAuth({
            credentials: JSON.parse(keyJson),
            scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });
        await auth.getClient();

        const webmasters = google.webmasters({ version: 'v3', auth: auth as Parameters<typeof google.webmasters>[0]['auth'] });

        // Try listing sites first
        const sites = await webmasters.sites.list();
        results.gscSites = sites.data.siteEntry?.map(s => s.siteUrl) || [];

        // Try querying
        const qr = await webmasters.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
                endDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                dimensions: [],
                rowLimit: 1,
            },
        });
        results.gsc = {
            connected: true,
            clicks: qr.data.rows?.[0]?.clicks || 0,
            impressions: qr.data.rows?.[0]?.impressions || 0,
        };
    } catch (e) {
        results.gsc = { connected: false, error: e instanceof Error ? e.message : String(e) };
    }

    return results;
}
