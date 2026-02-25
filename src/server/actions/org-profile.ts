'use server';
// src/server/actions/org-profile.ts
// Unified OrgProfile — auth-gated server actions.
// Replaces the split between brand-guide.ts actions and intent-profile.ts actions.

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
  getOrgProfile,
  upsertOrgProfile,
  getDefaultOrgProfile,
  invalidateOrgProfileCache,
} from '@/server/services/org-profile';
import { calculateOrgProfileCompletion } from '@/types/org-profile';
import type { OrgProfile } from '@/types/org-profile';
import type { BusinessArchetype } from '@/types/dispensary-intent-profile';

// ─────────────────────────────────────────────────────────────────────────────
// Org membership guard (same pattern as intent-profile actions)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyOrgAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    const data = userDoc.data();
    if (data?.role === 'super_user') return true;
    const memberships = data?.orgMemberships ?? {};
    return Object.keys(memberships).includes(orgId);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the unified org profile.
 * Returns null if no profile exists yet — callers should prompt onboarding.
 */
export async function getOrgProfileAction(
  orgId: string,
): Promise<{ success: boolean; profile?: OrgProfile; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) return { success: false, error: 'Unauthorized: no access to this org' };
    const profile = await getOrgProfile(orgId);
    return { success: true, profile: profile ?? undefined };
  } catch (err) {
    logger.error(`[OrgProfile Action] Fetch failed orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Get only the completion % — lightweight for sidebar badges / settings tabs.
 */
export async function getOrgProfileCompletion(
  orgId: string,
): Promise<{ pct: number; isDefault: boolean }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) return { pct: 0, isDefault: true };
    const profile = await getOrgProfile(orgId);
    if (!profile) return { pct: 0, isDefault: true };
    return { pct: calculateOrgProfileCompletion(profile), isDefault: profile.isDefault };
  } catch {
    return { pct: 0, isDefault: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge-update the org profile.
 * Accepts partial updates to either the brand or intent section (or both).
 * Creates the document if it doesn't exist.
 */
export async function updateOrgProfileAction(
  orgId: string,
  updates: Partial<Pick<OrgProfile, 'brand' | 'intent'>>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) return { success: false, error: 'Unauthorized: no access to this org' };

    await upsertOrgProfile(orgId, updates, session.uid);
    logger.info(`[OrgProfile Action] Updated orgId=${orgId} by uid=${session.uid}`);
    return { success: true };
  } catch (err) {
    logger.error(`[OrgProfile Action] Update failed orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Bootstrap a full OrgProfile from one of the 5 archetype defaults.
 * Overwrites any existing profile.
 * Use this when a new org selects their archetype during onboarding.
 */
export async function createOrgProfileFromArchetype(
  orgId: string,
  archetype: BusinessArchetype,
): Promise<{ success: boolean; profile?: OrgProfile; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) return { success: false, error: 'Unauthorized: no access to this org' };

    const defaultProfile = getDefaultOrgProfile(archetype, orgId);

    const db = getAdminFirestore();
    const docRef = db.collection('org_profiles').doc(orgId);
    await docRef.set(defaultProfile);

    // Write initial history entry
    await docRef.collection('history').doc(defaultProfile.createdAt).set({
      versionId: defaultProfile.createdAt,
      savedBy: session.uid,
      savedAt: defaultProfile.createdAt,
      changeNote: `Profile bootstrapped from archetype: ${archetype}`,
      snapshot: defaultProfile,
    });

    invalidateOrgProfileCache(orgId);
    logger.info(`[OrgProfile Action] Created from archetype=${archetype} for orgId=${orgId} by ${session.uid}`);
    return { success: true, profile: defaultProfile };
  } catch (err) {
    logger.error(`[OrgProfile Action] Create from archetype failed orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Create or update an org profile from a website scan.
 * Extracts brand identity from the URL and seeds default intent from detected dispensaryType.
 * This is the primary onboarding action — called at the end of the wizard.
 */
export async function createOrgProfileFromWizard(
  orgId: string,
  brandData: OrgProfile['brand'],
  intentData: OrgProfile['intent'],
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUser();
    const hasAccess = await verifyOrgAccess(session.uid, orgId);
    if (!hasAccess) return { success: false, error: 'Unauthorized: no access to this org' };

    await upsertOrgProfile(
      orgId,
      { brand: brandData, intent: intentData },
      session.uid,
    );

    logger.info(`[OrgProfile Action] Created from wizard for orgId=${orgId} by ${session.uid}`);
    return { success: true };
  } catch (err) {
    logger.error(`[OrgProfile Action] Wizard save failed orgId=${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}
