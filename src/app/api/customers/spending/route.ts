import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache } from '@/lib/cache/pos-cache';

export const dynamic = 'force-dynamic';

// Spending data per customer
interface CustomerSpending {
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
    avgOrderValue: number;
}

/**
 * GET /api/customers/spending?orgId=xxx
 *
 * Asynchronously fetches spending data from Alleaves orders.
 * Called by the frontend after initial customer list loads to enrich profiles.
 * Uses existing getCustomerSpending() from Alleaves adapter.
 */
export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');

        if (!orgId) {
            return NextResponse.json(
                { error: 'Missing orgId parameter' },
                { status: 400 }
            );
        }

        // Check cache first (15 minute TTL for spending data)
        const cacheKey = `spending:${orgId}`;
        const cached = posCache.get<Record<string, CustomerSpending>>(cacheKey);

        if (cached) {
            logger.info('[SPENDING] Returning cached spending data', {
                orgId,
                customerCount: Object.keys(cached).length,
            });
            return NextResponse.json({
                success: true,
                spending: cached,
                cached: true,
                duration: Date.now() - startTime,
            });
        }

        const { firestore } = await createServerClient();

        // Get location with Alleaves POS config
        let locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            locationsSnap = await firestore.collection('locations')
                .where('brandId', '==', orgId)
                .limit(1)
                .get();
        }

        if (locationsSnap.empty) {
            logger.info('[SPENDING] No location found for org', { orgId });
            return NextResponse.json({
                success: true,
                spending: {},
                message: 'No location configured',
                duration: Date.now() - startTime,
            });
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
            logger.info('[SPENDING] No active Alleaves POS config', { orgId });
            return NextResponse.json({
                success: true,
                spending: {},
                message: 'No active Alleaves POS',
                duration: Date.now() - startTime,
            });
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

        logger.info('[SPENDING] Fetching customer spending from Alleaves', { orgId });

        // Use existing getCustomerSpending method (fetches all orders internally)
        const spendingMap = await client.getCustomerSpending();

        logger.info('[SPENDING] Spending data fetched', {
            orgId,
            customerCount: spendingMap.size,
        });

        // Convert Map to serializable format with Alleaves customer ID keys
        const spendingData: Record<string, CustomerSpending> = {};
        spendingMap.forEach((data, customerId) => {
            // Match the customer ID format used in getCustomersFromAlleaves
            const key = `alleaves_${customerId}`;
            spendingData[key] = {
                totalSpent: data.totalSpent,
                orderCount: data.orderCount,
                lastOrderDate: data.lastOrderDate?.toISOString() || null,
                firstOrderDate: data.firstOrderDate?.toISOString() || null,
                avgOrderValue: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0,
            };
        });

        // Cache for 15 minutes
        posCache.set(cacheKey, spendingData, 15 * 60 * 1000);

        logger.info('[SPENDING] Spending data calculated and cached', {
            orgId,
            customerCount: Object.keys(spendingData).length,
            duration: Date.now() - startTime,
        });

        return NextResponse.json({
            success: true,
            spending: spendingData,
            customerCount: Object.keys(spendingData).length,
            cached: false,
            duration: Date.now() - startTime,
        });
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[SPENDING] Failed to fetch spending data', {
            error: err.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: err.message || 'Failed to fetch spending data',
            },
            { status: 500 }
        );
    }
}
