
// src/app/api/checkout/smokey-pay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { FieldValue } from "firebase-admin/firestore";
import { emitEvent } from "@/server/events/emitter";

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
  let body: SmokeyPayBody | null = null;

  try {
    body = (await req.json()) as SmokeyPayBody;

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
    const orgId = body.organizationId;

    // 1) Create order doc in Firestore (pending)
    const orderRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("orders")
      .doc();

    const orderData = {
      brandId: orgId, // Denormalize brandId for easier queries
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
      subtotal: body.subtotal, tax: body.tax, fees: body.fees, total: body.total,
      currency, paymentProvider: "cannpay", paymentIntentId: null, paymentStatus: "pending",
      fulfillmentType: "pickup", pickupLocationId: body.pickupLocationId, pickupEtaMinutes: null,
      status: "pending", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };

    await orderRef.set(orderData);
    await emitEvent({
      orgId,
      type: "checkout.started",
      agent: "smokey",
      refId: orderRef.id,
      data: {
        total: body.total, currency, dispensaryId: body.dispensaryId,
        pickupLocationId: body.pickupLocationId, itemCount: body.items.length,
      },
    });

    // 2) Call CannPay to create a payment intent
    const appKey = process.env.CANPAY_APP_KEY;
    const apiSecret = process.env.CANPAY_API_SECRET;
    const integratorId = process.env.CANPAY_INTEGRATOR_ID;
    const internalVersion = process.env.CANPAY_INTERNAL_VERSION || "1.0.0";
    const baseUrl = process.env.CANPAY_API_URL || "https://api.canpay.com";

    if (!appKey || !apiSecret || !integratorId) {
      console.error("CannPay config missing");
      return NextResponse.json({ error: "Smokey Pay is not configured on the server." }, { status: 500 });
    }

    const intentPayload = {
      amount: body.total, currency, order_id: orderRef.id, brand_id: orgId,
      dispensary_id: body.dispensaryId, integrator_id: integratorId, internal_version: internalVersion,
      customer: { email: body.customer.email, name: body.customer.name, phone: body.customer.phone },
      metadata: { pickup_location_id: body.pickupLocationId },
      redirect_urls: {
        success: `${process.env.APP_BASE_URL}/order-confirmation/${orderRef.id}`,
        cancel: `${process.env.APP_BASE_URL}/checkout?canceled=1`,
      },
    };

    const resp = await fetch(`${baseUrl}/integrator/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-APP-KEY": appKey, "X-API-SECRET": apiSecret },
      body: JSON.stringify(intentPayload),
    });

    const json: any = await resp.json().catch(() => null);

    if (!resp.ok || !json?.data?.intent_id) {
      console.error("CannPay authorize failed", json);
      await orderRef.update({ paymentStatus: "failed", updatedAt: FieldValue.serverTimestamp() });
      await emitEvent({ orgId, type: 'checkout.failed', agent: 'smokey', refId: orderRef.id, data: { reason: "cannpay_authorize_failed", response: json }});
      return NextResponse.json({ error: "Failed to create Smokey Pay intent." }, { status: 502 });
    }

    const intentId = json.data.intent_id;
    const checkoutUrl = json.data.checkout_url || null;

    await orderRef.update({ paymentIntentId: intentId, updatedAt: FieldValue.serverTimestamp() });
    
    await emitEvent({ orgId, type: 'checkout.intentCreated', agent: 'smokey', refId: orderRef.id, data: { intentId, checkoutUrl, total: body.total }});

    return NextResponse.json({ success: true, orderId: orderRef.id, intentId, checkoutUrl });
  } catch (err: any) {
    console.error("smokey-pay:checkout_error", err);
    if (body?.organizationId) {
        await emitEvent({ orgId: body.organizationId, type: 'checkout.failed', agent: 'smokey', data: { error: err?.message || String(err) }});
    }
    return NextResponse.json({ error: err?.message || "Unexpected error creating Smokey Pay checkout" }, { status: 500 });
  }
}
