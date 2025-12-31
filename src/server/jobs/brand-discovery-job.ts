
import { brandDiscovery } from '@/server/services/brand-discovery';

import { getAdminFirestore } from '@/firebase/admin';

export async function runBrandPilotJob(targetCity = 'Chicago', targetState = 'IL', zipCodes = ['60601', '60611', '60654']) {
    console.log(`[BrandPilot] Starting pilot for ${targetCity}, ${targetState}`);
    const firestore = getAdminFirestore();
    const statusRef = firestore.collection('foot_traffic').doc('status').collection('jobs').doc('brand_pilot');
    
    await statusRef.set({
        status: 'running',
        city: targetCity,
        state: targetState,
        startTime: new Date(),
        itemsFound: 0,
        itemsProcessed: 0,
        lastError: null
    });

    const results: any[] = [];

    try {
        // 1. Discover Brands
        const discoveredBrands = await brandDiscovery.discoverBrands(targetCity, targetState);
        console.log(`[BrandPilot] Found ${discoveredBrands.length} potential brands`);
        
        await statusRef.update({
            itemsFound: discoveredBrands.length,
            stage: 'processing'
        });

        // 2. Process each brand
        let processedCount = 0;
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
            
            processedCount++;
            await statusRef.update({
                itemsProcessed: processedCount,
                lastUpdated: new Date()
            });
        }

        await statusRef.set({
            status: 'completed',
            endTime: new Date(),
            totalProcessed: results.length,
            successCount: results.filter(r => r.status === 'success').length,
            results: results.slice(0, 50) // Limit size
        }, { merge: true });

        return {
            success: true,
            processed: results.length,
            results
        };

    } catch (error: any) {
        console.error('[BrandPilot] Job failed:', error);
        await statusRef.update({
            status: 'failed',
            lastError: error.message,
            endTime: new Date()
        });
        return {
            success: false,
            error: error.message
        };
    }
}
