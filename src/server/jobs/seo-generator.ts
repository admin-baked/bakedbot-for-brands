
import { MassScraperService } from '../services/mass-scraper';

// Target ZIPs for Chicago Pilot (Downtown/River North)
const CHICAGO_PILOT_ZIPS = [
    '60601', // Loop
    '60611', // Near North Side
    '60654', // River North
    '60610'  // Gold Coast / Old Town
];

/**
 * Job to run the mass scraping pilot for Chicago.
 * Can be triggered via a server action or API route.
 */
export async function runChicagoPilotJob() {
    console.log('[SeoPageGenerator] Starting Chicago Pilot...');
    const scraper = MassScraperService.getInstance();
    
    const results: any[] = [];

    for (const zip of CHICAGO_PILOT_ZIPS) {
        console.log(`[SeoPageGenerator] Processing ZIP: ${zip}`);
        
        // 1. Discover
        // Refined query for better precision
        const locationQuery = `${zip} Chicago, IL`;
        const candidates = await scraper.discoverDispensaries(locationQuery);
        
        console.log(`[SeoPageGenerator] Found ${candidates.length} candidates in ${zip}`);

        for (const candidate of candidates) {
            // 2. Scrape & Generate Page
            // Added delay to be polite to Firecrawl/target sites
            // await new Promise(r => setTimeout(r, 2000));
            
            const page = await scraper.scrapeDispensary(candidate.url, zip);
            
            if (page && !('error' in page)) {
                // 3. Save (Currently DRY RUN in service)
                await scraper.savePage(page);
                results.push({ zip, name: page.dispensaryName, status: 'success' });
            } else {
                results.push({ 
                    zip, 
                    name: candidate.name, 
                    status: 'failed',
                    error: page && 'error' in page ? page.error : 'Unknown error'
                });
            }
        }
    }

    console.log('[SeoPageGenerator] Pilot Complete.', results);
    return results;
}
