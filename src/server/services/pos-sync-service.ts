/**
 * POS Sync Service
 *
 * Background service to periodically sync customer and order data
 * from POS systems (Alleaves) to keep dashboard data fresh
 */

import 'server-only';
import { createServerClient } from '@/firebase/server-client';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { logger } from '@/lib/logger';
import { invalidateCache, CachePrefix } from '@/lib/cache';
import { recordProductSale } from '@/server/services/order-analytics';

export interface SyncResult {
    success: boolean;
    orgId: string;
    customersCount?: number;
    ordersCount?: number;
    error?: string;
    duration?: number;
}

interface POSIntegrationStatusUpdate {
    status: 'success' | 'error';
    provider?: string;
    lastError?: string | null;
    customersCount?: number;
    ordersCount?: number;
}

async function persistPOSIntegrationStatus(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    update: POSIntegrationStatusUpdate
): Promise<void> {
    const now = new Date();

    try {
        await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('integrations')
            .doc('pos')
            .set(
                {
                    provider: update.provider || 'alleaves',
                    status: update.status,
                    lastAttemptAt: now,
                    ...(update.status === 'success' ? { lastSyncAt: now } : {}),
                    lastError: update.lastError ?? null,
                    customersCount: update.customersCount ?? null,
                    ordersCount: update.ordersCount ?? null,
                    updatedAt: now,
                },
                { merge: true }
            );
    } catch (error: any) {
        logger.warn('[POS_SYNC] Failed to persist integration status', {
            orgId,
            error: error?.message || String(error),
        });
    }
}

/**
 * Persist Alleaves orders to Firestore `orders` collection.
 * Uses batched upserts (merge) keyed by Alleaves order ID so re-syncs are idempotent.
 * Alleaves field names differ from the ALLeavesOrder TypeScript type:
 *   - date_created  (not created_at)
 *   - date_updated  (not updated_at)
 *   - id_customer   (flat, not nested customer object)
 */
