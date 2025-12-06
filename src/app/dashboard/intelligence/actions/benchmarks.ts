'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
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

        // 1. Fetch all products (market data)
        // Optimization: In a real app, we would cache this or use a strictly aggregated collection.
        // For now, we fetch products to demonstrate the logic.
        // We limit to 500 to avoid reading the whole DB in this demo.
        const productsSnapshot = await firestore.collection('products')
            .limit(500)
            .get();

        const marketData: Record<string, { total: number; count: number }> = {};
        const brandData: Record<string, { total: number; count: number }> = {};

        productsSnapshot.forEach(doc => {
            const data = doc.data();
            const price = data.price || data.latest_price; // Handle different field names
            const category = data.category;
            const itemBrandId = data.brand_id;

            if (typeof price !== 'number' || !category) return;

            // Aggregating Market Data
            if (!marketData[category]) marketData[category] = { total: 0, count: 0 };
            marketData[category].total += price;
            marketData[category].count += 1;

            // Aggregating Brand Data
            if (itemBrandId === brandId) {
                if (!brandData[category]) brandData[category] = { total: 0, count: 0 };
                brandData[category].total += price;
                brandData[category].count += 1;
            }
        });

        // 2. Calculate Averages and Format
        const benchmarks: BenchmarkData[] = [];

        // We only care about categories where the brand actually has products
        for (const category in brandData) {
            const BrandStats = brandData[category];
            const MarketStats = marketData[category];

            const avgBrandParams = BrandStats.total / BrandStats.count;
            const avgMarketPrice = MarketStats.total / MarketStats.count;

            // Calculate difference percentage: (Brand - Market) / Market * 100
            const difference = ((avgBrandParams - avgMarketPrice) / avgMarketPrice) * 100;

            benchmarks.push({
                category,
                yourPrice: parseFloat(avgBrandParams.toFixed(2)),
                avgMarketPrice: parseFloat(avgMarketPrice.toFixed(2)),
                difference: parseFloat(difference.toFixed(1)),
                productCount: BrandStats.count
            });
        }

        return benchmarks;

    } catch (error) {
        logger.error('Failed to get benchmarks', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}

export async function getBrandRetailers(brandName: string): Promise<BrandRetailer[]> {
    try {
        // Use CannMenus Service to find retailers stocking this brand
        // Note: findRetailers expects location for proximity search, but we might just search by brand string if supported.
        // If the service doesn't support brand-only search without location, we might simulate or default to a region.

        // Mocking for Demo if API credentials aren't set or effectively used yet
        // In real implementation:
        // const results = await CannMenusService.findRetailers({ brand: brandName });

        // Returning mock data for UI proof-of-concept as per authorized plan to ensure UI is visible for verification
        return [
            { name: "The Green Room", address: "123 Main St, Los Angeles, CA", distance: 2.5, stockCount: 15 },
            { name: "Elevate Dispensary", address: "456 High Blvd, West Hollywood, CA", distance: 4.1, stockCount: 8 },
            { name: "Pure Life", address: "789 Wellness Way, Santa Monica, CA", distance: 6.8, stockCount: 22 },
            { name: "Cookies Melrose", address: "8150 Melrose Ave, Los Angeles, CA", distance: 3.2, stockCount: 12 },
            { name: "MedMen", address: "8208 Santa Monica Blvd, West Hollywood, CA", distance: 4.5, stockCount: 5 }
        ];

    } catch (error) {
        logger.error('Failed to find retailers', error as any);
        return [];
    }
}
