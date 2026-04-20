/**
 * AI Studio Type Definitions
 *
 * Canonical types for the AI Studio credit system:
 * entitlements, balances, usage events, top-up purchases, overrides.
 */

// ---------------------------------------------------------------------------
// Plan IDs
// ---------------------------------------------------------------------------

export type AIStudioPlanId =
  | 'free_audit'
  | 'signal'
  | 'convert'
  | 'retain'
  | 'optimize'
  | 'enterprise';

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export type AIStudioActionType =
  | 'chat'
  | 'research'
  | 'image_generate'
  | 'image_edit'
  | 'creative_batch'
  | 'video_short'
  | 'video_full';

// ---------------------------------------------------------------------------
// Source Surfaces
// ---------------------------------------------------------------------------

export type AIStudioSourceSurface =
  | 'inbox'
  | 'creative_center'
  | 'vibe_studio'
  | 'media'
  | 'campaigns'
  | 'playbooks'
  | 'boardroom'
  | 'unknown';

// ---------------------------------------------------------------------------
// Model Tiers
// ---------------------------------------------------------------------------

export type AIStudioModelTier = 'economy' | 'premium_reasoning' | 'flagship';

// ---------------------------------------------------------------------------
// Budget Bucket
// ---------------------------------------------------------------------------

export type AIStudioBudgetBucket = 'manual' | 'automation';

// ---------------------------------------------------------------------------
// Entitlement Document
// org_ai_studio_entitlements/{orgId}
// ---------------------------------------------------------------------------

export interface AIStudioEntitlementDoc {
  orgId: string;
  planId: AIStudioPlanId;

  monthlyCreditsIncluded: number;
  rolloverCapPct: number;           // e.g. 0.25 = 25%
  canPurchaseTopUps: boolean;
  requiresApprovalAfterDepletion: boolean;

  allowChat: boolean;
  allowResearch: boolean;
  allowImages: boolean;
  allowCreativeBatch: boolean;
  allowShortVideo: boolean;
  allowFullVideo: boolean;

  maxActivePlaybooks: number;
  allowCustomPlaybooks: boolean;
  monthlyAutomationCreditBudget: number;
  allowAutomationVideo: boolean;
  requireApprovalForHighCostAutomationSteps: boolean;

  effectiveAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Balance Document
// org_ai_studio_balances/{orgId}-{YYYY-MM}
// ---------------------------------------------------------------------------

export interface AIStudioAlertFlags {
  pct50?: boolean;
  pct80?: boolean;
  pct100?: boolean;
  totalExhausted?: boolean;
  automationExhausted?: boolean;
}

export interface AIStudioBalanceDoc {
  orgId: string;
  billingCycleKey: string;          // e.g. "2026-03"

  includedCreditsTotal: number;
  includedCreditsUsed: number;

  rolloverCreditsTotal: number;
  rolloverCreditsUsed: number;

  topUpCreditsTotal: number;
  topUpCreditsUsed: number;

  automationBudgetTotal: number;
  automationBudgetUsed: number;

  manualCreditsUsed: number;
  automationCreditsUsed: number;

  alertsSent: AIStudioAlertFlags;

  cycleStartedAt: number;
  cycleEndsAt: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Usage Event (immutable ledger)
// ai_studio_usage_events/{auto-id}
// ---------------------------------------------------------------------------

export interface AIStudioUsageEvent {
  id: string;
  orgId: string;
  userId?: string;

  actionType: AIStudioActionType;
  sourceSurface?: AIStudioSourceSurface;
  budgetBucket: AIStudioBudgetBucket;

  creditsCharged: number;
  baseActionCost: number;
  modelTier: AIStudioModelTier;
  modelMultiplier: number;

  success: boolean;
  errorCode?: string;

  automationTriggered: boolean;
  playbookId?: string;
  playbookRunId?: string;

  modelOrProvider?: string;
  requestId?: string;

  billingCycleKey: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Top-Up Purchase
// ai_studio_topup_purchases/{auto-id}
// ---------------------------------------------------------------------------

export type AIStudioTopUpPackId = 'topup_250' | 'topup_1000' | 'topup_3000';

export interface AIStudioTopUpPurchase {
  id: string;
  orgId: string;
  packId: AIStudioTopUpPackId | string;
  creditsAdded: number;
  priceCents: number;
  currency: 'usd';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billingProvider?: 'stripe' | 'authorize_net' | 'manual';
  externalChargeId?: string;
  purchasedByUserId?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Override Document (admin manual overrides)
// org_ai_studio_overrides/{orgId}
// ---------------------------------------------------------------------------

export interface AIStudioOverrideDoc {
  orgId: string;
  bonusCredits?: number;
  overrideMonthlyAutomationBudget?: number;
  forceDisableVideo?: boolean;
  forceHardStop?: boolean;
  note?: string;
  createdByUserId?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Service Layer Types
// ---------------------------------------------------------------------------

export interface CheckAIStudioActionInput {
  orgId: string;
  userId?: string;
  actionType: AIStudioActionType;
  automationTriggered: boolean;
  playbookId?: string;
  sourceSurface?: AIStudioSourceSurface;
  requestedModelTier?: AIStudioModelTier;
}

export interface CheckAIStudioActionResult {
  allowed: boolean;
  reason?: string;
  errorCode?:
    | 'PLAN_CAPABILITY_BLOCKED'
    | 'AUTOMATION_BUDGET_EXHAUSTED'
    | 'AI_STUDIO_CREDITS_EXHAUSTED'
    | 'AI_STUDIO_DISABLED_BY_ADMIN'
    | 'VIDEO_NOT_ALLOWED_IN_AUTOMATION'
    | 'PLAYBOOK_SLOTS_EXHAUSTED'
    | 'SERVICE_PAUSED';
  creditsRequired: number;
  budgetBucket: AIStudioBudgetBucket;
  modelTier: AIStudioModelTier;
  modelMultiplier: number;
}

export interface ChargeAIStudioCreditsInput {
  orgId: string;
  userId?: string;
  actionType: AIStudioActionType;
  sourceSurface?: AIStudioSourceSurface;
  automationTriggered: boolean;
  playbookId?: string;
  playbookRunId?: string;
  success: boolean;
  errorCode?: string;
  requestId?: string;
  modelOrProvider?: string;
  modelTier?: AIStudioModelTier;
}

export interface AIStudioUsageSummary {
  orgId: string;
  billingCycleKey: string;
  planId: AIStudioPlanId;

  totalCreditsAvailable: number;
  totalCreditsUsed: number;
  includedCreditsUsed: number;
  includedCreditsTotal: number;
  rolloverCreditsUsed: number;
  rolloverCreditsTotal: number;
  topUpCreditsUsed: number;
  topUpCreditsTotal: number;

  automationBudgetUsed: number;
  automationBudgetTotal: number;
  manualCreditsUsed: number;
  automationCreditsUsed: number;

  activePlaybooks: number;
  maxActivePlaybooks: number;

  allowChat: boolean;
  allowResearch: boolean;
  allowImages: boolean;
  allowCreativeBatch: boolean;
  allowShortVideo: boolean;
  allowFullVideo: boolean;

  alertsSent: AIStudioAlertFlags;
  cycleStartedAt: number;
  cycleEndsAt: number;
}
