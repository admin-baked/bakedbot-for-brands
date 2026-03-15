/**
 * Apple Wallet Device Registration Endpoints
 *
 * Apple calls these automatically when a customer adds/removes a pass from their wallet.
 *
 * POST   /api/wallet/register/:deviceLibraryId/registrations/:passTypeId/:serialNumber
 *        → Register device (Apple calls this when pass is added)
 *
 * DELETE /api/wallet/register/:deviceLibraryId/registrations/:passTypeId/:serialNumber
 *        → Unregister device (Apple calls this when pass is removed)
 *
 * GET    /api/wallet/register/:deviceLibraryId/registrations/:passTypeId
 *        → Return serial numbers updated since passesUpdatedSince timestamp
 *          (Apple polls this to check for updated passes)
 *
 * Auth: Apple sends the authenticationToken from pass.json as Authorization: ApplePass <token>
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { CustomerProfile } from '@/types/customers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validates the Apple-provided auth token against the pass serial
function validateAppleAuth(request: NextRequest, serialNumber: string): boolean {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('ApplePass ')) return false;
  const token = authHeader.replace('ApplePass ', '');
  // Token format: bb_<serialNumber without hyphens> (set in apple-wallet.ts generatePassAuthToken)
  const expectedToken = `bb_${serialNumber.replace(/-/g, '')}`;
  return token === expectedToken;
}

async function findCustomerBySerial(
  firestore: FirebaseFirestore.Firestore,
  serialNumber: string
): Promise<{ docId: string; profile: CustomerProfile } | null> {
  const snap = await firestore
    .collection('customers')
    .where('walletPassSerial', '==', serialNumber)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { docId: snap.docs[0].id, profile: snap.docs[0].data() as CustomerProfile };
}

// ==========================================
// Dynamic route params handled via segment params
// This file handles both /register/[deviceLibraryId]/registrations/[passTypeId]/[serialNumber]
// and /register/[deviceLibraryId]/registrations/[passTypeId]
// We use a catch-all approach at the folder level.
// ==========================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  // slug: [deviceLibraryId, 'registrations', passTypeId, serialNumber]
  const [deviceLibraryId, , , serialNumber] = slug;

  if (!deviceLibraryId || !serialNumber) {
    return new NextResponse(null, { status: 400 });
  }

  if (!validateAppleAuth(request, serialNumber)) {
    logger.warn('[WalletRegister] Invalid auth token', { serialNumber });
    return new NextResponse(null, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const pushToken = typeof body.pushToken === 'string' ? body.pushToken : '';

    if (!pushToken) {
      return new NextResponse(null, { status: 400 });
    }

    const firestore = getAdminFirestore();
    const found = await findCustomerBySerial(firestore, serialNumber);

    if (!found) {
      logger.warn('[WalletRegister] Serial not found', { serialNumber });
      return new NextResponse(null, { status: 404 });
    }

    const registration = {
      deviceLibraryId,
      pushToken,
      registeredAt: new Date(),
    };

    // Check if already registered (update pushToken if device re-registers)
    const existing = (found.profile.appleDeviceRegistrations ?? []) as Array<{
      deviceLibraryId: string;
      pushToken: string;
      registeredAt: Date;
    }>;
    const alreadyRegistered = existing.some(r => r.deviceLibraryId === deviceLibraryId);

    if (alreadyRegistered) {
      // Update the push token for this device
      const updated = existing.map(r =>
        r.deviceLibraryId === deviceLibraryId ? registration : r
      );
      await firestore
        .collection('customers')
        .doc(found.docId)
        .set({ appleDeviceRegistrations: updated }, { merge: true });

      logger.info('[WalletRegister] Device re-registered', { serialNumber, deviceLibraryId });
      return new NextResponse(null, { status: 200 });
    }

    // New registration
    await firestore
      .collection('customers')
      .doc(found.docId)
      .set(
        { appleDeviceRegistrations: FieldValue.arrayUnion(registration) },
        { merge: true }
      );

    logger.info('[WalletRegister] Device registered', { serialNumber, deviceLibraryId });
    return new NextResponse(null, { status: 201 });
  } catch (error) {
    logger.error('[WalletRegister] Registration failed', {
      serialNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const [deviceLibraryId, , , serialNumber] = slug;

  if (!deviceLibraryId || !serialNumber) {
    return new NextResponse(null, { status: 400 });
  }

  if (!validateAppleAuth(request, serialNumber)) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const firestore = getAdminFirestore();
    const found = await findCustomerBySerial(firestore, serialNumber);

    if (!found) return new NextResponse(null, { status: 404 });

    const updated = (found.profile.appleDeviceRegistrations ?? []).filter(
      (r: { deviceLibraryId: string }) => r.deviceLibraryId !== deviceLibraryId
    );

    await firestore
      .collection('customers')
      .doc(found.docId)
      .set({ appleDeviceRegistrations: updated }, { merge: true });

    logger.info('[WalletRegister] Device unregistered', { serialNumber, deviceLibraryId });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    logger.error('[WalletRegister] Unregistration failed', {
      serialNumber,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  // GET /register/:deviceLibraryId/registrations/:passTypeId
  // Apple polls this to get serial numbers updated since a timestamp
  const resolvedParams = await params;
  const slug = resolvedParams.slug || [];
  const [deviceLibraryId] = slug;
  const passesUpdatedSince = request.nextUrl.searchParams.get('passesUpdatedSince');

  if (!deviceLibraryId) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const firestore = getAdminFirestore();
    let query = firestore
      .collection('customers')
      .where(
        'appleDeviceRegistrations',
        'array-contains-any',
        // We only need to check if device is registered; Apple polls at the passTypeId level
        [{ deviceLibraryId }]
      );

    if (passesUpdatedSince) {
      const sinceDate = new Date(passesUpdatedSince);
      query = query.where('walletPassUpdatedAt', '>', sinceDate) as typeof query;
    }

    const snap = await query.limit(100).get();

    if (snap.empty) {
      return new NextResponse(null, { status: 204 });
    }

    const serialNumbers = snap.docs
      .map(d => (d.data() as CustomerProfile).walletPassSerial)
      .filter(Boolean) as string[];

    return NextResponse.json({
      serialNumbers,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[WalletRegister] GET registrations failed', {
      deviceLibraryId,
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 500 });
  }
}
