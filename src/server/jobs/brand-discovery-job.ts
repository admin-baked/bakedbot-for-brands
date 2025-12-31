
import { brandDiscovery } from '@/server/services/brand-discovery';

export async function runBrandPilotJob(targetCity = 'Chicago', targetState = 'IL', zipCodes = ['60601', '60611', '60654']) {
    console.log(`[BrandPilot] Starting pilot for ${targetCity}, ${targetState}`);
    const results: any[] = [];

    try {
        // 1. Discover Brands
        const discoveredBrands = await brandDiscovery.discoverBrands(targetCity, targetState);
        console.log(`[BrandPilot] Found ${discoveredBrands.length} potential brands`);

        // 2. Process each brand
        for (const brand of discoveredBrands) {
            console.log(`[BrandPilot] Processing ${brand.name}...`);
            
            // Create the SEO page (unpublished draft)
            const page = await brandDiscovery.createBrandPage(
                brand.name,
                brand.url,
                targetCity,
                targetState,
                zipCodes
            );

            if (page && !('error' in page)) {
                // 3. Save to Firestore
                await brandDiscovery.savePage(page);
                results.push({ name: brand.name, status: 'success', id: page.id });
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                results.push({ 
                    name: brand.name, 
                    status: 'failed', 
                    error: page && 'error' in page ? page.error : 'Unknown error' 
                });
            }
        }

        return {
            success: true,
            processed: results.length,
            results
        };

    } catch (error: any) {
        console.error('[BrandPilot] Job failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
