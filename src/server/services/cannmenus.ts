import { createServerClient } from '@/firebase/server-client';
import { RetailerDoc, ProductDoc, CannMenusProduct } from '@/types/cannmenus';
import { v4 as uuidv4 } from 'uuid';
import { withRetry, RateLimiter } from '@/lib/retry-utility';
import { logger, reportError, monitorApiCall, perfMonitor } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';
import { getPlanLimits } from '@/lib/plan-limits';

const CANNMENUS_BASE_URL = process.env.CANNMENUS_API_BASE || 'https://api.cannmenus.com';
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

// Rate limiter to prevent overwhelming CannMenus API
const rateLimiter = new RateLimiter(5, 200); // Max 5 concurrent, 200ms between requests

export interface SyncResult {
    success: boolean;
    brandId: string;
    retailersProcessed: number;
    productsProcessed: number;
    errors: string[];
    startTime: Date;
    endTime: Date;
    isIncremental: boolean;
}

export interface SyncOptions {
    forceFullSync?: boolean;
    maxRetailers?: number;
    planId?: string; // Add planId to options
}

/**
 * Custom error type for API errors with status code
 */
export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/**
 * Search parameters for CannMenus API
 */
export interface SearchParams {
    search?: string;
    category?: string;
    price_min?: number;
    price_max?: number;
    retailers?: string;
    brands?: string;
    limit?: number;
    page?: number;
}

export class CannMenusService {

    /**
     * Sync menus for a specific brand with enhanced error handling and incremental capabilities
     */
    async syncMenusForBrand(
        brandId: string,
        brandName: string,
        options: SyncOptions = {}
    ): Promise<SyncResult> {
        // ... implementation

        // Get plan limits
        const planId = options.planId || 'free';
        const limits = getPlanLimits(planId);

        // Use limits or explicit options
        const maxRetailers = options.maxRetailers || limits.maxRetailers;
        const maxProducts = limits.maxProducts;

        logger.info('Syncing menu with limits', { brandId, planId, maxRetailers, maxProducts });
        const startTime = new Date();
        const errors: string[] = [];
        let retailersProcessed = 0;
        let productsProcessed = 0;

        // Create sync status record
        const syncId = await this.createSyncStatus(brandId, brandName);

        try {
            logger.info('Starting CannMenus sync', {
                brandId,
                brandName,
                syncId,
                forceFullSync: options.forceFullSync
            });

            // Check last sync time for incremental sync
            const lastSyncTime = options.forceFullSync
                ? null
                : await this.getLastSuccessfulSync(brandId);

            const isIncremental = !!lastSyncTime;

            if (isIncremental) {
                logger.info('Performing incremental sync', {
                    brandId,
                    lastSyncTime: lastSyncTime.toISOString()
                });
            }

            // Step 1: Find retailers with retry logic
            perfMonitor.start('cannmenus.findRetailers');
            let retailers = await this.findRetailersCarryingBrand(brandName, maxRetailers);

            // Enforce strict limit on the result even if API returns more
            if (retailers.length > maxRetailers) {
                logger.info(`Limiting retailers from ${retailers.length} to ${maxRetailers} based on plan ${planId}`);
                retailers = retailers.slice(0, maxRetailers);
            }

            perfMonitor.end('cannmenus.findRetailers');

            logger.info(`Found ${retailers.length} retailers`, { brandId, count: retailers.length });

            // Step 2: Store retailers with error handling
            try {
                await this.storeRetailers(retailers);
                retailersProcessed = retailers.length;
            } catch (error: any) {
                const errMsg = `Failed to store retailers: ${error.message}`;
                errors.push(errMsg);
                reportError(error, { operation: 'storeRetailers', brandId });
            }

            // Step 3: Sync each retailer's menu with rate limiting
            for (let i = 0; i < retailers.length; i++) {
                const retailer = retailers[i];
                try {
                    // Update progress
                } catch (error: any) {
                    const errMsg = `Failed sync for retailer ${retailer.name}: ${error.message}`;
                    errors.push(errMsg);
                    logger.error(errMsg, { brandId, retailerId: retailer.id, error: error.message });
                    // Continue with other retailers instead of failing completely
                }
            }

            // Mark sync as complete
            const endTime = new Date();
            await this.completeSyncStatus(syncId, {
                status: errors.length > 0 ? 'completed_with_errors' : 'completed',
                retailersProcessed,
                productsProcessed,
                errors,
                endTime
            });

            logger.info('CannMenus sync completed', {
                brandId,
                syncId,
                retailersProcessed,
                productsProcessed,
                errors: errors.length,
                duration: endTime.getTime() - startTime.getTime()
            });

            return {
                success: errors.length === 0,
                brandId,
                retailersProcessed,
                productsProcessed,
                errors,
                startTime,
                endTime,
                isIncremental
            };

        } catch (error: any) {
            // Fatal error - mark sync as failed
            const endTime = new Date();
            await this.failSyncStatus(syncId, error.message);

            reportError(error, {
                operation: 'syncMenusForBrand',
                brandId,
                brandName
            });

            return {
                success: false,
                brandId,
                retailersProcessed,
                productsProcessed,
                errors: [error.message, ...errors],
                startTime,
                endTime,
                isIncremental: false
            };
        }
    }

