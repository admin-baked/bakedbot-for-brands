// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

const HANDLED_TYPES: EventType[] = [
  "checkout.paid",
  "order.completed",
];

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

export async function handleMrsParkerEvent(orgId: string, eventId: string) {
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
  const orderId = event.refId;
  if (!orderId) return;

  const orderSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("orders")
    .doc(orderId)
    .get();

  if (!orderSnap.exists) return;
  const order = orderSnap.data() as any;

  const customerKey = buildCustomerKey(order);
  if (!customerKey) return;

  const loyaltyRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("loyaltyProfiles")
    .doc(customerKey);

  const total = order.total || 0;
  const earnedPoints = Math.round(total); // 1 point per $ for now

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(loyaltyRef);
    const current = (snap.exists ? snap.data() : {}) as any;

    const newTotalOrders = (current.totalOrders || 0) + 1;
    const newTotalGmv = (current.totalGmv || 0) + total;
    const newPoints = (current.points || 0) + earnedPoints;
    const tier = computeTier(newPoints);

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
}
