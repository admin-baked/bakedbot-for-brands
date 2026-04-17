'use server';

import { getAdminFirestore } from '@/firebase/admin';
import type { BundleDeal } from '@/types/bundles';
import type { Product } from '@/types/products';
import { logger } from '@/lib/logger';
import { toAnalyticsDate } from '@/server/services/catalog-analytics-source';
import { buildTenantPosProductDocId } from '@/server/services/pos-product-doc-id';

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

type AnalyticsProductDoc = Partial<Product> & Record<string, unknown>;

type HistoricalOrderRecord = {
    createdAt?: unknown;
    items?: Array<Record<string, unknown>>;
};

type AggregatedProductSales = {
    count: number;
    salesLast7Days: number;
    salesLast30Days: number;
    lastDate: Date | null;
};

function toNonNegativeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(value, 0)
        : 0;
}

function toPositiveQuantity(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return 1;
}

function getHistoricalItemProductId(item: Record<string, unknown>): string | null {
    const candidate = item.productId ?? item.product_id ?? item.id_item;
    return typeof candidate === 'string' && candidate.trim().length > 0
        ? candidate.trim()
        : null;
}

function getHistoricalItemDate(
    item: Record<string, unknown>,
    order: HistoricalOrderRecord,
): Date | null {
    return toAnalyticsDate(item.purchasedAt) ?? toAnalyticsDate(order.createdAt);
}

async function resolveAnalyticsProductTargets(
    db: FirebaseFirestore.Firestore,
    orgId: string,
    externalProductId: string,
): Promise<Array<{
    ref: FirebaseFirestore.DocumentReference;
    data: AnalyticsProductDoc;
}>> {
    const targets: Array<{
        ref: FirebaseFirestore.DocumentReference;
        data: AnalyticsProductDoc;
    }> = [];
    const seenPaths = new Set<string>();

    const candidateRefs = [
        db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .doc(buildTenantPosProductDocId(orgId, externalProductId)),
        db.collection('products').doc(externalProductId),
    ];

    for (const ref of candidateRefs) {
        const snap = await ref.get();
        if (!snap.exists || seenPaths.has(ref.path)) {
            continue;
        }

        seenPaths.add(ref.path);
        targets.push({
            ref,
            data: (snap.data() ?? {}) as AnalyticsProductDoc,
        });
    }

    return targets;
}

