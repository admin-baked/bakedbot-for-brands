// src/server/agents/mrsParker.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";
import { deeboCheckMessage } from "./deebo";
import { blackleafService } from "@/lib/notifications/blackleaf-service";
import { logger } from '@/lib/logger';
import { AgentImplementation } from './harness';
import { MrsParkerMemory } from './schemas';
import { deebo } from './deebo';

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

async function sendSms(orgId: string, state: string, phone: string, message: string, order?: any) {
  // 1. Ask Deebo for permission first.
  const complianceCheck = await deeboCheckMessage({
    orgId,
    channel: "sms",
    stateCode: state,
    content: message,
  });

  if (!complianceCheck.ok) {
    logger.warn('Mrs. Parker: SMS blocked by Deebo', {
      phone,
      reason: complianceCheck.reason
    });
    return false; // Stop if compliance check fails
  }

  // 2. If compliant, send via Blackleaf
  try {
    const success = await blackleafService.sendCustomMessage(phone, message);
    if (success) {
      logger.info('Mrs. Parker: SMS sent successfully via Blackleaf', { phone, orderId: order?.id });
    }
    return success;
  } catch (error) {
    logger.error('Mrs. Parker: SMS send failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
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

    // INTEGRATION: iHeart Loyalty
    // Call iHeart API to award points and get the canonical balance
    const { getAdminAuth } = await import('@/firebase/admin'); // Import helper if needed, but not used here directly yet
    const { iheartService } = await import('@/server/services/iheart');

    const iheartResult = await iheartService.awardPoints({
      customerId: customerKey, // Ensure this matches iHeart ID format (often external_id)
      orderId: orderId,
      orderTotal: total,
      pointsMultiplier: 1
    });

    if (!iheartResult.success) {
      logger.error(`[MrsParker] Failed to award iHeart points for ${orderId}: ${iheartResult.error}`);
      // Optionally throw or continue with local fallback
    }

    await db.runTransaction(async (tx: any) => {
      // NOTE: We are re-reading/writing to ensure consistency, but we used values from iHeart above.
      // Ideally we should do iHeart call OUTSIDE transaction to avoid blocking it for too long, which we did.

      const snap = await tx.get(loyaltyRef);
      const current = (snap.exists ? snap.data() : {}) as any;

      const newTotalOrders = (current.totalOrders || 0) + 1;
      const newTotalGmv = (current.totalGmv || 0) + total;

      const earnedPoints = iheartResult.success ? iheartResult.pointsAwarded : Math.round(total);
      const newPoints = iheartResult.success ? iheartResult.newBalance : (current.points || 0) + earnedPoints;

      // Tier is now driven by iHeart (if available), or local fallback
      const tier = computeTier(newPoints);

      // Check if this is the first order to send a welcome SMS.
      const isFirstOrder = !current.totalOrders || current.totalOrders === 0;

      if (isFirstOrder && order.customerPhone) {
        const welcomeMessage = `Welcome to the ${orgId} family! You've earned ${earnedPoints} points on your first order. Thanks for your business!`;
        // We can call the SMS function directly from here, within the transaction's scope.
        await sendSms(orgId, "NY", order.customerPhone, welcomeMessage, order);
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
    logger.error(`[mrs_parker] Error processing event ${eventId}:`, error instanceof Error ? error : new Error(String(error)));
    await handleDeadLetter(orgId, eventId, event, error);
  }
}

// --- Tool Definitions ---

export interface MrsParkerTools {
  // Predict churn risk for a segment (Genkit analysis of frequency)
  predictChurnRisk(segmentId: string): Promise<{ riskLevel: 'high' | 'medium' | 'low'; atRiskCount: number }>;
  // Generate a loyalty campaign concept
  generateLoyaltyCampaign(segmentId: string, goal: string): Promise<{ subject: string; body: string }>;
}

// --- Mrs. Parker Agent Implementation (Harness) ---

export const mrsParkerAgent: AgentImplementation<MrsParkerMemory, MrsParkerTools> = {
  agentName: 'mrs_parker',

  async initialize(brandMemory, agentMemory) {
    logger.info('[MrsParker] Initializing. Syncing segments...');
    return agentMemory;
  },

  async orient(brandMemory, agentMemory) {
    const runningJourney = agentMemory.journeys.find(j => j.status === 'running');
    if (runningJourney) return `journey:${runningJourney.id}`;
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: MrsParkerTools) {
    if (targetId.startsWith('journey:')) {

      const journeyId = targetId.split(':')[1];
      const journey = agentMemory.journeys.find(j => j.id === journeyId);
      if (!journey) throw new Error(`Journey ${journeyId} not found`);

      // Use Tool: Predict Churn (Context aware step)
      const churnRisk = await tools.predictChurnRisk('vip_segment');

      let resultMessage = `Processed step 1 for journey ${journeyId}. Churn Risk for VIPs: ${churnRisk.riskLevel}.`;

      if (churnRisk.riskLevel === 'high') {
        // Use Tool: Generate Winback Campaign
        const campaign = await tools.generateLoyaltyCampaign('vip_segment', 'Retain High Value Customers');
        resultMessage += ` Generated Winback Campaign: "${campaign.subject}".`;
      }

      return {
        updatedMemory: agentMemory,
        logEntry: {
          action: 'process_journey_step',
          result: resultMessage,
          metadata: { journey_id: journey.id, step: 1, churn_risk: churnRisk.riskLevel }
        }
      };
    }
    throw new Error(`Unknown target ${targetId}`);
  }
};


