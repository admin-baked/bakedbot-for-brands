
// [AI-THREAD P0-SEC-CANNPAY-WEBHOOK]
// [Dev1-Claude @ 2025-11-29]:
//   Implemented HMAC-SHA256 signature verification for CannPay processed_callback.
//   Per CannPay spec: widget sends { response: "<JSON>", signature: "<HMAC>" }
//   Signature is HMAC-SHA256(response, CANPAY_API_SECRET) in lowercase hex.
//   Using constant-time comparison to prevent timing attacks.

// src/app/api/webhooks/cannpay/route.ts
// src/app/api/webhooks/cannpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { FieldValue } from "firebase-admin/firestore";
import { emitEvent } from "@/server/events/emitter";
import type { EventType } from "@/types/domain";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

/**
 * Verifies HMAC-SHA256 signature for CannPay webhook/callback
 * @param payload - The raw response string from CannPay
 * @param signature - The signature provided by CannPay (lowercase hex)
 * @param secret - CANPAY_API_SECRET from environment
 * @returns true if signature is valid
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const computed = hmac.digest("hex").toLowerCase();

  // Use constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(computed, "utf-8"),
    Buffer.from(signature, "utf-8")
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists';
}

function safeParseJson(value: unknown): Record<string, any> {
  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
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

function getExpectedOrderTotalCents(orderData: Record<string, any> | undefined): number | null {
  if (!orderData) return null;
  const total = Number(orderData?.totals?.total ?? orderData?.amount);
  if (!Number.isFinite(total) || total < 0) return null;
  return Math.round(total * 100);
}

function resolvePaymentStatus(
  orderData: Record<string, any> | undefined,
  desiredPaymentStatus: string,
): string {
  const desired = String(desiredPaymentStatus || '').toLowerCase();
  const current = String(orderData?.paymentStatus || '').toLowerCase();

  if (!desired) return current || 'pending';
  if (!current) return desired;

  if (current === 'paid') {
    if (desired === 'refunded' || desired === 'voided') {
      return desired;
    }
    return current;
  }

  if (current === 'refunded' || current === 'voided') {
    return current;
  }

  return desired;
}

function resolveOrderStatus(
  orderData: Record<string, any> | undefined,
  desiredStatus: string,
): string | undefined {
  if (!orderData) return desiredStatus;

  if (desiredStatus === 'ready_for_pickup') {
    const hasShippingAddress = !!orderData.shippingAddress;
    const purchaseModel = orderData.purchaseModel;
    if (hasShippingAddress || purchaseModel === 'online_only') {
      return undefined;
    }
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
    // Primary secret is CANPAY_API_SECRET; allow legacy fallback for compatibility.
    const secret = process.env.CANPAY_API_SECRET || process.env.CANPAY_WEBHOOK_SECRET;

    // Fail fast in production if secret is not configured
    if (!secret) {
      logger.critical("[P0-SEC-CANNPAY-WEBHOOK] Missing webhook secret (CANPAY_API_SECRET/CANPAY_WEBHOOK_SECRET)");
      return NextResponse.json(
        { error: "Payment gateway configuration error" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();
    const rawPayloadHash = createHash('sha256').update(rawBody).digest('hex');
    webhookLogRef = db.collection('payment_webhooks').doc(`cannpay_${rawPayloadHash.slice(0, 32)}`);

    // Per CannPay spec, widget sends { response: "<JSON>", signature: "<HMAC>" }
    let payload: { response?: string; signature?: string };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Invalid JSON payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { response: responseString, signature } = payload;

    // Validate required fields
    if (!responseString || !signature) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing response or signature");
      if (webhookLogRef) {
        await webhookLogRef.set({
          provider: 'cannpay',
          status: 'rejected_malformed_payload',
          rejectionReason: 'missing_response_or_signature',
          payloadHash: rawPayloadHash,
          signaturePresent: !!signature,
          receivedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return NextResponse.json(
        { error: "Missing response or signature" },
        { status: 400 }
      );
    }

    // Verify HMAC signature
    const isValid = verifySignature(responseString, signature, secret);
    if (!isValid) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] SECURITY: Invalid signature detected", {
        signatureProvided: signature.substring(0, 10) + "...",
      });
      if (webhookLogRef) {
        await webhookLogRef.set({
          provider: 'cannpay',
          status: 'rejected_invalid_signature',
          rejectionReason: 'invalid_signature',
          payloadHash: rawPayloadHash,
          signaturePresent: true,
          receivedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Parse the inner response JSON
    let event: any;
    try {
      event = JSON.parse(responseString);
    } catch {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Invalid response JSON");
      return NextResponse.json({ error: "Invalid response format" }, { status: 400 });
    }

    // Extract CannPay transaction details from verified payload
    const intentId = event?.intent_id;
    const canpayTransactionNumber = event?.canpay_transaction_number || event?.transaction_number;
    const transactionTime = event?.transaction_time;
    const status = event?.status; // "Success", "Pending", "Failed", etc.
    const amount = event?.amount;
    const tipAmount = event?.tip_amount;
    const deliveryFee = event?.delivery_fee;
    const passthroughParam = event?.passthrough_param || event?.passthrough;
    const merchantOrderId = event?.merchant_order_id;

    // Extract our internal IDs from passthrough (set by frontend)
    const passthrough = safeParseJson(passthroughParam);
    const orderId = passthrough?.orderId || merchantOrderId;
    const organizationId = passthrough?.brandId || passthrough?.organizationId || event?.organization_id;

    const webhookLogId = `cannpay_${createHash('sha256').update(responseString).digest('hex').slice(0, 32)}`;
    webhookLogRef = db.collection('payment_webhooks').doc(webhookLogId);

    try {
      await webhookLogRef.create({
        provider: 'cannpay',
        status: 'received',
        receivedAt: FieldValue.serverTimestamp(),
        intentId: intentId || null,
        canpayTransactionNumber: canpayTransactionNumber || null,
        merchantOrderId: merchantOrderId || null,
        orderId: orderId || null,
      });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        logger.info('[P0-SEC-CANNPAY-WEBHOOK] Duplicate webhook payload ignored', {
          webhookLogId,
          intentId: intentId || null,
          canpayTransactionNumber: canpayTransactionNumber || null,
        });
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw error;
    }

    if (!intentId) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing intent_id in verified payload");
      return NextResponse.json(
        { error: "Missing intent_id" },
        { status: 400 }
      );
    }

    if (!orderId) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing orderId in passthrough/merchant_order_id", {
        intentId,
        passthrough,
      });
      return NextResponse.json(
        { error: "Missing order_id in webhook payload" },
        { status: 400 }
      );
    }

    // Map CannPay status to our internal payment/order statuses
    let paymentStatus: string = "pending";
    let orderStatus: string = "pending";
    let eventType: EventType | null = null;

    // Per CannPay spec: status can be "Success", "Pending", "Failed", "Voided", "Settled"
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "success":
      case "settled":
        paymentStatus = "paid";
        orderStatus = "ready_for_pickup";
        eventType = "checkout.paid";
        break;
      case "failed":
      case "declined":
      case "voided":
        paymentStatus = normalizedStatus;
        orderStatus = "canceled";
        eventType = "checkout.failed";
        break;
      case "pending":
        paymentStatus = "pending";
        orderStatus = "pending";
        // No event emission for pending status
        break;
      default:
        logger.warn("[P0-SEC-CANNPAY-WEBHOOK] Unknown CannPay status", {
          status,
          intentId,
        });
        paymentStatus = status || "pending";
        orderStatus = "pending";
        break;
    }

    const topLevelOrderRef = db.collection("orders").doc(orderId);
    const orgOrderRef = organizationId
      ? db.collection("organizations").doc(organizationId).collection("orders").doc(orderId)
      : null;

    const [topLevelSnap, orgOrderSnap] = await Promise.all([
      topLevelOrderRef.get(),
      orgOrderRef ? orgOrderRef.get() : Promise.resolve(null),
    ]);

    if (!topLevelSnap.exists && !orgOrderSnap?.exists) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Order not found for webhook event", {
        orderId,
        organizationId: organizationId || null,
        intentId,
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const canonicalOrder = (topLevelSnap.exists ? topLevelSnap.data() : orgOrderSnap?.data()) as Record<string, any> | undefined;

    if (
      merchantOrderId &&
      String(merchantOrderId).trim() &&
      String(merchantOrderId).trim() !== String(orderId)
    ) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] merchant_order_id mismatch with resolved orderId", {
        orderId,
        merchantOrderId,
        intentId,
      });

      await db.collection('payment_forensics').add({
        provider: 'cannpay',
        source: 'cannpay_webhook',
        reason: 'order_mismatch',
        orderId,
        intentId,
        merchantOrderId,
        expectedMerchantOrderId: orderId,
        organizationId: organizationId || null,
        providerStatus: status || null,
        observedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ received: true, warning: 'Order mismatch' });
    }

    const expectedIntentId =
      typeof canonicalOrder?.canpay?.intentId === 'string'
        ? canonicalOrder.canpay.intentId
        : typeof canonicalOrder?.paymentIntentId === 'string'
          ? canonicalOrder.paymentIntentId
          : null;

    if (expectedIntentId && expectedIntentId !== intentId) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] intent_id mismatch for canonical order", {
        orderId,
        intentId,
        expectedIntentId,
      });

      await db.collection('payment_forensics').add({
        provider: 'cannpay',
        source: 'cannpay_webhook',
        reason: 'intent_mismatch',
        orderId,
        intentId,
        expectedIntentId,
        merchantOrderId: merchantOrderId || null,
        organizationId: organizationId || null,
        providerStatus: status || null,
        observedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ received: true, warning: 'Intent mismatch' });
    }

    const expectedAmountCents = getExpectedOrderTotalCents(canonicalOrder);
    const providerAmountCents = toCents(amount);

    if (
      paymentStatus === 'paid' &&
      expectedAmountCents !== null &&
      providerAmountCents === null
    ) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing provider amount on paid event - refusing state transition", {
        orderId,
        intentId,
        expectedAmountCents,
        status,
      });

      await db.collection('payment_forensics').add({
        provider: 'cannpay',
        source: 'cannpay_webhook',
        reason: 'missing_amount',
        orderId,
        intentId,
        merchantOrderId: merchantOrderId || null,
        organizationId: organizationId || null,
        expectedAmountCents,
        providerAmountCents: null,
        providerStatus: status || null,
        observedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ received: true, warning: 'Amount missing' });
    }

    if (expectedAmountCents !== null && providerAmountCents !== null) {
      if (providerAmountCents !== expectedAmountCents) {
        logger.error("[P0-SEC-CANNPAY-WEBHOOK] Amount mismatch - refusing state transition", {
          orderId,
          intentId,
          expectedAmountCents,
          providerAmountCents,
          status,
        });

        await db.collection('payment_forensics').add({
          provider: 'cannpay',
          source: 'cannpay_webhook',
          reason: 'amount_mismatch',
          orderId,
          intentId,
          merchantOrderId: merchantOrderId || null,
          organizationId: organizationId || null,
          expectedAmountCents,
          providerAmountCents,
          providerStatus: status || null,
          observedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ received: true, warning: 'Amount mismatch' });
      }
    }

    const nextPaymentStatus = resolvePaymentStatus(canonicalOrder, paymentStatus);
    if (nextPaymentStatus !== paymentStatus) {
      await db.collection('payment_forensics').add({
        provider: 'cannpay',
        source: 'cannpay_webhook',
        reason: 'status_regression_blocked',
        orderId,
        intentId,
        merchantOrderId: merchantOrderId || null,
        organizationId: organizationId || null,
        currentPaymentStatus: String(canonicalOrder?.paymentStatus || ''),
        desiredPaymentStatus: paymentStatus,
        appliedPaymentStatus: nextPaymentStatus,
        providerStatus: status || null,
        observedAt: FieldValue.serverTimestamp(),
      });
    }

    const updatePayload = {
      paymentIntentId: intentId,
      paymentStatus: nextPaymentStatus,
      updatedAt: FieldValue.serverTimestamp(),
      lastPaymentEvent: event,
      // Store CannPay-specific fields
      canpay: {
        intentId,
        canpayTransactionNumber,
        transactionTime,
        status,
        amount,
        tipAmount,
        deliveryFee,
        passthrough: passthroughParam,
        merchantOrderId,
      },
    } as Record<string, unknown>;

    const nextOrderStatus = resolveOrderStatus(canonicalOrder, orderStatus);
    if (nextOrderStatus) {
      updatePayload.status = nextOrderStatus;
    }

    const updateTargets = [];
    if (topLevelSnap.exists) {
      updateTargets.push(topLevelOrderRef.set(updatePayload, { merge: true }));
    }
    if (orgOrderRef && orgOrderSnap?.exists) {
      updateTargets.push(orgOrderRef.set(updatePayload, { merge: true }));
    }
    await Promise.all(updateTargets);

    const eventOrgId = organizationId || topLevelSnap.data()?.brandId || orgOrderSnap?.data()?.brandId || null;

    logger.info("[P0-SEC-CANNPAY-WEBHOOK] Order updated successfully", {
      orderId,
      intentId,
      status,
      paymentStatus,
      orderStatus,
    });

    if (eventType && eventOrgId) {
      await emitEvent({
        orgId: eventOrgId,
        type: eventType,
        agent: 'smokey',
        refId: orderId,
        data: { paymentStatus: nextPaymentStatus, orderStatus, intentId },
      });

      if (eventType === 'checkout.paid') {
        await emitEvent({
          orgId: eventOrgId,
          type: 'order.readyForPickup',
          agent: 'smokey',
          refId: orderId,
          data: { paymentStatus: nextPaymentStatus },
        });
      }
    } else if (eventType) {
      logger.warn("[P0-SEC-CANNPAY-WEBHOOK] Skipping event emit due to missing organization context", {
        orderId,
        intentId,
        eventType,
      });
    }

    if (webhookLogRef) {
      await webhookLogRef.set({
        status: 'processed',
        processedAt: FieldValue.serverTimestamp(),
        paymentStatus: nextPaymentStatus,
        providerStatus: status || null,
      }, { merge: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error("[P0-SEC-CANNPAY-WEBHOOK] Webhook processing failed", {
      error: err?.message,
      stack: err?.stack,
    });
    if (webhookLogRef) {
      await webhookLogRef.set({
        status: 'failed',
        failedAt: FieldValue.serverTimestamp(),
        error: err?.message || String(err),
      }, { merge: true });
    }
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
