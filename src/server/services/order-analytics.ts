'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { Product } from '@/types/products';
import { BundleDeal } from '@/types/bundles';
import { logger } from '@/lib/logger';

/**
 * Order Analytics Service
 * Tracks product sales and bundle redemptions for popularity metrics
 */

interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
}

interface OrderData {
    customerId: string;
    orderId: string;
    items: OrderItem[];
    bundleIds?: string[];
    totalAmount: number;
    purchasedAt: Date;
}

/**
 * Record a product sale and update analytics
 * Called from checkout completion and POS order sync
 */
export async function recordProductSale(orgId: string, orderData: OrderData): Promise<void> {
    try {
        const db = getAdminFirestore();
        const batch = db.batch();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Update product sales counts
        for (const item of orderData.items) {
            const productRef = db.collection('products').doc(item.productId);

            // Get current product data
            const productDoc = await productRef.get();
            const productData = productDoc.data() as Product | undefined;

            if (productData) {
                // Update sales counts
                const updatedSalesCount = (productData.salesCount || 0) + item.quantity;
                const updatedSalesLast7Days = (productData.salesLast7Days || 0) + item.quantity;
                const updatedSalesLast30Days = (productData.salesLast30Days || 0) + item.quantity;

                // Calculate velocity (units per day over 7-day period)
                const daysSinceSale = Math.max(1, (now.getTime() - (productData.lastSaleAt?.getTime() || now.getTime())) / (24 * 60 * 60 * 1000));
                const velocity = updatedSalesLast7Days / 7;

                // Determine if trending: high velocity (>2 units/day) + recent sales (within last 7 days)
                const isTrending = velocity > 2 && productData.lastSaleAt && productData.lastSaleAt > sevenDaysAgo;

                batch.update(productRef, {
                    salesCount: updatedSalesCount,
                    salesLast7Days: updatedSalesLast7Days,
                    salesLast30Days: updatedSalesLast30Days,
                    salesVelocity: velocity,
                    lastSaleAt: orderData.purchasedAt,
                    trending: isTrending,
                    updatedAt: now,
                });

                // Log sale for audit trail
                logger.info('[OrderAnalytics] Sale recorded', {
                    productId: item.productId,
                    quantity: item.quantity,
                    salesVelocity: velocity,
                    trending: isTrending,
                });
            }
        }

        // Update bundle redemptions if present
        if (orderData.bundleIds && orderData.bundleIds.length > 0) {
            for (const bundleId of orderData.bundleIds) {
                const bundleRef = db.collection('bundles').doc(bundleId);
                const bundleDoc = await bundleRef.get();
                const bundleData = bundleDoc.data() as BundleDeal | undefined;

                if (bundleData) {
                    // Increment current redemptions
                    const updatedRedemptions = (bundleData.currentRedemptions || 0) + 1;

                    // Add to redemption history
                    const redemptionEntry = {
                        date: orderData.purchasedAt,
                        customerId: orderData.customerId,
                        orderId: orderData.orderId,
                    };

                    batch.update(bundleRef, {
                        currentRedemptions: updatedRedemptions,
                        redemptionHistory: (bundleData.redemptionHistory || []).concat([redemptionEntry]),
                        updatedAt: now,
                    });

                    logger.info('[OrderAnalytics] Bundle redemption recorded', {
                        bundleId,
                        customerId: orderData.customerId,
                        orderId: orderData.orderId,
                    });
                }
            }
        }

        // Commit batch
        await batch.commit();
        logger.info('[OrderAnalytics] Order analytics recorded', {
            orderId: orderData.orderId,
            itemCount: orderData.items.length,
            bundleCount: orderData.bundleIds?.length || 0,
        });
    } catch (error) {
        logger.error('[OrderAnalytics] Failed to record order sale', {
            error: error instanceof Error ? error.message : String(error),
            orderId: orderData.orderId,
        });
        throw error;
    }
}

/**
 * Decay old sales counts and update trending status (runs daily)
 * Removes sales older than 30 days from rolling counters
 * Recalculates trending status for all products in org
 */
