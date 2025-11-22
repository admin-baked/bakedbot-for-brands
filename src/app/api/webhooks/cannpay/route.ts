
// src/app/api/webhooks/cannpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { FieldValue } from "firebase-admin/firestore";
import { emitEvent } from "@/server/events/emitter";
import type { EventType } from "@/types/domain";

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();

  try {
    const signature = req.headers.get("x-cannpay-signature");
    const secret = process.env.CANPAY_WEBHOOK_SECRET;

    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    // TODO: verify signature using secret + rawBody (depends on CannPay spec)
    if (!secret) {
      console.warn("No CANPAY_WEBHOOK_SECRET configured");
    }

    const intentId = event?.data?.intent_id || event?.intent_id;
    const status = event?.data?.status || event?.status;
    const orderId = event?.data?.order_id || event?.order_id;
    const organizationId = event?.data?.brand_id || event?.brand_id;

    if (!intentId || !orderId || !organizationId) {
      return NextResponse.json(
        { error: "Missing intent_id, order_id, or organization_id" },
        { status: 400 }
      );
    }

    const orderRef = db
      .collection("organizations")
      .doc(organizationId)
      .collection("orders")
      .doc(orderId);

    let paymentStatus: string = "pending";
    let orderStatus: string = "pending";
    let eventType: EventType | null = null;

    switch (status) {
      case "authorized":
      case "captured":
      case "paid":
        paymentStatus = "paid";
        orderStatus = "ready_for_pickup";
        eventType = "checkout.paid";
        break;
      case "failed":
      case "declined":
      case "canceled":
        paymentStatus = status;
        orderStatus = "canceled";
        eventType = "checkout.failed";
        break;
      default:
        paymentStatus = status || "pending";
        orderStatus = "pending";
        break;
    }

    await orderRef.set(
      {
        paymentIntentId: intentId,
        paymentStatus,
        status: orderStatus,
        updatedAt: FieldValue.serverTimestamp(),
        lastPaymentEvent: event,
      },
      { merge: true }
    );
    
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
    console.error("cannpay:webhook_error", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
