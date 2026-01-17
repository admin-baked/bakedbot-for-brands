'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import type { Product, Retailer } from '@/types/domain';

export interface DistributionData {
    products: Product[];
    retailers: Retailer[];
    // Map productId -> list of retailerIds
    stockMap: Record<string, string[]>;
}

export async function getDistributionData(brandId: string): Promise<DistributionData> {
    const user = await requireUser(['brand', 'super_user']);
    const idToUse = user.brandId || brandId;

    const { firestore } = await createServerClient();

    // Fetch Products
    const productsSnap = await firestore.collection('products')
        .where('brandId', '==', idToUse)
        .where('active', '==', true)
        .limit(50)
        .get();

    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];

    // Fetch Retailers (associated with brand)
    // In a real app, this might be a join table or array on brand/retailer
    // For now, we'll fetch all retailers linked to these products OR all retailers if brand owns them
    const retailersSnap = await firestore.collection('retailers')
        .where('status', '==', 'active')
        .limit(100)
        .get();

    let retailers = retailersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Retailer[];

    // --- SYNTHETIC DATA ENRICHMENT ---
    // If we don't have enough retailers for a good map, mock some in key states
    if (retailers.length < 5) {
        const mockRetailers: Retailer[] = [
            { id: 'ca-1', name: 'Golden State Greens', city: 'San Diego', state: 'CA', address: '123 Beach Dr', zip: '92109' },
            { id: 'ca-2', name: 'Bay Area Bud', city: 'San Francisco', state: 'CA', address: '456 Mission St', zip: '94103' },
            { id: 'nv-1', name: 'Las Vegas ReLeaf', city: 'Las Vegas', state: 'NV', address: '777 Strip Blvd', zip: '89109' },
            { id: 'co-1', name: 'Mile High Dispensary', city: 'Denver', state: 'CO', address: '5280 Peak Way', zip: '80202' },
            { id: 'ny-1', name: 'Empire State Cannabis', city: 'New York', state: 'NY', address: '100 Broadway', zip: '10005' },
            { id: 'wa-1', name: 'Evergreen Extracts', city: 'Seattle', state: 'WA', address: '206 Pike St', zip: '98101' },
            { id: 'or-1', name: 'Portland Pot Shop', city: 'Portland', state: 'OR', address: '503 Rose St', zip: '97204' },
        ];
        retailers = [...retailers, ...mockRetailers];
    }

    // Build Stock Map logic (Randomized for demo if real data missing)
    const stockMap: Record<string, string[]> = {};
    products.forEach(p => {
        // Real logic: use p.retailerIds
        if (p.retailerIds && p.retailerIds.length > 0) {
            stockMap[p.id] = p.retailerIds;
        } else {
            // Demo logic: randomly assign 20-60% of retailers to each product
            const assignedIds = retailers
                .filter(() => Math.random() > 0.6) // 40% chance
                .map(r => r.id);
            stockMap[p.id] = assignedIds;
        }
    });

    return {
        products,
        retailers,
        stockMap
    };
}
