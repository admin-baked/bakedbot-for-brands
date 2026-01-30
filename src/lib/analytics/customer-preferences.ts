/**
 * Customer Preference Analysis
 *
 * Analyzes customer order history to determine:
 * - Preferred product categories
 * - Preferred specific products
 * - Price range preferences
 * - Purchase frequency patterns
 * - Effect preferences (if available)
 */

import { logger } from '@/lib/logger';

export interface OrderHistoryItem {
    items: Array<{
        productId: string;
        name: string;
        category?: string;
        price: number;
        qty: number;
    }>;
    totals: {
        total: number;
    };
    createdAt: Date | { toDate: () => Date };
}

export interface CustomerPreferences {
    preferredCategories: string[];
    preferredProducts: string[];
    priceRange: 'budget' | 'mid' | 'premium';
    avgOrderValue: number;
    favoriteCategory?: string;
    topProducts: Array<{ name: string; count: number }>;
}

/**
 * Analyze customer's order history to determine preferences
 */
export function analyzeCustomerPreferences(
    orders: OrderHistoryItem[],
    customerEmail?: string
): CustomerPreferences {
    if (orders.length === 0) {
        return {
            preferredCategories: [],
            preferredProducts: [],
            priceRange: 'mid',
            avgOrderValue: 0,
            topProducts: [],
        };
    }

    // Track category frequency
    const categoryCount = new Map<string, number>();
    const productCount = new Map<string, { name: string; count: number }>();
    const orderValues: number[] = [];

    // Analyze each order
    orders.forEach(order => {
        const orderTotal = order.totals?.total || 0;
        orderValues.push(orderTotal);

        order.items?.forEach(item => {
            // Count categories
            const category = item.category || 'other';
            categoryCount.set(category, (categoryCount.get(category) || 0) + item.qty);

            // Count products
            const productKey = item.productId || item.name;
            const existing = productCount.get(productKey);
            if (existing) {
                existing.count += item.qty;
            } else {
                productCount.set(productKey, {
                    name: item.name,
                    count: item.qty,
                });
            }
        });
    });

    // Determine preferred categories (top 3)
    const sortedCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category);

    // Determine preferred products (top 5)
    const sortedProducts = Array.from(productCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Calculate average order value
    const avgOrderValue = orderValues.reduce((sum, val) => sum + val, 0) / orderValues.length;

    // Determine price range based on average order value
    let priceRange: 'budget' | 'mid' | 'premium' = 'mid';
    if (avgOrderValue < 30) {
        priceRange = 'budget';
    } else if (avgOrderValue > 100) {
        priceRange = 'premium';
    }

    const preferences: CustomerPreferences = {
        preferredCategories: sortedCategories,
        preferredProducts: sortedProducts.map(p => p.name),
        priceRange,
        avgOrderValue,
        favoriteCategory: sortedCategories[0],
        topProducts: sortedProducts,
    };

    logger.debug('[PREFERENCES] Analyzed customer preferences', {
        customerEmail,
        orderCount: orders.length,
        avgOrderValue,
        priceRange,
        topCategory: preferences.favoriteCategory,
    });

    return preferences;
}

/**
 * Analyze Alleaves customer data to infer preferences
 * (Used when we have customer summary but not full order history)
 */
export function inferPreferencesFromAlleaves(alleavesCustomer: any): Partial<CustomerPreferences> {
    const totalSpent = parseFloat(alleavesCustomer.total_spent || 0);
    const orderCount = parseInt(alleavesCustomer.total_orders || 0);
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    // Determine price range
    let priceRange: 'budget' | 'mid' | 'premium' = 'mid';
    if (avgOrderValue < 30) {
        priceRange = 'budget';
    } else if (avgOrderValue > 100) {
        priceRange = 'premium';
    }

    // Check for loyalty tier or tags in Alleaves data
    const preferredCategories: string[] = [];
    if (alleavesCustomer.favorite_category) {
        preferredCategories.push(alleavesCustomer.favorite_category);
    }

    return {
        priceRange,
        avgOrderValue,
        preferredCategories,
    };
}

/**
 * Get product recommendations based on customer preferences
 */
export function getProductRecommendations(
    preferences: CustomerPreferences,
    availableProducts: Array<{
        id: string;
        name: string;
        category: string;
        price: number;
    }>,
    limit: number = 5
): Array<{ id: string; name: string; score: number; reason: string }> {
    const recommendations = availableProducts.map(product => {
        let score = 0;
        const reasons: string[] = [];

        // Category match
        if (preferences.preferredCategories.includes(product.category)) {
            score += 10;
            reasons.push('matches your favorite category');
        }

        // Price range match
        const productPriceRange =
            product.price < 30 ? 'budget' : product.price > 100 ? 'premium' : 'mid';
        if (productPriceRange === preferences.priceRange) {
            score += 5;
            reasons.push('in your price range');
        }

        // Previously purchased
        if (preferences.preferredProducts.some(p => p.toLowerCase().includes(product.name.toLowerCase()))) {
            score += 15;
            reasons.push('you\'ve enjoyed this before');
        }

        return {
            id: product.id,
            name: product.name,
            score,
            reason: reasons.join(', ') || 'similar to your preferences',
        };
    });

    return recommendations
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Calculate customer lifetime value prediction
 */
export function predictLifetimeValue(
    currentLTV: number,
    orderCount: number,
    daysSinceFirstOrder: number,
    segment: string
): number {
    if (daysSinceFirstOrder === 0 || orderCount === 0) {
        return currentLTV;
    }

    // Calculate purchase frequency (orders per month)
    const monthsSinceFirst = daysSinceFirstOrder / 30;
    const ordersPerMonth = orderCount / monthsSinceFirst;

    // Average order value
    const avgOrderValue = currentLTV / orderCount;

    // Segment-based retention multiplier
    const retentionMultiplier: Record<string, number> = {
        vip: 24, // Expected to stay 2 years
        loyal: 18, // Expected to stay 1.5 years
        frequent: 12, // Expected to stay 1 year
        new: 6, // Expected to stay 6 months
        at_risk: 3, // Expected to stay 3 months
        slipping: 2, // Expected to stay 2 months
        churned: 0, // No future value
        high_value: 12, // Expected to stay 1 year
    };

    const expectedMonths = retentionMultiplier[segment] || 6;
    const futureOrders = ordersPerMonth * expectedMonths;
    const predictedLTV = currentLTV + (futureOrders * avgOrderValue);

    return Math.round(predictedLTV * 100) / 100;
}
