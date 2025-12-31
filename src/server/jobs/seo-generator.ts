
import { MassScraperService } from '../services/mass-scraper';

// Target ZIPs for Chicago Pilot (Downtown/River North)
const CHICAGO_PILOT_ZIPS = [
    '60601', // Loop
    '60611', // Near North Side
    '60654', // River North
    '60610'  // Gold Coast / Old Town
];

/**
 * Job to run the mass scraping pilot for dispensaries.
 * Can be triggered via a server action or API route.
 */
export async function runChicagoPilotJob(
    city = 'Chicago',
    state = 'IL',
    zipCodes = CHICAGO_PILOT_ZIPS
) {
    console.log(`[SeoPageGenerator] Starting Pilot for ${city}, ${state}...`);
    const scraper = MassScraperService.getInstance();
    
    const results: any[] = [];

    // If no zips provided, run one wide search (or handle differently, but here we expect zips)
    // If zips are empty, maybe default to just the city search?
    const targets = zipCodes.length > 0 ? zipCodes : [''];

    for (const zip of targets) {
        console.log(`[SeoPageGenerator] Processing ZIP: ${zip}`);
        
        // 1. Discover
        // Refined query for better precision
        const locationQuery = zip ? `${zip} ${city}, ${state}` : `dispensaries in ${city}, ${state}`;
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
