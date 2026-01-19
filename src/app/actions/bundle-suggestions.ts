'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { BundleDeal, BundleProduct } from '@/types/bundles';
import { createBundle } from '@/app/actions/bundles';
import { v4 as uuidv4 } from 'uuid';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
}

interface SuggestedBundle {
    name: string;
    description: string;
    products: Product[];
    savingsPercent: number;
    badgeText?: string;
}

/**
 * Generate AI-suggested bundles based on existing products
 */
export async function generateAIBundleSuggestions(orgId: string): Promise<{ success: boolean; suggestions?: SuggestedBundle[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();

        // Fetch products for this org
        const snapshot = await db.collection('products')
            .where('brandId', '==', orgId)
            .limit(50)
            .get();

        if (snapshot.empty) {
            return { success: false, error: 'No products found to create bundles from.' };
        }

        const products: Product[] = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            category: doc.data().category || 'Other',
            price: doc.data().price || 0,
        }));

        // Group products by category
        const byCategory: Record<string, Product[]> = {};
        for (const p of products) {
            if (!byCategory[p.category]) byCategory[p.category] = [];
            byCategory[p.category].push(p);
        }

        const suggestions: SuggestedBundle[] = [];

        // Strategy 1: Category Bundle (3 items from same category)
        for (const [category, prods] of Object.entries(byCategory)) {
            if (prods.length >= 3) {
                const selected = prods.slice(0, 3);
                suggestions.push({
                    name: `${category} Sampler`,
                    description: `Try our best ${category.toLowerCase()} products together!`,
                    products: selected,
                    savingsPercent: 15,
                    badgeText: 'POPULAR',
                });
            }
        }

        // Strategy 2: Starter Pack (cheapest items from different categories)
        const allCategories = Object.keys(byCategory);
        if (allCategories.length >= 2) {
            const starterProducts: Product[] = [];
            for (const cat of allCategories.slice(0, 3)) {
                const sorted = byCategory[cat].sort((a, b) => a.price - b.price);
                if (sorted[0]) starterProducts.push(sorted[0]);
            }
            if (starterProducts.length >= 2) {
                suggestions.push({
                    name: 'Starter Pack',
                    description: 'Perfect for first-time buyers. A little bit of everything!',
                    products: starterProducts,
                    savingsPercent: 20,
                    badgeText: 'NEW USER',
                });
            }
        }

        // Strategy 3: Premium Bundle (most expensive items)
        const sortedByPrice = [...products].sort((a, b) => b.price - a.price);
        if (sortedByPrice.length >= 3) {
            suggestions.push({
                name: 'Premium Experience',
                description: 'Our top-shelf products in one exclusive bundle.',
                products: sortedByPrice.slice(0, 3),
                savingsPercent: 10,
                badgeText: 'PREMIUM',
            });
        }

        return { success: true, suggestions };
    } catch (error) {
        console.error('Error generating bundle suggestions:', error);
        return { success: false, error: 'Failed to generate suggestions' };
    }
}

/**
 * Create a draft bundle from a suggestion
 */
export async function createBundleFromSuggestion(
    orgId: string,
    suggestion: SuggestedBundle
): Promise<{ success: boolean; error?: string }> {
    try {
        const bundleProducts: BundleProduct[] = suggestion.products.map(p => ({
            productId: p.id,
            name: p.name,
            category: p.category,
            requiredQty: 1,
            originalPrice: p.price,
        }));

        const originalTotal = suggestion.products.reduce((sum, p) => sum + p.price, 0);
        const bundlePrice = originalTotal * (1 - suggestion.savingsPercent / 100);

        const result = await createBundle({
            name: suggestion.name,
            description: suggestion.description,
            type: 'mix_match',
            status: 'draft', // User can review and activate
            orgId,
            products: bundleProducts,
            originalTotal,
            bundlePrice: Math.round(bundlePrice * 100) / 100,
            savingsAmount: Math.round((originalTotal - bundlePrice) * 100) / 100,
            savingsPercent: suggestion.savingsPercent,
            badgeText: suggestion.badgeText,
            featured: false,
        });

        return result;
    } catch (error) {
        console.error('Error creating bundle from suggestion:', error);
        return { success: false, error: 'Failed to create bundle' };
    }
}
