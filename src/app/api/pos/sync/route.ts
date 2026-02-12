/**
 * Manual POS Sync Endpoint (session-authenticated).
 *
 * Used by dashboard UI so cron secrets are never exposed client-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import { syncOrgPOSData } from '@/server/services/pos-sync-service';
import { logger } from '@/lib/logger';
import {
  buildOrgIdCandidates,
  collectOrgCandidates,
  hasOrgCandidateIntersection,
} from '@/server/org/org-id';

function isSuperUser(decodedToken: Record<string, unknown>): boolean {
  const role = typeof decodedToken.role === 'string' ? decodedToken.role : '';
  return role === 'super_user' || role === 'super_admin';
}

async function canAccessOrgFromSession(
  orgId: string,
  decodedToken: Record<string, unknown>
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

  // Fallback: claims can be stale, so check Firestore user profile.
  const db = getAdminFirestore();
  const uid = decodedToken.uid as string | undefined;
  if (!uid) {
    return false;
  }

  const userDoc = await db.collection('users').doc(uid).get();
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyOrgId =
      typeof body?.orgId === 'string' ? body.orgId.trim() : '';
    const queryOrgId = request.nextUrl.searchParams.get('orgId')?.trim() || '';
    const orgId = bodyOrgId || queryOrgId;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'orgId is required' },
        { status: 400 }
      );
    }

    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { auth } = await createServerClient();
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);

    if (!isSuperUser(decodedToken as Record<string, unknown>)) {
      const authorized = await canAccessOrgFromSession(
        orgId,
        decodedToken as Record<string, unknown>
      );

      if (!authorized) {
        logger.warn('[POS_SYNC_MANUAL] Forbidden org sync attempt', {
          orgId,
          uid: decodedToken.uid,
        });
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    logger.info('[POS_SYNC_MANUAL] Starting org POS sync', {
      orgId,
      uid: decodedToken.uid,
    });

    const result = await syncOrgPOSData(orgId);

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[POS_SYNC_MANUAL] Sync failed', {
      error: error?.message || String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to sync POS data',
      },
      { status: 500 }
    );
  }
}
