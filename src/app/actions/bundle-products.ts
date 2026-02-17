'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Product } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';

/**
 * Filter criteria for bundle-eligible products
 */
export interface BundleProductFilters {
    category?: string[];
    brand?: string[];
    priceRange?: { min: number; max: number };
    thcRange?: { min: number; max: number };
    cbdRange?: { min: number; max: number };
    inStockOnly?: boolean;
    excludeIds?: string[]; // Exclude already-selected products
}

/**
 * Product with bundle-specific metadata
 */
export interface BundleEligibleProduct extends Product {
    brand: string; // Override to make required
    quantity: number; // Override to make required (same as stock)
    thcPercentage?: number; // Alias for thcPercent
    cbdPercentage?: number; // Alias for cbdPercent
    unitCost?: number;
    marginPercent?: number;
    daysOfInventory?: number;
    recommendationScore?: number; // AI-generated score (0-100)
}

/**
 * Fetch eligible products for a bundle deal
 * Queries publicViews/products/items and filters based on deal criteria
 */
export async function fetchEligibleBundleProducts(
    orgId: string,
    dealType: BundleDeal['type'],
    dealCriteria: BundleDeal['criteria'],
    filters?: BundleProductFilters
): Promise<{ success: boolean; data?: BundleEligibleProduct[]; error?: string }> {
    try {
        if (!orgId) {
            throw new Error('Organization ID is required');
        }

        const db = getAdminFirestore();
        logger.info('[BUNDLE_PRODUCTS] Fetching eligible products', {
            orgId,
            dealType,
            filters,
        });

        // Start with base query for publicViews/products/items
        let query = db.collection('publicViews')
            .doc(orgId)
            .collection('products')
            .doc('menu')
            .collection('items') as FirebaseFirestore.Query;

        // Apply deal-specific criteria
        if (dealCriteria?.categories && dealCriteria.categories.length > 0) {
            query = query.where('category', 'in', dealCriteria.categories);
        }

        if (dealCriteria?.brands && dealCriteria.brands.length > 0) {
            query = query.where('brand', 'in', dealCriteria.brands);
        }

        if (dealCriteria?.subcategories && dealCriteria.subcategories.length > 0) {
            query = query.where('subcategory', 'in', dealCriteria.subcategories);
        }

        // Fetch products
        const snapshot = await query.get();

        let products: BundleEligibleProduct[] = snapshot.docs.map(doc => {
            const data = doc.data();
            const brand = data.brand || data.brandName || 'Unknown Brand';
            const quantity = data.quantity || data.stock || 0;
            const thcPercentage = data.thcPercentage || data.thc_percentage;
            const cbdPercentage = data.cbdPercentage || data.cbd_percentage;
            const unitCost = data.cost || data.unitCost;

            return {
                id: doc.id,
                name: data.name || 'Unknown Product',
                brand,
                brandId: data.brandId,
                category: data.category || 'other',
                subcategory: data.subcategory,
                price: data.price || 0,
                imageUrl: data.imageUrl || data.image,
                description: data.description,
                thcPercent: thcPercentage,
                cbdPercent: cbdPercentage,
                thcPercentage, // Keep alias for compatibility
                cbdPercentage, // Keep alias for compatibility
                strainType: data.strainType || data.strain_type,
                quantity,
                stock: quantity, // Alias
                unit: data.unit || 'unit',
                effects: data.effects || [],
                terpenes: data.terpenes || [],
                unitCost,
                // Calculate margin if cost is available
                marginPercent: unitCost && data.price ? ((data.price - unitCost) / data.price) * 100 : undefined,
                // Inventory age approximation (assume FIFO: low stock = old inventory)
                daysOfInventory: quantity > 0 && data.averageDailySales
                    ? Math.round(quantity / data.averageDailySales)
                    : undefined,
            } as unknown as BundleEligibleProduct;
        });

        // Apply additional filters
        if (filters) {
            // Category filter
            if (filters.category && filters.category.length > 0) {
                products = products.filter(p => filters.category!.includes(p.category));
            }

            // Brand filter
            if (filters.brand && filters.brand.length > 0) {
                products = products.filter(p => filters.brand!.includes(p.brand));
            }

            // Price range filter
            if (filters.priceRange) {
                const { min, max } = filters.priceRange;
                products = products.filter(p => p.price >= min && p.price <= max);
            }

            // THC range filter
            if (filters.thcRange) {
                const { min, max } = filters.thcRange;
                products = products.filter(p => {
                    const thc = p.thcPercentage || p.thcPercent || 0;
                    return thc >= min && thc <= max;
                });
            }

            // CBD range filter
            if (filters.cbdRange) {
                const { min, max } = filters.cbdRange;
                products = products.filter(p => {
                    const cbd = p.cbdPercentage || p.cbdPercent || 0;
                    return cbd >= min && cbd <= max;
                });
            }

            // In stock only filter
            if (filters.inStockOnly) {
                products = products.filter(p => (p.quantity || p.stock || 0) > 0);
            }

            // Exclude already-selected products
            if (filters.excludeIds && filters.excludeIds.length > 0) {
                const excludeSet = new Set(filters.excludeIds);
                products = products.filter(p => !excludeSet.has(p.id));
            }
        }

        // Apply deal-specific price filters from criteria
        if (dealCriteria?.priceRange) {
            const { min, max } = dealCriteria.priceRange;
            products = products.filter(p => p.price >= min && p.price <= max);
        }

        // Calculate recommendation scores based on weighted factors:
        // margin 40% + inventory urgency 30% + potency 20% + category bonus 10%
        const maxMargin = Math.max(...products.map(p => p.marginPercent || 0), 1);
        const maxTHC = Math.max(...products.map(p => (p as BundleEligibleProduct).thcPercentage || 0), 1);

        products = products.map(p => {
            const marginScore = maxMargin > 0 ? ((p.marginPercent || 0) / maxMargin) * 40 : 0;

            // Inventory urgency: slow-moving stock (lots of days remaining) gets LOWER score
            // so we prioritize products that need to move
            const daysOfInventory = (p as BundleEligibleProduct).daysOfInventory;
            const inventoryScore = daysOfInventory !== undefined
                ? daysOfInventory > 60
                    ? 30  // Old stock — high urgency to bundle/clear
                    : daysOfInventory > 30
                        ? 20
                        : daysOfInventory > 14
                            ? 10
                            : 5
                : 15; // Unknown age — neutral score

            const thc = (p as BundleEligibleProduct).thcPercentage || 0;
            const potencyScore = maxTHC > 0 ? (thc / maxTHC) * 20 : 0;

            // Category popularity bonus (edibles/flower are highest-demand in cannabis)
            const cat = (p.category || '').toLowerCase();
            const categoryBonus = cat.includes('flower') || cat.includes('edible') ? 10
                : cat.includes('preroll') || cat.includes('pre-roll') ? 8
                : cat.includes('vape') || cat.includes('concentrate') ? 6
                : 4;

            const score = Math.round(Math.min(100, marginScore + inventoryScore + potencyScore + categoryBonus));
            return { ...p, recommendationScore: score } as BundleEligibleProduct;
        });

        // Sort by recommendation score descending, then by name
        products.sort((a, b) => {
            const scoreA = (a as BundleEligibleProduct).recommendationScore || 0;
            const scoreB = (b as BundleEligibleProduct).recommendationScore || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
        });

        logger.info('[BUNDLE_PRODUCTS] Products fetched', {
            orgId,
            total: products.length,
        });

        return {
            success: true,
            data: products,
        };
    } catch (error: any) {
        logger.error('[BUNDLE_PRODUCTS] Error fetching products', { error });
        return {
            success: false,
            error: error.message || 'Failed to fetch bundle products',
        };
    }
}