async function queryHistoricalOrdersByField(
    db: FirebaseFirestore.Firestore,
    field: 'brandId' | 'orgId' | 'retailerId',
    orgId: string,
    lookbackDate: Date,
): Promise<HistoricalOrderRecord[]> {
    try {
        const snap = await db.collection('orders')
            .where(field, '==', orgId)
            .where('createdAt', '>=', lookbackDate)
            .get();

        return snap.docs.map((doc) => doc.data() as HistoricalOrderRecord);
    } catch (error) {
        logger.warn('[OrderAnalytics] Historical order query failed, retrying without createdAt filter', {
            orgId,
            field,
            error: error instanceof Error ? error.message : String(error),
        });

        const fallback = await db.collection('orders')
            .where(field, '==', orgId)
            .get()
            .catch((fallbackError) => {
                logger.error('[OrderAnalytics] Historical order fallback query failed', {
                    orgId,
                    field,
                    error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                });
                return null;
            });

        if (!fallback) {
            return [];
        }

        return fallback.docs
            .map((doc) => doc.data() as HistoricalOrderRecord)
            .filter((order) => {
                const createdAt = toAnalyticsDate(order.createdAt);
                return createdAt instanceof Date && createdAt >= lookbackDate;
            });
    }
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

        // Update product sales counts
        for (const item of orderData.items) {
            const targets = await resolveAnalyticsProductTargets(db, orgId, item.productId);

            if (targets.length === 0) {
                logger.warn('[OrderAnalytics] No analytics product target found for sale', {
                    orgId,
                    productId: item.productId,
                    orderId: orderData.orderId,
                });
                continue;
            }

            const primary = targets[0].data;
            const updatedSalesCount = toNonNegativeNumber(primary.salesCount) + item.quantity;
            const updatedSalesLast7Days = toNonNegativeNumber(primary.salesLast7Days) + item.quantity;
            const updatedSalesLast30Days = toNonNegativeNumber(primary.salesLast30Days) + item.quantity;
            const velocity = updatedSalesLast7Days / 7;
            const isTrending = velocity > 2 && orderData.purchasedAt > sevenDaysAgo;

            for (const target of targets) {
                batch.set(target.ref, {
                    salesCount: updatedSalesCount,
                    salesLast7Days: updatedSalesLast7Days,
                    salesLast30Days: updatedSalesLast30Days,
                    salesVelocity: velocity,
                    lastSaleAt: orderData.purchasedAt,
                    trending: isTrending,
                    updatedAt: now,
                }, { merge: true });
            }

            logger.info('[OrderAnalytics] Sale recorded', {
                orgId,
                orderId: orderData.orderId,
                productId: item.productId,
                quantity: item.quantity,
                targetsUpdated: targets.length,
                salesVelocity: velocity,
                trending: isTrending,
            });
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
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const queryPlans: Array<'brandId' | 'orgId' | 'retailerId'> = ['brandId', 'orgId', 'retailerId'];
        let orders: HistoricalOrderRecord[] = [];
        let queryFieldUsed: 'brandId' | 'orgId' | 'retailerId' | null = null;

        for (const field of queryPlans) {
            const candidateOrders = await queryHistoricalOrdersByField(db, field, orgId, lookbackDate);
            if (candidateOrders.length === 0) {
                continue;
            }

            orders = candidateOrders;
            queryFieldUsed = field;
            break;
        }

        if (orders.length === 0) {
            logger.info('[OrderAnalytics] No historical orders found for backfill', { orgId, lookbackDays });
            return { processed: 0, updated: 0 };
        }

        const tenantCatalogSnapshot = await db.collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .limit(2000)
            .get();
        const tenantTargets = new Map<string, FirebaseFirestore.DocumentReference>();

        for (const doc of tenantCatalogSnapshot.docs) {
            tenantTargets.set(doc.id, doc.ref);

            const externalId = doc.get('externalId');
            if (typeof externalId === 'string' && externalId.trim().length > 0) {
                tenantTargets.set(externalId.trim(), doc.ref);
            }
        }

        const productSales: Record<string, AggregatedProductSales> = {};
        let processedCount = 0;

        // Aggregate sales from orders
        for (const order of orders) {
            // Aggregate products from order items
            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                    const productId = getHistoricalItemProductId(item);
                    if (!productId) {
                        continue;
                    }

                    const quantity = toPositiveQuantity(item.quantity ?? item.qty);
                    const itemDate = getHistoricalItemDate(item, order);
                    if (!itemDate) {
                        continue;
                    }

                    if (!productSales[productId]) {
                        productSales[productId] = {
                            count: 0,
                            salesLast7Days: 0,
                            salesLast30Days: 0,
                            lastDate: null,
                        };
                    }

                    productSales[productId].count += quantity;
                    if (itemDate >= sevenDaysAgo) {
                        productSales[productId].salesLast7Days += quantity;
                    }
                    if (itemDate >= thirtyDaysAgo) {
                        productSales[productId].salesLast30Days += quantity;
                    }
                    if (!productSales[productId].lastDate || itemDate > productSales[productId].lastDate) {
                        productSales[productId].lastDate = itemDate;
                    }
                }
            }
            processedCount++;
        }

        // Update products with aggregated sales
        let batch = db.batch();
        let batchOps = 0;
        let updatedCount = 0;
        let unresolvedProducts = 0;

        for (const [productId, salesData] of Object.entries(productSales)) {
            if (!(salesData.lastDate instanceof Date)) {
                continue;
            }

            const tenantRef = tenantTargets.get(productId)
                ?? tenantTargets.get(buildTenantPosProductDocId(orgId, productId));

            if (!tenantRef) {
                unresolvedProducts++;
                continue;
            }

            const salesVelocity = salesData.salesLast7Days / 7;
            const isTrending = salesVelocity > 2 && salesData.lastDate > sevenDaysAgo;

            batch.set(tenantRef, {
                salesCount: salesData.count,
                salesLast7Days: salesData.salesLast7Days,
                salesLast30Days: salesData.salesLast30Days,
                salesVelocity,
                lastSaleAt: salesData.lastDate,
                trending: isTrending,
                updatedAt: new Date(),
            }, { merge: true });
            batchOps++;

            updatedCount++;

            if (batchOps >= 400) {
                await batch.commit();
                logger.info('[OrderAnalytics] Backfill batch committed', {
                    orgId,
                    productsUpdated: updatedCount,
                    batchOps,
                });
                batch = db.batch();
                batchOps = 0;
            }
        }

        if (batchOps > 0) {
            await batch.commit();
        }

        logger.info('[OrderAnalytics] Backfill completed', {
            orgId,
            lookbackDays,
            queryFieldUsed,
            ordersProcessed: processedCount,
            productsUpdated: updatedCount,
            unresolvedProducts,
            tenantCatalogProducts: tenantCatalogSnapshot.size,
        });

        return { processed: processedCount, updated: updatedCount };
    } catch (error) {
        logger.error('[OrderAnalytics] Backfill failed', {
            error: error instanceof Error ? error.message : String(error),
            orgId,
        });
        throw error;
    }
}
