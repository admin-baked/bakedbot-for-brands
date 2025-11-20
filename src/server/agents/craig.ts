
// src/server/agents/craig.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import type { OrderDoc, Retailer } from "@/types/domain";
import type { ServerOrderPayload } from "@/app/checkout/actions/submitOrder";
import { orderConverter, retailerConverter } from "@/firebase/converters";


const HANDLED_TYPES: EventType[] = [
  "subscription.updated",
  "checkout.paid",
];

export async function handleCraigEvent(orgId: string, eventId: string) {
  const { firestore: db } = await createServerClient();

  const eventSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("events")
    .doc(eventId)
    .get();

  if (!eventSnap.exists) return;
  const event = eventSnap.data() as any;

  if (!HANDLED_TYPES.includes(event.type)) return;

  switch (event.type as EventType) {
    case "subscription.updated":
      await handleSubscriptionUpdated(orgId, event);
      break;

    case "checkout.paid":
      await handleCheckoutPaid(orgId, event);
      break;
  }
}

async function handleSubscriptionUpdated(orgId: string, event: any) {
  // Example: send brand onboarding email
  const { firestore: db } = await createServerClient();
  const orgSnap = await db.collection("organizations").doc(orgId).get();
  const org = orgSnap.data() || {};

  const ownerEmail = org.ownerEmail; // Assuming this field exists
  if (!ownerEmail) {
      console.log(`Craig: Org ${orgId} has no ownerEmail, skipping subscription email.`);
      return;
  };

  // This is a placeholder for a real email sending service call
  console.log(
    `Craig: [Action] Would send onboarding email to ${ownerEmail} for plan ${event.data?.planId}`
  );
}

async function handleCheckoutPaid(orgId: string, event: any) {
  const { firestore: db } = await createServerClient();
  const orderId = event.refId;
  if (!orderId) return;

  const orderSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("orders")
    .doc(orderId)
    .withConverter(orderConverter as any)
    .get();

  if (!orderSnap.exists) return;
  const order = orderSnap.data() as OrderDoc;
  
  const retailerSnap = await db.collection('dispensaries').doc(order.retailerId).withConverter(retailerConverter as any).get();
  if (!retailerSnap.exists) {
      console.error(`Craig: Retailer ${order.retailerId} not found for order ${orderId}`);
      return;
  }
  const retailer = retailerSnap.data() as Retailer;

  const serverOrderPayload: ServerOrderPayload = {
      ...(order as any),
  };

  try {
    await sendOrderEmail({
      to: order.customer.email,
      orderId,
      order: serverOrderPayload,
      retailer: retailer,
      recipientType: 'customer',
      subject: `Your order #${orderId.substring(0, 7)} is confirmed!`,
    });
    console.log(`Craig: sent order confirmation for ${orderId}`);
  } catch (err) {
    console.error(`Craig: sendOrderEmail for order ${orderId} failed`, err);
  }
}
