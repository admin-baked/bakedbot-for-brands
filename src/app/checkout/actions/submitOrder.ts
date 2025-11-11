"use server";

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { sendOrderEmail } from "@/lib/email/send-order-email";

type OrderInput = {
  items: Array<{ productId: string; name: string; qty: number; price: number }>;
  totals: { subtotal: number; tax: number; total: number };
  customer: { name: string; email: string };
  locationId?: string | null;
};

export async function submitOrder(input: OrderInput) {
  // 1) Resolve demo mode on the server (don’t trust client state)
  const isDemo = cookies().get("isUsingDemoData")?.value === "true";
  
  const { firestore } = await createServerClient();

  // 2) Create the order doc first (authoritative write)
  const ordersRef = firestore.collection("orders");
  const orderDoc = await ordersRef.add({
    ...input,
    status: "submitted",
    createdAt: FieldValue.serverTimestamp(),
    mode: isDemo ? "demo" : "live",
  });

  // 3) Try email — never break the order if email fails
  try {
    const to = isDemo
      ? "martez@bakedbot.ai"
      : input?.customer?.email || "orders@yourdomain.test"; // your live routing

    await sendOrderEmail({
      to,
      bcc: ["jack@bakedbot.ai"], // brand copy for demo
      subject: isDemo ? "Demo order received" : "New order",
      orderId: orderDoc.id,
      order: input,
    });
  } catch (err) {
    console.error("sendOrderEmail failed (non-blocking):", err);
    // Optionally mark order with an emailError flag
    const orderRef = firestore.doc(`orders/${orderDoc.id}`);
    // do not throw
  }

  return { ok: true, orderId: orderDoc.id };
}
