/**
 * Aeropay Webhook Handler
 *
 * POST /api/webhooks/aeropay
 *
 * Receives webhook events from Aeropay for transaction status updates.
 *
 * Webhook Events (based on Aeropay docs):
 * - transaction_completed: Payment succeeded
 * - transaction_declined: Payment failed
 * - transaction_voided: Payment voided/cancelled
 * - transaction_refunded: Payment refunded
 * - user_suspended: User account suspended
 * - user_active: User account reactivated
 * - merchant_reputation_updated: Merchant reputation changed
 *
 * Security:
 * - Verifies webhook signature using Aeropay's signing method
 * - Uses constant-time comparison to prevent timing attacks
 * - Logs all events to payment_webhooks collection for audit trail
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created Aeropay webhook handler with signature verification and event processing.
 *
 * TODO: Confirm webhook signature algorithm with Aeropay (HMAC-SHA256 vs JWT vs other)
 * Current implementation assumes HMAC-SHA256 similar to CannPay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { emitEvent } from '@/server/events/emitter';
import type { EventType } from '@/types/domain';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import type { AeropayWebhookEvent } from '@/types/aeropay';
import { AEROPAY_TRANSACTION_FEE_CENTS } from '@/lib/payments/aeropay';

/**
 * Verifies webhook signature
 *
 * TODO: Confirm with Aeropay documentation for exact signature algorithm
 * Current implementation: HMAC-SHA256 (similar to CannPay pattern)
 *
 * @param payload - Raw request body
 * @param signature - Signature from header (format TBD by Aeropay)
 * @param secret - AEROPAY_WEBHOOK_SECRET from environment
 * @returns true if signature is valid
 */
function verifyAeropaySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Update signature algorithm based on Aeropay documentation
  // This assumes HMAC-SHA256 - verify with Aeropay integration engineer

  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const computed = hmac.digest('hex').toLowerCase();

  // Use constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(computed, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists';
}

function toCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Number.isInteger(value) ? value : Math.round(value * 100);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return trimmed.includes('.') ? Math.round(parsed * 100) : Math.round(parsed);
  }

  return null;
}

function getExpectedAeropayAmountCents(orderData: Record<string, any> | undefined): number | null {
  if (!orderData) return null;
  const total = Number(orderData?.totals?.total ?? orderData?.amount);
  if (!Number.isFinite(total) || total < 0) return null;
  return Math.round(total * 100) + AEROPAY_TRANSACTION_FEE_CENTS;
}

