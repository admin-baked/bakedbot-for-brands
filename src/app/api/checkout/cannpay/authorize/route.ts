/**
 * CannPay Payment Authorization Endpoint
 *
 * POST /api/checkout/cannpay/authorize
 *
 * Authorizes a CannPay payment and returns intent_id for widget initialization.
 *
 * Flow:
 * 1. Client calls this endpoint with order details
 * 2. Server calls CannPay /integrator/authorize
 * 3. Server returns intent_id and widget_url to client
 * 4. Client initializes CannPay widget with intent_id
 *
 * AI-THREAD: [Dev1-Claude @ 2025-11-30] P0-PAY-CANNPAY-INTEGRATION
 * Created authorization endpoint for CannPay payments.
 * Includes 50 cent transaction fee as deliveryFee parameter.
 * Validates order and customer before authorizing payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authorizePayment, CANNPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/cannpay';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface AuthorizeRequest {
  orderId: string;
  amount: number; // in cents
  organizationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: AuthorizeRequest = await request.json();
    const { orderId, amount, organizationId } = body;

    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid orderId or amount' },
        { status: 400 }
      );
    }

    // 3. Verify order exists and belongs to user
    const { firestore } = await createServerClient();
    const orderRef = firestore.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data();

    // Verify order ownership (customer must own the order)
    if (orderData?.customerId !== user.uid) {
      return NextResponse.json(
        { error: 'You do not have permission to pay for this order' },
        { status: 403 }
      );
    }

    // Verify order hasn't already been paid
    if (orderData?.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Order has already been paid' },
        { status: 400 }
      );
    }

    // 4. Authorize payment with CannPay
    const passthrough = JSON.stringify({
      orderId,
      organizationId: organizationId || orderData.organizationId,
      customerId: user.uid,
    });

    const authResult = await authorizePayment({
      amount,
      deliveryFee: CANNPAY_TRANSACTION_FEE_CENTS, // $0.50 transaction fee
      merchantOrderId: orderId,
      passthrough,
      returnConsumerGivenTipAmount: true, // Allow tips
    });

    // 5. Update order with intent_id and payment method
    await orderRef.update({
      paymentMethod: 'cannpay',
      'canpay.intentId': authResult.intent_id,
      'canpay.status': 'Pending',
      'canpay.amount': amount + CANNPAY_TRANSACTION_FEE_CENTS,
      'canpay.fee': CANNPAY_TRANSACTION_FEE_CENTS,
      'canpay.authorizedAt': new Date().toISOString(),
      paymentStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });

    logger.info('[P0-PAY-CANNPAY] Authorized payment for order', {
      orderId,
      intentId: authResult.intent_id,
      amount,
      fee: CANNPAY_TRANSACTION_FEE_CENTS,
      userId: user.uid,
    });

    // 6. Return intent_id and widget_url to client
    return NextResponse.json({
      intentId: authResult.intent_id,
      widgetUrl: authResult.widget_url,
      expiresAt: authResult.expires_at,
      totalAmount: amount + CANNPAY_TRANSACTION_FEE_CENTS,
      transactionFee: CANNPAY_TRANSACTION_FEE_CENTS,
    });
  } catch (error) {
    logger.error('[P0-PAY-CANNPAY] Authorization failed', error instanceof Error ? error : new Error(String(error)));

    // Return appropriate error
    if (error instanceof Error) {
      // CannPay API errors
      if (error.message.includes('CannPay')) {
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
