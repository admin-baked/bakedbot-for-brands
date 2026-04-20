/**
 * AI Studio Billing Service
 *
 * Main orchestration layer for AI Studio credit accounting.
 *
 * Responsibilities:
 *   - Validate whether an action is allowed by plan + balance
 *   - Charge credits using the correct burn order (included → rollover → top-up)
 *   - Write immutable usage events
 *   - Update aggregate balance docs atomically
 *   - Trigger threshold alerts (50% / 80% / 100% / exhausted)
 *   - Apply top-up credits after purchase confirmation
 *   - Monthly billing cycle reset
 *
 * Burn order: included credits → rollover credits → top-up credits
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { getEffectiveAIStudioEntitlement } from '@/lib/ai-studio/entitlements';
import { canUseAIStudioAction, canRunPlaybookAIAction } from '@/lib/ai-studio/entitlements';
import { getBaseActionCost, isVideoAction, isHighCostAction } from '@/lib/ai-studio/action-costs';
import { resolveModelTier, computeCreditsCharged } from '@/lib/ai-studio/model-routing';
import { getModelMultiplier } from '@/lib/ai-studio/model-tier-map';
import { getTenantServiceStatus } from './billing-guard';
import type {
  AIStudioBalanceDoc,
  AIStudioUsageEvent,
  AIStudioTopUpPurchase,
  AIStudioTopUpPackId,
  AIStudioAlertFlags,
  CheckAIStudioActionInput,
  CheckAIStudioActionResult,
  ChargeAIStudioCreditsInput,
  AIStudioUsageSummary,
  AIStudioBudgetBucket,
  AIStudioModelTier,
} from '@/types/ai-studio';
import { TOPUP_PACK_BY_ID } from '@/lib/config/ai-studio-plans';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentCycleKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function balanceDocId(orgId: string, cycleKey: string): string {
  return `${orgId}-${cycleKey}`;
}

function totalAvailableCredits(balance: AIStudioBalanceDoc): number {
  const includedRemaining = Math.max(
    0,
    balance.includedCreditsTotal - balance.includedCreditsUsed
  );
  const rolloverRemaining = Math.max(
    0,
    balance.rolloverCreditsTotal - balance.rolloverCreditsUsed
  );
  const topUpRemaining = Math.max(
    0,
    balance.topUpCreditsTotal - balance.topUpCreditsUsed
  );
  return includedRemaining + rolloverRemaining + topUpRemaining;
}

function automationCreditsRemaining(balance: AIStudioBalanceDoc): number {
  return Math.max(0, balance.automationBudgetTotal - balance.automationBudgetUsed);
}

// ---------------------------------------------------------------------------
// Load or initialize current balance doc
// ---------------------------------------------------------------------------

async function getOrInitBalance(
  orgId: string,
  cycleKey: string
): Promise<AIStudioBalanceDoc> {
  const db = getAdminFirestore();
  const docId = balanceDocId(orgId, cycleKey);
  const snap = await db.collection('org_ai_studio_balances').doc(docId).get();

  if (snap.exists) {
    return snap.data() as AIStudioBalanceDoc;
  }

  // No balance doc yet — build from entitlement
  const entitlement = await getEffectiveAIStudioEntitlement(orgId);

  const now = Date.now();
  const cycleStart = new Date();
  cycleStart.setDate(1);
  cycleStart.setHours(0, 0, 0, 0);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  const newBalance: AIStudioBalanceDoc = {
    orgId,
    billingCycleKey: cycleKey,
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

  await db
    .collection('org_ai_studio_balances')
    .doc(docId)
    .set(newBalance);

  return newBalance;
}

// ---------------------------------------------------------------------------
// checkAIStudioActionAllowed
// ---------------------------------------------------------------------------

export async function checkAIStudioActionAllowed(
  input: CheckAIStudioActionInput
): Promise<CheckAIStudioActionResult> {
  const { orgId, actionType, automationTriggered, sourceSurface } = input;

  try {
    const [entitlement, overrideSnap, serviceStatus] = await Promise.all([
      getEffectiveAIStudioEntitlement(orgId),
      getAdminFirestore().collection('org_ai_studio_overrides').doc(orgId).get(),
      getTenantServiceStatus(orgId),
    ]);

    // Service Pause Gate
    if (!serviceStatus.active) {
      return {
        allowed: false,
        errorCode: 'SERVICE_PAUSED',
        reason: serviceStatus.reason || 'Service is currently paused',
        creditsRequired: 0,
        budgetBucket: automationTriggered ? 'automation' : 'manual',
        modelTier: 'economy',
        modelMultiplier: 1.0,
      };
    }

    // Admin hard stop
    if (overrideSnap.exists && (overrideSnap.data() as { forceHardStop?: boolean }).forceHardStop) {
      return {
        allowed: false,
        errorCode: 'AI_STUDIO_DISABLED_BY_ADMIN',
        reason: 'Admin hard stop is active for this org',
        creditsRequired: 0,
        budgetBucket: automationTriggered ? 'automation' : 'manual',
        modelTier: 'economy',
        modelMultiplier: 1.0,
      };
    }

    // Plan capability gate
    const capabilityAllowed = automationTriggered
      ? canRunPlaybookAIAction(entitlement, actionType)
      : canUseAIStudioAction(entitlement, actionType);

    if (!capabilityAllowed) {
      const errorCode = automationTriggered && isVideoAction(actionType)
        ? 'VIDEO_NOT_ALLOWED_IN_AUTOMATION'
        : 'PLAN_CAPABILITY_BLOCKED';
      return {
        allowed: false,
        errorCode,
        reason: `Action "${actionType}" is not allowed on plan "${entitlement.planId}"`,
        creditsRequired: 0,
        budgetBucket: automationTriggered ? 'automation' : 'manual',
        modelTier: 'economy',
        modelMultiplier: 1.0,
      };
    }

    // High-cost automation approval gate
    if (
      automationTriggered &&
      entitlement.requireApprovalForHighCostAutomationSteps &&
      isHighCostAction(actionType)
    ) {
      // Note: in v1 this is a soft gate (log warning, proceed). v2 can add approval flow.
      logger.warn('[AIStudio] High-cost automation step running on restricted plan', {
        orgId,
        actionType,
        planId: entitlement.planId,
      });
    }

    // Resolve model tier
    const { tier: modelTier } = resolveModelTier({
      requestedModelTier: input.requestedModelTier,
      automationTriggered,
      sourceSurface,
      actionType,
    });
    const modelMultiplier = getModelMultiplier(modelTier);
    const baseActionCost = getBaseActionCost(actionType);
    const creditsRequired = computeCreditsCharged(baseActionCost, modelMultiplier);

    const budgetBucket: AIStudioBudgetBucket = automationTriggered ? 'automation' : 'manual';

    // Load balance
    const cycleKey = currentCycleKey();
    const balance = await getOrInitBalance(orgId, cycleKey);

    // Check automation budget
    if (automationTriggered) {
      const autoRemaining = automationCreditsRemaining(balance);
      if (autoRemaining < creditsRequired) {
        return {
          allowed: false,
          errorCode: 'AUTOMATION_BUDGET_EXHAUSTED',
          reason: `Automation budget exhausted (${autoRemaining} remaining, ${creditsRequired} required)`,
          creditsRequired,
          budgetBucket,
          modelTier,
          modelMultiplier,
        };
      }
    }

    // Check total available credits
    const totalRemaining = totalAvailableCredits(balance);
    if (totalRemaining < creditsRequired) {
      return {
        allowed: false,
        errorCode: 'AI_STUDIO_CREDITS_EXHAUSTED',
        reason: `Insufficient credits (${totalRemaining} available, ${creditsRequired} required)`,
        creditsRequired,
        budgetBucket,
        modelTier,
        modelMultiplier,
      };
    }

    return {
      allowed: true,
      creditsRequired,
      budgetBucket,
      modelTier,
      modelMultiplier,
    };
  } catch (err) {
    logger.error('[AIStudio] checkAIStudioActionAllowed failed', { orgId, actionType, err });
    // Fail open: allow action but log error
    return {
      allowed: true,
      reason: 'billing_check_error_fail_open',
      creditsRequired: getBaseActionCost(actionType),
      budgetBucket: automationTriggered ? 'automation' : 'manual',
      modelTier: 'economy',
      modelMultiplier: 1.0,
    };
  }
}

// ---------------------------------------------------------------------------
// chargeAIStudioCredits
// ---------------------------------------------------------------------------

export async function chargeAIStudioCredits(
  input: ChargeAIStudioCreditsInput
): Promise<void> {
  const {
    orgId,
    userId,
    actionType,
    sourceSurface,
    automationTriggered,
    playbookId,
    playbookRunId,
    success,
    errorCode,
    requestId,
    modelOrProvider,
  } = input;

  try {
    const entitlement = await getEffectiveAIStudioEntitlement(orgId);

    // Resolve model tier
    const { tier: modelTier, reason: tierReason } = resolveModelTier({
      requestedModelTier: input.modelTier,
      automationTriggered,
      sourceSurface,
      actionType,
      modelOrProvider,
    });
    const modelMultiplier = getModelMultiplier(modelTier);
    const baseActionCost = getBaseActionCost(actionType);
    const creditsCharged = computeCreditsCharged(baseActionCost, modelMultiplier);

    const budgetBucket: AIStudioBudgetBucket = automationTriggered ? 'automation' : 'manual';
    const cycleKey = currentCycleKey();
    const db = getAdminFirestore();

    logger.info('[AIStudio] Charging credits', {
      orgId,
      actionType,
      creditsCharged,
      modelTier,
      tierReason,
      automationTriggered,
    });

    // Write usage event (immutable)
    const eventRef = db.collection('ai_studio_usage_events').doc();
    const usageEvent: AIStudioUsageEvent = {
      id: eventRef.id,
      orgId,
      userId,
      actionType,
      sourceSurface,
      budgetBucket,
      creditsCharged,
      baseActionCost,
      modelTier,
      modelMultiplier,
      success,
      errorCode,
      automationTriggered,
      playbookId,
      playbookRunId,
      modelOrProvider,
      requestId,
      billingCycleKey: cycleKey,
      createdAt: Date.now(),
    };

    // Determine how to deduct credits (burn order: included → rollover → top-up)
    const balanceDocRef = db
      .collection('org_ai_studio_balances')
      .doc(balanceDocId(orgId, cycleKey));

    const balance = await getOrInitBalance(orgId, cycleKey);
    const deductions = computeBurnDeductions(balance, creditsCharged);

    const balanceUpdates: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (deductions.fromIncluded > 0) {
      balanceUpdates.includedCreditsUsed = FieldValue.increment(deductions.fromIncluded);
    }
    if (deductions.fromRollover > 0) {
      balanceUpdates.rolloverCreditsUsed = FieldValue.increment(deductions.fromRollover);
    }
    if (deductions.fromTopUp > 0) {
      balanceUpdates.topUpCreditsUsed = FieldValue.increment(deductions.fromTopUp);
    }

    if (budgetBucket === 'automation') {
      balanceUpdates.automationBudgetUsed = FieldValue.increment(creditsCharged);
      balanceUpdates.automationCreditsUsed = FieldValue.increment(creditsCharged);
    } else {
      balanceUpdates.manualCreditsUsed = FieldValue.increment(creditsCharged);
    }

    // Execute both writes
    await Promise.all([
      eventRef.set(usageEvent),
      balanceDocRef.set(balanceUpdates, { merge: true }),
    ]);

    // Trigger threshold alerts (non-blocking)
    triggerThresholdAlerts(orgId, balance, creditsCharged, entitlement.monthlyCreditsIncluded).catch(
      (err) => logger.error('[AIStudio] Alert trigger failed', { orgId, err })
    );
  } catch (err) {
    logger.error('[AIStudio] chargeAIStudioCredits failed', { orgId, actionType, err });
    // Never block caller on billing failure
  }
}

// ---------------------------------------------------------------------------
// Burn order deduction calculator
// ---------------------------------------------------------------------------

interface BurnDeductions {
  fromIncluded: number;
  fromRollover: number;
  fromTopUp: number;
}

function computeBurnDeductions(
  balance: AIStudioBalanceDoc,
  creditsRequired: number
): BurnDeductions {
  let remaining = creditsRequired;
  const deductions: BurnDeductions = { fromIncluded: 0, fromRollover: 0, fromTopUp: 0 };

  const includedAvail = Math.max(0, balance.includedCreditsTotal - balance.includedCreditsUsed);
  const fromIncluded = Math.min(remaining, includedAvail);
  deductions.fromIncluded = fromIncluded;
  remaining -= fromIncluded;

  if (remaining > 0) {
    const rolloverAvail = Math.max(0, balance.rolloverCreditsTotal - balance.rolloverCreditsUsed);
    const fromRollover = Math.min(remaining, rolloverAvail);
    deductions.fromRollover = fromRollover;
    remaining -= fromRollover;
  }

  if (remaining > 0) {
    const topUpAvail = Math.max(0, balance.topUpCreditsTotal - balance.topUpCreditsUsed);
    deductions.fromTopUp = Math.min(remaining, topUpAvail);
  }

  return deductions;
}

// ---------------------------------------------------------------------------
// Threshold Alerts
// ---------------------------------------------------------------------------

async function triggerThresholdAlerts(
  orgId: string,
  balanceBefore: AIStudioBalanceDoc,
  creditsJustUsed: number,
  includedTotal: number
): Promise<void> {
  const db = getAdminFirestore();
  const cycleKey = currentCycleKey();
  const docId = balanceDocId(orgId, cycleKey);

  // Re-read fresh balance after write
  const snap = await db.collection('org_ai_studio_balances').doc(docId).get();
  if (!snap.exists) return;

  const balance = snap.data() as AIStudioBalanceDoc;
  const totalUsed = balance.includedCreditsUsed + balance.rolloverCreditsUsed + balance.topUpCreditsUsed;
  const totalAvailable = balance.includedCreditsTotal + balance.rolloverCreditsTotal + balance.topUpCreditsTotal;
  const pctUsed = totalAvailable > 0 ? Math.floor((totalUsed / totalAvailable) * 100) : 0;
  const alertUpdates: Partial<AIStudioAlertFlags> = {};
  const prevAlerts = balance.alertsSent ?? {};

  if (pctUsed >= 50 && !prevAlerts.pct50) {
    alertUpdates.pct50 = true;
    logger.info('[AIStudio] 50% usage threshold reached', { orgId, pctUsed });
    // TODO: send email/in-app notification
  }
  if (pctUsed >= 80 && !prevAlerts.pct80) {
    alertUpdates.pct80 = true;
    logger.info('[AIStudio] 80% usage threshold reached', { orgId, pctUsed });
    // TODO: send email/in-app notification
  }
  if (pctUsed >= 100 && !prevAlerts.pct100) {
    alertUpdates.pct100 = true;
    logger.info('[AIStudio] 100% included credits used', { orgId });
    // TODO: send email/in-app notification
  }

  const totalRemaining = totalAvailable - totalUsed;
  if (totalRemaining <= 0 && !prevAlerts.totalExhausted) {
    alertUpdates.totalExhausted = true;
    logger.info('[AIStudio] All credits exhausted', { orgId });
    // TODO: send email/in-app notification
  }

  const autoRemaining = balance.automationBudgetTotal - balance.automationBudgetUsed;
  if (autoRemaining <= 0 && !prevAlerts.automationExhausted) {
    alertUpdates.automationExhausted = true;
    logger.info('[AIStudio] Automation budget exhausted', { orgId });
    // TODO: send email/in-app notification
  }

  if (Object.keys(alertUpdates).length > 0) {
    const mergedAlerts = { ...prevAlerts, ...alertUpdates };
    await db
      .collection('org_ai_studio_balances')
      .doc(docId)
      .set({ alertsSent: mergedAlerts, updatedAt: Timestamp.now() }, { merge: true });
  }
}

// ---------------------------------------------------------------------------
// getAIStudioBalance
// ---------------------------------------------------------------------------

export async function getAIStudioBalance(orgId: string): Promise<AIStudioBalanceDoc> {
  const cycleKey = currentCycleKey();
  return getOrInitBalance(orgId, cycleKey);
}

export interface ManualAIStudioGrantInput {
  orgId: string;
  credits: number;
  grantKey: string;
  purchasedByUserId?: string;
  externalChargeId?: string;
}

export interface ManualAIStudioGrantResult {
  applied: boolean;
  duplicate: boolean;
  purchaseId: string;
}

export async function grantManualAIStudioCredits(
  input: ManualAIStudioGrantInput
): Promise<ManualAIStudioGrantResult> {
  if (!Number.isInteger(input.credits) || input.credits < 1 || input.credits > 100_000) {
    throw new Error('Invalid manual AI Studio grant credit amount');
  }

  const grantKey = input.grantKey.trim();
  if (!grantKey) {
    throw new Error('Manual AI Studio grant key is required');
  }

  const db = getAdminFirestore();
  const cycleKey = currentCycleKey();
  const now = Date.now();
  const purchaseId = `manual_grant_${input.orgId}_${grantKey}`;

  await getOrInitBalance(input.orgId, cycleKey);

  const purchaseRef = db.collection('ai_studio_topup_purchases').doc(purchaseId);
  const balanceDocRef = db
    .collection('org_ai_studio_balances')
    .doc(balanceDocId(input.orgId, cycleKey));

  const result = await db.runTransaction<ManualAIStudioGrantResult>(async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef);

    if (purchaseSnap.exists) {
      return {
        applied: false,
        duplicate: true,
        purchaseId,
      };
    }

    const purchase: AIStudioTopUpPurchase = {
      id: purchaseId,
      orgId: input.orgId,
      packId: `manual_grant_${grantKey}`,
      creditsAdded: input.credits,
      priceCents: 0,
      currency: 'usd',
      status: 'paid',
      billingProvider: 'manual',
      externalChargeId: input.externalChargeId,
      purchasedByUserId: input.purchasedByUserId,
      createdAt: now,
      updatedAt: now,
    };

    transaction.set(purchaseRef, purchase);
    transaction.set(
      balanceDocRef,
      {
        topUpCreditsTotal: FieldValue.increment(input.credits),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return {
      applied: true,
      duplicate: false,
      purchaseId,
    };
  });

  logger.info('[AIStudio] Manual credits grant processed', {
    orgId: input.orgId,
    grantKey,
    credits: input.credits,
    purchaseId,
    result: result.applied ? 'applied' : 'duplicate',
    purchasedByUserId: input.purchasedByUserId ?? null,
    externalChargeId: input.externalChargeId ?? null,
  });

  return result;
}

// ---------------------------------------------------------------------------
// applyTopUpCredits
// ---------------------------------------------------------------------------

export async function applyTopUpCredits(
  orgId: string,
  packId: AIStudioTopUpPackId,
  purchasedByUserId?: string,
  externalChargeId?: string
): Promise<AIStudioTopUpPurchase> {
  const pack = TOPUP_PACK_BY_ID[packId];
  if (!pack) throw new Error(`Unknown top-up pack: ${packId}`);

  const db = getAdminFirestore();
  const cycleKey = currentCycleKey();
  const now = Date.now();

  // Create purchase record
  const purchaseRef = db.collection('ai_studio_topup_purchases').doc();
  const purchase: AIStudioTopUpPurchase = {
    id: purchaseRef.id,
    orgId,
    packId,
    creditsAdded: pack.credits,
    priceCents: pack.priceCents,
    currency: 'usd',
    status: 'paid',
    externalChargeId,
    purchasedByUserId,
    createdAt: now,
    updatedAt: now,
  };

  // Ensure balance doc has all required fields before incrementing top-up credits.
  // A merge-only write creates a partial doc when no current-cycle balance exists,
  // leaving numeric fields undefined and breaking downstream credit math.
  await getOrInitBalance(orgId, cycleKey);

  const balanceDocRef = db
    .collection('org_ai_studio_balances')
    .doc(balanceDocId(orgId, cycleKey));

  await Promise.all([
    purchaseRef.set(purchase),
    balanceDocRef.set(
      {
        topUpCreditsTotal: FieldValue.increment(pack.credits),
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    ),
  ]);

  logger.info('[AIStudio] Top-up credits applied', {
    orgId,
    packId,
    credits: pack.credits,
    purchaseId: purchase.id,
  });

  return purchase;
}

// ---------------------------------------------------------------------------
// Monthly billing cycle reset
// ---------------------------------------------------------------------------

export async function resetAIStudioBillingCycle(orgId: string): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date();
  const prevMonth = new Date(now);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevCycleKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const entitlement = await getEffectiveAIStudioEntitlement(orgId);
  const cycleKey = currentCycleKey();

  // Load previous balance for rollover calculation
  const prevSnap = await db
    .collection('org_ai_studio_balances')
    .doc(balanceDocId(orgId, prevCycleKey))
    .get();

  let rolloverCredits = 0;
  if (prevSnap.exists) {
    const prevBalance = prevSnap.data() as AIStudioBalanceDoc;
    const unusedIncluded = Math.max(
      0,
      prevBalance.includedCreditsTotal - prevBalance.includedCreditsUsed
    );
    const maxRollover = Math.floor(
      prevBalance.includedCreditsTotal * entitlement.rolloverCapPct
    );
    rolloverCredits = Math.min(unusedIncluded, maxRollover);
  }

  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ts = Date.now();

  const newBalance: AIStudioBalanceDoc = {
    orgId,
    billingCycleKey: cycleKey,
    includedCreditsTotal: entitlement.monthlyCreditsIncluded,
    includedCreditsUsed: 0,
    rolloverCreditsTotal: rolloverCredits,
    rolloverCreditsUsed: 0,
    topUpCreditsTotal: 0,          // top-ups reset each cycle (consumed or expire)
    topUpCreditsUsed: 0,
    automationBudgetTotal: entitlement.monthlyAutomationCreditBudget,
    automationBudgetUsed: 0,
    manualCreditsUsed: 0,
    automationCreditsUsed: 0,
    alertsSent: {},
    cycleStartedAt: cycleStart.getTime(),
    cycleEndsAt: cycleEnd.getTime(),
    createdAt: ts,
    updatedAt: ts,
  };

  await db
    .collection('org_ai_studio_balances')
    .doc(balanceDocId(orgId, cycleKey))
    .set(newBalance);

  logger.info('[AIStudio] Billing cycle reset', {
    orgId,
    cycleKey,
    includedCredits: entitlement.monthlyCreditsIncluded,
    rolloverCredits,
  });
}

// ---------------------------------------------------------------------------
// getAIStudioUsageSummary
// ---------------------------------------------------------------------------

export async function getAIStudioUsageSummary(orgId: string): Promise<AIStudioUsageSummary> {
  const [entitlement, balance] = await Promise.all([
    getEffectiveAIStudioEntitlement(orgId),
    getAIStudioBalance(orgId),
  ]);

  const db = getAdminFirestore();
  const activePlaybooksSnap = await db
    .collection('playbooks')
    .where('orgId', '==', orgId)
    .where('enabled', '==', true)
    .count()
    .get();

  const totalCreditsUsed =
    balance.includedCreditsUsed + balance.rolloverCreditsUsed + balance.topUpCreditsUsed;
  const totalCreditsAvailable =
    balance.includedCreditsTotal + balance.rolloverCreditsTotal + balance.topUpCreditsTotal;

  return {
    orgId,
    billingCycleKey: balance.billingCycleKey,
    planId: entitlement.planId,

    totalCreditsAvailable,
    totalCreditsUsed,
    includedCreditsUsed: balance.includedCreditsUsed,
    includedCreditsTotal: balance.includedCreditsTotal,
    rolloverCreditsUsed: balance.rolloverCreditsUsed,
    rolloverCreditsTotal: balance.rolloverCreditsTotal,
    topUpCreditsUsed: balance.topUpCreditsUsed,
    topUpCreditsTotal: balance.topUpCreditsTotal,

    automationBudgetUsed: balance.automationBudgetUsed,
    automationBudgetTotal: balance.automationBudgetTotal,
    manualCreditsUsed: balance.manualCreditsUsed,
    automationCreditsUsed: balance.automationCreditsUsed,

    activePlaybooks: activePlaybooksSnap.data().count,
    maxActivePlaybooks: entitlement.maxActivePlaybooks,

    allowChat: entitlement.allowChat,
    allowResearch: entitlement.allowResearch,
    allowImages: entitlement.allowImages,
    allowCreativeBatch: entitlement.allowCreativeBatch,
    allowShortVideo: entitlement.allowShortVideo,
    allowFullVideo: entitlement.allowFullVideo,

    alertsSent: balance.alertsSent,
    cycleStartedAt: balance.cycleStartedAt,
    cycleEndsAt: balance.cycleEndsAt,
  };
}
