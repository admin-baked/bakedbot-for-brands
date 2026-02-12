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
import { FieldPath } from 'firebase-admin/firestore';
import { LoyaltySyncService } from '@/server/services/loyalty-sync';
import { ALLeavesClient } from '@/lib/pos/adapters/alleaves';
import { getLoyaltySettings } from '@/app/actions/loyalty';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import {
  buildOrgIdCandidates,
  collectOrgCandidates,
  hasOrgCandidateIntersection,
} from '@/server/org/org-id';

interface ResolvedLoyaltyContext {
  requestedOrgId: string;
  effectiveOrgId: string;
  brandId: string;
  candidateOrgIds: string[];
  posConfig: Record<string, any>;
}

function dedupe(values: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const cleaned = value.trim();
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    result.push(cleaned);
  }

  return result;
}

function isSuperUser(decodedToken: Record<string, unknown>): boolean {
  const role = typeof decodedToken.role === 'string' ? decodedToken.role : '';
  return role === 'super_user' || role === 'super_admin';
}

function hasValidCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

async function canAccessOrgFromSession(
  orgId: string,
  decodedToken: Record<string, unknown>,
  firestore: FirebaseFirestore.Firestore
): Promise<boolean> {
  const requestedCandidates = new Set(buildOrgIdCandidates(orgId));
  const tokenCandidates = collectOrgCandidates([
    decodedToken.orgId as string | undefined,
    decodedToken.currentOrgId as string | undefined,
    decodedToken.brandId as string | undefined,
    decodedToken.locationId as string | undefined,
    decodedToken.dispensaryId as string | undefined,
  ]);

  if (hasOrgCandidateIntersection(requestedCandidates, tokenCandidates)) {
    return true;
  }

  const uid = decodedToken.uid as string | undefined;
  if (!uid) {
    return false;
  }

  const userDoc = await firestore.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return false;
  }

  const userData = userDoc.data();
  const profileCandidates = collectOrgCandidates([
    userData?.orgId as string | undefined,
    userData?.currentOrgId as string | undefined,
    userData?.brandId as string | undefined,
    userData?.locationId as string | undefined,
    userData?.dispensaryId as string | undefined,
    userData?.linkedDispensary?.id as string | undefined,
  ]);

  return hasOrgCandidateIntersection(requestedCandidates, profileCandidates);
}

interface AuthResult {
  source: 'cron' | 'session';
  uid: string | null;
  response: NextResponse | null;
}

