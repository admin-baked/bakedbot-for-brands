/**
 * Aeropay Transaction Status Endpoint
 *
 * POST /api/checkout/aeropay/status
 *
 * Polls transaction status from Aeropay API.
 * Used by frontend to check if payment has completed.
 *
 * Flow:
 * 1. Frontend creates transaction
 * 2. Frontend polls this endpoint every 3 seconds
 * 3. Server queries Aeropay API for latest status
 * 4. Server returns status to frontend
 * 5. Frontend stops polling when status is 'completed', 'declined', or 'voided'
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created transaction status endpoint for polling Aeropay payment status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTransactionDetails } from '@/lib/payments/aeropay';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { AEROPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/aeropay';

export const dynamic = 'force-dynamic';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const statusRequestSchema = z.object({
  transactionId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid transactionId'),
}).strict();

function getExpectedAeropayAmountCents(orderData: Record<string, unknown> | undefined): number | null {
  if (!orderData) return null;
  const total = Number((orderData as any)?.totals?.total ?? (orderData as any)?.amount);
  if (!Number.isFinite(total) || total < 0) return null;
  return Math.round(total * 100) + AEROPAY_TRANSACTION_FEE_CENTS;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const { transactionId } = statusRequestSchema.parse(await request.json());

    // 3. Verify transaction exists in Firestore and belongs to user
    const { firestore } = await createServerClient();
    const transactionRef = firestore
      .collection('aeropay_transactions')
      .doc(transactionId);
    const transactionSnap = await transactionRef.get();

    if (!transactionSnap.exists) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transactionData = transactionSnap.data();

    // Verify transaction ownership
    if (transactionData?.userId !== user.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to view this transaction' },
        { status: 403 }
      );
    }

    // 4. Query Aeropay API for latest transaction status
    logger.debug('[AEROPAY] Polling transaction status', {
      transactionId,
      userId: user.uid,
    });

    const transaction = await getTransactionDetails(transactionId);

    // 5. Update the related order if status changed
    const orderId = transactionData.orderId;
    if (orderId) {
      const orderRef = firestore.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
        const orderData = orderSnap.data() as Record<string, unknown>;
        const expectedAmountCents = getExpectedAeropayAmountCents(orderData);
        const providerAmountCents = Number(transaction.amount);
        const providerMerchantOrderId =
          typeof (transaction as any).merchantOrderId === 'string'
            ? String((transaction as any).merchantOrderId)
            : null;

        if (
          providerMerchantOrderId &&
          providerMerchantOrderId !== orderId
        ) {
          await firestore.collection('payment_forensics').add({
            provider: 'aeropay',
            source: 'aeropay_status_poll',
            reason: 'order_mismatch',
            userId: user.uid,
            orderId,
            transactionId,
            providerMerchantOrderId,
            expectedMerchantOrderId: orderId,
            providerStatus: transaction.status,
            observedAt: FieldValue.serverTimestamp(),
          });

          return NextResponse.json(
            { error: 'Aeropay transaction is not bound to this order' },
            { status: 409 }
          );
        }

        if (
          expectedAmountCents !== null &&
          Number.isFinite(providerAmountCents) &&
          providerAmountCents !== expectedAmountCents
        ) {
          await firestore.collection('payment_forensics').add({
            provider: 'aeropay',
            source: 'aeropay_status_poll',
            reason: 'amount_mismatch',
            userId: user.uid,
            orderId,
            transactionId,
            expectedAmountCents,
            providerAmountCents,
            providerStatus: transaction.status,
            observedAt: FieldValue.serverTimestamp(),
          });

          return NextResponse.json(
            { error: 'Aeropay transaction amount mismatch' },
            { status: 409 }
          );
        }

        if (
          transaction.status === 'completed' &&
          expectedAmountCents !== null &&
          !Number.isFinite(providerAmountCents)
        ) {
          await firestore.collection('payment_forensics').add({
            provider: 'aeropay',
            source: 'aeropay_status_poll',
            reason: 'missing_amount',
            userId: user.uid,
            orderId,
            transactionId,
            expectedAmountCents,
            providerAmountCents: null,
            providerStatus: transaction.status,
            observedAt: FieldValue.serverTimestamp(),
          });

          return NextResponse.json(
            { error: 'Aeropay transaction amount missing' },
            { status: 409 }
          );
        }

        const updates: any = {
          'aeropay.status': transaction.status,
          updatedAt: new Date().toISOString(),
        };

        // Update payment status based on transaction status
        if (transaction.status === 'completed') {
          updates.paymentStatus = 'paid';
          updates['aeropay.completedAt'] = new Date().toISOString();
        } else if (transaction.status === 'declined') {
          updates.paymentStatus = 'failed';
        } else if (transaction.status === 'voided' || transaction.status === 'refunded') {
          updates.paymentStatus = transaction.status;
        }

        await orderRef.update(updates);
      }
    }

    // 6. Update Firestore transaction document with latest status after guardrails
    await transactionRef.update({
      status: transaction.status,
      updatedAt: new Date().toISOString(),
    });

    logger.debug('[AEROPAY] Transaction status retrieved', {
      transactionId,
      status: transaction.status,
      amount: transaction.amount,
    });

    // 7. Return transaction status to frontend
    return NextResponse.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      updatedAt: transaction.updatedAt || new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
    logger.error('[AEROPAY] Status check failed', error instanceof Error ? error : new Error(String(error)));

    // Return appropriate error
    if (error instanceof Error) {
      // Aeropay API errors
      if (error.message.includes('AEROPAY')) {
        return NextResponse.json(
          { error: 'Failed to retrieve transaction status. Please try again.' },
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
      { error: 'An unexpected error occurred while checking status' },
      { status: 500 }
    );
  }
}
