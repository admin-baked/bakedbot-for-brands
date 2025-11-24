
// src/server/agents/pops.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

const HANDLED_TYPES: EventType[] = [
  "reach.entry",
  "checkout.started",
  "checkout.paid",
  "checkout.failed",
  "subscription.updated",
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
        _agentId: 'pops',
    });
    batch.delete(originalEventRef);
    await batch.commit();
}

function toDateKey(ts: FirebaseFirestore.Timestamp | Date) {
  const d = ts instanceof Date ? ts : ts.toDate();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function handlePopsEvent(orgId: string, eventId: string) {
  const { firestore: db } = await createServerClient();
  const agentId = 'pops';

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

  const createdAt: FirebaseFirestore.Timestamp =
    event.timestamp || FieldValue.serverTimestamp();
  const dateKey = toDateKey(createdAt.toDate());

  const dailyRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("analytics")
    .doc(`daily-${dateKey}`);

  try {
    await db.runTransaction(async (tx: any) => {
      const snap = await tx.get(dailyRef);
      const current = (snap.exists ? snap.data() : {}) as any;

      const totals = current.totals || {};
      const channels = current.channels || {};
      const subscription = current.subscription || {};

      switch (event.type as EventType) {
        case "reach.entry": {
          const channel = event.data?.channel || "unknown";
          const ch = channels[channel] || { sessions: 0, checkoutsStarted: 0, paidCheckouts: 0 };
          ch.sessions += 1;
          channels[channel] = ch;
          break;
        }

        case "checkout.started": {
          totals.checkoutsStarted = (totals.checkoutsStarted || 0) + 1;
          break;
        }

        case "checkout.paid": {
          totals.paidCheckouts = (totals.paidCheckouts || 0) + 1;
          totals.orders = (totals.orders || 0) + 1;
          const amount = event.data?.total ?? 0;
          totals.gmv = (totals.gmv || 0) + amount;
          break;
        }

        case "checkout.failed": {
          totals.failedCheckouts = (totals.failedCheckouts || 0) + 1;
          break;
        }

        case "subscription.updated": {
          subscription.currentPlanId = event.data?.planId || subscription.currentPlanId || null;
          subscription.currentAmount = event.data?.amount ?? subscription.currentAmount ?? null;
          break;
        }
      }

      tx.set(
        dailyRef,
        {
          date: `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}`,
          totals,
          channels,
          subscription,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

  } catch(error) {
    console.error(`[${agentId}] Error processing event ${eventId}:`, error);
    await handleDeadLetter(orgId, eventId, event, error);
  }
}
