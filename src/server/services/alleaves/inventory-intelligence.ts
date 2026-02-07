/**
 * Alleaves Inventory Intelligence
 *
 * Integrates with Alleaves API to monitor inventory age and velocity.
 * Foundation for clearance pricing strategies.
 */

import { ALLeavesClient, type ALLeavesConfig, type ALLeavesInventoryItem } from '@/lib/pos/adapters/alleaves';
import type { InventoryAgeData } from '@/types/dynamic-pricing';
import { logger } from '@/lib/logger';

// ============ Client Factory ============

/**
 * Create an Alleaves client for an organization
 * Uses environment variables for Thrive Syracuse, can be extended for multi-tenant
 */
function createAlleavesClient(orgId: string): ALLeavesClient {
    // For now, use environment variables (single-tenant)
    // TODO: Fetch credentials from tenant config in Firestore
    const config: ALLeavesConfig = {
        username: process.env.ALLEAVES_USERNAME || '',
        password: process.env.ALLEAVES_PASSWORD || '',
        pin: process.env.ALLEAVES_PIN,
        storeId: process.env.ALLEAVES_LOCATION_ID || '1',
        locationId: process.env.ALLEAVES_LOCATION_ID || '1',
    };

    return new ALLeavesClient(config);
}

// ============ Core Functions ============

/**
 * Get inventory age data for a specific product
 *
 * @param productId - Product ID (Alleaves id_item) to check
 * @param orgId - Organization ID for context
 * @returns Inventory age data with procurement date and velocity
 */
