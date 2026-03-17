/**
 * GET /api/wallet/pass?customerId=&orgId=&type=apple|google&t=<token>
 *
 * Returns:
 *   type=apple  → signed .pkpass file (Content-Type: application/vnd.apple.pkpass)
 *   type=google → 302 redirect to Google Wallet save URL
 *
 * Auth: short-lived pass token (?t=) OR valid session cookie.
 * On first download, writes walletPassSerial to the customer profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { generateApplePass, isAppleConfigured } from '@/server/services/wallet/apple-wallet';
import {
  generateSaveUrl,
  getOrCreateLoyaltyClass,
  isGoogleConfigured,
} from '@/server/services/wallet/google-wallet';
import { verifyPassToken } from '../token/route';
import type { WalletPassData } from '@/server/services/wallet/types';
import type { CustomerProfile } from '@/types/customers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

const SMOKEY_URL = `${APP_BASE_URL}/assets/agents/smokey-main.png`;

async function resolveAuth(
  request: NextRequest,
  customerId: string,
  orgId: string
): Promise<boolean> {
  // Option 1: short-lived pass token
  const tokenParam = request.nextUrl.searchParams.get('t');
  if (tokenParam) {
    const verified = verifyPassToken(tokenParam);
    if (verified && verified.customerId === customerId && verified.orgId === orgId) {
      return true;
    }
  }

  // Option 2: session cookie
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return false;

  try {
    const { auth } = await createServerClient();
    await auth.verifySessionCookie(sessionCookie, true);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const customerId = searchParams.get('customerId')?.trim() || '';
  const orgId = searchParams.get('orgId')?.trim() || '';
  const type = searchParams.get('type') || 'apple';

  if (!customerId || !orgId) {
    return NextResponse.json(
      { success: false, error: 'customerId and orgId are required' },
      { status: 400 }
    );
  }

  if (!['apple', 'google'].includes(type)) {
    return NextResponse.json(
      { success: false, error: 'type must be apple or google' },
      { status: 400 }
    );
  }

  const isAuthed = await resolveAuth(request, customerId, orgId);
  if (!isAuthed) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check wallet credentials before touching Firestore
  const configured = type === 'apple' ? isAppleConfigured() : isGoogleConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        success: false,
        error: `${type === 'apple' ? 'Apple' : 'Google'} Wallet credentials not yet configured`,
        code: 'WALLET_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const firestore = getAdminFirestore();
    // Try compound ID first (org_thrive_syracuse_custId), then bare customerId
    let customerDoc = await firestore.collection('customers').doc(`${orgId}_${customerId}`).get();
    if (!customerDoc.exists) {
      customerDoc = await firestore.collection('customers').doc(customerId).get();
    }

    if (!customerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const profile = customerDoc.data() as CustomerProfile;

    // Ensure serial number exists (set on first download)
    let serialNumber = profile.walletPassSerial;
    if (!serialNumber) {
      serialNumber = randomUUID();
      await firestore
        .collection('customers')
        .doc(customerDoc.id)
        .set({ walletPassSerial: serialNumber }, { merge: true });
    }

    // Fetch brand guide for this org
    const brandGuideDoc = await firestore.collection('brandGuides').doc(orgId).get();
    const brandGuide = brandGuideDoc.exists ? brandGuideDoc.data() : null;

    const brandName = brandGuide?.brandName || 'Thrive Syracuse';
    const brandColor = brandGuide?.visualIdentity?.colors?.primary?.hex || '#2E7D32';
    const logoUrl =
      brandGuide?.visualIdentity?.logo?.primary ||
      `${APP_BASE_URL}/bakedbot-logo-horizontal.png`;

    const passData: WalletPassData = {
      customerId,
      orgId,
      customerName:
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        profile.displayName ||
        profile.email ||
        'Member',
      points: profile.points ?? 0,
      tier: profile.tier ?? 'Bronze',
      loyaltyId: customerId,
      brandName,
      brandColor,
      logoUrl,
      mascotUrl: SMOKEY_URL,
      serialNumber,
    };

    if (type === 'apple') {
      const passBuffer = await generateApplePass(passData);

      logger.info('[WalletPass] Apple pass served', { customerId, orgId, serialNumber });

      return new NextResponse(new Uint8Array(passBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': `attachment; filename="${orgId}-loyalty.pkpass"`,
          'Content-Length': passBuffer.length.toString(),
          'Cache-Control': 'no-store',
        },
      });
    }

    // Google: ensure class exists, then get save URL
    await getOrCreateLoyaltyClass(orgId, brandName, brandColor, logoUrl, SMOKEY_URL);
    const saveUrl = await generateSaveUrl(passData);

    logger.info('[WalletPass] Google Wallet URL generated', { customerId, orgId });

    return NextResponse.redirect(saveUrl, { status: 302 });
  } catch (error) {
    logger.error('[WalletPass] Pass generation failed', {
      customerId,
      orgId,
      type,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pass generation failed',
      },
      { status: 500 }
    );
  }
}
