'use server';
// src/server/actions/intent-profile.ts
// Dispensary Intent Profile Framework (DIPF) — Auth-gated server actions

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  getIntentProfile,
  upsertIntentProfile,
  getDefaultProfile,
  calculateCompletionPct,
  invalidateCache,
} from '@/server/services/intent-profile';
import type {
  DispensaryIntentProfile,
  BusinessArchetype,
} from '@/types/dispensary-intent-profile';

// ─────────────────────────────────────────────────────────────────────────────
// Org membership guard
// ─────────────────────────────────────────────────────────────────────────────

async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    const data = userDoc.data();
    // Super users bypass org check
    if (data?.role === 'super_user') return true;
    // Check org membership
    const memberships = data?.orgMemberships ?? {};
    return Object.keys(memberships).includes(orgId);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public-facing server actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the active intent profile for an org.
 * Returns null if no profile has been created yet.
 */
export async function getOrgIntentProfile(
  orgId: string,
): Promise<DispensaryIntentProfile | null> {
  const session = await requireUser();
  const hasAccess = await verifyOrgAccess(session.uid, orgId);
  if (!hasAccess) {
    throw new Error('Unauthorized: no access to this org');
  }
  return getIntentProfile(orgId);
}

/**
 * Update (merge) the intent profile for an org.
 * Creates the document if it doesn't exist.
 * Saves a version snapshot to the history subcollection.
 */
export async function updateOrgIntentProfile(
  orgId: string,
  updates: Partial<
    Pick<
      DispensaryIntentProfile,
      | 'strategicFoundation'
      | 'valueHierarchies'
      | 'agentConfigs'
      | 'hardBoundaries'
      | 'feedbackConfig'
    >
  >,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) {
      return { success: false, error: 'Unauthorized: no access to this org' };
    }

    await upsertIntentProfile(orgId, updates, session.uid);
    logger.info(`[IntentProfile Action] Updated for orgId=${orgId} by uid=${session.uid}`);
    return { success: true };
  } catch (err) {
    logger.error(`[IntentProfile Action] Update failed for orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Create a fresh intent profile seeded from one of the 5 archetype defaults.
 * If a profile already exists, it will be overwritten.
 */
export async function createOrgIntentProfileFromArchetype(
  orgId: string,
  archetype: BusinessArchetype,
): Promise<{ success: boolean; profile?: DispensaryIntentProfile; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) {
      return { success: false, error: 'Unauthorized: no access to this org' };
    }

    const defaultProfile = getDefaultProfile(archetype, orgId);

    // Write the full default profile as the initial state
    const db = getAdminFirestore();
    const docRef = db.collection('org_intent_profiles').doc(orgId);
    await docRef.set(defaultProfile);

    // Write version history
    const historyRef = docRef.collection('history').doc(defaultProfile.createdAt);
    await historyRef.set({
      versionId: defaultProfile.createdAt,
      savedBy: session.uid,
      savedAt: defaultProfile.createdAt,
      changeNote: `Profile bootstrapped from archetype: ${archetype}`,
      snapshot: defaultProfile,
    });

    invalidateCache(orgId);
    logger.info(`[IntentProfile Action] Created from archetype=${archetype} for orgId=${orgId}`);
    return { success: true, profile: defaultProfile };
  } catch (err) {
    logger.error(`[IntentProfile Action] Create from archetype failed for orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Get the completion percentage (0–100) for an org's intent profile.
 * Returns 0 if no profile exists.
 */
export async function getOrgIntentProfileCompletion(orgId: string): Promise<number> {
  const session = await requireUser();
  const hasAccess = await verifyOrgAccess(session.uid, orgId);
  if (!hasAccess) return 0;

  const profile = await getIntentProfile(orgId);
  if (!profile) return 0;
  return calculateCompletionPct(profile);
}