export async function getInventoryAge(
    productId: string,
    orgId: string
): Promise<InventoryAgeData | null> {
    try {
        const client = createAlleavesClient(orgId);

        // Fetch the product's batch info
        const batchId = parseInt(productId, 10);
        if (isNaN(batchId)) {
            logger.warn('[INVENTORY_INTEL] Invalid product ID for batch lookup', { productId });
            return null;
        }

        const batchDetails = await client.getBatchDetails(batchId);

        if (!batchDetails) {
            // Fallback: Try to get from menu fetch
            const products = await client.fetchMenu();
            const product = products.find(p => p.externalId === productId);

            if (!product) {
                return null;
            }

            // Use product data if batch not available
            const rawItem = product.rawData as ALLeavesInventoryItem | undefined;

            return {
                productId,
                procurementDate: rawItem?.package_date
                    ? new Date(rawItem.package_date)
                    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 days
                daysInInventory: rawItem?.package_date
                    ? Math.floor((Date.now() - new Date(rawItem.package_date).getTime()) / (1000 * 60 * 60 * 24))
                    : 30,
                expiryDate: product.expirationDate,
                stockLevel: product.stock,
                reorderPoint: 5, // Default reorder point
                turnoverRate: 0.5, // Default - would need order history to calculate
                velocityTrend: 'stable' as const,
            };
        }

        // Calculate days in inventory from package/production date
        const packageDate = batchDetails.date_production
            ? new Date(batchDetails.date_production)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const daysInInventory = Math.floor(
            (Date.now() - packageDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const expiryDate = batchDetails.date_expire
            ? new Date(batchDetails.date_expire)
            : undefined;

        return {
            productId,
            procurementDate: packageDate,
            daysInInventory,
            expiryDate,
            stockLevel: batchDetails.quantity,
            reorderPoint: 5, // Default
            turnoverRate: 0.5, // Would need sales history
            velocityTrend: 'stable' as const,
        };
    } catch (error) {
        logger.error('[INVENTORY_INTEL] Error fetching inventory age', { productId, error });
        return null;
    }
}

/**
 * Get slow-moving inventory for an organization
 *
 * @param orgId - Organization ID
 * @param minDays - Minimum days in inventory to be considered slow-moving (default: 30)
 * @returns Array of product IDs with slow turnover
 */
export async function getSlowMovingInventory(
    orgId: string,
    minDays: number = 30
): Promise<{ productId: string; daysInInventory: number; stockLevel: number; expiryDate?: Date }[]> {
    try {
        const client = createAlleavesClient(orgId);

        // Fetch all products
        const products = await client.fetchMenu();

        const slowMoving: { productId: string; daysInInventory: number; stockLevel: number; expiryDate?: Date }[] = [];

        for (const product of products) {
            const rawItem = product.rawData as ALLeavesInventoryItem | undefined;
            if (!rawItem) continue;

            // Calculate days in inventory
            let daysInInventory = 30; // Default
            if (rawItem.package_date) {
                daysInInventory = Math.floor(
                    (Date.now() - new Date(rawItem.package_date).getTime()) / (1000 * 60 * 60 * 24)
                );
            }

            // Check if slow-moving
            if (daysInInventory >= minDays && product.stock > 0) {
                slowMoving.push({
                    productId: product.externalId,
                    daysInInventory,
                    stockLevel: product.stock,
                    expiryDate: product.expirationDate,
                });
            }
        }

        // Sort by days in inventory (oldest first)
        slowMoving.sort((a, b) => b.daysInInventory - a.daysInInventory);

        logger.info('[INVENTORY_INTEL] Found slow-moving inventory', {
            orgId,
            total: products.length,
            slowMoving: slowMoving.length,
            minDays,
        });

        return slowMoving;
    } catch (error) {
        logger.error('[INVENTORY_INTEL] Error fetching slow-moving inventory', { orgId, error });
        return [];
    }
}

/**
 * Get expiring inventory within a threshold
 *
 * @param orgId - Organization ID
 * @param daysThreshold - Products expiring within this many days
 * @returns Array of expiring products with urgency info
 */
export async function getExpiringInventory(
    orgId: string,
    daysThreshold: number = 30
): Promise<{
    productId: string;
    productName: string;
    daysUntilExpiry: number;
    stockLevel: number;
    urgency: 'low' | 'medium' | 'high';
    recommendedDiscount: number;
}[]> {
    try {
        const client = createAlleavesClient(orgId);

        // Use batch search for expiration data
        const expiringBatches = await client.searchBatches({
            expiringWithinDays: daysThreshold,
            minQuantity: 1,
        });

        const results = expiringBatches
            .filter(b => b.days_until_expiry !== undefined && b.days_until_expiry > 0)
            .map(batch => {
                const daysUntilExpiry = batch.days_until_expiry!;

                // Calculate urgency based on expiry
                let urgency: 'low' | 'medium' | 'high' = 'low';
                if (daysUntilExpiry <= 7) urgency = 'high';
                else if (daysUntilExpiry <= 14) urgency = 'medium';

                // Calculate recommended discount
                let recommendedDiscount = 15; // Base
                if (urgency === 'high') recommendedDiscount = 40;
                else if (urgency === 'medium') recommendedDiscount = 25;

                return {
                    productId: batch.id_item.toString(),
                    productName: batch.item_name,
                    daysUntilExpiry,
                    stockLevel: batch.quantity,
                    urgency,
                    recommendedDiscount,
                };
            })
            .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        logger.info('[INVENTORY_INTEL] Found expiring inventory', {
            orgId,
            expiring: results.length,
            daysThreshold,
        });

        return results;
    } catch (error) {
        logger.error('[INVENTORY_INTEL] Error fetching expiring inventory', { orgId, error });
        return [];
    }
}

/**
 * Calculate urgency level for inventory clearance
 *
 * @param inventoryAge - Inventory age data
 * @returns Urgency level (low, medium, high)
 */
export function calculateClearanceUrgency(
    inventoryAge: InventoryAgeData
): 'low' | 'medium' | 'high' {
    const { daysInInventory, expiryDate, turnoverRate, velocityTrend } = inventoryAge;

    // High urgency if approaching expiry
    if (expiryDate) {
        const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry < 14) return 'high';
        if (daysUntilExpiry < 30) return 'medium';
    }

    // High urgency if very old with low velocity
    if (daysInInventory > 90 && velocityTrend === 'decreasing') {
        return 'high';
    }

    // Medium urgency if moderately old
    if (daysInInventory > 60) {
        return 'medium';
    }

    // Medium urgency if slow-moving
    if (daysInInventory > 30 && turnoverRate < 1) {
        return 'medium';
    }

    return 'low';
}

/**
 * Get recommended discount for inventory based on age and urgency
 *
 * @param inventoryAge - Inventory age data
 * @returns Recommended discount percentage (0-50)
 */
export function getRecommendedClearanceDiscount(
    inventoryAge: InventoryAgeData
): number {
    const urgency = calculateClearanceUrgency(inventoryAge);
    const { daysInInventory, velocityTrend } = inventoryAge;

    // Base discount by urgency
    let discount = 0;
    if (urgency === 'high') {
        discount = 40; // 40% for high urgency
    } else if (urgency === 'medium') {
        discount = 25; // 25% for medium urgency
    } else {
        discount = 15; // 15% for low urgency
    }

    // Adjust based on days in inventory
    if (daysInInventory > 120) {
        discount += 10;
    } else if (daysInInventory > 90) {
        discount += 5;
    }

    // Adjust based on velocity trend
    if (velocityTrend === 'decreasing') {
        discount += 5;
    }

    // Cap at 50% maximum
    return Math.min(discount, 50);
}

/**
 * Check if product needs clearance pricing
 *
 * @param productId - Product ID to check
 * @param orgId - Organization ID
 * @returns Whether product needs clearance and recommended discount
 */
export async function needsClearancePricing(
    productId: string,
    orgId: string
): Promise<{
    needsClearance: boolean;
    urgency?: 'low' | 'medium' | 'high';
    recommendedDiscount?: number;
    reason?: string;
}> {
    const inventoryAge = await getInventoryAge(productId, orgId);

    if (!inventoryAge) {
        return { needsClearance: false };
    }

    // Criteria for clearance:
    // 1. Approaching expiry (< 30 days)
    // 2. More than 60 days old
    // 3. Decreasing velocity
    // 4. Low turnover rate
    let needsClearance = false;
    let reason = '';

    if (inventoryAge.expiryDate) {
        const daysUntilExpiry = Math.floor(
            (inventoryAge.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30) {
            needsClearance = true;
            reason = `Expiring in ${daysUntilExpiry} days`;
        }
    }

    if (!needsClearance && inventoryAge.daysInInventory > 60) {
        needsClearance = true;
        reason = `${inventoryAge.daysInInventory} days in inventory`;
    }

    if (!needsClearance && inventoryAge.velocityTrend === 'decreasing') {
        needsClearance = true;
        reason = 'Decreasing sales velocity';
    }

    if (!needsClearance && inventoryAge.turnoverRate < 0.5) {
        needsClearance = true;
        reason = `Slow-moving (${inventoryAge.turnoverRate.toFixed(1)} units/day)`;
    }

    if (!needsClearance) {
        return { needsClearance: false };
    }

    const urgency = calculateClearanceUrgency(inventoryAge);
    const recommendedDiscount = getRecommendedClearanceDiscount(inventoryAge);

    return {
        needsClearance: true,
        urgency,
        recommendedDiscount,
        reason,
    };
}

// ============ Background Monitoring ============

/**
 * Monitor inventory age and return clearance recommendations
 *
 * @param orgId - Organization ID
 * @returns Summary of inventory needing clearance
 */
export async function monitorInventoryAge(orgId: string): Promise<{
    expiringSoon: number;
    slowMoving: number;
    recommendations: Array<{
        productId: string;
        productName: string;
        urgency: 'low' | 'medium' | 'high';
        recommendedDiscount: number;
        reason: string;
    }>;
}> {
    try {
        logger.info('[INVENTORY_INTEL] Starting inventory monitoring', { orgId });

        // Get expiring inventory (within 30 days)
        const expiring = await getExpiringInventory(orgId, 30);

        // Get slow-moving inventory (> 60 days old)
        const slowMoving = await getSlowMovingInventory(orgId, 60);

        // Combine and deduplicate recommendations
        const recommendations: Array<{
            productId: string;
            productName: string;
            urgency: 'low' | 'medium' | 'high';
            recommendedDiscount: number;
            reason: string;
        }> = [];

        // Add expiring products
        for (const item of expiring) {
            recommendations.push({
                productId: item.productId,
                productName: item.productName,
                urgency: item.urgency,
                recommendedDiscount: item.recommendedDiscount,
                reason: `Expiring in ${item.daysUntilExpiry} days`,
            });
        }

        // Add slow-moving products (that aren't already in expiring)
        const expiringIds = new Set(expiring.map(e => e.productId));
        for (const item of slowMoving) {
            if (!expiringIds.has(item.productId)) {
                const urgency: 'low' | 'medium' | 'high' =
                    item.daysInInventory > 90 ? 'high' :
                    item.daysInInventory > 60 ? 'medium' : 'low';

                recommendations.push({
                    productId: item.productId,
                    productName: `Product ${item.productId}`, // Would need product name lookup
                    urgency,
                    recommendedDiscount: urgency === 'high' ? 40 : urgency === 'medium' ? 25 : 15,
                    reason: `${item.daysInInventory} days in inventory`,
                });
            }
        }

        // Sort by urgency (high first)
        recommendations.sort((a, b) => {
            const urgencyOrder = { high: 0, medium: 1, low: 2 };
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        });

        logger.info('[INVENTORY_INTEL] Monitoring complete', {
            orgId,
            expiringSoon: expiring.length,
            slowMoving: slowMoving.length,
            totalRecommendations: recommendations.length,
        });

        return {
            expiringSoon: expiring.length,
            slowMoving: slowMoving.length,
            recommendations,
        };
    } catch (error) {
        logger.error('[INVENTORY_INTEL] Error monitoring inventory age', { orgId, error });
        return {
            expiringSoon: 0,
            slowMoving: 0,
            recommendations: [],
        };
    }
}

/**
 * Get inventory velocity report
 *
 * @param orgId - Organization ID
 * @returns Products grouped by velocity trend
 */
export async function getInventoryVelocityReport(orgId: string): Promise<{
    increasing: string[];
    stable: string[];
    decreasing: string[];
}> {
    try {
        // This would require order history analysis
        // For now, return based on stock levels relative to typical
        const client = createAlleavesClient(orgId);
        const products = await client.fetchMenu();

        // Simple heuristic: low stock = increasing velocity, high stock = decreasing
        const increasing: string[] = [];
        const stable: string[] = [];
        const decreasing: string[] = [];

        for (const product of products) {
            if (product.stock <= 5) {
                increasing.push(product.externalId);
            } else if (product.stock >= 50) {
                decreasing.push(product.externalId);
            } else {
                stable.push(product.externalId);
            }
        }

        logger.info('[INVENTORY_INTEL] Velocity report generated', {
            orgId,
            increasing: increasing.length,
            stable: stable.length,
            decreasing: decreasing.length,
        });

        return { increasing, stable, decreasing };
    } catch (error) {
        logger.error('[INVENTORY_INTEL] Error fetching velocity report', { orgId, error });
        return {
            increasing: [],
            stable: [],
            decreasing: [],
        };
    }
}
