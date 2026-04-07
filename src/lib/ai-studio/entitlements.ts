/**
 * AI Studio Entitlement Helpers
 *
 * Helpers for resolving effective AI Studio entitlements.
 * Reads from org_ai_studio_entitlements/{orgId} and merges admin overrides.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { AI_STUDIO_PLAN_CONFIG } from '@/lib/config/ai-studio-plans';
import type {
  AIStudioPlanId,
  AIStudioEntitlementDoc,
  AIStudioOverrideDoc,
  AIStudioActionType,
  AIStudioBalanceDoc,
} from '@/types/ai-studio';

// ---------------------------------------------------------------------------
// Base entitlement from plan config
// ---------------------------------------------------------------------------

/**
 * Returns the base entitlement for a plan — no org-level overrides applied.
 */
export function getBaseAIStudioEntitlement(
  planId: AIStudioPlanId,
  orgId: string
): AIStudioEntitlementDoc {
  const config = AI_STUDIO_PLAN_CONFIG[planId];
  const now = Date.now();
  return {
    ...config,
    orgId,
    effectiveAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Effective entitlement (base + overrides)
// ---------------------------------------------------------------------------

/**
 * Loads the org's entitlement document from Firestore.
 * Falls back to base plan config if no entitlement doc exists.
 */
export async function getEffectiveAIStudioEntitlement(
  orgId: string
): Promise<AIStudioEntitlementDoc> {
  try {
    const db = getAdminFirestore();
    const [entitlementSnap, overrideSnap] = await Promise.all([
      db.collection('org_ai_studio_entitlements').doc(orgId).get(),
      db.collection('org_ai_studio_overrides').doc(orgId).get(),
    ]);

    let entitlement: AIStudioEntitlementDoc;

    if (entitlementSnap.exists) {
      entitlement = entitlementSnap.data() as AIStudioEntitlementDoc;
    } else {
      // Default to signal plan if no entitlement configured
      logger.warn('[AIStudio] No entitlement doc found, defaulting to signal', { orgId });
      entitlement = getBaseAIStudioEntitlement('signal', orgId);
    }

    // Apply admin overrides
    if (overrideSnap.exists) {
      const overrides = overrideSnap.data() as AIStudioOverrideDoc;
      if (overrides.forceDisableVideo) {
        entitlement = {
          ...entitlement,
          allowShortVideo: false,
          allowFullVideo: false,
          allowAutomationVideo: false,
        };
      }
      if (overrides.overrideMonthlyAutomationBudget !== undefined) {
        entitlement = {
          ...entitlement,
          monthlyAutomationCreditBudget: overrides.overrideMonthlyAutomationBudget,
        };
      }
    }

    return entitlement;
  } catch (err) {
    logger.error('[AIStudio] Failed to load entitlement', { orgId, err });
    // Fail safe: return signal-level entitlement
    return getBaseAIStudioEntitlement('signal', orgId);
  }
}

/**
 * Write (or overwrite) an org's AI Studio entitlement document.
 * Used when a plan is provisioned or upgraded.
 */
export async function upsertAIStudioEntitlement(
  orgId: string,
  planId: AIStudioPlanId
): Promise<void> {
  const db = getAdminFirestore();
  const entitlement = getBaseAIStudioEntitlement(planId, orgId);
  await db.collection('org_ai_studio_entitlements').doc(orgId).set(entitlement, { merge: true });
  logger.info('[AIStudio] Entitlement upserted', { orgId, planId });
}

/**
 * Provisions AI Studio for a new org — creates entitlement + initial balance.
 * Should be called during org creation flow.
 */
export async function provisionAIStudioForOrg(
  orgId: string,
  planId: AIStudioPlanId = 'signal'
): Promise<void> {
  const db = getAdminFirestore();
  const entitlement = getBaseAIStudioEntitlement(planId, orgId);

  const now = Date.now();
  const cycleStart = new Date();
  cycleStart.setDate(1);
  cycleStart.setHours(0, 0, 0, 0);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  const currentCycleKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const balance: AIStudioBalanceDoc = {
    orgId,
    billingCycleKey: currentCycleKey,
    includedCreditsTotal: entitlement.monthlyCreditsIncluded,
    includedCreditsUsed: 0,
    rolloverCreditsTotal: 0,
    rolloverCreditsUsed: 0,
    topUpCreditsTotal: 0,
    topUpCreditsUsed: 0,
    automationBudgetTotal: entitlement.monthlyAutomationCreditBudget,
    automationBudgetUsed: 0,
    manualCreditsUsed: 0,
    automationCreditsUsed: 0,
    alertsSent: {},
    cycleStartedAt: cycleStart.getTime(),
    cycleEndsAt: cycleEnd.getTime(),
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    db.collection('org_ai_studio_entitlements').doc(orgId).set(entitlement),
    db.collection('org_ai_studio_balances').doc(`${orgId}-${currentCycleKey}`).set(balance),
  ]);

  logger.info('[AIStudio] Provisioned for new org', { orgId, planId, credits: entitlement.monthlyCreditsIncluded });
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

/**
 * Returns whether an entitlement allows a given action type.
 */
export function canUseAIStudioAction(
  entitlement: AIStudioEntitlementDoc,
  actionType: AIStudioActionType
): boolean {
  switch (actionType) {
    case 'chat':
      return entitlement.allowChat;
    case 'research':
      return entitlement.allowResearch;
    case 'image_generate':
    case 'image_edit':
      return entitlement.allowImages;
    case 'creative_batch':
      return entitlement.allowCreativeBatch;
    case 'video_short':
      return entitlement.allowShortVideo;
    case 'video_full':
      return entitlement.allowFullVideo;
  }
}

/**
 * Returns whether an entitlement allows an AI-powered automation action.
 * Applies additional automation-specific gates (e.g. no video in automation for Retain).
 */
export function canRunPlaybookAIAction(
  entitlement: AIStudioEntitlementDoc,
  actionType: AIStudioActionType
): boolean {
  // Must first pass the standard plan gate
  if (!canUseAIStudioAction(entitlement, actionType)) return false;

  // Video in automation requires explicit allowAutomationVideo flag
  if (
    (actionType === 'video_short' || actionType === 'video_full') &&
    !entitlement.allowAutomationVideo
  ) {
    return false;
  }

  // No playbooks allowed on plans with 0 automation budget
  if (entitlement.monthlyAutomationCreditBudget === 0) return false;

  return true;
}

/**
 * Returns active playbook count for an org from Firestore.
 */
export async function getActivePlaybookCount(orgId: string): Promise<number> {
  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('playbooks')
      .where('orgId', '==', orgId)
      .where('enabled', '==', true)
      .count()
      .get();
    return snap.data().count;
  } catch (err) {
    logger.error('[AIStudio] Failed to count active playbooks', { orgId, err });
    return 0;
  }
}

/**
 * Returns whether the org can create another active playbook.
 */
export async function canCreateAnotherPlaybook(orgId: string): Promise<boolean> {
  const entitlement = await getEffectiveAIStudioEntitlement(orgId);
  if (entitlement.maxActivePlaybooks === 0) return false;
  const count = await getActivePlaybookCount(orgId);
  return count < entitlement.maxActivePlaybooks;
}
