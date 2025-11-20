
// src/app/api/webhooks/cannpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import * as admin from "firebase-admin";

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

    switch (status) {
      case "authorized":
      case "captured":
      case "paid":
        paymentStatus = "paid";
        orderStatus = "ready_for_pickup";
        break;
      case "failed":
      case "declined":
        paymentStatus = "failed";
        orderStatus = "canceled";
        break;
      case "canceled":
        paymentStatus = "canceled";
        orderStatus = "canceled";
        break;
      default:
        paymentStatus = status || "pending";
        orderStatus = "pending";
    }

    await orderRef.set(
      {
        paymentIntentId: intentId,
        paymentStatus,
        status: orderStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPaymentEvent: event,
      },
      { merge: true }
    );

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("cannpay:webhook_error", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
