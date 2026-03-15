/**
 * POST /api/wallet/token
 *
 * Issues a short-lived signed token (15 min) for unauthenticated pass download.
 * The token is used as ?t= query param on /api/wallet/pass so customers can
 * download their pass without a session cookie (e.g. from a link in an SMS).
 *
 * Auth: requires valid session cookie (customer must be logged in to generate token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function signToken(payload: string): string {
  const secret = process.env.CRON_SECRET || 'dev-secret';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildPassToken(customerId: string, orgId: string, expiresAt: number): string {
  const payload = `${customerId}:${orgId}:${expiresAt}`;
  const sig = signToken(payload);
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyPassToken(
  token: string
): { customerId: string; orgId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 4) return null;

    const [customerId, orgId, expiresAtStr, sig] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) return null;

    const payload = `${customerId}:${orgId}:${expiresAtStr}`;
    const expectedSig = signToken(payload);
    if (sig !== expectedSig) return null;

    return { customerId, orgId };
  } catch {
    return null;
  }
}

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

    // Verify session
    const sessionCookie = request.cookies.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { auth } = await createServerClient();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    // Verify the requesting user owns this customer profile or is super user
    const firestore = getAdminFirestore();
    const customerDoc = await firestore
      .collection('customers')
      .doc(`${orgId}_${customerId}`)
      .get();

    if (!customerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data();
    const isOwner = customerData?.userId === decoded.uid || customerData?.email === decoded.email;
    const isSuperUser = decoded.role === 'super_user' || decoded.role === 'super_admin';

    if (!isOwner && !isSuperUser) {
      logger.warn('[WalletToken] Unauthorized token request', {
        uid: decoded.uid,
        customerId,
        orgId,
      });
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const token = buildPassToken(customerId, orgId, expiresAt);

    logger.info('[WalletToken] Token issued', { customerId, orgId, uid: decoded.uid });

    return NextResponse.json({
      success: true,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    logger.error('[WalletToken] Token issuance failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
