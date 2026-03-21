/**
 * POST /api/wallet/lookup-token
 *
 * Issues a short-lived pass token for public (unauthenticated) wallet downloads.
 * Called after a successful /api/wallet/lookup to get a download token.
 * No auth required — valid lookup is the gate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  buildPassToken,
  WALLET_PASS_TOKEN_TTL_MS,
} from '@/server/services/wallet/pass-token';
import type { CustomerProfile } from '@/types/customers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customerId = typeof body.customerId === 'string' ? body.customerId.trim() : '';
    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';

    if (!customerId || !orgId) {
      return NextResponse.json(
        { success: false, error: 'customerId and orgId are required' },
        { status: 400 }
      );
    }

    // Verify this customer actually exists in the org (prevents token farming)
    const firestore = getAdminFirestore();
    const doc = await firestore
      .collection('customers')
      .doc(`${orgId}_${customerId}`)
      .get();

    if (!doc.exists) {
      // Try by customerId field directly
      const snap = await firestore
        .collection('customers')
        .where('orgId', '==', orgId)
        .where('id', '==', customerId)
        .limit(1)
        .get();

      if (snap.empty) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      const profile = snap.docs[0].data() as CustomerProfile;
      const resolvedId = profile.id || customerId;
      const expiresAt = Date.now() + WALLET_PASS_TOKEN_TTL_MS;
      const token = buildPassToken(resolvedId, orgId, expiresAt);

      logger.info('[WalletLookupToken] Token issued (by-id fallback)', { customerId: resolvedId, orgId });
      return NextResponse.json({ success: true, token, expiresAt: new Date(expiresAt).toISOString() });
    }

    const expiresAt = Date.now() + WALLET_PASS_TOKEN_TTL_MS;
    const token = buildPassToken(customerId, orgId, expiresAt);

    logger.info('[WalletLookupToken] Token issued', { customerId, orgId });
    return NextResponse.json({
      success: true,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    logger.error('[WalletLookupToken] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