function resolveOrderStatus(
  orderData: Record<string, any>,
  desiredStatus?: string
): string | undefined {
  if (!desiredStatus) return undefined;

  const hasShippingAddress = !!orderData.shippingAddress;
  const purchaseModel = orderData.purchaseModel;

  if (desiredStatus === 'ready_for_pickup' && (hasShippingAddress || purchaseModel === 'online_only')) {
    return undefined;
  }

  const currentStatus = String(orderData.status || '').toLowerCase();
  if (currentStatus === 'completed' || currentStatus === 'canceled' || currentStatus === 'cancelled') {
    return undefined;
  }

  return desiredStatus;
}

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();
  let webhookLogRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    // 1. Get webhook secret
    const secret =
      process.env.AEROPAY_WEBHOOK_SECRET ||
      process.env.AEROPAY_API_SECRET; // Fallback to API secret

    if (!secret) {
      logger.critical('[AEROPAY-WEBHOOK] Missing webhook secret (AEROPAY_WEBHOOK_SECRET)');
      return NextResponse.json(
        { error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    // 2. Read raw request body
    const rawBody = await req.text();

    // 3. Get signature from headers
    // TODO: Confirm header name with Aeropay (using x-aeropay-signature as assumption)
    const signature =
      req.headers.get('x-aeropay-signature') ||
      req.headers.get('x-signature') ||
      '';

    if (!signature) {
      logger.error('[AEROPAY-WEBHOOK] Missing signature header');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // 4. Verify signature
    const isValid = verifyAeropaySignature(rawBody, signature, secret);
    if (!isValid) {
      logger.error('[AEROPAY-WEBHOOK] SECURITY: Invalid signature detected', {
        signatureProvided: signature.substring(0, 10) + '...',
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 5. Parse webhook payload
    let webhookEvent: AeropayWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch {
      logger.error('[AEROPAY-WEBHOOK] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { topic, data, date } = webhookEvent;

    if (!topic || !data) {
      logger.error('[AEROPAY-WEBHOOK] Missing topic or data in payload');
      return NextResponse.json(
        { error: 'Invalid webhook payload structure' },
        { status: 400 }
      );
    }

    logger.info('[AEROPAY-WEBHOOK] Received webhook event', {
      topic,
      date,
    });

    // 6. Idempotent webhook logging/deduplication
    const webhookLogId = `aeropay_${createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`;
    webhookLogRef = db.collection('payment_webhooks').doc(webhookLogId);
    try {
      await webhookLogRef.create({
        provider: 'aeropay',
        eventType: topic,
        payload: webhookEvent,
        receivedAt: Timestamp.now(),
        signature,
        status: 'received',
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        logger.info('[AEROPAY-WEBHOOK] Duplicate webhook payload ignored', {
          topic,
          webhookLogId,
          transactionId: (data as any)?.transactionId || null,
        });
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw error;
    }

    // 7. Route to appropriate handler based on topic
    switch (topic) {
      case 'transaction_completed':
      case 'transaction_declined':
      case 'transaction_voided':
      case 'transaction_refunded':
        await handleTransactionWebhook(db, topic, data as any);
        break;

      case 'user_suspended':
      case 'user_active':
        await handleUserWebhook(db, topic, data as any);
        break;

      case 'merchant_reputation_updated':
        await handleMerchantWebhook(db, topic, data as any);
        break;

      case 'preauthorized_transaction_created':
        // Future: Handle preauth transactions if needed
        logger.info('[AEROPAY-WEBHOOK] Preauth transaction created (not implemented)', {
          topic,
        });
        break;

      default:
        logger.warn('[AEROPAY-WEBHOOK] Unknown webhook topic', { topic });
        break;
    }

    if (webhookLogRef) {
      await webhookLogRef.set(
        {
          status: 'processed',
          processedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('[AEROPAY-WEBHOOK] Webhook processing failed', {
      error: err?.message,
      stack: err?.stack,
    });
    if (webhookLogRef) {
      await webhookLogRef.set(
        {
          status: 'failed',
          failedAt: Timestamp.now(),
          error: err?.message || String(err),
        },
        { merge: true }
      );
    }
    return NextResponse.json(
      { error: err?.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}

/**
 * Handle transaction webhook events
 */
async function handleTransactionWebhook(
  db: FirebaseFirestore.Firestore,
  topic: string,
  data: {
    transactionId: string;
    userId: string;
    merchantId: string;
    amount: string;
    status: string;
    merchantOrderId?: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string;
  }
) {
  const { transactionId, merchantOrderId, status } = data;

  if (!transactionId) {
    logger.error('[AEROPAY-WEBHOOK] Missing transactionId in webhook data');
    return;
  }

  // Map Aeropay status to our internal statuses
  let paymentStatus: string = 'pending';
  let orderStatus: string = 'pending';
  let eventType: EventType | null = null;

  switch (status.toLowerCase()) {
    case 'completed':
      paymentStatus = 'paid';
      orderStatus = 'ready_for_pickup';
      eventType = 'checkout.paid';
      break;
    case 'declined':
      paymentStatus = 'failed';
      orderStatus = 'canceled';
      eventType = 'checkout.failed';
      break;
    case 'voided':
      paymentStatus = 'voided';
      orderStatus = 'canceled';
      eventType = 'checkout.failed';
      break;
    case 'refunded':
      paymentStatus = 'refunded';
      // Don't change order status for refunds (order already fulfilled)
      break;
    case 'pending':
      paymentStatus = 'pending';
      orderStatus = 'pending';
      break;
    default:
      logger.warn('[AEROPAY-WEBHOOK] Unknown transaction status', {
        status,
        transactionId,
      });
      paymentStatus = status;
      break;
  }

  // Update transaction document
  const transactionRef = db.collection('aeropay_transactions').doc(transactionId);
  const transactionSnap = await transactionRef.get();

  if (!transactionSnap.exists) {
    logger.error('[AEROPAY-WEBHOOK] Transaction not found in Firestore', {
      transactionId,
    });
    // Don't fail webhook - transaction might not be in our system yet
    return;
  }

  const transactionData = transactionSnap.data();
  const orderId = transactionData?.orderId || merchantOrderId;

  if (!orderId) {
    logger.error('[AEROPAY-WEBHOOK] Missing orderId in transaction data', {
      transactionId,
    });
    return;
  }

  // Update order document
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    logger.error('[AEROPAY-WEBHOOK] Order not found for webhook event', {
      orderId,
      transactionId,
    });
    return;
  }

  const orderData = orderSnap.data() as Record<string, any>;
  if (
    merchantOrderId &&
    String(merchantOrderId).trim() &&
    String(merchantOrderId).trim() !== String(orderId)
  ) {
    logger.error('[AEROPAY-WEBHOOK] merchantOrderId mismatch with resolved orderId', {
      orderId,
      merchantOrderId,
      transactionId,
      status,
    });

    await db.collection('payment_forensics').add({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'order_mismatch',
      orderId,
      transactionId,
      merchantOrderId,
      expectedMerchantOrderId: orderId,
      providerStatus: status || null,
      observedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const storedTransactionId =
    typeof orderData?.transactionId === 'string' ? orderData.transactionId : null;
  if (storedTransactionId && storedTransactionId !== transactionId) {
    logger.error('[AEROPAY-WEBHOOK] transactionId mismatch for resolved order', {
      orderId,
      transactionId,
      expectedTransactionId: storedTransactionId,
      merchantOrderId: merchantOrderId || null,
      status,
    });

    await db.collection('payment_forensics').add({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'transaction_mismatch',
      orderId,
      transactionId,
      expectedTransactionId: storedTransactionId,
      merchantOrderId: merchantOrderId || null,
      providerStatus: status || null,
      observedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const expectedAmountCents = getExpectedAeropayAmountCents(orderData);
  const providerAmountCents = toCents(data.amount);

  if (
    paymentStatus === 'paid' &&
    expectedAmountCents !== null &&
    providerAmountCents === null
  ) {
    logger.error('[AEROPAY-WEBHOOK] Missing provider amount on paid event - refusing state transition', {
      orderId,
      transactionId,
      expectedAmountCents,
      status,
    });

    await db.collection('payment_forensics').add({
      provider: 'aeropay',
      source: 'aeropay_webhook',
      reason: 'missing_amount',
      orderId,
      transactionId,
      merchantOrderId: merchantOrderId || null,
      expectedAmountCents,
      providerAmountCents: null,
      providerStatus: status || null,
      observedAt: FieldValue.serverTimestamp(),
    });

    return;
  }

  if (expectedAmountCents !== null && providerAmountCents !== null) {
    const centsMatch = providerAmountCents === expectedAmountCents;
    const dollarsMatch = providerAmountCents * 100 === expectedAmountCents;

    if (!centsMatch && !dollarsMatch) {
      logger.error('[AEROPAY-WEBHOOK] Amount mismatch - refusing state transition', {
        orderId,
        transactionId,
        expectedAmountCents,
        providerAmountCents,
        status,
      });

      await db.collection('payment_forensics').add({
        provider: 'aeropay',
        source: 'aeropay_webhook',
        reason: 'amount_mismatch',
        orderId,
        transactionId,
        merchantOrderId: merchantOrderId || null,
        expectedAmountCents,
        providerAmountCents,
        providerStatus: status || null,
        observedAt: FieldValue.serverTimestamp(),
      });

      return;
    }
  }

  // Update transaction with new status and webhook event
  await transactionRef.update({
    status: paymentStatus,
    updatedAt: Timestamp.now(),
    ...(status === 'completed' && { completedAt: Timestamp.now() }),
    webhookEvents: FieldValue.arrayUnion({
      topic,
      data,
      receivedAt: new Date().toISOString(),
    }),
  });

  const updatePayload: any = {
    paymentStatus,
    updatedAt: FieldValue.serverTimestamp(),
    lastPaymentEvent: data,
    'aeropay.status': status,
    'aeropay.updatedAt': new Date().toISOString(),
  };

  const resolvedOrderStatus = resolveOrderStatus(
    orderData,
    status.toLowerCase() === 'refunded' ? undefined : orderStatus,
  );

  if (resolvedOrderStatus) {
    updatePayload.status = resolvedOrderStatus;
  }

  // Add completion timestamp for completed payments
  if (status.toLowerCase() === 'completed') {
    updatePayload['aeropay.completedAt'] = new Date().toISOString();
  }

  await orderRef.update(updatePayload);

  const orgId = orderData?.brandId || orderData?.retailerId;

  logger.info('[AEROPAY-WEBHOOK] Transaction updated successfully', {
    orderId,
    transactionId,
    status,
    paymentStatus,
    orderStatus,
  });

  // Emit domain events
  if (eventType && orgId) {
    await emitEvent({
      orgId,
      type: eventType,
      agent: 'smokey',
      refId: orderId,
      data: { paymentStatus, orderStatus, transactionId },
    });

    // Emit order ready event for completed payments
    if (eventType === 'checkout.paid') {
      await emitEvent({
        orgId,
        type: 'order.readyForPickup',
        agent: 'smokey',
        refId: orderId,
        data: { paymentStatus },
      });
    }
  } else if (eventType) {
    logger.warn('[AEROPAY-WEBHOOK] Skipping event emit due to missing organization context', {
      orderId,
      transactionId,
      eventType,
    });
  }
}

/**
 * Handle user webhook events (suspended/active)
 */
async function handleUserWebhook(
  db: FirebaseFirestore.Firestore,
  topic: string,
  data: {
    userId: string; // Aeropay user ID
    status: string;
    reason?: string;
    updatedAt: string;
  }
) {
  const { userId: aeropayUserId, status } = data;

  if (!aeropayUserId) {
    logger.error('[AEROPAY-WEBHOOK] Missing userId in user webhook data');
    return;
  }

  // Find BakedBot user by Aeropay user ID
  const aeropayUsersQuery = await db
    .collection('aeropay_users')
    .where('aeropayUserId', '==', aeropayUserId)
    .limit(1)
    .get();

  if (aeropayUsersQuery.empty) {
    logger.warn('[AEROPAY-WEBHOOK] Aeropay user not found in Firestore', {
      aeropayUserId,
    });
    return;
  }

  const aeropayUserDoc = aeropayUsersQuery.docs[0];

  // Update user status
  await aeropayUserDoc.ref.update({
    status: status === 'suspended' ? 'suspended' : 'active',
    updatedAt: Timestamp.now(),
  });

  logger.info('[AEROPAY-WEBHOOK] User status updated', {
    aeropayUserId,
    status,
    topic,
  });
}

/**
 * Handle merchant reputation webhook events
 */
async function handleMerchantWebhook(
  db: FirebaseFirestore.Firestore,
  topic: string,
  data: {
    merchantId: string;
    reputationScore: number;
    riskLevel: string;
    updatedAt: string;
  }
) {
  const { merchantId, reputationScore, riskLevel } = data;

  // Log merchant reputation updates for monitoring
  logger.info('[AEROPAY-WEBHOOK] Merchant reputation updated', {
    merchantId,
    reputationScore,
    riskLevel,
  });

  // Future: Store merchant reputation data if needed
  // For now, just log for monitoring purposes
}
