
// src/server/agents/craig.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import type { OrderDoc, Retailer } from "@/types/domain";
import type { ServerOrderPayload } from "@/types/domain";
import { orderConverter, retailerConverter } from "@/firebase/converters";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";


const HANDLED_TYPES: EventType[] = [
  "subscription.updated",
  "checkout.paid",
  "order.readyForPickup",
];

async function handleDeadLetter(orgId: string, eventId: string, eventData: any, error: any) {
  const { firestore: db } = await createServerClient();
  const originalEventRef = db.collection("organizations").doc(orgId).collection("events").doc(eventId);
  const dlqRef = db.collection("organizations").doc(orgId).collection("events_failed").doc(eventId);

  const batch = db.batch();
  batch.set(dlqRef, {
    ...eventData,
    _failedAt: FieldValue.serverTimestamp(),
    _error: error?.message || String(error),
    _agentId: 'craig',
  });
  batch.delete(originalEventRef);
  await batch.commit();
}


export async function handleCraigEvent(orgId: string, eventId: string) {
  const { firestore: db } = await createServerClient();
  const agentId = 'craig';

  const eventRef = db.collection("organizations").doc(orgId).collection("events").doc(eventId);
  const eventSnap = await eventRef.get();

  if (!eventSnap.exists) return;
  const event = eventSnap.data() as any;

  // Check if this agent has already handled this event.
  if (event.processedBy && event.processedBy[agentId]) {
    return;
  }

  if (!HANDLED_TYPES.includes(event.type)) {
    // Mark as processed even if not handled to prevent re-scanning
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
    return;
  }

  try {
    switch (event.type as EventType) {
      case "subscription.updated":
        await handleSubscriptionUpdated(orgId, event);
        break;

      case "checkout.paid":
        await handleCheckoutPaid(orgId, event);
        break;

      case "order.readyForPickup":
        // Add more handlers as needed, e.g. for status updates
        break;
    }
    // Mark as successfully processed
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

  } catch (error) {
    console.error(`[${agentId}] Error processing event ${eventId}:`, error);
    await handleDeadLetter(orgId, eventId, event, error);
  }
}

async function handleSubscriptionUpdated(orgId: string, event: any) {
  // Example: send brand onboarding email
  const { firestore: db } = await createServerClient();
  const orgSnap = await db.collection("organizations").doc(orgId).get();
  const org = orgSnap.data() || {};

  const ownerEmail = org.ownerEmail; // Assuming this field exists
  if (!ownerEmail) {
    logger.warn('Craig: Org has no ownerEmail, skipping subscription email', { orgId });
    return;
  };

  // This is a placeholder for a real email sending service call
  logger.info(
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
    logger.info('Craig: Sent order confirmation', { orderId });
  } catch (err) {
    console.error(`Craig: sendOrderEmail for order ${orderId} failed`, err);
  }
}
