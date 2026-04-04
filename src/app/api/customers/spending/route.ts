import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache } from '@/lib/cache/pos-cache';
import { requireUser } from '@/server/auth/auth';
import { isBrandRole, isDispensaryRole } from '@/types/roles';

export const dynamic = 'force-dynamic';

// Spending data per customer
interface CustomerSpending {
    totalSpent: number;
    orderCount: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
    avgOrderValue: number;
}

type SpendingRouteUser = {
    uid: string;
    role?: string;
    currentOrgId?: string;
    orgId?: string;
    brandId?: string;
    locationId?: string;
};

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: SpendingRouteUser): string | null {
    const role = String(user.role || '');

    if (isBrandRole(role)) {
        return user.brandId || null;
    }

    if (isDispensaryRole(role)) {
        return user.orgId || user.currentOrgId || user.locationId || null;
    }

    return user.currentOrgId || user.orgId || user.brandId || user.locationId || null;
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

    const { searchParams } = new URL(request.url);
    const requestedOrgId = searchParams.get('orgId')?.trim();

    if (!requestedOrgId) {
        return NextResponse.json(
            { error: 'Missing orgId parameter' },
            { status: 400 }
        );
    }

    let user: SpendingRouteUser;
    try {
        user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
            'super_user',
        ]) as SpendingRouteUser;
    } catch (error) {
        logger.warn('[SPENDING] Unauthorized spending request', {
            requestedOrgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { success: false, error: 'Authentication required' },
            { status: 401 }
        );
    }

    const isSuperUser = isSuperRole(user.role);
    const actorOrgId = getActorOrgId(user);
    if (!isSuperUser && (!actorOrgId || actorOrgId !== requestedOrgId)) {
        logger.warn('[SPENDING] Forbidden spending request', {
            userId: user.uid,
            requestedOrgId,
            actorOrgId,
            role: user.role || null,
        });
        return NextResponse.json(
            { success: false, error: 'Forbidden: Cannot access another organization' },
            { status: 403 }
        );
    }

    const orgId = isSuperUser ? requestedOrgId : actorOrgId;
    if (!orgId) {
        logger.warn('[SPENDING] Missing org context for spending request', {
            userId: user.uid,
            requestedOrgId,
            role: user.role || null,
        });
        return NextResponse.json(
            { success: false, error: 'Forbidden: Missing organization context' },
            { status: 403 }
        );
    }

    try {
        // Check cache first (15 minute TTL for spending data)
        const cacheKey = `spending:${orgId}`;
        const cached = await posCache.get<Record<string, CustomerSpending>>(cacheKey);

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
        await posCache.set(cacheKey, spendingData, 900);

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
