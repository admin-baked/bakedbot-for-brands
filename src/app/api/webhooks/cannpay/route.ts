
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
import { createHmac, timingSafeEqual } from "crypto";
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

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();

  try {
    // Get secret from environment (CANPAY_API_SECRET per spec)
    const secret = process.env.CANPAY_API_SECRET;

    // Fail fast in production if secret is not configured
    if (!secret) {
      logger.critical("[P0-SEC-CANNPAY-WEBHOOK] CANPAY_API_SECRET not configured");
      return NextResponse.json(
        { error: "Payment gateway configuration error" },
        { status: 500 }
      );
    }

    const rawBody = await req.text();

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
    const canpayTransactionNumber = event?.canpay_transaction_number;
    const transactionTime = event?.transaction_time;
    const status = event?.status; // "Success", "Pending", "Failed", etc.
    const amount = event?.amount;
    const tipAmount = event?.tip_amount;
    const deliveryFee = event?.delivery_fee;
    const passthroughParam = event?.passthrough_param;
    const merchantOrderId = event?.merchant_order_id;

    // Extract our internal IDs from passthrough (set by frontend)
    const passthrough = passthroughParam ? JSON.parse(passthroughParam) : {};
    const orderId = passthrough?.orderId || merchantOrderId;
    const organizationId = passthrough?.brandId || passthrough?.organizationId;

    if (!intentId) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing intent_id in verified payload");
      return NextResponse.json(
        { error: "Missing intent_id" },
        { status: 400 }
      );
    }

    if (!orderId || !organizationId) {
      logger.error("[P0-SEC-CANNPAY-WEBHOOK] Missing orderId or organizationId in passthrough", {
        intentId,
        passthrough,
      });
      return NextResponse.json(
        { error: "Missing order_id or organization_id in passthrough" },
        { status: 400 }
      );
    }

    const orderRef = db
      .collection("organizations")
      .doc(organizationId)
      .collection("orders")
      .doc(orderId);

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

    // Update order with CannPay transaction details
    await orderRef.set(
      {
        paymentIntentId: intentId,
        paymentStatus,
        status: orderStatus,
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
      },
      { merge: true }
    );

    logger.info("[P0-SEC-CANNPAY-WEBHOOK] Order updated successfully", {
      orderId,
      intentId,
      status,
      paymentStatus,
      orderStatus,
    });

    if (eventType) {
      await emitEvent({
        orgId: organizationId,
        type: eventType,
        agent: 'smokey',
        refId: orderId,
        data: { paymentStatus, orderStatus, intentId },
      });

      if (eventType === 'checkout.paid') {
        await emitEvent({
          orgId: organizationId,
          type: 'order.readyForPickup',
          agent: 'smokey',
          refId: orderId,
          data: { paymentStatus },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error("[P0-SEC-CANNPAY-WEBHOOK] Webhook processing failed", {
      error: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
