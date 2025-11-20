
// src/server/agents/ezal.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";

const HANDLED_TYPES: EventType[] = [
  "checkout.failed",
];

export async function handleEzalEvent(orgId: string, eventId: string) {
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

  // For now, only inspect failures tagged with pricing issues (later)
  if (event.data?.reason !== "pricing") return;

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
}
