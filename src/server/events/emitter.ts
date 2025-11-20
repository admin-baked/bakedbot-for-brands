// src/server/events/emitter.ts
'use server';

import 'server-only';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import type { Agent, EventType } from '@/types/domain';

/**
 * Emits an event to the Event Spine for a given organization.
 * This is the central function for all agent and system event logging.
 *
 * @param orgId - The ID of the organization (brand) this event belongs to.
 * @param type - The type of event (e.g., 'checkout.started').
 * @param agent - The agent responsible for the event, or 'system'.
 * @param data - The payload containing event-specific details.
 * @param refId - An optional reference ID (e.g., orderId, customerId).
 */
export async function emitEvent(
  orgId: string,
  type: EventType,
  agent: Agent | 'system',
  data: any,
  refId: string | null = null
): Promise<void> {
  if (!orgId) {
    console.warn('emitEvent called without an orgId. Skipping.');
    return;
  }

  try {
    const { firestore } = await createServerClient();
    const eventRef = firestore.collection('organizations').doc(orgId).collection('events').doc();
    
    await eventRef.set({
      type,
      agent,
      orgId,
      refId,
      data,
      timestamp: FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error(`Failed to emit event [${type}] for org [${orgId}]:`, error);
    // In a production system, you might push this failed event to a retry queue.
  }
}
