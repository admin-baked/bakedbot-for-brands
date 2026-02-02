/**
 * Loyalty Sync API Endpoint
 *
 * POST /api/loyalty/sync
 * Triggers loyalty data sync from Alleaves + Alpine IQ
 *
 * Body:
 * - orgId: string (required)
 * - customerId?: string (optional, sync single customer)
 * - force?: boolean (optional, force resync even if recently synced)
 */

import { NextRequest, NextResponse } from 'next/server';
import { LoyaltySyncService } from '@/server/services/loyalty-sync';
import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, customerId, force } = body;

    // Validate required fields
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    logger.info('[API] Loyalty sync requested', { orgId, customerId, force });

    // Get POS config for this org
    const firestore = getAdminFirestore();
    const brandDoc = await firestore.collection('brands').doc(orgId).get();

    if (!brandDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const brandData = brandDoc.data();
    const posConfig = brandData?.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves') {
      return NextResponse.json(
        { success: false, error: 'Alleaves POS not configured for this organization' },
        { status: 400 }
      );
    }

    // Initialize POS client
    const posClient = new ALLeavesClient({
      storeId: posConfig.storeId,
      locationId: posConfig.locationId || posConfig.storeId,
      username: posConfig.username,
      password: posConfig.password,
      pin: posConfig.pin,
      environment: posConfig.environment || 'production'
    });

    // Get loyalty settings
    const settingsResult = await getLoyaltySettings(orgId);

    if (!settingsResult.success || !settingsResult.data) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch loyalty settings' },
        { status: 500 }
      );
    }

    // Initialize sync service
    const syncService = new LoyaltySyncService(posClient);

    // Sync single customer or all customers
    if (customerId) {
      logger.info('[API] Syncing single customer', { orgId, customerId });

      const result = await syncService.syncCustomer(
        customerId,
        orgId,
        settingsResult.data
      );

      logger.info('[API] Customer sync completed', {
        orgId,
        customerId,
        success: result.success,
        points: result.calculated.points,
        reconciled: result.reconciliation.reconciled
      });

      return NextResponse.json({
        success: true,
        result
      });

    } else {
      logger.info('[API] Syncing all customers', { orgId });

      const result = await syncService.syncAllCustomers(
        orgId,
        settingsResult.data
      );

      logger.info('[API] Batch sync completed', {
        orgId,
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        discrepancies: result.discrepancies.length,
        duration: result.duration
      });

      // Alert on discrepancies if >10% difference
      if (result.discrepancies.length > 0) {
        logger.warn('[API] Loyalty discrepancies detected', {
          orgId,
          count: result.discrepancies.length,
          samples: result.discrepancies.slice(0, 5)
        });

        // TODO: Send alert to admin (Discord webhook, email, etc.)
      }

      return NextResponse.json({
        success: true,
        result
      });
    }

  } catch (error) {
    logger.error('[API] Loyalty sync failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/loyalty/sync?orgId=xxx&customerId=xxx
 * Get sync status for a customer or organization
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    const customerId = searchParams.get('customerId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    logger.info('[API] Loyalty sync status requested', { orgId, customerId });

    // Get POS config
    const firestore = getAdminFirestore();
    const brandDoc = await firestore.collection('brands').doc(orgId).get();

    if (!brandDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const brandData = brandDoc.data();
    const posConfig = brandData?.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves') {
      return NextResponse.json(
        { success: false, error: 'Alleaves POS not configured' },
        { status: 400 }
      );
    }

    // Initialize clients
    const posClient = new ALLeavesClient({
      storeId: posConfig.storeId,
      locationId: posConfig.locationId || posConfig.storeId,
      username: posConfig.username,
      password: posConfig.password,
      pin: posConfig.pin,
      environment: posConfig.environment || 'production'
    });

    const syncService = new LoyaltySyncService(posClient);

    if (customerId) {
      // Get reconciliation report for specific customer
      const report = await syncService.getReconciliationReport(customerId, orgId);

      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        report
      });

    } else {
      // Get organization-level sync stats
      const customersRef = firestore
        .collection('customers')
        .where('orgId', '==', orgId);

      const snapshot = await customersRef.get();
      const customers = snapshot.docs.map(doc => doc.data());

      const stats = {
        totalCustomers: customers.length,
        withAlpineSync: customers.filter(c => c.pointsFromAlpine !== undefined).length,
        withCalculatedPoints: customers.filter(c => c.pointsFromOrders !== undefined).length,
        reconciled: customers.filter(c => c.loyaltyReconciled === true).length,
        needsReview: customers.filter(c => c.loyaltyReconciled === false).length,
        lastSyncAt: customers
          .map(c => c.pointsLastCalculated)
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
      };

      return NextResponse.json({
        success: true,
        stats
      });
    }

  } catch (error) {
    logger.error('[API] Failed to get sync status', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
