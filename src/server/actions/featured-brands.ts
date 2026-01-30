'use server';

/**
 * Server actions for managing featured brands
 */

import { createServerClient } from '@/firebase/server-client';

export interface FeaturedBrand {
    id: string;
    name: string;
    logo?: string;
    tagline?: string;
    backgroundColor?: string;
    productCount?: number;
}

/**
 * Get featured brands for a dispensary from their product catalog
 * Analyzes products to determine top brands by product count
 */
export async function getFeaturedBrands(orgId: string): Promise<FeaturedBrand[]> {
    try {
        const { firestore } = await createServerClient();

        // Fetch all products for this org
        const productsSnapshot = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        if (productsSnapshot.empty) {
            return [];
        }

        // Analyze brands from products
        const brandStats = new Map<string, number>();

        productsSnapshot.docs.forEach(doc => {
            const product = doc.data();
            const brand = product.brandName || 'Unknown';

            if (brand !== 'Unknown') {
                brandStats.set(brand, (brandStats.get(brand) || 0) + 1);
            }
        });

        // Sort by product count and take top 8
        const topBrands = Array.from(brandStats.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // Convert to FeaturedBrand format
        const featuredBrands: FeaturedBrand[] = topBrands.map(([name, count], idx) => ({
            id: `brand-${idx + 1}`,
            name,
            productCount: count,
            tagline: `${count} products available`,
            backgroundColor: generateBrandColor(name),
        }));

        return featuredBrands;
    } catch (error) {
        console.error('Error fetching featured brands:', error);
        return [];
    }
}

/**
 * Generate a consistent color for a brand based on its name
 */
function generateBrandColor(brandName: string): string {
    const colors = [
        '#1a1a2e', // Dark blue
        '#2d5a27', // Forest green
        '#4a1c40', // Purple
        '#1e3a5f', // Navy
        '#2c1810', // Brown
        '#1a0a2e', // Deep purple
        '#8b4513', // Saddle brown
        '#2f4f4f', // Dark slate gray
    ];

    // Use brand name to deterministically select a color
    const hash = brandName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}
