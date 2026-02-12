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
        const [customers, orders] = await Promise.all([
            client.getAllCustomersPaginated(30).catch(err => {
                logger.error('[POS_SYNC] Failed to fetch customers', { orgId, error: err.message });
                return [];
            }),
            client.getAllOrders(100).catch(err => {
                logger.error('[POS_SYNC] Failed to fetch orders', { orgId, error: err.message });
                return [];
            }),
        ]);

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
