'use server';

import { searchNearbyRetailers, getRetailerProducts } from '@/lib/cannmenus-api';

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
        // 1. Search for nearby retailers (limit to 5 to be fast)
        const retailers = await searchNearbyRetailers(lat, lng, 5);
        
        if (retailers.length === 0) {
            return { retailers: [], brands: [], location: null };
        }

        // 2. Derive location name from the closest retailer
        const closest = retailers[0];
        const locationName = {
            city: closest.city,
            state: closest.state
        };

        // 3. Fetch products from the top 3 retailers to discover local brands
        const topRetailers = retailers.slice(0, 3);
        const brandMap = new Map<string, { id: string; name: string; count: number }>();

        await Promise.all(topRetailers.map(async (retailer) => {
            try {
                // Fetch a small batch of products from each retailer
                const products = await getRetailerProducts(retailer.id, { 
                    state: retailer.state, // v1 API needs state
                    category: 'Flower' // Focus on flower for best brand discovery
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

        // 4. Sort brands by prevalence
        const sortedBrands = Array.from(brandMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5) // Top 5 brands
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

    } catch (error) {
        console.error('Error in getLandingGeoData:', error);
        return { retailers: [], brands: [], location: null };
    }
}
