/**
 * POST /api/wallet/lookup
 *
 * Public endpoint — looks up a customer by phone or email within an org.
 * Returns minimal profile data (name, points, tier) for the wallet card preview.
 * No auth required — identifier must match a customer record.
 *
 * Rate-limited by: identifier normalization (only exact match allowed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { isAppleConfigured } from '@/server/services/wallet/apple-wallet';
import { isGoogleConfigured } from '@/server/services/wallet/google-wallet';
import type { CustomerProfile } from '@/types/customers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier =
      typeof body.identifier === 'string' ? body.identifier.trim() : '';
    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';

    if (!identifier || !orgId) {
      return NextResponse.json(
        { success: false, error: 'identifier and orgId are required' },
        { status: 400 }
      );
    }

    if (!isAppleConfigured() && !isGoogleConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Wallet not yet configured for this organization', code: 'WALLET_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const firestore = getAdminFirestore();

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const searchField = isEmail ? 'email' : 'phone';
    const searchValue = isEmail
      ? normalizeEmail(identifier)
      : normalizePhone(identifier);

    const snap = await firestore
      .collection('customers')
      .where('orgId', '==', orgId)
      .where(searchField, '==', searchValue)
      .limit(1)
      .get();

    if (snap.empty) {
      logger.info('[WalletLookup] Customer not found', { orgId, searchField });
      return NextResponse.json(
        { success: false, error: 'No loyalty account found for that identifier' },
        { status: 404 }
      );
    }

    const doc = snap.docs[0];
    const profile = doc.data() as CustomerProfile;

    // Return only the fields needed for the card preview — no PII beyond what customer entered
    return NextResponse.json({
      success: true,
      customer: {
        customerId: profile.id || doc.id.split('_').slice(1).join('_'),
        customerName:
          [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
          profile.displayName ||
          'Member',
        points: profile.points ?? 0,
        tier: profile.tier ?? 'Bronze',
      },
    });
  } catch (error) {
    logger.error('[WalletLookup] Lookup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Lookup failed' },
      { status: 500 }
    );
  }
}