async function persistOrdersToFirestore(
    firestore: FirebaseFirestore.Firestore,
    orgId: string,
    locationId: string,
    rawOrders: any[]
): Promise<void> {
    const { Timestamp } = await import('firebase-admin/firestore');
    const BATCH_SIZE = 400; // Firestore batch limit is 500
    let batch = firestore.batch();
    let batchCount = 0;
    let total = 0;
    const ordersToTrack: { orderId: string; customerId: string; items: Array<{ productId: string; qty: number; price: number }>; totalAmount: number; purchasedAt: Date }[] = []; // Track orders for sales analytics

    const mapStatus = (s: string): string => {
        const map: Record<string, string> = {
            pending: 'pending', submitted: 'submitted', confirmed: 'confirmed',
            preparing: 'preparing', ready: 'ready', completed: 'completed',
            cancelled: 'cancelled', processing: 'preparing', delivered: 'completed',
        };
        return map[s?.toLowerCase()] || 'pending';
    };

    for (const ao of rawOrders) {
        const orderId = ao.id?.toString() || ao.id_order?.toString();
        if (!orderId) continue;

        const docId = `alleaves_${orderId}`;
        const rawDate = ao.date_created || ao.created_at;
        const rawUpdated = ao.date_updated || ao.updated_at || rawDate;
        const orderDate = rawDate ? new Date(rawDate) : new Date();
        const updatedDate = rawUpdated ? new Date(rawUpdated) : orderDate;

        const customerName =
            ao.customer?.name ||
            `${ao.customer?.first_name || ao.name_first || ao.customer_first_name || ''} ${ao.customer?.last_name || ao.name_last || ao.customer_last_name || ''}`.trim() ||
            ao.customer_name || 'Unknown';
        const customerEmail = ao.customer?.email || ao.email || ao.customer_email || 'no-email@alleaves.local';
        const customerPhone = ao.customer?.phone || ao.phone || ao.customer_phone || '';

        const items = (ao.items || []).map((item: any) => ({
            productId: item.id_item?.toString() || item.product_id?.toString() || 'unknown',
            name: item.item || item.product_name || 'Unknown Item',
            qty: parseInt(item.quantity || 1),
            price: parseFloat(item.price || item.unit_price || 0),
            category: item.category || 'other',
        }));

        const docRef = firestore.collection('orders').doc(docId);
        batch.set(docRef, {
            id: docId,
            brandId: orgId,
            retailerId: locationId,
            userId: ao.customer?.id?.toString() || ao.id_customer?.toString() || 'alleaves_customer',
            status: mapStatus(ao.status),
            customer: { name: customerName, email: customerEmail, phone: customerPhone },
            items,
            totals: {
                subtotal: parseFloat(ao.subtotal || 0),
                tax: parseFloat(ao.tax || 0),
                discount: parseFloat(ao.discount || 0),
                total: parseFloat(ao.total || ao.amount || 0),
            },
            mode: 'live',
            source: 'alleaves',
            createdAt: Timestamp.fromDate(orderDate),
            updatedAt: Timestamp.fromDate(updatedDate),
        }, { merge: true }); // merge so status updates from BakedBot aren't overwritten

        // Track order for sales analytics (only completed/ready orders)
        const status = mapStatus(ao.status);
        if (status === 'completed' || status === 'ready') {
            ordersToTrack.push({
                orderId: docId,
                customerId: ao.customer?.id?.toString() || ao.id_customer?.toString() || 'alleaves_customer',
                items,
                totalAmount: parseFloat(ao.total || ao.amount || 0),
                purchasedAt: orderDate,
            });
        }

        batchCount++;
        total++;

        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = firestore.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    logger.info('[POS_SYNC] Persisted orders to Firestore', { orgId, total });

    // Record sales analytics for completed orders (async, don't block)
    if (ordersToTrack.length > 0) {
        setImmediate(async () => {
            try {
                for (const order of ordersToTrack) {
                    try {
                        await recordProductSale(orgId, {
                            customerId: order.customerId,
                            orderId: order.orderId,
                            items: order.items.map(item => ({
                                productId: item.productId,
                                quantity: item.qty,
                                price: item.price,
                            })),
                            totalAmount: order.totalAmount,
                            purchasedAt: order.purchasedAt,
                        });
                    } catch (error) {
                        logger.warn('[POS_SYNC] Failed to record sale for order', {
                            orderId: order.orderId,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
                logger.info('[POS_SYNC] Sales analytics recorded', { orgId, ordersTracked: ordersToTrack.length });
            } catch (error) {
                logger.error('[POS_SYNC] Sales tracking batch failed', {
                    orgId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
    }
}

/**
 * Sync customers and orders for a specific organization
 */
export async function syncOrgPOSData(orgId: string): Promise<SyncResult> {
    const startTime = Date.now();
    let firestore: FirebaseFirestore.Firestore | null = null;

    try {
        const serverClient = await createServerClient();
        firestore = serverClient.firestore;

        // Get location with POS config
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            logger.warn('[POS_SYNC] No location found for org', { orgId });
            await persistPOSIntegrationStatus(firestore, orgId, {
                status: 'error',
                lastError: 'No location found',
            });
            return {
                success: false,
                orgId,
                error: 'No location found',
                duration: Date.now() - startTime,
            };
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
            logger.info('[POS_SYNC] No active Alleaves POS config', { orgId });
            await persistPOSIntegrationStatus(firestore, orgId, {
                status: 'error',
                provider: posConfig?.provider,
                lastError: 'No active POS config',
            });
            return {
                success: false,
                orgId,
                error: 'No active POS config',
                duration: Date.now() - startTime,
            };
        }

        // Initialize Alleaves client
        const alleavesConfig: ALLeavesConfig = {
            apiKey: posConfig.apiKey,
            username: posConfig.username || process.env.ALLEAVES_USERNAME,
            password: posConfig.password || process.env.ALLEAVES_PASSWORD,
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // Fetch customers and orders in parallel
        // Fetch up to 10k orders to capture full history on each sync
        const [customers, orders] = await Promise.all([
            client.getAllCustomersPaginated(30).catch(err => {
                logger.error('[POS_SYNC] Failed to fetch customers', { orgId, error: err.message });
                return [];
            }),
            client.getAllOrders(10000).catch(err => {
                logger.error('[POS_SYNC] Failed to fetch orders', { orgId, error: err.message });
                return [];
            }),
        ]);

        // Persist orders to Firestore so historical data accumulates across syncs
        // Alleaves orders are NOT stored anywhere between page loads without this
        if (orders.length > 0) {
            await persistOrdersToFirestore(firestore, orgId, posConfig.locationId, orders);
        }

        // Invalidate existing cache to force refresh on next request
        posCache.invalidate(cacheKeys.customers(orgId));
        posCache.invalidate(cacheKeys.orders(orgId));

        await persistPOSIntegrationStatus(firestore, orgId, {
            status: 'success',
            provider: posConfig.provider,
            lastError: null,
            customersCount: customers.length,
            ordersCount: orders.length,
        });

        logger.info('[POS_SYNC] Successfully synced POS data', {
            orgId,
            customersCount: customers.length,
            ordersCount: orders.length,
            duration: Date.now() - startTime,
        });

        // Invalidate products cache so public API serves fresh data
        await invalidateCache(CachePrefix.PRODUCTS, orgId);
        logger.info('[POS_SYNC] Invalidated products cache', { orgId });

        return {
            success: true,
            orgId,
            customersCount: customers.length,
            ordersCount: orders.length,
            duration: Date.now() - startTime,
        };
    } catch (error: any) {
        logger.error('[POS_SYNC] Sync failed', {
            orgId,
            error: error.message,
            duration: Date.now() - startTime,
        });

        if (firestore) {
            await persistPOSIntegrationStatus(firestore, orgId, {
                status: 'error',
                lastError: error.message,
            });
        }

        return {
            success: false,
            orgId,
            error: error.message,
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Sync all organizations with active POS integrations
 */
export async function syncAllPOSData(): Promise<SyncResult[]> {
    try {
        const { firestore } = await createServerClient();

        // Find all locations with active Alleaves POS config
        const locationsSnap = await firestore.collection('locations')
            .where('posConfig.provider', '==', 'alleaves')
            .where('posConfig.status', '==', 'active')
            .get();

        if (locationsSnap.empty) {
            logger.info('[POS_SYNC] No active POS integrations found');
            return [];
        }

        // Get unique org IDs
        const orgIds = new Set<string>();
        locationsSnap.docs.forEach(doc => {
            const orgId = doc.data().orgId;
            if (orgId) {
                orgIds.add(orgId);
            }
        });

        logger.info('[POS_SYNC] Starting batch sync', {
            orgCount: orgIds.size,
            locationCount: locationsSnap.size,
        });

        // Sync each org sequentially to avoid overwhelming the POS API
        const results: SyncResult[] = [];
        for (const orgId of orgIds) {
            const result = await syncOrgPOSData(orgId);
            results.push(result);

            // Small delay between syncs to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const successCount = results.filter(r => r.success).length;
        logger.info('[POS_SYNC] Batch sync completed', {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount,
        });

        return results;
    } catch (error: any) {
        logger.error('[POS_SYNC] Batch sync failed', { error: error.message });
        return [];
    }
}
