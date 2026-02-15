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

export const dynamic = 'force-dynamic';

interface StatusRequest {
  transactionId: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: StatusRequest = await request.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transactionId' },
        { status: 400 }
      );
    }

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

    // 5. Update Firestore transaction document with latest status
    await transactionRef.update({
      status: transaction.status,
      updatedAt: new Date().toISOString(),
    });

    // Also update the order if status changed
    const orderId = transactionData.orderId;
    if (orderId) {
      const orderRef = firestore.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
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

    logger.debug('[AEROPAY] Transaction status retrieved', {
      transactionId,
      status: transaction.status,
      amount: transaction.amount,
    });

    // 6. Return transaction status to frontend
    return NextResponse.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      updatedAt: transaction.updatedAt || new Date().toISOString(),
    });
  } catch (error) {
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
