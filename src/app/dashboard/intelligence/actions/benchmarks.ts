'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { makeProductRepo } from '@/server/repos/productRepo';
import { RetailerDoc } from '@/types/cannmenus';
import { CannMenusService } from '@/server/services/cannmenus';

export type BenchmarkData = {
    category: string;
    avgMarketPrice: number;
    yourPrice: number;
    difference: number; // percentage
    productCount: number;
};

export type BrandRetailer = {
    name: string;
    address: string;
    distance?: number;
    stockCount?: number;
};

export async function getCategoryBenchmarks(brandId: string): Promise<BenchmarkData[]> {
    try {
        const { firestore } = await createServerClient();

        // 1. Fetch Brand Products
        const productRepo = makeProductRepo(firestore);
        const products = await productRepo.getAllByBrand(brandId);

        if (products.length === 0) return [];

        // 2. Fetch Brand Data (State/City) for localized comparisons
        // Use marketState (from onboarding) if available, fall back to legacy state field
        const brandDoc = await firestore.collection('brands').doc(brandId).get();
        const brandData = brandDoc.data() || {};
        const state = brandData.marketState || brandData.state || 'IL';
        const city = brandData.city;

        // 3. Fetch Market Data (Leafly Intel)
        const activeIntel = await import('@/server/services/leafly-connector').then(m => m.getLocalCompetition(state, city));


        // ... (inside getCategoryBenchmarks)

        // 4. Compute Averages per Category
        const brandCategoryStats: Record<string, { total: number; count: number }> = {};
        const categoriesToCheck: string[] = [];

        products.forEach(p => {
            const cat = p.category || 'Other';
            if (p.price) {
                if (!brandCategoryStats[cat]) {
                    brandCategoryStats[cat] = { total: 0, count: 0 };
                    categoriesToCheck.push(cat);
                }
                brandCategoryStats[cat].total += p.price;
                brandCategoryStats[cat].count += 1;
            }
        });

        // 5. Fetch CannMenus Data (Parallel)
        // We'll try to get a market sample for each category active for the brand
        const cannMenusService = new CannMenusService();
        const cannMenusSamples = await Promise.allSettled(
            categoriesToCheck.map(async (cat) => {
                try {
                    // Search for products in this category (generic market search)
                    // We limit to 20 items to get a quick sample
                    const { products } = await cannMenusService.searchProducts({
                        category: cat,
                        limit: 20
                        // Note: We'd ideally pass 'near' if we had lat/long, or 'state' if API supported it in search.
                        // For now, this gives a broad market average.
                    });

                    if (!products || products.length === 0) return { category: cat, avg: 0, count: 0 };

                    const total = products.reduce((sum: number, p: any) => sum + (p.latest_price || 0), 0);
                    return {
                        category: cat,
                        avg: total / products.length,
                        count: products.length
                    };
                } catch (err) {
                    console.warn(`Failed to fetch CannMenus data for ${cat}`, err);
                    return { category: cat, avg: 0, count: 0 };
                }
            })
        );

        const benchmarks: BenchmarkData[] = [];

        for (const category in brandCategoryStats) {
            const stats = brandCategoryStats[category];
            const yourAvg = stats.total / stats.count;

            // Get Leafly Data
            const leaflyCat = activeIntel.pricingByCategory.find(c =>
                c.category.toLowerCase().includes(category.toLowerCase()) ||
                category.toLowerCase().includes(c.category.toLowerCase())
            );
            const leaflyAvg = leaflyCat?.avg || 0;

            // Get CannMenus Data
            // @ts-ignore
            const cmSample = cannMenusSamples.find(r => r.status === 'fulfilled' && r.value.category === category)?.value;
            const cannMenusAvg = cmSample?.avg || 0;

            // Blended Market Avg
            let marketAvg = 0;
            if (leaflyAvg > 0 && cannMenusAvg > 0) {
                marketAvg = (leaflyAvg + cannMenusAvg) / 2;
            } else {
                marketAvg = leaflyAvg || cannMenusAvg;
            }

            if (marketAvg === 0) continue; // No market data to compare

            const diff = ((yourAvg - marketAvg) / marketAvg) * 100;

            benchmarks.push({
                category,
                yourPrice: parseFloat(yourAvg.toFixed(2)),
                avgMarketPrice: parseFloat(marketAvg.toFixed(2)),
                difference: parseFloat(diff.toFixed(1)),
                productCount: stats.count
            });
        }

        return benchmarks;

    } catch (error) {
        logger.error('Failed to get benchmarks', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

export async function getBrandRetailers(brandId: string): Promise<BrandRetailer[]> {
    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);

        const results: BrandRetailer[] = [];

        // 1. Get auto-imported partners first (from onboarding/brand page)
        try {
            const partnersSnap = await firestore
                .collection('organizations')
                .doc(brandId)
                .collection('partners')
                .where('status', '==', 'active')
                .limit(20)
                .get();

            partnersSnap.forEach(doc => {
                const data = doc.data();
                results.push({
                    name: data.name,
                    address: `${data.address || ''}, ${data.city || ''}, ${data.state || ''}`.replace(/^, |, $/g, '') || 'Unknown',
                    distance: 0,
                    stockCount: data.stockCount || 0
                });
            });
        } catch (partnerErr) {
            // Non-fatal, continue to product-based retailers
        }

        // 2. Get retailers from product associations
        const products = await productRepo.getAllByBrand(brandId);

        const retailerIds = new Set<string>();
        const retailerSkuCounts: Record<string, number> = {};

        products.forEach(p => {
            if (p.retailerIds) {
                p.retailerIds.forEach(rid => {
                    retailerIds.add(rid);
                    retailerSkuCounts[rid] = (retailerSkuCounts[rid] || 0) + 1;
                });
            }
        });

        if (retailerIds.size > 0) {
            const retailerRefs = Array.from(retailerIds).map(id => firestore.collection('retailers').doc(id));
            const retailerPnaps = await firestore.getAll(...retailerRefs);

            retailerPnaps.forEach(snap => {
                if (snap.exists) {
                    const data = snap.data() as RetailerDoc;
                    const address = data.address?.street1
                        ? `${data.address.street1}, ${data.address.city}, ${data.address.state}`
                        : data.address?.city || 'Unknown Location';

                    // Avoid duplicates
                    if (!results.find(r => r.name === data.name)) {
                        results.push({
                            name: data.name,
                            address: address,
                            distance: 0,
                            stockCount: retailerSkuCounts[snap.id] || 0
                        });
                    }
                }
            });
        }

        return results.sort((a, b) => (b.stockCount || 0) - (a.stockCount || 0));

    } catch (error) {
        logger.error('Failed to find retailers', error as any);
        return [];
    }
}