/**
 * Get unique filter options for bundle product selection UI
 * Returns available categories, brands, price ranges for filtering
 */
export async function getBundleFilterOptions(
    orgId: string
): Promise<{
    success: boolean;
    data?: {
        categories: string[];
        brands: string[];
        priceRange: { min: number; max: number };
        thcRange: { min: number; max: number };
        cbdRange: { min: number; max: number };
    };
    error?: string;
}> {
    try {
        const db = getAdminFirestore();

        const snapshot = await db.collection('publicViews')
            .doc(orgId)
            .collection('products')
            .doc('menu')
            .collection('items')
            .get();

        const categories = new Set<string>();
        const brands = new Set<string>();
        let minPrice = Infinity;
        let maxPrice = 0;
        let minThc = Infinity;
        let maxThc = 0;
        let minCbd = Infinity;
        let maxCbd = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.category) categories.add(data.category);
            if (data.brand || data.brandName) brands.add(data.brand || data.brandName);

            const price = data.price || 0;
            if (price > 0) {
                minPrice = Math.min(minPrice, price);
                maxPrice = Math.max(maxPrice, price);
            }

            const thc = data.thcPercentage || data.thc_percentage || 0;
            if (thc > 0) {
                minThc = Math.min(minThc, thc);
                maxThc = Math.max(maxThc, thc);
            }

            const cbd = data.cbdPercentage || data.cbd_percentage || 0;
            if (cbd > 0) {
                minCbd = Math.min(minCbd, cbd);
                maxCbd = Math.max(maxCbd, cbd);
            }
        });

        return {
            success: true,
            data: {
                categories: Array.from(categories).sort(),
                brands: Array.from(brands).sort(),
                priceRange: {
                    min: minPrice === Infinity ? 0 : minPrice,
                    max: maxPrice || 100,
                },
                thcRange: {
                    min: minThc === Infinity ? 0 : minThc,
                    max: maxThc || 30,
                },
                cbdRange: {
                    min: minCbd === Infinity ? 0 : minCbd,
                    max: maxCbd || 30,
                },
            },
        };
    } catch (error: any) {
        logger.error('[BUNDLE_PRODUCTS] Error fetching filter options', { error });
        return {
            success: false,
            error: error.message || 'Failed to fetch filter options',
        };
    }
}
