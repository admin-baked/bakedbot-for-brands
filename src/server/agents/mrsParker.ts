
// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { deeboCheckMessage } from "./deebo";

const HANDLED_TYPES: EventType[] = [
  "checkout.paid",
  "order.completed",
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
        _agentId: 'mrs_parker',
    });
    batch.delete(originalEventRef);
    await batch.commit();
}


function buildCustomerKey(order: any): string | null {
  if (order.customerEmail) return `email:${order.customerEmail.toLowerCase()}`;
  if (order.customerPhone) return `phone:${order.customerPhone}`;
  return null;
}

function computeTier(points: number): string {
  if (points >= 1000) return "VIP";
  if (points >= 300) return "Regular";
  return "New";
}

async function sendSms(orgId: string, state: string, phone: string, message: string) {
    // 1. Ask Deebo for permission first.
    const complianceCheck = await deeboCheckMessage({
      orgId,
      channel: "sms",
      stateCode: state,
      content: message,
    });
  
    if (!complianceCheck.ok) {
      console.log(`Mrs. Parker: [Blocked] SMS to ${phone} blocked by Deebo. Reason: ${complianceCheck.reason}`);
      return; // Stop if compliance check fails
    }
  
    // 2. If compliant, send the SMS (placeholder).
    // TODO: integrate with Twilio or another SMS provider.
    console.log(`Mrs. Parker: [Action] Would send SMS to ${phone}: "${message}"`);
}
  

export async function handleMrsParkerEvent(orgId: string, eventId: string) {
  const { firestore: db } = await createServerClient();
  const agentId = 'mrs_parker';

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
  
  const orderId = event.refId;
  if (!orderId) {
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
    return;
  };

  try {
    const orderSnap = await db
      .collection("organizations")
      .doc(orgId)
      .collection("orders")
      .doc(orderId)
      .get();

    if (!orderSnap.exists) {
        await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
        return;
    };
    const order = orderSnap.data() as any;

    const customerKey = buildCustomerKey(order);
    if (!customerKey) {
        await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
        return;
    };

    const loyaltyRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("loyaltyProfiles")
      .doc(customerKey);

    const total = order.total || 0;
    const earnedPoints = Math.round(total); // 1 point per $ for now

    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(loyaltyRef);
      const current = (snap.exists ? snap.data() : {}) as any;

      const newTotalOrders = (current.totalOrders || 0) + 1;
      const newTotalGmv = (current.totalGmv || 0) + total;
      const newPoints = (current.points || 0) + earnedPoints;
      const tier = computeTier(newPoints);

      // Check if this is the first order to send a welcome SMS.
      const isFirstOrder = !current.totalOrders || current.totalOrders === 0;

      if (isFirstOrder && order.customerPhone) {
        const welcomeMessage = `Welcome to the ${orgId} family! You've earned ${earnedPoints} points on your first order. Thanks for your business!`;
        // We can call the SMS function directly from here, within the transaction's scope.
        await sendSms(orgId, "NY", order.customerPhone, welcomeMessage);
      }
      
      tx.set(
        loyaltyRef,
        {
          customerKey,
          totalOrders: newTotalOrders,
          totalGmv: newTotalGmv,
          points: newPoints,
          tier,
          lastOrderAt: FieldValue.serverTimestamp(),
          lastOrderId: orderId,
        },
        { merge: true }
      );
    });

    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

  } catch (error) {
     console.error(`[${agentId}] Error processing event ${eventId}:`, error);
     await handleDeadLetter(orgId, eventId, event, error);
  }
}
