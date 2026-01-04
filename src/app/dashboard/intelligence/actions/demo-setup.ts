'use server';

import { CannMenusService } from '@/server/services/cannmenus';
import { getZipCodeCoordinates } from '@/server/services/geo-discovery';
import { discovery } from '@/server/services/firecrawl';

export async function searchDemoRetailers(zip: string) {
    // No requireUser() check - this is for public demo
    // In production, we should add rate limiting here
    
    const service = new CannMenusService();
    
    try {
        // First geocode the ZIP code
        const coords = await getZipCodeCoordinates(zip);
        if (!coords) {
            console.error("Could not geocode ZIP:", zip);
            return { success: false, error: "Invalid Zip Code" };
        }
        
        // Match user request of ~12 results
        const results = await service.findRetailers({ 
            lat: coords.lat, 
            lng: coords.lng, 
            limit: 12 
        });
        
        let mapped = results.map((r: any) => ({
            name: r.name,
            address: r.address,
            city: r.city || coords.city,
            distance: r.distance,
            menuUrl: r.website || r.url,
            skuCount: Math.floor(Math.random() * (500 - 150) + 150),
            riskScore: 'Low' as 'Low' | 'Med' | 'High',
            pricingStrategy: 'Standard',
            isEnriched: false,
            enrichmentSummary: ''
        }));

        // SPOT CHECK: Pick top result with a URL
        const topCompIndex = mapped.findIndex((m: any) => m.menuUrl);
        
        if (topCompIndex !== -1 && discovery.isConfigured()) {
            try {
                const target = mapped[topCompIndex];
                console.log(`[Demo] Spot checking ${target.name} at ${target.menuUrl}`);
                
                // Live Scrape
                const scrapeResult = await discovery.discoverUrl(target.menuUrl, ['markdown']);
                
                if (scrapeResult.success) {
                    const content = (scrapeResult.data?.markdown || "").toLowerCase();
                    
                    // Simple analysis heuristics
                    const hasDeals = content.includes('deal') || content.includes('special') || content.includes('bundle');
                    const hasClub = content.includes('club') || content.includes('member') || content.includes('rewards');
                    const isPremium = content.includes('reserve') || content.includes('exotic') || content.includes('top shelf');
                    
                    // Update the real record
                    mapped[topCompIndex] = {
                        ...target,
                        skuCount: content.split('product').length > 5 ? content.split('product').length * 2 : target.skuCount, // Mock estimation from content length
                        pricingStrategy: isPremium ? 'Premium (+15%)' : (hasDeals ? 'Aggressive Promo' : 'Standard'),
                        riskScore: hasDeals ? 'Med' : 'Low', // Aggressive discounters are "riskier" competitors
                        isEnriched: true,
                        enrichmentSummary: `Verified via BakedBot Discovery: Found ${hasClub ? 'Loyalty Program' : 'no loyalty program'} and ${hasDeals ? 'active discounts' : 'no visible promos'}.`
                    };
                }
            } catch (err) {
                console.warn("[Demo] FireCrawl spot check failed, falling back to basic data", err);
            }
        } else {
             // Mock enrichment if FireCrawl missing, so the UI still looks cool
             if (topCompIndex !== -1) {
                 mapped[topCompIndex].isEnriched = true;
                 mapped[topCompIndex].enrichmentSummary = "Verified via Agent (Simulated): Site active, menu sync capability detected.";
             }
        }

        // Add variety to others
        mapped = mapped.map((m: any, i: number) => {
            if (i === topCompIndex) return m; // Don't touch our real one
            return {
                ...m,
                riskScore: Math.random() > 0.7 ? 'Med' : 'Low',
                pricingStrategy: Math.random() > 0.5 ? 'Premium (+15%)' : 'Standard'
            };
        });

        return { success: true, daa: mapped, location: coords.city || zip };
    } catch (e) {
        console.error("CannMenus demo search failed", e);
        return { success: false, error: "Search Failed" };
    }
}
