'use server';

import { requireUser } from '@/server/auth/auth';
import { makeProductRepo } from '@/server/repos/productRepo';
import { createServerClient } from '@/firebase/server-client';

export type CannMenusResult = {
    name: string;
    id: string; // CannMenus ID (e.g. cm_123)
    type: 'dispensary' | 'brand';
};

// Mock Database of CannMenus customers for Autocomplete
const MOCK_RETAILERS: CannMenusResult[] = [
    { name: 'Green Valley Dispensary', id: 'cm_gv_101', type: 'dispensary' },
    { name: 'Higher Ground', id: 'cm_hg_202', type: 'dispensary' },
    { name: 'Blue Dream Collective', id: 'cm_bd_303', type: 'dispensary' },
    { name: 'Urban Leaf', id: 'cm_ul_404', type: 'dispensary' },
    { name: 'Cookies Los Angeles', id: 'cm_cookies_la', type: 'dispensary' },
    { name: 'Stiiizy DTLA', id: 'cm_stiiizy_dtla', type: 'brand' },
    { name: 'Wyld Edibles', id: 'cm_wyld_global', type: 'brand' },
    { name: 'Kiva Confections', id: 'cm_kiva_global', type: 'brand' },
    { name: 'Raw Garden', id: 'cm_raw_garden', type: 'brand' },
    { name: 'Jeeter', id: 'cm_jeeter', type: 'brand' },
    { name: 'Pure Beauty', id: 'cm_pure_beauty', type: 'brand' },
    { name: 'Caminos', id: 'cm_caminos', type: 'brand' },
    { name: '40 Tons', id: 'cm_40_tons', type: 'brand' },
];

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
    if (!query || query.length < 2) return [];

    // Force mock for demo/testing
    if (query.toLowerCase().includes('demo') || query.toLowerCase().includes('test')) {
        const normalizedQuery = query.toLowerCase().trim();
        const stripped = normalizedQuery.replace(/\b(demo|test)\b/g, '').trim();
        if (!stripped) {
            return MOCK_RETAILERS.slice(0, 10);
        }

        return MOCK_RETAILERS.filter((r) => {
            const lowerName = r.name.toLowerCase();
            const lowerId = r.id.toLowerCase();
            return lowerName.includes(stripped) || r.type.includes(stripped) || lowerId.includes(stripped);
        }).slice(0, 10);
    }

    const { API_BASE: base, API_KEY: apiKey } = (await import('@/lib/config')).CANNMENUS_CONFIG;

    // Fallback to mock if query is specifically for a mock brand or if no API key
    const lowerQuery = query.toLowerCase();
    if (!apiKey || lowerQuery.includes('40 tons') || lowerQuery.includes('kiva') || lowerQuery.includes('wyld')) {
        console.info('[CannMenus] Using mock/augmented results for query:', query);
        return MOCK_RETAILERS.filter(r =>
            r.name.toLowerCase().includes(lowerQuery) ||
            r.id.toLowerCase().includes(lowerQuery)
        ).slice(0, 10);
    }

    try {
        const headers = {
            "Accept": "application/json",
            "User-Agent": "BakedBot/1.0",
            "X-Token": apiKey.trim().replace(/^['"']|['"']$/g, ""),
        };

        console.log(`[CannMenus] Searching for: ${query} on ${base}`);

        // Parallel fetch for Brands and Retailers
        const [brandsRes, retailersRes] = await Promise.all([
            fetch(`${base}/v1/brands?name=${encodeURIComponent(query)}`, { headers }),
            fetch(`${base}/v1/retailers?name=${encodeURIComponent(query)}`, { headers })
        ]);

        if (!brandsRes.ok) console.warn(`[CannMenus] Brands fetch failed: ${brandsRes.status}`);
        if (!retailersRes.ok) console.warn(`[CannMenus] Retailers fetch failed: ${retailersRes.status}`);

        let results: CannMenusResult[] = [];

        if (brandsRes.ok) {
            const brandsData = await brandsRes.json();
            if (brandsData.data) {
                const brands = brandsData.data.map((b: any) => ({
                    name: b.brand_name,
                    id: String(b.id),
                    type: 'brand' as const
                }));
                results = [...results, ...brands];
            }
        }

        if (retailersRes.ok) {
            const retailersData = await retailersRes.json();
            if (retailersData.data) {
                const retailers = retailersData.data.map((r: any) => ({
                    name: r.dispensary_name,
                    id: String(r.id),
                    type: 'dispensary' as const
                }));
                results = [...results, ...retailers];
            }
        }

        console.log(`[CannMenus] Found ${results.length} results.`);
        return results.slice(0, 20);

    } catch (error) {
        console.error('Error searching CannMenus:', error);
        return [];
    }
}

export async function syncCannMenusProducts(
    cannMenusId: string,
    role: 'brand' | 'dispensary',
    brandId: string, // The internal Firestore Brand ID
    limit?: number
): Promise<number> {
    const { CannMenusService } = await import('@/server/services/cannmenus');
    const service = new CannMenusService();

    // Mapping 'cm_xxx' ID to the name if possible, or passing it directly?
    // CannMenusService expects a Brand Name for search, OR we can implement ID based sync if supported.
    // The current signature of syncMenusForBrand takes (brandId, brandName).
    // If we have the ID, we might need to lookup the name or pass the ID if the service supports it.
    // However, looking at CannMenusService, it searches by NAME.
    // The MOCK_RETAILERS list has the name.

    // Find name from mock list or passed ID (hacky reverse lookup not needed if we trust the name passed upstream)
    // Actually, syncMenusForBrand is for BRANDS.
    // If role is dispensary, we need syncRetailerMenu logic.

    if (role === 'brand') {
        // We need the brand name. 
        // In onboarding/actions.ts, we had finalBrandName available but didn't pass it here?
        // Let's assume cannMenusId might ALSO be the name if it's not a cm_ ID? 
        // No, it's definitely an ID in the mock case.
        // Let's look up the name from our MOCK list if possible, or default.
        const mockEntry = MOCK_RETAILERS.find(r => r.id === cannMenusId);
        const nameToUse = mockEntry ? mockEntry.name : cannMenusId;

        const result = await service.syncMenusForBrand(brandId, nameToUse, {
            maxRetailers: limit || 10
        });
        return result.productsProcessed;
    } else {
        // Dispensary Sync
        const mockEntry = MOCK_RETAILERS.find(r => r.id === cannMenusId);
        const nameToUse = mockEntry ? mockEntry.name : cannMenusId;

        console.log(`[CannMenus] Syncing dispensary inventory for ${nameToUse} (${cannMenusId}) to ${brandId}`);

        const result = await service.syncDispensaryInventory(
            cannMenusId, // retailerId
            nameToUse,   // dispensaryName
            brandId,     // locationId (passed as brandId arg)
            { maxRetailers: limit || 1000 }
        );
        return result.productsProcessed;
    }
}
