
// src/server/events/emitter.ts
'use server';

import 'server-only';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import type { Agent, EventType } from '@/types/domain';

export interface EmitEventInput {
  orgId: string;
  type: EventType;
  agent: Agent | 'system';
  refId?: string | null;
  data?: any;
}

/**
 * Emits an event to the Event Spine for a given organization.
 * This is the central function for all agent and system event logging.
 *
 * @param input - The structured input for the event.
 */
export async function emitEvent({
  orgId,
  type,
  agent,
  refId = null,
  data = {},
}: EmitEventInput): Promise<void> {
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
      orgId, // Denormalize for collection group queries
      refId,
      data,
      timestamp: FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error(`Failed to emit event [${type}] for org [${orgId}]:`, error);
    // In a production system, you might push this failed event to a retry queue.
  }
}
