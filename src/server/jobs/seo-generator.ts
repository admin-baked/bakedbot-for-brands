
import { MassDiscoveryService } from '../services/mass-discovery';

// Target ZIPs for Chicago Pilot (Downtown/River North)
const CHICAGO_PILOT_ZIPS = [
    '60601', // Loop
    '60611', // Near North Side
    '60654', // River North
    '60610'  // Gold Coast / Old Town
];

/**
 * Job to run the mass discovery pilot for dispensaries.
 * Can be triggered via a server action or API route.
 */
export async function runChicagoPilotJob(
    city = 'Chicago',
    state = 'IL',
    zipCodes = CHICAGO_PILOT_ZIPS
) {
    console.log(`[SeoPageGenerator] Starting Pilot for ${city}, ${state}...`);
    const discovery = MassDiscoveryService.getInstance();
    
    const results: any[] = [];

    // If no zips provided, run one wide search (or handle differently, but here we expect zips)
    // If zips are empty, maybe default to just the city search?
    const targets = zipCodes.length > 0 ? zipCodes : [''];

    for (const zip of targets) {
        console.log(`[SeoPageGenerator] Processing ZIP: ${zip}`);
        
        // 1. Discover
        // Refined query for better precision
        const locationQuery = zip ? `${zip} ${city}, ${state}` : `dispensaries in ${city}, ${state}`;
        const candidates = await discovery.findDispensaries(locationQuery);
        
        console.log(`[SeoPageGenerator] Found ${candidates.length} candidates in ${zip}`);

        // Get existing pages for this ZIP to avoid duplicate work
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const existingDocs = await db.collection('seo_pages_dispensary')
            .where('zipCode', '==', zip)
            .select('dispensaryName', 'metrics') // Minimize read cost
            .get();
        
        const existingNames = new Set(existingDocs.docs.map(d => d.data().dispensaryName?.toLowerCase()));

        for (const candidate of candidates) {
            // Check if exists
            if (existingNames.has(candidate.name.toLowerCase())) {
                console.log(`[SeoPageGenerator] Skipping ${candidate.name} (Already exists)`);
                results.push({ zip, name: candidate.name, status: 'skipped', reason: 'exists' });
                continue;
            }

            // 2. Discover & Generate Page
            // Added delay to be polite to target sites
            // await new Promise(r => setTimeout(r, 2000));
            
            const page = await discovery.discoverDispensary(candidate.url, zip);
            
            if (page && !('error' in page)) {
                // 3. Save
                await discovery.savePage(page);
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
