
// src/server/agents/smokey.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

const HANDLED_TYPES: EventType[] = [
    "recommendation.shown",
    "cart.updated",
    "checkout.started",
    "checkout.intentCreated",
    "checkout.paid",
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
        _agentId: 'smokey',
    });
    batch.delete(originalEventRef);
    await batch.commit();
}

export async function handleSmokeyEvent(orgId: string, eventId: string) {
    const { firestore: db } = await createServerClient();
    const agentId = 'smokey';

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
            case "recommendation.shown":
                await handleRecommendationShown(orgId, event);
                break;
            case "cart.updated":
                await handleCartUpdated(orgId, event);
                break;
            case "checkout.started":
                // Logic for checkout started
                break;
            // Add other cases here
        }
        // Mark as successfully processed
        await eventRef.set({ processedBy: { [agentId]: FieldValue.serverTimestamp() } }, { merge: true });

    } catch (error) {
        console.error(`[${agentId}] Error processing event ${eventId}:`, error);
        await handleDeadLetter(orgId, eventId, event, error);
    }
}

async function handleRecommendationShown(orgId: string, event: any) {
    logger.info(`Smokey: Recommendation shown for user ${event.data?.userId}`);
    // Implement logic to track recommendation performance or update user profile
}

async function handleCartUpdated(orgId: string, event: any) {
    logger.info(`Smokey: Cart updated for user ${event.data?.userId}`);
    // Implement logic to check for upsell opportunities
}
