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
];

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
    if (!query || query.length < 2) return [];

    const base = process.env.CANNMENUS_API_BASE || process.env.CANNMENUS_API_URL;
    const apiKey = process.env.CANNMENUS_API_KEY;

    // Fallback to mock if no API key (for dev/demo without keys)
    if (!base || !apiKey) {
        console.warn('CannMenus API keys missing, using mock data for onboarding search.');
        const lowerQuery = query.toLowerCase();
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

        // Parallel fetch for Brands and Retailers
        const [brandsRes, retailersRes] = await Promise.all([
            fetch(`${base}/v1/brands?name=${encodeURIComponent(query)}`, { headers }),
            fetch(`${base}/v1/retailers?name=${encodeURIComponent(query)}`, { headers })
        ]);

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

        return results.slice(0, 20);

    } catch (error) {
        console.error('Error searching CannMenus:', error);
        return [];
    }
}

export async function syncCannMenusProducts(
    cannMenusId: string,
    role: 'brand' | 'dispensary',
    brandId: string // The internal Firestore Brand ID
): Promise<number> {
    const { firestore } = await createServerClient();
    const productRepo = makeProductRepo(firestore);

    // Define limits
    const LIMIT = role === 'brand' ? 5 : 25;

    // Simulate fetching products from CannMenus API
    // In reality, this would call `cannmenus-api.ts`
    const mockProducts = Array.from({ length: LIMIT }).map((_, i) => ({
        name: `Imported ${role === 'brand' ? 'Strain' : 'Item'} ${i + 1} (${cannMenusId})`,
        brandId: brandId,
        category: i % 2 === 0 ? 'Flower' : 'Edible',
        price: 25 + i * 5,
        categoryId: `cat_${i % 2}`,
        description: `Automatically imported from CannMenus for ${cannMenusId}.`,
        imageUrl: `https://picsum.photos/seed/${cannMenusId}-${i}/400/400`,
        cannMenusId: `${cannMenusId}_sku_${i}`,
        imageHint: 'product sample'
    }));

    // Save to Firestore
    let count = 0;
    for (const p of mockProducts) {
        // Simple check to avoid duplicates if running multiple times (omitted for speed)
        await productRepo.create(p);
        count++;
    }

    return count;
}
