/**
 * Aeropay Payment Authorization Endpoint
 *
 * POST /api/checkout/aeropay/authorize
 *
 * Authorizes an Aeropay payment - creates user if needed, checks for linked bank,
 * and either returns bank linking URL or creates transaction.
 *
 * Flow:
 * 1. Client calls this endpoint with order details
 * 2. Server checks if user has Aeropay account (Firestore: aeropay_users)
 * 3a. If NO account → Create Aeropay user → Save to Firestore
 * 3b. If YES account → Check if bank account linked
 * 4a. If NO bank → Return aggregator URL for Aerosync widget (one-time bank linking)
 * 4b. If YES bank → Create transaction → Return transaction ID
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created authorization endpoint for Aeropay payments with user/bank management.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createAeropayUser,
  getAggregatorCredentials,
  createTransaction,
  AEROPAY_TRANSACTION_FEE_CENTS,
} from '@/lib/payments/aeropay';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { AeropayUserDoc } from '@/types/aeropay';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const authorizeRequestSchema = z.object({
  orderId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid orderId'),
  amount: z.number().int().min(1).max(5_000_000), // cents
  organizationId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid organizationId').optional(),
  bankAccountId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid bankAccountId').optional(),
}).strict();

function isClosedOrderStatus(status: unknown): boolean {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'completed' || normalized === 'canceled' || normalized === 'cancelled';
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEmailUnverified =
      (user as any).email_verified === false ||
      (user as any).emailVerified === false;
    if (isEmailUnverified) {
      return NextResponse.json(
        { error: 'Email verification is required before processing payment.' },
        { status: 403 },
      );
    }

    // 2. Parse request body
    const body = authorizeRequestSchema.parse(await request.json());
    const { orderId, amount, organizationId, bankAccountId } = body;

    // 3. Verify order exists and belongs to user
    const { firestore } = await createServerClient();
    const orderRef = firestore.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data();

    const sessionEmail = typeof user.email === 'string' ? user.email.toLowerCase() : '';
    const orderEmail = typeof orderData?.customer?.email === 'string' ? orderData.customer.email.toLowerCase() : '';
    const isOwner =
      orderData?.customerId === user.uid ||
      orderData?.userId === user.uid ||
      (!!sessionEmail && orderEmail === sessionEmail);

    // Verify order ownership
    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this order' },
        { status: 403 }
      );
    }

    const orderOrganizationId = orderData?.organizationId || orderData?.orgId || orderData?.brandId;
    if (!orderOrganizationId || !DOCUMENT_ID_REGEX.test(orderOrganizationId)) {
      return NextResponse.json(
        { error: 'Order organization is invalid' },
        { status: 400 }
      );
    }
    if (organizationId && organizationId !== orderOrganizationId) {
      return NextResponse.json(
        { error: 'Organization mismatch for order' },
        { status: 403 }
      );
    }

    const normalizedPaymentStatus = String(orderData?.paymentStatus || '').toLowerCase();
    if (normalizedPaymentStatus === 'paid' || normalizedPaymentStatus === 'refunded' || normalizedPaymentStatus === 'voided') {
      return NextResponse.json(
        { error: 'Order has already been paid or closed' },
        { status: 400 }
      );
    }
    if (isClosedOrderStatus(orderData?.status)) {
      return NextResponse.json(
        { error: 'Order is closed and cannot be paid' },
        { status: 409 }
      );
    }

    const orderTotalUsd = Number(orderData?.totals?.total ?? orderData?.amount ?? 0);
    if (!Number.isFinite(orderTotalUsd) || orderTotalUsd <= 0) {
      return NextResponse.json(
        { error: 'Order total is invalid for payment authorization' },
        { status: 400 }
      );
    }
    const serverAmountCents = Math.round(orderTotalUsd * 100);
    if (Math.abs(amount - serverAmountCents) > 0) {
      logger.warn('[AEROPAY] Client amount mismatch; using order total', {
        orderId,
        clientAmount: amount,
        serverAmount: serverAmountCents,
        userId: user.uid,
      });
    }

    const existingAeropayTransactionId =
      typeof orderData?.aeropay?.transactionId === 'string'
        ? orderData.aeropay.transactionId
        : typeof orderData?.transactionId === 'string'
          ? orderData.transactionId
          : null;
    const existingAeropayStatus = String(orderData?.aeropay?.status || '').toLowerCase();
    const hasActiveAeropayAuthorization =
      !!existingAeropayTransactionId &&
      normalizedPaymentStatus === 'pending' &&
      (
        String(orderData?.paymentMethod || '').toLowerCase() === 'aeropay' ||
        existingAeropayStatus === 'pending' ||
        existingAeropayStatus === 'authorized'
      );

    if (hasActiveAeropayAuthorization) {
      logger.info('[AEROPAY] Reusing existing pending Aeropay authorization', {
        orderId,
        transactionId: existingAeropayTransactionId,
        userId: user.uid,
      });
      return NextResponse.json({
        requiresBankLink: false,
        transactionId: existingAeropayTransactionId,
        status: orderData?.aeropay?.status || orderData?.paymentStatus || 'pending',
        totalAmount: serverAmountCents + AEROPAY_TRANSACTION_FEE_CENTS,
        transactionFee: AEROPAY_TRANSACTION_FEE_CENTS,
        reused: true,
      });
    }

    // 4. Check if user has Aeropay account in Firestore
    const aeropayUserRef = firestore.collection('aeropay_users').doc(user.uid);
    const aeropayUserSnap = await aeropayUserRef.get();
    let aeropayUser: AeropayUserDoc | null = null;

    if (aeropayUserSnap.exists) {
      aeropayUser = aeropayUserSnap.data() as AeropayUserDoc;
    }

    // 5. If NO Aeropay account → Create one
    if (!aeropayUser) {
      logger.info('[AEROPAY] Creating new Aeropay user', {
        userId: user.uid,
        email: user.email,
      });

      const newAeropayUser = await createAeropayUser({
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || 'Customer',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        phoneNumber: (user as any).phoneNumber || '+1234567890',
      });

      // Save to Firestore
      aeropayUser = {
        userId: user.uid,
        aeropayUserId: newAeropayUser.userId,
        email: newAeropayUser.email,
        firstName: newAeropayUser.firstName,
        lastName: newAeropayUser.lastName,
        phoneNumber: newAeropayUser.phoneNumber,
        bankAccounts: [],
        status: 'active',
        createdAt: Timestamp.now() as any,
        updatedAt: Timestamp.now() as any,
      };

      await aeropayUserRef.set(aeropayUser as any);

      logger.info('[AEROPAY] Aeropay user created and saved', {
        userId: user.uid,
        aeropayUserId: newAeropayUser.userId,
      });
    }

    // 6. Check if user has linked bank account
    if (!aeropayUser) {
      return NextResponse.json({ error: 'Failed to create or retrieve Aeropay user' }, { status: 500 });
    }

    const hasBankAccount =
      aeropayUser.bankAccounts && aeropayUser.bankAccounts.length > 0;

    // Determine which bank account to use
    let selectedBankAccountId: string | undefined;
    if (hasBankAccount) {
      if (bankAccountId) {
        // Use specified bank account
        const bankAccount = aeropayUser.bankAccounts.find((ba) => ba.id === bankAccountId);
        if (!bankAccount) {
          return NextResponse.json(
            { error: 'Specified bank account not found' },
            { status: 400 }
          );
        }
        selectedBankAccountId = bankAccountId;
      } else {
        // Use default bank account
        selectedBankAccountId =
          aeropayUser.defaultBankAccountId ||
          aeropayUser.bankAccounts.find((ba) => ba.isDefault)?.id ||
          aeropayUser.bankAccounts[0]?.id;
      }
    }

    // 7a. If NO bank account → Return aggregator URL for bank linking
    if (!hasBankAccount || !selectedBankAccountId) {
      logger.info('[AEROPAY] User needs to link bank account', {
        userId: user.uid,
        aeropayUserId: aeropayUser.aeropayUserId,
      });

      const aggregatorCreds = await getAggregatorCredentials({
        userId: aeropayUser.aeropayUserId,
      });

      // Update order to indicate Aeropay payment in progress
      await orderRef.update({
        paymentMethod: 'aeropay',
        paymentStatus: 'pending',
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        requiresBankLink: true,
        aerosyncUrl: aggregatorCreds.aggregatorUrl,
        linkToken: aggregatorCreds.linkToken,
        aeropayUserId: aeropayUser.aeropayUserId,
        expiresAt: aggregatorCreds.expiresAt,
      });
    }

    // 7b. If YES bank account → Create transaction
    logger.info('[AEROPAY] Creating transaction with linked bank account', {
      userId: user.uid,
      aeropayUserId: aeropayUser.aeropayUserId,
      bankAccountId: selectedBankAccountId,
      amount: serverAmountCents,
    });

    const merchantId = process.env.AEROPAY_MERCHANT_ID!;

    const transaction = await createTransaction({
      userId: aeropayUser.aeropayUserId,
      bankAccountId: selectedBankAccountId,
      amount: serverAmountCents + AEROPAY_TRANSACTION_FEE_CENTS, // Include fee
      merchantId,
      merchantOrderId: orderId,
      description: `Order ${orderId}`,
    });

    // 8. Update order with transaction details
    await orderRef.update({
      paymentMethod: 'aeropay',
      paymentStatus: 'pending',
      paymentProvider: 'aeropay',
      paymentIntentId: transaction.transactionId,
      transactionId: transaction.transactionId,
      'aeropay.transactionId': transaction.transactionId,
      'aeropay.userId': aeropayUser.aeropayUserId,
      'aeropay.bankAccountId': selectedBankAccountId,
      'aeropay.status': transaction.status,
      'aeropay.amount': serverAmountCents + AEROPAY_TRANSACTION_FEE_CENTS,
      'aeropay.fee': AEROPAY_TRANSACTION_FEE_CENTS,
      'aeropay.authorizedAt': new Date().toISOString(),
      'aeropay.merchantOrderId': orderId,
      updatedAt: new Date().toISOString(),
    });

    // 9. Save transaction to Firestore for audit trail
    const transactionRef = firestore
      .collection('aeropay_transactions')
      .doc(transaction.transactionId);

    await transactionRef.set({
      transactionId: transaction.transactionId,
      orderId,
      userId: user.uid,
      aeropayUserId: aeropayUser.aeropayUserId,
      bankAccountId: selectedBankAccountId,
      merchantId,
      amount: serverAmountCents + AEROPAY_TRANSACTION_FEE_CENTS,
      fee: AEROPAY_TRANSACTION_FEE_CENTS,
      status: transaction.status,
      merchantOrderId: orderId,
      description: `Order ${orderId}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      webhookEvents: [],
    });

    logger.info('[AEROPAY] Transaction created successfully', {
      orderId,
      transactionId: transaction.transactionId,
      amount: amount + AEROPAY_TRANSACTION_FEE_CENTS,
      fee: AEROPAY_TRANSACTION_FEE_CENTS,
      userId: user.uid,
    });

    // 10. Return transaction details to client
    return NextResponse.json({
      requiresBankLink: false,
      transactionId: transaction.transactionId,
      status: transaction.status,
      totalAmount: serverAmountCents + AEROPAY_TRANSACTION_FEE_CENTS,
      transactionFee: AEROPAY_TRANSACTION_FEE_CENTS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
    logger.error('[AEROPAY] Authorization failed', error instanceof Error ? error : new Error(String(error)));

    // Return appropriate error
    if (error instanceof Error) {
      // Aeropay API errors
      if (error.message.includes('AEROPAY')) {
        return NextResponse.json(
          { error: 'Payment authorization failed. Please try again.' },
          { status: 502 }
        );
      }

      // Configuration errors (missing secrets)
      if (error.message.includes('environment variable')) {
        return NextResponse.json(
          { error: 'Payment system not configured. Please contact support.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
