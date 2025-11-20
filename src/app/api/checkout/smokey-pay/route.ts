
// src/app/api/checkout/smokey-pay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import * as admin from "firebase-admin";

type CheckoutItem = {
  productId: string;
  cannmenusProductId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number; // in dollars
};

interface SmokeyPayBody {
  organizationId: string;
  dispensaryId: string;
  pickupLocationId: string;
  customer: {
    email: string;
    name: string;
    phone: string;
    uid?: string | null;
  };
  items: CheckoutItem[];
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();

  try {
    const body = (await req.json()) as SmokeyPayBody;

    if (
      !body.organizationId ||
      !body.dispensaryId ||
      !body.pickupLocationId ||
      !body.customer?.email ||
      !body.items?.length ||
      !body.total
    ) {
      return NextResponse.json(
        { error: "Missing required fields for Smokey Pay checkout." },
        { status: 400 }
      );
    }

    const currency = body.currency || "USD";

    // 1) Create order doc in Firestore (pending)
    const orderRef = db
      .collection("organizations")
      .doc(body.organizationId)
      .collection("orders")
      .doc();

    const orderData = {
      brandId: body.organizationId,
      dispensaryId: body.dispensaryId,
      customerId: body.customer.uid || null,
      customerEmail: body.customer.email,
      customerName: body.customer.name,
      customerPhone: body.customer.phone,
      items: body.items.map((i) => ({
        productId: i.productId,
        cannmenusProductId: i.cannmenusProductId || null,
        name: i.name,
        sku: i.sku || null,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.quantity * i.unitPrice,
      })),
      subtotal: body.subtotal,
      tax: body.tax,
      fees: body.fees,
      total: body.total,
      currency,
      paymentProvider: "cannpay",
      paymentIntentId: null,
      paymentStatus: "pending",
      fulfillmentType: "pickup",
      pickupLocationId: body.pickupLocationId,
      pickupEtaMinutes: null,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orderRef.set(orderData);

    // 2) Call CannPay to create a payment intent
    const appKey = process.env.CANPAY_APP_KEY;
    const apiSecret = process.env.CANPAY_API_SECRET;
    const integratorId = process.env.CANPAY_INTEGRATOR_ID;
    const internalVersion = process.env.CANPAY_INTERNAL_VERSION || "1.0.0";
    const baseUrl = process.env.CANPAY_API_URL || "https://api.canpay.com";

    if (!appKey || !apiSecret || !integratorId) {
      console.error("CannPay config missing");
      return NextResponse.json(
        { error: "Smokey Pay is not configured on the server." },
        { status: 500 }
      );
    }

    // Payload shape will depend on real CannPay docs – this is the pattern
    const intentPayload = {
      amount: body.total,
      currency,
      order_id: orderRef.id,
      brand_id: body.organizationId,
      dispensary_id: body.dispensaryId,
      integrator_id: integratorId,
      internal_version: internalVersion,
      customer: {
        email: body.customer.email,
        name: body.customer.name,
        phone: body.customer.phone,
      },
      metadata: {
        pickup_location_id: body.pickupLocationId,
      },
      // success/cancel URLs you can use for redirect if CannPay supports hosted checkout
      redirect_urls: {
        success: `${process.env.APP_BASE_URL}/order-confirmation/${orderRef.id}`,
        cancel: `${process.env.APP_BASE_URL}/checkout?canceled=1`,
      },
    };

    const resp = await fetch(`${baseUrl}/integrator/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-APP-KEY": appKey,
        "X-API-SECRET": apiSecret, // or HMAC signature in real implementation
      },
      body: JSON.stringify(intentPayload),
    });

    const json: any = await resp.json().catch(() => null);

    if (!resp.ok || !json?.data?.intent_id) {
      console.error("CannPay authorize failed", json);
      // Mark order as failed
      await orderRef.update({
        paymentStatus: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { error: "Failed to create Smokey Pay intent." },
        { status: 502 }
      );
    }

    const intentId = json.data.intent_id;
    const checkoutUrl = json.data.checkout_url || null;

    // 3) Update order with intent info
    await orderRef.update({
      paymentIntentId: intentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      intentId,
      checkoutUrl,
    });
  } catch (err: any) {
    console.error("smokey-pay:checkout_error", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error creating Smokey Pay checkout" },
      { status: 500 }
    );
  }
}