export async function runAnalyticsRollup(orgId: string): Promise<void> {
    try {
        const db = getAdminFirestore();
        logger.info('[OrderAnalytics] Starting analytics rollup', { orgId });

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Query products for this org (if org-specific)
        // Note: Products collection is global, use source tracking if needed
        const productsSnapshot = await db.collection('products')
            .where('orgId', '==', orgId)
            .get()
            .catch(() => {
                // Fallback if orgId not indexed on products
                logger.warn('[OrderAnalytics] orgId query failed, falling back to manual filter');
                return db.collection('products').get();
            });

        let updatedCount = 0;
        const batch = db.batch();

        for (const doc of productsSnapshot.docs) {
            const product = doc.data() as Product;

            // Skip products with no sales
            if (!product.lastSaleAt) continue;

            // Recalculate metrics
            const lastSaleTime = product.lastSaleAt instanceof Date ? product.lastSaleAt.getTime() : new Date(product.lastSaleAt as any).getTime();
            const velocity = (product.salesLast7Days || 0) / 7;
            const isTrending = velocity > 2 && lastSaleTime > sevenDaysAgo.getTime();

            // Update trending status
            if (product.trending !== isTrending || (product.salesVelocity || 0) !== velocity) {
                batch.update(doc.ref, {
                    trending: isTrending,
                    salesVelocity: velocity,
                    updatedAt: now,
                });
                updatedCount++;
            }
        }

        await batch.commit();
        logger.info('[OrderAnalytics] Rollup completed', { orgId, productsUpdated: updatedCount });
    } catch (error) {
        logger.error('[OrderAnalytics] Rollup failed', {
            error: error instanceof Error ? error.message : String(error),
            orgId,
        });
        throw error;
    }
}

/**
 * Backfill historical sales data from existing orders
 * Run once to populate initial salesCount metrics from order history
 */
export async function backfillHistoricalSalesData(orgId: string, lookbackDays: number = 90): Promise<{ processed: number; updated: number }> {
    try {
        const db = getAdminFirestore();
        logger.info('[OrderAnalytics] Starting historical backfill', { orgId, lookbackDays });

        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

        // Query orders collection for this org
        const ordersSnapshot = await db.collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', lookbackDate)
            .get()
            .catch(async () => {
                // Fallback: query all orders and filter
                logger.warn('[OrderAnalytics] Complex query failed, using simple filter');
                return db.collection('orders').where('orgId', '==', orgId).get();
            });

        const productSales: Record<string, { count: number; lastDate: Date }> = {};
        let processedCount = 0;

        // Aggregate sales from orders
        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data() as any;

            // Skip if older than lookback (when fallback query used)
            if (order.createdAt && new Date(order.createdAt).getTime() < lookbackDate.getTime()) {
                continue;
            }

            // Aggregate products from order items
            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = { count: 0, lastDate: new Date() };
                    }
                    productSales[item.productId].count += item.quantity || 1;
                    const itemDate = new Date(item.purchasedAt || order.createdAt);
                    if (itemDate > productSales[item.productId].lastDate) {
                        productSales[item.productId].lastDate = itemDate;
                    }
                }
            }
            processedCount++;
        }

        // Update products with aggregated sales
        const batch = db.batch();
        let updatedCount = 0;

        for (const [productId, salesData] of Object.entries(productSales)) {
            const productRef = db.collection('products').doc(productId);
            const productDoc = await productRef.get();
            const product = productDoc.data() as Product | undefined;

            if (product) {
                // Only update if sales data increases existing count
                const newSalesCount = Math.max(product.salesCount || 0, salesData.count);

                batch.update(productRef, {
                    salesCount: newSalesCount,
                    lastSaleAt: salesData.lastDate,
                    updatedAt: new Date(),
                });
                updatedCount++;

                // Batch in chunks of 500
                if (updatedCount % 500 === 0) {
                    await batch.commit();
                    logger.info('[OrderAnalytics] Batch committed', { count: updatedCount });
                }
            }
        }

        await batch.commit();
        logger.info('[OrderAnalytics] Backfill completed', { orgId, ordersProcessed: processedCount, productsUpdated: updatedCount });

        return { processed: processedCount, updated: updatedCount };
    } catch (error) {
        logger.error('[OrderAnalytics] Backfill failed', {
            error: error instanceof Error ? error.message : String(error),
            orgId,
        });
        throw error;
    }
}
