import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { createServerClient } from '@/firebase/server-client';
import { emitEvent } from '@/server/events/emitter';
import { verifyAuthorizeNetSignature } from '@/lib/payments/webhook-validation';
import { assignTierPlaybooks } from '@/server/actions/playbooks';
import type { EventType } from '@/types/domain';
import { logger } from '@/lib/logger';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

type AuthNetWebhookPayload = {
  notificationId?: string;
  eventType?: string;
  eventDate?: string;
  webhookId?: string;
  payload?: {
    id?: string | number;
    entityName?: string;
    responseCode?: string | number;
    authAmount?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type PaymentWebhookOutcome = {
  paymentStatus: string;
  orderStatus?: string;
  emittedEvent?: EventType;
};

type SubscriptionWebhookOutcome = {
  subscriptionStatus?: string;
  emittedEvent?: EventType;
};

type VoidAttemptResult = {
  attempted: boolean;
  succeeded: boolean;
  message?: string;
  code?: string | null;
  providerTransId?: string | null;
};

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists';
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseAmountToCents(value: unknown): number | null {
  const numeric = parseNumericValue(value);
  if (numeric === null || numeric < 0) return null;
  return Math.round(numeric * 100);
}

function getExpectedOrderTotalCents(orderData: Record<string, any>): number | null {
  const total = parseNumericValue(orderData?.totals?.total ?? orderData?.amount);
  if (total === null || total < 0) return null;
  return Math.round(total * 100);
}

function mapPaymentWebhookOutcome(eventType: string, responseCode: number | null): PaymentWebhookOutcome {
  const normalizedType = eventType.toLowerCase();

  if (
    normalizedType.includes('refund') ||
    normalizedType.includes('void') ||
    normalizedType.includes('declined') ||
    normalizedType.includes('failed') ||
    responseCode === 2 ||
    responseCode === 3 ||
    responseCode === 4
  ) {
    return {
      paymentStatus: normalizedType.includes('refund') ? 'refunded' : 'failed',
      orderStatus: 'canceled',
      emittedEvent: 'checkout.failed',
    };
  }

  if (isAuthorizationOnlyEvent(eventType)) {
    return { paymentStatus: 'authorized' };
  }

  if (
    normalizedType.includes('authcapture') ||
    normalizedType.includes('capture') ||
    normalizedType.includes('settled')
  ) {
    return {
      paymentStatus: 'paid',
      orderStatus: 'ready_for_pickup',
      emittedEvent: 'checkout.paid',
    };
  }

  return { paymentStatus: 'pending' };
}

function resolvePaymentStatus(currentOrderData: Record<string, any>, desiredPaymentStatus: string): string {
  const desired = String(desiredPaymentStatus || '').toLowerCase();
  if (!desired) {
    return String(currentOrderData?.paymentStatus || 'pending').toLowerCase();
  }

  const current = String(currentOrderData?.paymentStatus || '').toLowerCase();
  if (!current) return desired;

  // Do not allow late authorization/decline/pending events to downgrade settled orders.
  if (current === 'paid') {
    if (desired === 'refunded') return desired;
    return current;
  }

  // Refunded/voided are terminal settlement states.
  if (current === 'refunded' || current === 'voided') {
    return current;
  }

  return desired;
}

function mapPaymentEventToSubscriptionOutcome(
  eventType: string,
  responseCode: number | null,
): SubscriptionWebhookOutcome {
  const normalizedType = eventType.toLowerCase();

  if (isAuthorizationOnlyEvent(eventType)) {
    return {};
  }

  if (
    normalizedType.includes('payment.declined') ||
    normalizedType.includes('payment.fraud.declined') ||
    normalizedType.includes('payment.void.created') ||
    responseCode === 2 ||
    responseCode === 3 ||
    responseCode === 4
  ) {
    return { subscriptionStatus: 'past_due', emittedEvent: 'subscription.failed' };
  }

  if (
    normalizedType.includes('payment.authcapture.created') ||
    normalizedType.includes('payment.capture.created') ||
    normalizedType.includes('payment.fraud.approved')
  ) {
    return { subscriptionStatus: 'active', emittedEvent: 'subscription.updated' };
  }

  return {};
}

function isAuthorizationOnlyEvent(eventType: string): boolean {
  const normalizedType = eventType.toLowerCase();
  return (
    normalizedType.includes('net.authorize.payment.authorization.') ||
    normalizedType.includes('authonly')
  );
}

function shouldAttemptVoidForUnmappedPayment(
  eventType: string,
  responseCode: number | null,
): boolean {
  if (responseCode !== null && responseCode !== 1) return false;
  const normalizedType = eventType.toLowerCase();
  if (!normalizedType.includes('net.authorize.payment.')) return false;
  if (
    normalizedType.includes('refund') ||
    normalizedType.includes('void') ||
    normalizedType.includes('declined') ||
    normalizedType.includes('failed')
  ) {
    return false;
  }

  return (
    normalizedType.includes('authorization') ||
    normalizedType.includes('authonly') ||
    normalizedType.includes('authcapture') ||
    normalizedType.includes('capture') ||
    normalizedType.includes('settled')
  );
}

function getAuthNetEndpoint(): string {
  const env = (process.env.AUTHNET_ENV || '').toLowerCase();
  const isProduction = env === 'production' || (process.env.NODE_ENV || '').toLowerCase() === 'production';
  return isProduction
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';
}

function getAuthNetCredentials(): { apiLoginId: string; transactionKey: string } | null {
  const apiLoginId =
    process.env.AUTHNET_API_LOGIN_ID ||
    process.env.AUTHORIZE_NET_LOGIN_ID ||
    process.env.AUTHORIZENET_API_LOGIN_ID ||
    process.env.AUTHORIZENET_LOGIN_ID ||
    '';
  const transactionKey =
    process.env.AUTHNET_TRANSACTION_KEY ||
    process.env.AUTHORIZE_NET_TRANSACTION_KEY ||
    process.env.AUTHORIZENET_TRANSACTION_KEY ||
    '';

  if (!apiLoginId || !transactionKey) {
    return null;
  }

  return { apiLoginId, transactionKey };
}

async function attemptVoidSuspiciousPayment(
  transactionId: string,
  eventType: string,
): Promise<VoidAttemptResult> {
  const credentials = getAuthNetCredentials();
  if (!credentials) {
    logger.warn('[AUTHNET_WEBHOOK] Missing credentials for suspicious authorization void attempt', {
      transactionId,
      eventType,
    });
    return { attempted: false, succeeded: false, message: 'credentials_missing' };
  }

  const payload = {
    createTransactionRequest: {
      merchantAuthentication: {
        name: credentials.apiLoginId,
        transactionKey: credentials.transactionKey,
      },
      refId: `authnet_void_${Date.now()}`,
      transactionRequest: {
        transactionType: 'voidTransaction',
        refTransId: transactionId,
      },
    },
  };

  try {
    const response = await fetch(getAuthNetEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        attempted: true,
        succeeded: false,
        message: `http_${response.status}`,
      };
    }

    const data = await response.json().catch(() => null);
    const resultCode = data?.messages?.resultCode;
    const transactionResponse = data?.transactionResponse || {};
    const errorText =
      transactionResponse?.errors?.[0]?.errorText ||
      data?.messages?.message?.[0]?.text ||
      null;
    const errorCode =
      transactionResponse?.errors?.[0]?.errorCode ||
      data?.messages?.message?.[0]?.code ||
      null;
    const providerTransId =
      transactionResponse?.transId || null;

    if (resultCode === 'Ok') {
      return {
        attempted: true,
        succeeded: true,
        message: 'void_submitted',
        code: null,
        providerTransId,
      };
    }

    return {
      attempted: true,
      succeeded: false,
      message: errorText || 'void_failed',
      code: errorCode,
      providerTransId,
    };
  } catch (error: any) {
    logger.error('[AUTHNET_WEBHOOK] Failed to void suspicious authorization', {
      transactionId,
      error: error?.message || String(error),
    });
    return {
      attempted: true,
      succeeded: false,
      message: error?.message || 'void_request_failed',
    };
  }
}

function mapSubscriptionWebhookOutcome(eventType: string): SubscriptionWebhookOutcome {
  const normalizedType = eventType.toLowerCase();

  if (
    normalizedType.includes('suspended') ||
    normalizedType.includes('payment.failed') ||
    normalizedType.includes('.failed')
  ) {
    return { subscriptionStatus: 'past_due', emittedEvent: 'subscription.failed' };
  }

  if (normalizedType.includes('terminated') || normalizedType.includes('cancelled')) {
    return { subscriptionStatus: 'canceled', emittedEvent: 'subscription.updated' };
  }

  if (
    normalizedType.includes('created') ||
    normalizedType.includes('updated') ||
    normalizedType.includes('reactivated') ||
    normalizedType.includes('expiring')
  ) {
    return { subscriptionStatus: 'active', emittedEvent: 'subscription.updated' };
  }

  return {};
}

function isSubscriptionWebhookEvent(eventType: string): boolean {
  const normalizedType = eventType.toLowerCase();
  return (
    normalizedType.includes('net.authorize.customer.subscription.') ||
    normalizedType.includes('net.authorize.subscription.')
  );
}

function resolveOrderStatus(currentOrderData: Record<string, any>, desiredStatus?: string): string | undefined {
  if (!desiredStatus) return undefined;

  const hasShippingAddress = !!currentOrderData.shippingAddress;
  const purchaseModel = currentOrderData.purchaseModel;

  if (desiredStatus === 'ready_for_pickup' && (hasShippingAddress || purchaseModel === 'online_only')) {
    return undefined;
  }

  const currentStatus = String(currentOrderData.status || '').toLowerCase();
  if (currentStatus === 'completed' || currentStatus === 'canceled' || currentStatus === 'cancelled') {
    return undefined;
  }

  return desiredStatus;
}

function extractOrgIdFromSubscriptionPath(path: string): string | null {
  const match = path.match(/^organizations\/([^/]+)\/subscription\/[^/]+$/);
  return match?.[1] ?? null;
}

function extractOrgIdFromPaymentPayload(payload: Record<string, unknown>): string | null {
  const merchantReferenceId =
    typeof payload?.merchantReferenceId === 'string' && payload.merchantReferenceId.trim().length > 0
      ? payload.merchantReferenceId.trim()
      : null;
  if (merchantReferenceId) return merchantReferenceId;

  const profile = payload?.profile as Record<string, unknown> | undefined;
  const merchantCustomerId =
    typeof profile?.merchantCustomerId === 'string' && profile.merchantCustomerId.trim().length > 0
      ? profile.merchantCustomerId.trim()
      : null;

  return merchantCustomerId;
}

function extractOrderIdFromPaymentPayload(payload: Record<string, unknown>): string | null {
  const directInvoice =
    typeof payload?.invoiceNumber === 'string' && payload.invoiceNumber.trim().length > 0
      ? payload.invoiceNumber.trim()
      : null;
  if (directInvoice && DOCUMENT_ID_REGEX.test(directInvoice)) {
    return directInvoice;
  }

  const merchantOrderId =
    typeof payload?.merchantOrderId === 'string' && payload.merchantOrderId.trim().length > 0
      ? payload.merchantOrderId.trim()
      : null;
  if (merchantOrderId && DOCUMENT_ID_REGEX.test(merchantOrderId)) {
    return merchantOrderId;
  }

  const order = payload?.order as Record<string, unknown> | undefined;
  const nestedInvoice =
    typeof order?.invoiceNumber === 'string' && order.invoiceNumber.trim().length > 0
      ? order.invoiceNumber.trim()
      : null;
  if (nestedInvoice && DOCUMENT_ID_REGEX.test(nestedInvoice)) {
    return nestedInvoice;
  }

  return null;
}

function isEligibleInvoiceFallbackOrder(orderData: Record<string, unknown>): boolean {
  const paymentProvider = String(orderData?.paymentProvider || '').toLowerCase();
  const paymentMethod = String(orderData?.paymentMethod || '').toLowerCase();
  const paymentStatus = String(orderData?.paymentStatus || '').toLowerCase();
  const orderStatus = String(orderData?.status || '').toLowerCase();
  const transactionId =
    typeof orderData?.transactionId === 'string'
      ? orderData.transactionId.trim()
      : '';

  const providerMatches = paymentProvider === 'authorize_net' || paymentMethod === 'credit_card';
  const pendingLikeStatus =
    !paymentStatus || paymentStatus === 'pending' || paymentStatus === 'authorized';
  const orderIsOpen =
    orderStatus !== 'completed' &&
    orderStatus !== 'canceled' &&
    orderStatus !== 'cancelled';

  // Invoice fallback should only reconcile known pending Authorize.Net orders that
  // do not yet have a bound gateway transaction id.
  return providerMatches && pendingLikeStatus && orderIsOpen && transactionId.length === 0;
}

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();
  let webhookLogRef: FirebaseFirestore.DocumentReference | null = null;

  try {
    const secret =
      process.env.AUTHNET_SIGNATURE_KEY ||
      process.env.AUTHORIZE_NET_SIGNATURE_KEY ||
      process.env.AUTHNET_NOTIFICATION_KEY;
    if (!secret) {
      logger.critical('[AUTHNET_WEBHOOK] Missing AUTHNET signature key configuration');
      return NextResponse.json(
        { error: 'Payment gateway configuration error' },
        { status: 500 }
      );
    }

    const signature = req.headers.get('x-anet-signature') || '';
    const rawBody = await req.text();
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    let fallbackNotificationId = '';
    let fallbackEventType: string | null = null;
    let fallbackEntityId: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as AuthNetWebhookPayload;
      fallbackNotificationId = typeof parsed?.notificationId === 'string' ? parsed.notificationId : '';
      fallbackEventType = typeof parsed?.eventType === 'string' ? parsed.eventType : null;
      fallbackEntityId = parsed?.payload?.id != null ? String(parsed.payload.id) : null;
    } catch {
      // Ignore parsing errors here; signature validation still happens on raw body.
    }
    const fallbackWebhookLogId = fallbackNotificationId
      ? `authnet_${fallbackNotificationId}`
      : `authnet_${payloadHash.slice(0, 32)}`;
    webhookLogRef = db.collection('payment_webhooks').doc(fallbackWebhookLogId);
    const validation = verifyAuthorizeNetSignature(rawBody, signature, secret);

    if (!validation.valid) {
      logger.warn('[AUTHNET_WEBHOOK] Invalid webhook signature', {
        reason: validation.error,
      });
      try {
        await webhookLogRef.set({
          provider: 'authorize_net',
          notificationId: fallbackNotificationId || null,
          eventType: fallbackEventType,
          entityId: fallbackEntityId,
          payloadHash,
          receivedAt: FieldValue.serverTimestamp(),
          status: 'rejected_invalid_signature',
          rejectionReason: validation.error || 'invalid_signature',
          signaturePresent: signature.length > 0,
        }, { merge: true });
      } catch (logError) {
        logger.warn('[AUTHNET_WEBHOOK] Failed to persist invalid signature forensic log', {
          reason: logError instanceof Error ? logError.message : String(logError),
        });
      }
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    let body: AuthNetWebhookPayload;
    try {
      body = JSON.parse(rawBody) as AuthNetWebhookPayload;
    } catch {
      logger.error('[AUTHNET_WEBHOOK] Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const eventType = typeof body.eventType === 'string' ? body.eventType : '';
    const payload = (body.payload ?? {}) as Record<string, unknown>;
    const entityId = payload.id != null ? String(payload.id) : '';
    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : '';
    const eventDate = typeof body.eventDate === 'string' ? body.eventDate : null;

    if (!eventType) {
      logger.error('[AUTHNET_WEBHOOK] Missing eventType');
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const webhookLogId = notificationId
      ? `authnet_${notificationId}`
      : `authnet_${payloadHash.slice(0, 32)}`;

    webhookLogRef = db.collection('payment_webhooks').doc(webhookLogId);

    try {
      await webhookLogRef.create({
        provider: 'authorize_net',
        notificationId: notificationId || null,
        webhookId: body.webhookId || null,
        eventType,
        entityId: entityId || null,
        receivedAt: FieldValue.serverTimestamp(),
        status: 'received',
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        logger.info('[AUTHNET_WEBHOOK] Duplicate notification ignored', {
          notificationId: notificationId || null,
          eventType,
        });
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw error;
    }

    let processedOrders = 0;
    let processedSubscriptions = 0;

    if (eventType.toLowerCase().includes('net.authorize.payment.') && entityId) {
      const responseCode = parseNumericValue(payload.responseCode);
      const outcome = mapPaymentWebhookOutcome(eventType, responseCode);
      const providerAmountCents =
        parseAmountToCents(payload.authAmount) ?? parseAmountToCents(payload.amount);

      const [rootOrdersSnapshot, groupOrdersSnapshot] = await Promise.all([
        db.collection('orders').where('transactionId', '==', entityId).limit(20).get(),
        db.collectionGroup('orders').where('transactionId', '==', entityId).limit(50).get(),
      ]);

      const orderDocMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      for (const doc of rootOrdersSnapshot.docs) orderDocMap.set(doc.ref.path, doc);
      for (const doc of groupOrdersSnapshot.docs) orderDocMap.set(doc.ref.path, doc);

      if (orderDocMap.size === 0) {
        const fallbackOrderId = extractOrderIdFromPaymentPayload(payload);
        if (fallbackOrderId) {
          const fallbackOrderRef = db.collection('orders').doc(fallbackOrderId);
          const fallbackOrderSnap = await fallbackOrderRef.get();

          if (fallbackOrderSnap.exists) {
            const fallbackOrderData = (fallbackOrderSnap.data() || {}) as Record<string, unknown>;
            const existingTransactionId =
              typeof fallbackOrderData.transactionId === 'string'
                ? fallbackOrderData.transactionId
                : null;

            if (existingTransactionId && existingTransactionId !== entityId) {
              logger.error('[AUTHNET_WEBHOOK] Fallback order transaction conflict', {
                orderId: fallbackOrderId,
                expectedTransactionId: existingTransactionId,
                incomingTransactionId: entityId,
                eventType,
              });

              await db.collection('payment_forensics').add({
                provider: 'authorize_net',
                source: 'authnet_webhook',
                reason: 'order_transaction_conflict',
                orderId: fallbackOrderId,
                transactionId: entityId,
                expectedTransactionId: existingTransactionId,
                eventType,
                responseCode,
                providerAmountCents,
                observedAt: FieldValue.serverTimestamp(),
              });
            } else if (!isEligibleInvoiceFallbackOrder(fallbackOrderData)) {
              logger.error('[AUTHNET_WEBHOOK] Fallback order is not eligible for invoice-based reconciliation', {
                orderId: fallbackOrderId,
                incomingTransactionId: entityId,
                eventType,
                paymentProvider: String(fallbackOrderData.paymentProvider || ''),
                paymentMethod: String(fallbackOrderData.paymentMethod || ''),
                paymentStatus: String(fallbackOrderData.paymentStatus || ''),
                status: String(fallbackOrderData.status || ''),
              });

              await db.collection('payment_forensics').add({
                provider: 'authorize_net',
                source: 'authnet_webhook',
                reason: 'fallback_order_not_eligible',
                orderId: fallbackOrderId,
                transactionId: entityId,
                eventType,
                responseCode,
                providerAmountCents,
                paymentProvider: String(fallbackOrderData.paymentProvider || null),
                paymentMethod: String(fallbackOrderData.paymentMethod || null),
                paymentStatus: String(fallbackOrderData.paymentStatus || null),
                orderStatus: String(fallbackOrderData.status || null),
                observedAt: FieldValue.serverTimestamp(),
              });
            } else {
              orderDocMap.set(fallbackOrderRef.path, fallbackOrderSnap);
            }
          }
        }
      }

      if (orderDocMap.size > 1) {
        const orderPaths = Array.from(orderDocMap.keys());
        logger.error('[AUTHNET_WEBHOOK] Duplicate transaction mapping detected - refusing state transitions', {
          transactionId: entityId,
          eventType,
          orderCount: orderDocMap.size,
          orderPaths,
        });

        await db.collection('payment_forensics').add({
          provider: 'authorize_net',
          source: 'authnet_webhook',
          reason: 'duplicate_transaction_mapping',
          transactionId: entityId,
          eventType,
          responseCode,
          providerAmountCents,
          orderCount: orderDocMap.size,
          orderPaths,
          observedAt: FieldValue.serverTimestamp(),
        });

        await webhookLogRef.set(
          {
            status: 'processed',
            processedAt: FieldValue.serverTimestamp(),
            processedOrders: 0,
            processedSubscriptions: 0,
            warning: 'duplicate_transaction_mapping',
          },
          { merge: true },
        );

        return NextResponse.json({
          received: true,
          eventType,
          processedOrders: 0,
          processedSubscriptions: 0,
          warning: 'duplicate_transaction_mapping',
        });
      }

      if (orderDocMap.size === 0) {
        logger.warn('[AUTHNET_WEBHOOK] Payment event received with no matching order', {
          transactionId: entityId,
          eventType,
        });

        const shouldVoid = shouldAttemptVoidForUnmappedPayment(eventType, responseCode);
        const voidAttempt = shouldVoid
          ? await attemptVoidSuspiciousPayment(entityId, eventType)
          : { attempted: false, succeeded: false, message: 'void_not_required' };

        await db.collection('payment_forensics').add({
          provider: 'authorize_net',
          source: 'authnet_webhook',
          reason: 'missing_order_mapping',
          transactionId: entityId,
          eventType,
          responseCode,
          providerAmountCents,
          voidAttempted: voidAttempt.attempted,
          voidSucceeded: voidAttempt.succeeded,
          voidMessage: voidAttempt.message || null,
          voidCode: voidAttempt.code || null,
          voidProviderTransId: voidAttempt.providerTransId || null,
          observedAt: FieldValue.serverTimestamp(),
        });
      }

      await Promise.all(
        Array.from(orderDocMap.values()).map(async (doc) => {
          const orderDataRaw = doc.data();
          if (!orderDataRaw) {
            logger.warn('[AUTHNET_WEBHOOK] Order snapshot missing data; skipping transition', {
              orderPath: doc.ref.path,
              transactionId: entityId,
              eventType,
            });
            return;
          }
          const orderData = orderDataRaw as Record<string, any>;
          const expectedAmountCents = getExpectedOrderTotalCents(orderData);

          if (
            expectedAmountCents !== null &&
            providerAmountCents !== null &&
            expectedAmountCents !== providerAmountCents
          ) {
            logger.error('[AUTHNET_WEBHOOK] Amount mismatch - refusing state transition', {
              orderId: doc.id,
              transactionId: entityId,
              eventType,
              expectedAmountCents,
              providerAmountCents,
            });

            const shouldVoid = shouldAttemptVoidForUnmappedPayment(eventType, responseCode);
            const voidAttempt = shouldVoid
              ? await attemptVoidSuspiciousPayment(entityId, eventType)
              : { attempted: false, succeeded: false, message: 'void_not_required' };

            await db.collection('payment_forensics').add({
              provider: 'authorize_net',
              source: 'authnet_webhook',
              reason: 'amount_mismatch',
              orderId: doc.id,
              orderPath: doc.ref.path,
              transactionId: entityId,
              eventType,
              responseCode,
              expectedAmountCents,
              providerAmountCents,
              voidAttempted: voidAttempt.attempted,
              voidSucceeded: voidAttempt.succeeded,
              voidMessage: voidAttempt.message || null,
              voidCode: voidAttempt.code || null,
              voidProviderTransId: voidAttempt.providerTransId || null,
              observedAt: FieldValue.serverTimestamp(),
            });
            return;
          }

          if (
            outcome.paymentStatus === 'paid' &&
            expectedAmountCents !== null &&
            providerAmountCents === null
          ) {
            logger.error('[AUTHNET_WEBHOOK] Missing provider amount on paid event - refusing state transition', {
              orderId: doc.id,
              transactionId: entityId,
              eventType,
              expectedAmountCents,
            });

            const shouldVoid = shouldAttemptVoidForUnmappedPayment(eventType, responseCode);
            const voidAttempt = shouldVoid
              ? await attemptVoidSuspiciousPayment(entityId, eventType)
              : { attempted: false, succeeded: false, message: 'void_not_required' };

            await db.collection('payment_forensics').add({
              provider: 'authorize_net',
              source: 'authnet_webhook',
              reason: 'missing_amount',
              orderId: doc.id,
              orderPath: doc.ref.path,
              transactionId: entityId,
              eventType,
              responseCode,
              expectedAmountCents,
              providerAmountCents: null,
              voidAttempted: voidAttempt.attempted,
              voidSucceeded: voidAttempt.succeeded,
              voidMessage: voidAttempt.message || null,
              voidCode: voidAttempt.code || null,
              voidProviderTransId: voidAttempt.providerTransId || null,
              observedAt: FieldValue.serverTimestamp(),
            });
            return;
          }

          const nextStatus = resolveOrderStatus(orderData, outcome.orderStatus);
          const nextPaymentStatus = resolvePaymentStatus(orderData, outcome.paymentStatus);
          if (nextPaymentStatus !== outcome.paymentStatus) {
            await db.collection('payment_forensics').add({
              provider: 'authorize_net',
              source: 'authnet_webhook',
              reason: 'status_regression_blocked',
              orderId: doc.id,
              orderPath: doc.ref.path,
              transactionId: entityId,
              eventType,
              responseCode,
              currentPaymentStatus: String(orderData.paymentStatus || ''),
              desiredPaymentStatus: outcome.paymentStatus,
              appliedPaymentStatus: nextPaymentStatus,
              observedAt: FieldValue.serverTimestamp(),
            });
          }

          const updatePayload: Record<string, unknown> = {
            paymentProvider: 'authorize_net',
            paymentStatus: nextPaymentStatus,
            lastPaymentEvent: {
              eventType,
              eventDate,
              notificationId: notificationId || null,
              payload,
            },
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (!orderData.transactionId) {
            updatePayload.transactionId = entityId;
          }

          if (nextStatus) {
            updatePayload.status = nextStatus;
          }

          await doc.ref.set(updatePayload, { merge: true });
          processedOrders += 1;

          const orgId = typeof orderData.brandId === 'string'
            ? orderData.brandId
            : typeof orderData.organizationId === 'string'
              ? orderData.organizationId
              : null;

          if (orgId && outcome.emittedEvent) {
            await emitEvent({
              orgId,
              type: outcome.emittedEvent,
              agent: 'money_mike',
              refId: doc.id,
              data: {
                transactionId: entityId,
                paymentStatus: nextPaymentStatus,
                responseCode,
                amount: parseNumericValue(payload.authAmount) ?? parseNumericValue(payload.amount),
                eventType,
              },
            });

            if (outcome.emittedEvent === 'checkout.paid' && nextStatus === 'ready_for_pickup') {
              await emitEvent({
                orgId,
                type: 'order.readyForPickup',
                agent: 'smokey',
                refId: doc.id,
                data: {
                  transactionId: entityId,
                  paymentStatus: nextPaymentStatus,
                },
              });
            }
          }
        })
      );

      if (orderDocMap.size === 0) {
        const orgIdFromPayload = extractOrgIdFromPaymentPayload(payload);
        const subscriptionOutcome = mapPaymentEventToSubscriptionOutcome(eventType, responseCode);

        if (orgIdFromPayload && subscriptionOutcome.subscriptionStatus) {
          const orgSubscriptionRef = db
            .collection('organizations')
            .doc(orgIdFromPayload)
            .collection('subscription')
            .doc('current');

          await orgSubscriptionRef.set(
            {
              status: subscriptionOutcome.subscriptionStatus,
              updatedAt: FieldValue.serverTimestamp(),
              providerLastEventType: eventType,
              providerLastEventAt: eventDate || FieldValue.serverTimestamp(),
            },
            { merge: true },
          );

          processedSubscriptions += 1;

          if (subscriptionOutcome.emittedEvent) {
            await emitEvent({
              orgId: orgIdFromPayload,
              type: subscriptionOutcome.emittedEvent,
              agent: 'money_mike',
              refId: 'current',
              data: {
                status: subscriptionOutcome.subscriptionStatus,
                eventType,
                transactionId: entityId,
                responseCode,
              },
            });
          }
        }
      }
    }

    if (isSubscriptionWebhookEvent(eventType) && entityId) {
      const outcome = mapSubscriptionWebhookOutcome(eventType);

      const [subscriptionSnapshot, topLevelByProviderSnapshot, topLevelByAuthNetSnapshot] = await Promise.all([
        db
          .collectionGroup('subscription')
          .where('providerSubscriptionId', '==', entityId)
          .limit(20)
          .get(),
        db
          .collection('subscriptions')
          .where('providerSubscriptionId', '==', entityId)
          .limit(20)
          .get(),
        // Legacy: some subscription records stored the provider id under this field.
        db
          .collection('subscriptions')
          .where('authorizeNetSubscriptionId', '==', entityId)
          .limit(20)
          .get(),
      ]);

      const topLevelDocs: FirebaseFirestore.DocumentSnapshot[] = [];
      const topLevelPaths = new Set<string>();
      for (const doc of topLevelByProviderSnapshot.docs) {
        if (!topLevelPaths.has(doc.ref.path)) {
          topLevelPaths.add(doc.ref.path);
          topLevelDocs.push(doc);
        }
      }
      for (const doc of topLevelByAuthNetSnapshot.docs) {
        if (!topLevelPaths.has(doc.ref.path)) {
          topLevelPaths.add(doc.ref.path);
          topLevelDocs.push(doc);
        }
      }

      // Legacy fallback: some records use providerSubscriptionId as the document id.
      if (topLevelDocs.length === 0) {
        const directDoc = await db.collection('subscriptions').doc(entityId).get();
        if (directDoc.exists) {
          topLevelDocs.push(directDoc);
        }
      }

      if (subscriptionSnapshot.empty && topLevelDocs.length === 0) {
        logger.warn('[AUTHNET_WEBHOOK] Subscription event received with no matching subscription', {
          providerSubscriptionId: entityId,
          eventType,
        });
      }

      const emittedOrgIds = new Set<string>();

      await Promise.all(
        subscriptionSnapshot.docs.map(async (doc) => {
          const updatePayload: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
            providerLastEventType: eventType,
            providerLastEventAt: eventDate || FieldValue.serverTimestamp(),
          };

          if (outcome.subscriptionStatus) {
            updatePayload.status = outcome.subscriptionStatus;
          }

          await doc.ref.set(updatePayload, { merge: true });
          processedSubscriptions += 1;

          const orgId = extractOrgIdFromSubscriptionPath(doc.ref.path);
          if (orgId && outcome.emittedEvent) {
            emittedOrgIds.add(orgId);
            await emitEvent({
              orgId,
              type: outcome.emittedEvent,
              agent: 'money_mike',
              refId: doc.id,
              data: {
                providerSubscriptionId: entityId,
                status: outcome.subscriptionStatus || null,
                eventType,
              },
            });
          }
        })
      );

      // Also update the normalized top-level subscriptions collection used by CEO analytics/CRM.
      if (topLevelDocs.length > 0) {
        await Promise.all(
          topLevelDocs.map(async (doc) => {
            const data = doc.data() as any;
            const updatePayload: Record<string, unknown> = {
              updatedAt: FieldValue.serverTimestamp(),
              providerLastEventType: eventType,
              providerLastEventAt: eventDate || FieldValue.serverTimestamp(),
            };

            if (outcome.subscriptionStatus) {
              updatePayload.status = outcome.subscriptionStatus;
            }

            await doc.ref.set(updatePayload, { merge: true });
            processedSubscriptions += 1;

            const orgId = typeof data?.orgId === 'string'
              ? data.orgId
              : typeof data?.organizationId === 'string'
                ? data.organizationId
                : null;

            if (orgId && outcome.emittedEvent && !emittedOrgIds.has(orgId)) {
              emittedOrgIds.add(orgId);
              await emitEvent({
                orgId,
                type: outcome.emittedEvent,
                agent: 'money_mike',
                refId: doc.id,
                data: {
                  providerSubscriptionId: entityId,
                  status: outcome.subscriptionStatus || null,
                  eventType,
                },
              });
            }

            // Send email notifications for failed/canceled subscriptions (non-blocking)
            if (orgId && data?.tierId) {
              const { notifySubscriptionPaymentFailed, notifySubscriptionCanceled } = await import(
                '@/server/services/billing-notifications'
              );

              if (outcome.subscriptionStatus === 'past_due') {
                notifySubscriptionPaymentFailed(orgId, data.tierId).catch((e: any) => {
                  logger.warn('[AUTHNET_WEBHOOK] Payment failed email error', {
                    orgId,
                    error: e.message,
                  });
                });
              } else if (outcome.subscriptionStatus === 'canceled') {
                notifySubscriptionCanceled(orgId, data.tierId).catch((e: any) => {
                  logger.warn('[AUTHNET_WEBHOOK] Canceled email error', {
                    orgId,
                    error: e.message,
                  });
                });
              }
            }

            // Assign tier playbooks when subscription is activated
            if (outcome.subscriptionStatus === 'active' && data?.tierId) {
              try {
                // Map tierId to playbook tier: pro/growth → 'pro', empire → 'enterprise'
                const playbookTier =
                  data.tierId === 'pro' || data.tierId === 'growth' ? 'pro' : 'enterprise';
                await assignTierPlaybooks(orgId, playbookTier);
                logger.info('[AUTHNET_WEBHOOK] Assigned tier playbooks on subscription activation', {
                  orgId,
                  tierId: data.tierId,
                  playbookTier,
                });
              } catch (error: any) {
                logger.warn('[AUTHNET_WEBHOOK] Failed to assign playbooks (non-blocking)', {
                  orgId,
                  error: error?.message,
                });
              }
            }
          })
        );
      }
    }

    await webhookLogRef.set(
      {
        status: 'processed',
        processedAt: FieldValue.serverTimestamp(),
        processedOrders,
        processedSubscriptions,
      },
      { merge: true }
    );

    return NextResponse.json({
      received: true,
      eventType,
      processedOrders,
      processedSubscriptions,
    });
  } catch (error: any) {
    logger.error('[AUTHNET_WEBHOOK] Processing failed', {
      error: error?.message,
      stack: error?.stack,
    });

    if (webhookLogRef) {
      await webhookLogRef.set(
        {
          status: 'failed',
          failedAt: FieldValue.serverTimestamp(),
          error: error?.message || String(error),
        },
        { merge: true }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/webhooks/authnet',
    provider: 'authorize_net',
  });
}
