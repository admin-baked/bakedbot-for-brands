
// src/server/agents/moneyMike.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

const HANDLED_TYPES: EventType[] = [
  "subscription.updated",
  "subscription.failed",
];

export async function handleMoneyMikeEvent(orgId: string, eventId: string) {
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

  const revenueRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("meta")
    .doc("revenueSnapshot");

  if (event.type === "subscription.updated") {
    const planId = event.data?.planId;
    const amount = event.data?.amount ?? 0;

    await revenueRef.set(
      {
        currentPlanId: planId,
        currentMrr: amount,
        lastUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  if (event.type === "subscription.failed") {
    await revenueRef.set(
      {
        lastFailureAt: FieldValue.serverTimestamp(),
        lastFailureReason: event.data?.stage || event.data?.error || null,
      },
      { merge: true }
    );
  }
}
