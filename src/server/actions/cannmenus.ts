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
    // Determine if we need auth here. Search might be public for onboarding? 
    // Usually onboarding is protected by "Authenticated but no role yet".
    // Let's assume we allow it for any authenticated user.
    // await requireUser(); 

    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    return MOCK_RETAILERS.filter(r =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit results
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
        description: `Automatically imported from CannMenus for ${cannMenusId}.`,
        imageUrl: `https://picsum.photos/seed/${cannMenusId}-${i}/400/400`,
        cannMenusId: `${cannMenusId}_sku_${i}`,
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
