
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { sitemapManager } from '@/server/services/growth/sitemap-manager';
import { logger } from '@/lib/logger';

async function pingSitemap() {
    console.log('🌍 Pinging Google Sitemap...');
    try {
        const result = await sitemapManager.pingGoogle();
        if (result) {
            console.log('✅ Sitemap Ping Successful!');
        } else {
            console.log('❌ Sitemap Ping Failed (Check logs/env).');
        }
    } catch (error: any) {
        console.error('❌ Error pinging sitemap:', error.message);
    }
}

pingSitemap().catch(console.error);
