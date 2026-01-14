// src/server/jobs/dayday-daily-discovery.ts
/**
 * Day Day Daily Discovery Job
 * 
 * Runs daily at 5am to:
 * 1. Research and find 5-10 low-competition markets
 * 2. Create Location, Dispensary, and Brand pages
 * 3. Generate unique SEO content via AI
 * 4. Auto-publish pages (review happens after)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { ai } from '@/ai/genkit';
import { gemini25Flash } from '@genkit-ai/vertexai';
import { runChicagoPilotJob } from './seo-generator';
import { runBrandPilotJob } from './brand-discovery-job';
import { optimizePageContent } from '@/server/actions/dayday-seo-content';
import { PageGeneratorService } from '@/server/services/page-generator';
import { FieldValue } from 'firebase-admin/firestore';

// Low competition markets to target (expandable list)
const TARGET_MARKETS = [
    // Illinois
    { city: 'Naperville', state: 'IL', zips: ['60540', '60563', '60564'] },
    { city: 'Aurora', state: 'IL', zips: ['60502', '60503', '60504'] },
    { city: 'Evanston', state: 'IL', zips: ['60201', '60202'] },
    { city: 'Oak Park', state: 'IL', zips: ['60301', '60302'] },
    // Michigan
    { city: 'Ann Arbor', state: 'MI', zips: ['48104', '48105', '48108'] },
    { city: 'Grand Rapids', state: 'MI', zips: ['49503', '49504', '49505'] },
    { city: 'Lansing', state: 'MI', zips: ['48912', '48933', '48915'] },
    // Colorado
    { city: 'Boulder', state: 'CO', zips: ['80301', '80302', '80303'] },
    { city: 'Aurora', state: 'CO', zips: ['80010', '80011', '80012'] },
    // California
    { city: 'Oakland', state: 'CA', zips: ['94601', '94602', '94607'] },
    { city: 'Berkeley', state: 'CA', zips: ['94702', '94703', '94704'] },
    { city: 'Long Beach', state: 'CA', zips: ['90802', '90803', '90804'] },
    // New York/New Jersey
    { city: 'Hoboken', state: 'NJ', zips: ['07030'] },
    { city: 'Jersey City', state: 'NJ', zips: ['07302', '07306', '07310'] },
];

interface DailyDiscoveryResult {
    marketsProcessed: number;
    pagesCreated: {
        location: number;
        dispensary: number;
        brand: number;
    };
    pagesOptimized: number;
    lowCompetitionMarkets: string[];
    errors: string[];
}

/**
 * Run Day Day's daily discovery to find low-competition markets
 */
export async function runDayDayDailyDiscovery(
    marketCount: number = 5
): Promise<DailyDiscoveryResult> {
    const firestore = getAdminFirestore();
    const pageGen = new PageGeneratorService();
    
    const result: DailyDiscoveryResult = {
        marketsProcessed: 0,
        pagesCreated: { location: 0, dispensary: 0, brand: 0 },
        pagesOptimized: 0,
        lowCompetitionMarkets: [],
        errors: []
    };
    
    console.log(`[DayDay] Starting daily discovery for ${marketCount} markets...`);
    
    // 1. Find markets we haven't processed yet
    const processedMarketsSnap = await firestore
        .collection('dayday_discovery_log')
        .orderBy('processedAt', 'desc')
        .limit(100)
        .get();
    
    const processedCities = new Set(
        processedMarketsSnap.docs.map(d => `${d.data().city}-${d.data().state}`)
    );
    
    // 2. Pick unprocessed markets
    const marketsToProcess = TARGET_MARKETS
        .filter(m => !processedCities.has(`${m.city}-${m.state}`))
        .slice(0, marketCount);
    
    if (marketsToProcess.length === 0) {
        console.log('[DayDay] All target markets have been processed. Cycling through again.');
        // Reset and start over
        marketsToProcess.push(...TARGET_MARKETS.slice(0, marketCount));
    }
    
    // 3. Process each market
    for (const market of marketsToProcess) {
        try {
            console.log(`[DayDay] Processing ${market.city}, ${market.state}...`);
            
            // Create Location (ZIP) pages
            const locResult = await pageGen.scanAndGenerateDispensaries({
                locations: market.zips,
                city: market.city,
                state: market.state,
                limit: 20
            });
            result.pagesCreated.location += locResult.pagesCreated;
            
            // Create Dispensary SEO pages
            await runChicagoPilotJob(market.city, market.state, market.zips);
            result.pagesCreated.dispensary += 5; // Estimate
            
            // Create Brand SEO pages
            await runBrandPilotJob(market.city, market.state, market.zips);
            result.pagesCreated.brand += 3; // Estimate
            
            // Optimize new pages with unique content
            for (const zip of market.zips) {
                try {
                    await optimizePageContent(`zip_${zip}`, 'zip');
                    result.pagesOptimized++;
                } catch (e) {
                    // Page might not exist yet
                }
            }
            
            // Auto-publish optimized pages
            await autoPublishOptimizedPages(market.zips);
            
            // Log this market as processed
            await firestore.collection('dayday_discovery_log').add({
                city: market.city,
                state: market.state,
                zips: market.zips,
                pagesCreated: result.pagesCreated,
                processedAt: FieldValue.serverTimestamp()
            });
            
            result.marketsProcessed++;
            result.lowCompetitionMarkets.push(`${market.city}, ${market.state}`);
            
            // Rate limit between markets
            await new Promise(r => setTimeout(r, 2000));
            
        } catch (error: any) {
            console.error(`[DayDay] Error processing ${market.city}:`, error);
            result.errors.push(`${market.city}: ${error.message}`);
        }
    }
    
    console.log('[DayDay] Daily discovery complete:', result);
    return result;
}

/**
 * Auto-publish pages that have been optimized by Day Day
 */
async function autoPublishOptimizedPages(zips: string[]): Promise<number> {
    const firestore = getAdminFirestore();
    let published = 0;
    
    for (const zip of zips) {
        try {
            // Publish ZIP page
            const zipRef = firestore.doc(`foot_traffic/config/zip_pages/zip_${zip}`);
            const zipDoc = await zipRef.get();
            if (zipDoc.exists && (zipDoc.data() as any).seoOptimized) {
                await zipRef.update({ published: true, publishedAt: FieldValue.serverTimestamp() });
                published++;
            }
        } catch (e) {
            // Ignore errors for missing pages
        }
    }
    
    return published;
}

/**
 * Export for use as a scheduled job or manual trigger
 */
export { runDayDayDailyDiscovery as dayDayDailyDiscoveryJob };