    /**
     * Find retailers carrying a brand with retry logic
     */
    /**
     * Find retailers carrying a brand with retry logic
     */
    public async findRetailersCarryingBrand(
        brandName: string,
        maxRetailers?: number
    ): Promise<RetailerDoc[]> {
        if (!CANNMENUS_API_KEY) {
            throw new Error('CANNMENUS_API_KEY is not configured');
        }

        return await withRetry(async () => {
            return await monitorApiCall('/v2/products', async () => {
                const params = new URLSearchParams({
                    brand_name: brandName,
                    limit: String(maxRetailers || 50)
                });

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                try {
                    const response = await fetch(`${CANNMENUS_BASE_URL}/v2/products?${params}`, {
                        headers: {
                            'X-Token': CANNMENUS_API_KEY,
                            'Accept': 'application/json',
                            'User-Agent': 'BakedBot/1.0',
                        },
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new ApiError(`CannMenus API error: ${response.statusText}`, response.status);
                    }

                    const data = await response.json();
                    const retailersMap = new Map<string, RetailerDoc>();

                    if (data.data?.data) {
                        data.data.data.forEach((item: any) => {
                            if (!retailersMap.has(item.retailer_id)) {
                                retailersMap.set(item.retailer_id, {
                                    id: item.retailer_id.toString(),
                                    name: item.name,
                                    state: item.state,
                                    city: item.city,
                                    postal_code: item.postal_code || '',
                                    country: 'US',
                                    street_address: item.address || '',
                                    homepage_url: item.homepage_url,
                                    menu_url: item.menu_url,
                                    menu_discovery_status: 'found',
                                    geo: {
                                        lat: item.latitude,
                                        lng: item.longitude
                                    },
                                    phone: item.phone,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                });
                            }
                        });
                    }

                    return Array.from(retailersMap.values());
                } finally {
                    clearTimeout(timeoutId);
                }
            });
        }, {
            maxRetries: 3,
            initialDelayMs: 1000
        }, 'CannMenus.findRetailersCarryingBrand');
    }

    /**
     * Search products directly from CannMenus API
     */
    async searchProducts(params: SearchParams): Promise<{ products: CannMenusProduct[], meta?: Record<string, unknown> }> {
        if (!CANNMENUS_API_KEY) {
            throw new Error('CANNMENUS_API_KEY is not configured');
        }

        return await withRetry(async () => {
            return await monitorApiCall('/v2/products', async () => {
                const queryParams = new URLSearchParams();
                if (params.search) queryParams.set('search', params.search);
                if (params.category) queryParams.set('category', params.category);
                if (params.price_min) queryParams.set('price_min', String(params.price_min));
                if (params.price_max) queryParams.set('price_max', String(params.price_max));
                if (params.retailers) queryParams.set('retailers', params.retailers);
                if (params.brands) queryParams.set('brands', params.brands);
                if (params.limit) queryParams.set('limit', String(params.limit));
                if (params.page) queryParams.set('page', String(params.page));

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for search

                try {
                    const response = await fetch(`${CANNMENUS_BASE_URL}/v2/products?${queryParams}`, {
                        headers: {
                            'X-Token': CANNMENUS_API_KEY,
                            'Accept': 'application/json',
                            'User-Agent': 'BakedBot/1.0',
                        },
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new ApiError(`CannMenus API error: ${response.statusText}`, response.status);
                    }

                    const data = await response.json();
                    return {
                        products: data.data?.products || data.data || [],
                        meta: data.meta
                    };
                } finally {
                    clearTimeout(timeoutId);
                }
            });
        }, {
            maxRetries: 2,
            initialDelayMs: 500
        }, 'CannMenus.searchProducts');
    }

    /**
     * Store retailers in Firestore with error handling
     */
    private async storeRetailers(retailers: RetailerDoc[]): Promise<void> {
        const { firestore } = await createServerClient();

        return await withRetry(async () => {
            const chunkSize = 400;
            for (let i = 0; i < retailers.length; i += chunkSize) {
                const chunk = retailers.slice(i, i + chunkSize);
                const batch = firestore.batch();

                chunk.forEach(retailer => {
                    const ref = firestore.collection('retailers').doc(retailer.id);
                    batch.set(ref, retailer, { merge: true });
                });

                await batch.commit();
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 500
        }, 'CannMenus.storeRetailers');
    }

    /**
     * Sync a single retailer's menu with retry and incremental support
     */
    private async syncRetailerMenu(
        retailerId: string,
        brandName: string,
        brandId: string,
        lastSyncTime: Date | null,
        maxProducts?: number
    ): Promise<number> {
        return await withRetry(async () => {
            const params = new URLSearchParams({
                retailers: retailerId,
                brand_name: brandName
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(`${CANNMENUS_BASE_URL}/v2/products?${params}`, {
                    headers: {
                        'X-Token': CANNMENUS_API_KEY!,
                        'Accept': 'application/json',
                        'User-Agent': 'BakedBot/1.0',
                    },
                    signal: controller.signal
                });

                if (!response.ok) {
                    const error: any = new Error(`CannMenus API error: ${response.statusText}`);
                    error.status = response.status;
                    throw error;
                }

                const data = await response.json();
                const products: ProductDoc[] = [];

                if (data.data?.data) {
                    data.data.data.forEach((item: any) => {
                        if (item.products && Array.isArray(item.products)) {
                            item.products.forEach((p: CannMenusProduct) => {
                                products.push({
                                    id: uuidv4(),
                                    brand_id: brandId,
                                    sku_id: p.cann_sku_id,
                                    canonical_name: p.product_name,
                                    name: p.product_name,
                                    category: p.category,
                                    imageUrl: p.image_url,
                                    price: p.latest_price,
                                    thcPercent: p.percentage_thc,
                                    cbdPercent: p.percentage_cbd,
                                    retailerIds: [retailerId],
                                    createdAt: new Date()
                                });
                            });
                        }
                    });
                }

                if (maxProducts && products.length > maxProducts) {
                    logger.info(`Limiting products from ${products.length} to ${maxProducts} for retailer ${retailerId}`);
                    // Truncate products array
                    products.length = maxProducts;
                }

                await this.storeProducts(products);
                return products.length;

            } finally {
                clearTimeout(timeoutId);
            }
        }, {
            maxRetries: 3,
            initialDelayMs: 1000
        }, `CannMenus.syncRetailerMenu.${retailerId}`);
    }

    /**
     * Store products in Firestore with deduplication
     */
    private async storeProducts(products: ProductDoc[]): Promise<void> {
        if (products.length === 0) return;

        const { firestore } = await createServerClient();

        return await withRetry(async () => {
            const chunkSize = 400;
            for (let i = 0; i < products.length; i += chunkSize) {
                const chunk = products.slice(i, i + chunkSize);
                const batch = firestore.batch();

                chunk.forEach(product => {
                    const docId = `${product.brand_id}_${product.sku_id}`;
                    const ref = firestore.collection('products').doc(docId);

                    batch.set(ref, {
                        ...product,
                        id: docId,
                        updatedAt: new Date()
                    }, { merge: true });
                });

                await batch.commit();
            }
        }, {
            maxRetries: 2,
            initialDelayMs: 500
        }, 'CannMenus.storeProducts');
    }

    // ===== Sync Status Tracking =====

    private async createSyncStatus(brandId: string, brandName: string): Promise<string> {
        const { firestore } = await createServerClient();
        const syncDoc = firestore.collection('sync_status').doc();

        await syncDoc.set({
            brandId,
            brandName,
            status: 'in_progress',
            startTime: FieldValue.serverTimestamp(),
            retailersProcessed: 0,
            productsProcessed: 0,
            currentRetailer: null,
            errors: []
        });

        return syncDoc.id;
    }

    private async updateSyncProgress(syncId: string, progress: {
        retailersProcessed?: number;
        productsProcessed?: number;
        currentRetailer?: string;
    }): Promise<void> {
        const { firestore } = await createServerClient();
        await firestore.collection('sync_status').doc(syncId).update(progress);
    }

    private async completeSyncStatus(syncId: string, result: {
        status: string;
        retailersProcessed: number;
        productsProcessed: number;
        errors: string[];
        endTime: Date;
    }): Promise<void> {
        const { firestore } = await createServerClient();
        await firestore.collection('sync_status').doc(syncId).update({
            ...result,
            endTime: FieldValue.serverTimestamp()
        });
    }

    private async failSyncStatus(syncId: string, errorMessage: string): Promise<void> {
        const { firestore } = await createServerClient();
        await firestore.collection('sync_status').doc(syncId).update({
            status: 'failed',
            error: errorMessage,
            endTime: FieldValue.serverTimestamp()
        });
    }

    private async getLastSuccessfulSync(brandId: string): Promise<Date | null> {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('sync_status')
            .where('brandId', '==', brandId)
            .where('status', '==', 'completed')
            .orderBy('endTime', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const lastSync = snapshot.docs[0].data();
        return lastSync.endTime?.toDate() || null;
    }
}

