import { searchNearbyRetailers, getRetailerProducts, reverseGeocode } from '@/lib/cannmenus-api';
import { LEGAL_US_STATES } from '@/lib/constants/legal-states';
import { searchPlaces } from '@/server/tools/web-search';

export type LandingGeoData = {
    retailers: {
        id: string;
        name: string;
        city: string;
        distance: number;
    }[];
    brands: {
        id: string;
        name: string;
        productCount: number;
    }[];
    location: {
        city: string;
        state: string;
    } | null;
};

/**
 * Fetch nearby retailers and derived brands for the landing page demo
 * This aggregates data from the CannMenus API to provide local context
 */
export async function getLandingGeoData(lat: number, lng: number): Promise<LandingGeoData> {
    try {
        // 1. Search for nearby retailers (limit to 10 to allow for filtering)
        const rawRetailers = await searchNearbyRetailers(lat, lng, 10);
        
        // 2. Filter by Legal States and Distance
        const retailers = rawRetailers.filter(r => {
            // Must be in a legal state
            const isLegalState = LEGAL_US_STATES.includes(r.state.toUpperCase());
            // Must be within 50 miles (otherwise it's not "near")
            const isNearby = (r.distance || 0) <= 50;

            return isLegalState && isNearby;
        }).slice(0, 5); // Take top 5 after filtering
        
        if (retailers.length > 0) {
            // 3. Derive location name from the closest retailer
            const closest = retailers[0];
            const locationName = {
                city: closest.city,
                state: closest.state
            };

            // 4. Fetch products from the top 3 retailers
            const topRetailers = retailers.slice(0, 3);
            const brandMap = new Map<string, { id: string; name: string; count: number }>();

            await Promise.all(topRetailers.map(async (retailer) => {
                try {
                    const products = await getRetailerProducts(retailer.id, { 
                        state: retailer.state, 
                        category: 'Flower' 
                    });
                    
                    products.forEach(p => {
                        if (p.brand_name && p.brand_name !== 'Unknown Brand' && p.brand_id) {
                            const existing = brandMap.get(p.brand_name);
                            if (existing) {
                                existing.count++;
                            } else {
                                brandMap.set(p.brand_name, {
                                    id: p.brand_id.toString(),
                                    name: p.brand_name,
                                    count: 1
                                });
                            }
                        }
                    });
                } catch (err) {
                    console.warn(`Failed to fetch products for retailer ${retailer.id}`, err);
                }
            }));

            // 5. Sort brands
            const sortedBrands = Array.from(brandMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(b => ({
                    id: b.id,
                    name: b.name,
                    productCount: b.count
                }));

            return {
                retailers: retailers.map(r => ({
                    id: r.id,
                    name: r.name,
                    city: r.city,
                    distance: r.distance || 0
                })),
                brands: sortedBrands,
                location: locationName
            };
        }

        // ==========================================
        // FALLBACK: Non-Legal State Strategy
        // ==========================================
        
        // If we found no legal retailers nearby, check if we are in a non-legal state
        // and should show "Smoke/Hemp Shops" instead.
        
        const loc = await reverseGeocode(lat, lng);
        if (loc && loc.stateCode) { 
             // Check if the generic state code (e.g. WI) is in our LEGAL list
             const isLegal = LEGAL_US_STATES.includes(loc.stateCode.toUpperCase());
             
             if (!isLegal) {
                 // Non-legal state: Search for Smoke/Hemp shops
                 const query = `Smoke shops in ${loc.city}, ${loc.state}`;
                 try {
                     const searchRes = await searchPlaces(query);
                     if (searchRes.success && searchRes.results.length > 0) {
                         return {
                             retailers: searchRes.results.map((r: any, i: number) => ({
                                 id: `serper-${i}`,
                                 name: r.title,
                                 city: loc.city,
                                 distance: 1.0 // Mock distance as Serper doesn't give it easily in this mode
                             })),
                             brands: [], // No brands for smoke shops
                             location: {
                                 city: loc.city,
                                 state: loc.state
                             }
                         };
                     }
                 } catch (err) {
                     console.error('Fallback search failed:', err);
                 }
             }
        }

        return { retailers: [], brands: [], location: null };

    } catch (error) {
        console.error('Error in getLandingGeoData:', error);
        return { retailers: [], brands: [], location: null };
    }
}
