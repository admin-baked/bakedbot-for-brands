
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { logger } from '@/lib/logger';

async function verifyConnections() {
    console.log('🔍 Verifying Google Services Connectivity...\n');

    // 1. Verify Environment Variables
    console.log('1. Checking Environment Variables:');
    const gscUrl = process.env.SEARCH_CONSOLE_SITE_URL;
    const ga4Id = process.env.GA4_PROPERTY_ID;
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    console.log(`   - SEARCH_CONSOLE_SITE_URL: ${gscUrl ? '✅ Found (' + gscUrl + ')' : '❌ Missing'}`);
    console.log(`   - GA4_PROPERTY_ID: ${ga4Id ? '✅ Found (' + ga4Id + ')' : '❌ Missing'}`);
    console.log(`   - GOOGLE_APPLICATION_CREDENTIALS: ${creds ? '✅ Found (' + creds + ')' : '❌ Missing'}`);

    if (!creds) {
        console.warn('\n⚠️  GOOGLE_APPLICATION_CREDENTIALS is missing. Auth will fail unless running in an environment with default identity (e.g., GCE, Cloud Run).\n');
    }

    // 2. Verify Search Console
    console.log('\n2. Testing Search Console API:');
    try {
        const gscResult = await searchConsoleService.getSiteSummary(7);
        if (gscResult.clicks === 0 && gscResult.impressions === 0) {
             console.warn('   ⚠️  Result returned empty zeros - Check if site has data or if auth is siliently failing/limited.');
        } else {
             console.log(`   ✅ Success! Found ${gscResult.clicks} clicks and ${gscResult.impressions} impressions.`);
        }
    } catch (e: any) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    // 3. Verify Google Analytics
    console.log('\n3. Testing Google Analytics 4 API:');
    try {
        const ga4Result = await googleAnalyticsService.getTrafficReport('7daysAgo', 'today');
         if (ga4Result.error) {
             console.error(`   ❌ API Error: ${ga4Result.error}`);
         } else if (ga4Result.rows && ga4Result.rows.length > 0) {
            console.log(`   ✅ Success! Retrieved ${ga4Result.rows.length} rows of traffic data.`);
        } else {
            console.warn('   ⚠️  Result returned empty rows - Check if property has data.');
        }
    } catch (e: any) {
        console.error(`   ❌ Failed: ${e.message}`);
    }
}

verifyConnections().catch(console.error);
