
// src/server/agents/ezal.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

import { logger } from '@/lib/logger';
const HANDLED_TYPES: EventType[] = [
  "checkout.failed",
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
    _agentId: 'ezal',
  });
  batch.delete(originalEventRef);
  await batch.commit();
}

export async function handleEzalEvent(orgId: string, eventId: string) {
  const { firestore: db } = await createServerClient();
  const agentId = 'ezal';

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
    // For now, only inspect failures tagged with pricing issues (later)
    if (event.data?.reason !== "pricing") {
      await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
      return;
    };

    const orderId = event.refId;
    if (!orderId) {
      await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });
      return;
    };

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

    // TODO: for each item, compare to CannMenus competitor data
    // and compute if we're overpriced vs nearby menus.

    // Example placeholder insight:
    const insightsRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("meta")
      .doc("competitiveInsights");

    await insightsRef.set(
      {
        lastUpdatedAt: new Date(),
        notes: "Ezal placeholder – plug in CannMenus price comparison here.",
      },
      { merge: true }
    );

    await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

  } catch (error) {
    logger.error(`[${agentId}] Error processing event ${eventId}:`, error instanceof Error ? error : new Error(String(error)));
    await handleDeadLetter(orgId, eventId, event, error);
  }
}
