/**
 * GET /api/wallet/passes/:passTypeId/:serialNumber
 *
 * Apple calls this endpoint after receiving an APNs push notification.
 * Returns the latest .pkpass for the given serial number.
 *
 * Apple also sends If-Modified-Since; return 304 if pass hasn't changed.
 *
 * Auth: Apple sends Authorization: ApplePass <authenticationToken>
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateApplePass, isAppleConfigured } from '@/server/services/wallet/apple-wallet';
import type { CustomerProfile } from '@/types/customers';
import type { WalletPassData } from '@/server/services/wallet/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

function validateAppleAuth(request: NextRequest, serialNumber: string): boolean {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('ApplePass ')) return false;
  const token = authHeader.replace('ApplePass ', '');
  return token === `bb_${serialNumber.replace(/-/g, '')}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ passTypeId: string; serialNumber: string }> }
) {
  const resolvedParams = await params;
  const { serialNumber } = resolvedParams;

  if (!validateAppleAuth(request, serialNumber)) {
    logger.warn('[WalletPasses] Invalid auth token for serial', { serialNumber });
    return new NextResponse(null, { status: 401 });
  }

  if (!isAppleConfigured()) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const firestore = getAdminFirestore();
    const snap = await firestore
      .collection('customers')
      .where('walletPassSerial', '==', serialNumber)
      .limit(1)
      .get();

    if (snap.empty) {
      logger.warn('[WalletPasses] Serial not found', { serialNumber });
      return new NextResponse(null, { status: 404 });
    }

    const doc = snap.docs[0];
    const profile = doc.data() as CustomerProfile;
    const docId = doc.id;

    // Honor If-Modified-Since for bandwidth efficiency
    const ifModifiedSince = request.headers.get('if-modified-since');
    if (ifModifiedSince && profile.walletPassUpdatedAt) {
      const lastModified = new Date(profile.walletPassUpdatedAt);
      const clientDate = new Date(ifModifiedSince);
      if (lastModified <= clientDate) {
        return new NextResponse(null, { status: 304 });
      }
    }

    // Parse orgId and customerId from the Firestore doc ID ({orgId}_{customerId})
    const underscoreIdx = docId.indexOf('_');
    const orgId = underscoreIdx > -1 ? docId.substring(0, underscoreIdx) : doc.id;
    const customerId =
      underscoreIdx > -1 ? docId.substring(underscoreIdx + 1) : profile.id || docId;

    // Fetch brand guide
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
      mascotUrl: `${APP_BASE_URL}/assets/agents/smokey-main.png`,
      serialNumber,
    };

    const passBuffer = await generateApplePass(passData);

    // Stamp last updated
    await firestore
      .collection('customers')
      .doc(docId)
      .set({ walletPassUpdatedAt: new Date() }, { merge: true });

    logger.info('[WalletPasses] Updated pass served to Apple', { serialNumber, customerId, orgId });

    return new NextResponse(new Uint8Array(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date().toUTCString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error('[WalletPasses] Failed to serve updated pass', {
      serialNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500 });
  }
}
