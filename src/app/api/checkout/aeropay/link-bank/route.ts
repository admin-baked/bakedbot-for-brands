/**
 * Aeropay Bank Link Callback Endpoint
 *
 * POST /api/checkout/aeropay/link-bank
 *
 * Completes bank account linking after Aerosync widget completion.
 * Called by frontend after customer links their bank account via Aerosync.
 *
 * Flow:
 * 1. Frontend displays Aerosync widget in iframe
 * 2. Customer links bank account
 * 3. Aerosync widget posts message to parent window with aggregatorAccountId
 * 4. Frontend calls this endpoint with aggregatorAccountId
 * 5. Server calls Aeropay API to link the account
 * 6. Server saves bank account details to Firestore
 * 7. Server returns success to frontend
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created bank link callback endpoint for Aeropay integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { linkBankAccount } from '@/lib/payments/aeropay';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { AeropayUserDoc, AeropayBankAccount } from '@/types/aeropay';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface LinkBankRequest {
  userId: string; // BakedBot user ID (Firebase Auth UID)
  aeropayUserId: string; // Aeropay user ID
  aggregatorAccountId: string; // From Aerosync widget callback
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: LinkBankRequest = await request.json();
    const { userId, aeropayUserId, aggregatorAccountId } = body;

    if (!userId || !aeropayUserId || !aggregatorAccountId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, aeropayUserId, aggregatorAccountId' },
        { status: 400 }
      );
    }

    // 3. Verify user matches authenticated user
    if (userId !== user.uid) {
      return NextResponse.json(
        { error: 'User ID does not match authenticated user' },
        { status: 403 }
      );
    }

    // 4. Verify Aeropay user exists in Firestore
    const { firestore } = await createServerClient();
    const aeropayUserRef = firestore.collection('aeropay_users').doc(userId);
    const aeropayUserSnap = await aeropayUserRef.get();

    if (!aeropayUserSnap.exists) {
      return NextResponse.json(
        { error: 'Aeropay user not found. Please restart the payment process.' },
        { status: 404 }
      );
    }

    const aeropayUser = aeropayUserSnap.data() as AeropayUserDoc;

    // Verify Aeropay user ID matches
    if (aeropayUser.aeropayUserId !== aeropayUserId) {
      return NextResponse.json(
        { error: 'Aeropay user ID mismatch' },
        { status: 403 }
      );
    }

    // 5. Link bank account via Aeropay API
    logger.info('[AEROPAY] Linking bank account', {
      userId,
      aeropayUserId,
      aggregatorAccountId,
    });

    const linkResult = await linkBankAccount({
      userId: aeropayUserId,
      aggregatorAccountId,
    });

    // 6. Create bank account object for Firestore
    const bankAccount: AeropayBankAccount = {
      id: linkResult.bankAccountId,
      bankName: linkResult.bankAccount.bankName,
      accountType: linkResult.bankAccount.accountType,
      last4: linkResult.bankAccount.last4,
      status: linkResult.bankAccount.status,
      isDefault: aeropayUser.bankAccounts.length === 0, // First account is default
      linkedAt: Timestamp.now() as any,
    };

    // 7. Update Firestore with bank account
    const existingBankAccounts = aeropayUser.bankAccounts || [];
    const updatedBankAccounts = [...existingBankAccounts, bankAccount];

    await aeropayUserRef.update({
      bankAccounts: updatedBankAccounts,
      defaultBankAccountId: bankAccount.isDefault
        ? bankAccount.id
        : aeropayUser.defaultBankAccountId || bankAccount.id,
      updatedAt: Timestamp.now(),
    });

    logger.info('[AEROPAY] Bank account linked successfully', {
      userId,
      aeropayUserId,
      bankAccountId: linkResult.bankAccountId,
      bankName: linkResult.bankAccount.bankName,
      last4: linkResult.bankAccount.last4,
    });

    // 8. Return success to frontend
    return NextResponse.json({
      success: true,
      bankAccountId: linkResult.bankAccountId,
      bankAccount: {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountType: bankAccount.accountType,
        last4: bankAccount.last4,
        status: bankAccount.status,
        isDefault: bankAccount.isDefault,
      },
    });
  } catch (error) {
    logger.error('[AEROPAY] Bank link failed', error instanceof Error ? error : new Error(String(error)));

    // Return appropriate error
    if (error instanceof Error) {
      // Aeropay API errors
      if (error.message.includes('AEROPAY')) {
        return NextResponse.json(
          { error: 'Failed to link bank account. Please try again.' },
          { status: 502 }
        );
      }

      // Configuration errors
      if (error.message.includes('environment variable')) {
        return NextResponse.json(
          { error: 'Payment system not configured. Please contact support.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while linking bank account' },
      { status: 500 }
    );
  }
}