async function authorizeRequest(
  request: NextRequest,
  orgId: string,
  firestore: FirebaseFirestore.Firestore,
  action: 'sync' | 'status'
): Promise<AuthResult> {
  if (hasValidCronAuth(request)) {
    return {
      source: 'cron',
      uid: null,
      response: null,
    };
  }

  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return {
      source: 'session',
      uid: null,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  try {
    const { auth } = await createServerClient();
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const tokenRecord = decodedToken as Record<string, unknown>;

    if (
      !isSuperUser(tokenRecord) &&
      !(await canAccessOrgFromSession(orgId, tokenRecord, firestore))
    ) {
      logger.warn('[LOYALTY_SYNC] Forbidden org access attempt', {
        action,
        orgId,
        uid: decodedToken.uid,
      });
      return {
        source: 'session',
        uid: decodedToken.uid,
        response: NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        ),
      };
    }

    return {
      source: 'session',
      uid: decodedToken.uid,
      response: null,
    };
  } catch (error) {
    logger.warn('[LOYALTY_SYNC] Invalid session cookie', {
      action,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      source: 'session',
      uid: null,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
}

async function findBrandDocByCandidates(
  firestore: FirebaseFirestore.Firestore,
  candidates: string[]
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  for (const candidate of candidates) {
    const brandDoc = await firestore.collection('brands').doc(candidate).get();
    if (brandDoc.exists) {
      return brandDoc;
    }
  }
  return null;
}

async function findLocationDocByCandidates(
  firestore: FirebaseFirestore.Firestore,
  candidates: string[]
): Promise<FirebaseFirestore.QueryDocumentSnapshot | null> {
  for (const candidate of candidates) {
    const byOrgId = await firestore
      .collection('locations')
      .where('orgId', '==', candidate)
      .limit(1)
      .get();

    if (!byOrgId.empty) {
      return byOrgId.docs[0];
    }
  }

  for (const candidate of candidates) {
    const byBrandId = await firestore
      .collection('locations')
      .where('brandId', '==', candidate)
      .limit(1)
      .get();

    if (!byBrandId.empty) {
      return byBrandId.docs[0];
    }
  }

  return null;
}

async function resolveExistingDocId(
  firestore: FirebaseFirestore.Firestore,
  collectionName: string,
  candidates: string[]
): Promise<string | null> {
  for (const candidate of dedupe(candidates)) {
    const doc = await firestore.collection(collectionName).doc(candidate).get();
    if (doc.exists) {
      return candidate;
    }
  }

  return null;
}

async function resolveLoyaltyContext(
  firestore: FirebaseFirestore.Firestore,
  orgId: string
): Promise<ResolvedLoyaltyContext | null> {
  const requestedOrgId = orgId.trim();
  if (!requestedOrgId) {
    return null;
  }

  let candidateOrgIds = dedupe(buildOrgIdCandidates(requestedOrgId));

  let brandDoc = await findBrandDocByCandidates(firestore, candidateOrgIds);
  const locationDoc = await findLocationDocByCandidates(firestore, candidateOrgIds);
  const locationData = locationDoc?.data() || {};

  const locationOrgId =
    typeof locationData.orgId === 'string' ? locationData.orgId.trim() : '';
  const locationBrandId =
    typeof locationData.brandId === 'string' ? locationData.brandId.trim() : '';

  if (!brandDoc?.exists && locationBrandId) {
    const brandFromLocation = await firestore.collection('brands').doc(locationBrandId).get();
    if (brandFromLocation.exists) {
      brandDoc = brandFromLocation;
    }
  }

  if (!brandDoc?.exists && !locationDoc) {
    return null;
  }

  const brandId = brandDoc?.id || locationBrandId || requestedOrgId;
  candidateOrgIds = dedupe([
    ...candidateOrgIds,
    ...buildOrgIdCandidates(brandId),
    ...buildOrgIdCandidates(locationOrgId || ''),
  ]);

  const brandPosConfig = brandDoc?.data()?.posConfig;
  const locationPosConfig = locationData.posConfig;

  const posConfig =
    locationPosConfig?.provider === 'alleaves'
      ? locationPosConfig
      : brandPosConfig?.provider === 'alleaves'
        ? brandPosConfig
        : locationPosConfig || brandPosConfig;

  const effectiveOrgId = locationOrgId || requestedOrgId || brandId;

  return {
    requestedOrgId,
    effectiveOrgId,
    brandId,
    candidateOrgIds: dedupe([
      effectiveOrgId,
      ...buildOrgIdCandidates(effectiveOrgId),
      ...candidateOrgIds,
    ]),
    posConfig,
  };
}

async function fetchCustomersForOrgCandidates(
  firestore: FirebaseFirestore.Firestore,
  orgCandidates: string[]
): Promise<Array<Record<string, any>>> {
  const candidates = dedupe(orgCandidates);
  const customerMap = new Map<string, Record<string, any>>();

  for (const candidate of candidates) {
    const snapshot = await firestore
      .collection('customers')
      .where('orgId', '==', candidate)
      .get();

    snapshot.docs.forEach(doc => {
      customerMap.set(doc.id, doc.data() as Record<string, any>);
    });
  }

  if (customerMap.size > 0) {
    return Array.from(customerMap.values());
  }

  // Fallback for records that only encode org in doc ID: {orgId}_{customerId}
  for (const candidate of candidates) {
    const prefix = `${candidate}_`;
    const snapshot = await firestore
      .collection('customers')
      .where(FieldPath.documentId(), '>=', prefix)
      .where(FieldPath.documentId(), '<', `${prefix}\uf8ff`)
      .get();

    snapshot.docs.forEach(doc => {
      customerMap.set(doc.id, doc.data() as Record<string, any>);
    });
  }

  return Array.from(customerMap.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyOrgId =
      typeof body?.orgId === 'string' ? body.orgId.trim() : '';
    const queryOrgId = request.nextUrl.searchParams.get('orgId')?.trim() || '';
    const orgId = bodyOrgId || queryOrgId;
    const customerId =
      typeof body?.customerId === 'string' && body.customerId.trim()
        ? body.customerId.trim()
        : undefined;
    const force = body?.force;

    // Validate required fields
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    const authResult = await authorizeRequest(request, orgId, firestore, 'sync');
    if (authResult.response) {
      return authResult.response;
    }

    const context = await resolveLoyaltyContext(firestore, orgId);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Loyalty sync requested', {
      requestedOrgId: context.requestedOrgId,
      effectiveOrgId: context.effectiveOrgId,
      brandId: context.brandId,
      authSource: authResult.source,
      uid: authResult.uid,
      customerId,
      force,
    });

    if (!context.posConfig || context.posConfig.provider !== 'alleaves') {
      return NextResponse.json(
        { success: false, error: 'Alleaves POS not configured for this organization' },
        { status: 400 }
      );
    }

    // Initialize POS client
    const posClient = new ALLeavesClient({
      apiKey: context.posConfig.apiKey,
      storeId: context.posConfig.storeId,
      locationId: context.posConfig.locationId || context.posConfig.storeId,
      username: context.posConfig.username || process.env.ALLEAVES_USERNAME,
      password: context.posConfig.password || process.env.ALLEAVES_PASSWORD,
      pin: context.posConfig.pin || process.env.ALLEAVES_PIN,
      partnerId: context.posConfig.partnerId,
      environment: context.posConfig.environment || 'production'
    });

    // Get loyalty settings (try exact match across aliases first)
    const settingsOrgId =
      (await resolveExistingDocId(firestore, 'loyalty_settings', [
        context.effectiveOrgId,
        context.brandId,
        ...context.candidateOrgIds,
      ])) || context.effectiveOrgId;

    const settingsResult = await getLoyaltySettings(settingsOrgId);

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
      logger.info('[API] Syncing single customer', {
        requestedOrgId: context.requestedOrgId,
        effectiveOrgId: context.effectiveOrgId,
        customerId,
      });

      const result = await syncService.syncCustomer(
        customerId,
        context.effectiveOrgId,
        settingsResult.data
      );

      logger.info('[API] Customer sync completed', {
        requestedOrgId: context.requestedOrgId,
        effectiveOrgId: context.effectiveOrgId,
        customerId,
        success: result.success,
        points: result.calculated.points,
        reconciled: result.reconciliation.reconciled
      });

      return NextResponse.json({
        success: true,
        effectiveOrgId: context.effectiveOrgId,
        settingsOrgId,
        result
      });

    } else {
      logger.info('[API] Syncing all customers', {
        requestedOrgId: context.requestedOrgId,
        effectiveOrgId: context.effectiveOrgId,
      });

      const result = await syncService.syncAllCustomers(
        context.effectiveOrgId,
        settingsResult.data
      );

      logger.info('[API] Batch sync completed', {
        requestedOrgId: context.requestedOrgId,
        effectiveOrgId: context.effectiveOrgId,
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        discrepancies: result.discrepancies.length,
        duration: result.duration
      });

      // Alert on discrepancies if >10% difference
      if (result.discrepancies.length > 0) {
        logger.warn('[API] Loyalty discrepancies detected', {
          requestedOrgId: context.requestedOrgId,
          effectiveOrgId: context.effectiveOrgId,
          count: result.discrepancies.length,
          samples: result.discrepancies.slice(0, 5)
        });

        // TODO: Send alert to admin (Discord webhook, email, etc.)
      }

      return NextResponse.json({
        success: true,
        effectiveOrgId: context.effectiveOrgId,
        settingsOrgId,
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
    const orgId = searchParams.get('orgId')?.trim() || '';
    const customerId = searchParams.get('customerId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    const authResult = await authorizeRequest(request, orgId, firestore, 'status');
    if (authResult.response) {
      return authResult.response;
    }

    const context = await resolveLoyaltyContext(firestore, orgId);

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    logger.info('[API] Loyalty sync status requested', {
      requestedOrgId: context.requestedOrgId,
      effectiveOrgId: context.effectiveOrgId,
      authSource: authResult.source,
      uid: authResult.uid,
      customerId,
    });

    if (!context.posConfig || context.posConfig.provider !== 'alleaves') {
      return NextResponse.json(
        { success: false, error: 'Alleaves POS not configured' },
        { status: 400 }
      );
    }

    // Initialize clients
    const posClient = new ALLeavesClient({
      apiKey: context.posConfig.apiKey,
      storeId: context.posConfig.storeId,
      locationId: context.posConfig.locationId || context.posConfig.storeId,
      username: context.posConfig.username || process.env.ALLEAVES_USERNAME,
      password: context.posConfig.password || process.env.ALLEAVES_PASSWORD,
      pin: context.posConfig.pin || process.env.ALLEAVES_PIN,
      partnerId: context.posConfig.partnerId,
      environment: context.posConfig.environment || 'production'
    });

    const syncService = new LoyaltySyncService(posClient);

    if (customerId) {
      // Get reconciliation report for specific customer
      const report = await syncService.getReconciliationReport(customerId, context.effectiveOrgId);

      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        effectiveOrgId: context.effectiveOrgId,
        report
      });

    } else {
      // Get organization-level sync stats (support alias org IDs).
      const customers = await fetchCustomersForOrgCandidates(
        firestore,
        context.candidateOrgIds
      );

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
        effectiveOrgId: context.effectiveOrgId,
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
