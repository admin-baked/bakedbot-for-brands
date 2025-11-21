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
  const agentId = 'money_mike';

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

  const revenueRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("meta")
    .doc("revenueSnapshot");
    
  try {
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
    
    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

  } catch (error) {
     console.error(`[${agentId}] Error processing event ${eventId}:`, error);
    await eventRef.set({ processedBy: { [agentId]: `failed_at_${new Date().toISOString()}` } }, { merge: true });
  }
}
