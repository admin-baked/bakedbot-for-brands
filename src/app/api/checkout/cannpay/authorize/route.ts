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
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const authorizeRequestSchema = z.object({
  orderId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid orderId'),
  amount: z.number().int().min(1).max(5_000_000), // cents
  organizationId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid organizationId').optional(),
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
    const { orderId, amount, organizationId } = body;

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

    // Verify order ownership (customer must own the order)
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
      logger.warn('[P0-PAY-CANNPAY] Client amount mismatch; using order total', {
        orderId,
        clientAmount: amount,
        serverAmount: serverAmountCents,
        userId: user.uid,
      });
    }

    const existingIntentId =
      typeof orderData?.canpay?.intentId === 'string'
        ? orderData.canpay.intentId
        : null;
    const existingIntentStatus = String(orderData?.canpay?.status || '').toLowerCase();
    const hasActiveCannPayAuthorization =
      !!existingIntentId &&
      normalizedPaymentStatus === 'pending' &&
      (
        String(orderData?.paymentMethod || '').toLowerCase() === 'cannpay' ||
        existingIntentStatus === 'pending' ||
        existingIntentStatus === 'authorized'
      );

    if (hasActiveCannPayAuthorization) {
      logger.info('[P0-PAY-CANNPAY] Reusing existing pending CannPay authorization', {
        orderId,
        intentId: existingIntentId,
        userId: user.uid,
      });
      return NextResponse.json({
        intentId: existingIntentId,
        widgetUrl: orderData?.canpay?.widgetUrl || null,
        expiresAt: orderData?.canpay?.expiresAt || null,
        totalAmount: serverAmountCents + CANNPAY_TRANSACTION_FEE_CENTS,
        transactionFee: CANNPAY_TRANSACTION_FEE_CENTS,
        reused: true,
      });
    }

    // 4. Authorize payment with CannPay
    const passthrough = JSON.stringify({
      orderId,
      organizationId: orderOrganizationId,
      customerId: user.uid,
    });

    const authResult = await authorizePayment({
      amount: serverAmountCents,
      deliveryFee: CANNPAY_TRANSACTION_FEE_CENTS, // $0.50 transaction fee
      merchantOrderId: orderId,
      passthrough,
      returnConsumerGivenTipAmount: true, // Allow tips
    });

    // 5. Update order with intent_id and payment method
    await orderRef.update({
      paymentMethod: 'cannpay',
      'canpay.intentId': authResult.intent_id,
      'canpay.widgetUrl': authResult.widget_url || null,
      'canpay.expiresAt': authResult.expires_at || null,
      'canpay.status': 'Pending',
      'canpay.amount': serverAmountCents + CANNPAY_TRANSACTION_FEE_CENTS,
      'canpay.fee': CANNPAY_TRANSACTION_FEE_CENTS,
      'canpay.authorizedAt': new Date().toISOString(),
      paymentStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });

    logger.info('[P0-PAY-CANNPAY] Authorized payment for order', {
      orderId,
      intentId: authResult.intent_id,
      amount: serverAmountCents,
      fee: CANNPAY_TRANSACTION_FEE_CENTS,
      userId: user.uid,
    });

    // 6. Return intent_id and widget_url to client
    return NextResponse.json({
      intentId: authResult.intent_id,
      widgetUrl: authResult.widget_url,
      expiresAt: authResult.expires_at,
      totalAmount: serverAmountCents + CANNPAY_TRANSACTION_FEE_CENTS,
      transactionFee: CANNPAY_TRANSACTION_FEE_CENTS,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid request payload' },
        { status: 400 }
      );
    }
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
