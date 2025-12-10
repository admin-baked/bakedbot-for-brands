
// src/server/agents/moneyMike.ts
import { createServerClient } from "@/firebase/server-client";
import { EventType } from "@/types/domain";
import { FieldValue } from "firebase-admin/firestore";

import { logger } from '@/lib/logger';
import { AgentImplementation } from './harness';
import { MoneyMikeMemory } from './schemas';
import { deebo } from './deebo';

const HANDLED_TYPES: EventType[] = [
  "subscription.updated",
  "subscription.failed",
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
    _agentId: 'money_mike',
  });
  batch.delete(originalEventRef);
  await batch.commit();
}

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
    logger.error(`[${agentId}] Error processing event ${eventId}:`, error instanceof Error ? error : new Error(String(error)));
    await handleDeadLetter(orgId, eventId, event, error);
  }
}


// --- Tool Definitions ---

export interface MoneyMikeTools {
  // Forecast revenue impact of a price change (Genkit analysis)
  forecastRevenueImpact(skuId: string, priceDelta: number): Promise<{ projected_revenue_change: number; confidence: number }>;
  // Validate if a price change violates margin constraints
  validateMargin(skuId: string, newPrice: number, costBasis: number): Promise<{ isValid: boolean; margin: number }>;
}

// --- Money Mike Agent Implementation (Harness) ---

export const moneyMikeAgent: AgentImplementation<MoneyMikeMemory, MoneyMikeTools> = {
  agentName: 'money_mike',

  async initialize(brandMemory, agentMemory) {
    logger.info('[MoneyMike] Initializing. Reviewing margin floors...');
    const brandMarginFloor = brandMemory.constraints.discount_floor_margin_pct || 30;
    return agentMemory;
  },

  async orient(brandMemory, agentMemory) {
    const runningExp = agentMemory.pricing_experiments.find(e => e.status === 'running');
    if (runningExp) return runningExp.id;
    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: MoneyMikeTools) {
    const exp = agentMemory.pricing_experiments.find(e => e.id === targetId);

    if (!exp) throw new Error(`Experiment ${targetId} not found`);

    let resultMessage = '';

    if (exp.status === 'running') {
      // Use Tool: Forecast Impact
      const forecast = await tools.forecastRevenueImpact(exp.sku_ids[0], 5); // +$5 delta forecast

      resultMessage = `Monitoring Pricing Experiment. Forecasted Impact: $${forecast.projected_revenue_change.toFixed(2)} (Confidence: ${(forecast.confidence * 100).toFixed(0)}%).`;

      // Use Tool: Validate Margin (for safety check before concluding)
      const safetyCheck = await tools.validateMargin(exp.sku_ids[0], 55, 30); // Mock: New Price 55, Cost 30

      if (!safetyCheck.isValid) {
        resultMessage += ` WARNING: Margin violation detected (${safetyCheck.margin.toFixed(1)}%). Pausing experiment.`;
        exp.status = 'completed'; // or paused
      } else if (Math.random() > 0.8) {
        exp.status = 'completed';
        resultMessage = 'Experiment Completed. Variant B (+5% price) preserved volume.';
      }
    }

    return {
      updatedMemory: agentMemory,
      logEntry: {
        action: exp.status === 'completed' ? 'conclude_pricing_exp' : 'monitor_pricing_exp',
        result: resultMessage,
        metadata: { experiment_id: exp.id }
      }
    };
  }
};


