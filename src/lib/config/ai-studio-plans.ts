/**
 * AI Studio Plan Configuration
 *
 * Canonical source of truth for:
 * - Monthly credits by plan
 * - Capability gates by plan
 * - Playbook slot counts by plan
 * - Automation budget by plan
 * - Top-up pack definitions
 *
 * This file is the single reference for plan-based AI Studio entitlements.
 * Do not scatter these values across UI or service code.
 */

import type {
  AIStudioPlanId,
  AIStudioEntitlementDoc,
  AIStudioTopUpPackId,
} from '@/types/ai-studio';

// ---------------------------------------------------------------------------
// Plan Entitlement Defaults
// ---------------------------------------------------------------------------

export const AI_STUDIO_PLAN_CONFIG: Record<
  AIStudioPlanId,
  Omit<AIStudioEntitlementDoc, 'orgId' | 'effectiveAt' | 'updatedAt'>
> = {
  free_audit: {
    planId: 'free_audit',
    monthlyCreditsIncluded: 25,    // one-time, not monthly recurring
    rolloverCapPct: 0,
    canPurchaseTopUps: false,
    requiresApprovalAfterDepletion: true,

    allowChat: true,
    allowResearch: false,
    allowImages: false,
    allowCreativeBatch: false,
    allowShortVideo: false,
    allowFullVideo: false,

    maxActivePlaybooks: 0,
    allowCustomPlaybooks: false,
    monthlyAutomationCreditBudget: 0,
    allowAutomationVideo: false,
    requireApprovalForHighCostAutomationSteps: true,
  },

  signal: {
    planId: 'signal',
    monthlyCreditsIncluded: 250,
    rolloverCapPct: 0.25,
    canPurchaseTopUps: true,
    requiresApprovalAfterDepletion: false,

    allowChat: true,
    allowResearch: true,
    allowImages: true,
    allowCreativeBatch: false,
    allowShortVideo: false,
    allowFullVideo: false,

    maxActivePlaybooks: 0,
    allowCustomPlaybooks: false,
    monthlyAutomationCreditBudget: 0,
    allowAutomationVideo: false,
    requireApprovalForHighCostAutomationSteps: true,
  },

  convert: {
    planId: 'convert',
    monthlyCreditsIncluded: 900,
    rolloverCapPct: 0.25,
    canPurchaseTopUps: true,
    requiresApprovalAfterDepletion: false,

    allowChat: true,
    allowResearch: true,
    allowImages: true,
    allowCreativeBatch: true,
    allowShortVideo: false,
    allowFullVideo: false,

    maxActivePlaybooks: 0,
    allowCustomPlaybooks: false,
    monthlyAutomationCreditBudget: 150,    // system playbooks only
    allowAutomationVideo: false,
    requireApprovalForHighCostAutomationSteps: true,
  },

  retain: {
    planId: 'retain',
    monthlyCreditsIncluded: 1800,
    rolloverCapPct: 0.25,
    canPurchaseTopUps: true,
    requiresApprovalAfterDepletion: false,

    allowChat: true,
    allowResearch: true,
    allowImages: true,
    allowCreativeBatch: true,
    allowShortVideo: true,
    allowFullVideo: false,

    maxActivePlaybooks: 10,
    allowCustomPlaybooks: true,
    monthlyAutomationCreditBudget: 600,
    allowAutomationVideo: false,            // short video via manual only at Retain
    requireApprovalForHighCostAutomationSteps: true,
  },

  optimize: {
    planId: 'optimize',
    monthlyCreditsIncluded: 4500,
    rolloverCapPct: 0.25,
    canPurchaseTopUps: true,
    requiresApprovalAfterDepletion: false,

    allowChat: true,
    allowResearch: true,
    allowImages: true,
    allowCreativeBatch: true,
    allowShortVideo: true,
    allowFullVideo: true,

    maxActivePlaybooks: 25,
    allowCustomPlaybooks: true,
    monthlyAutomationCreditBudget: 2000,
    allowAutomationVideo: true,
    requireApprovalForHighCostAutomationSteps: false,
  },

  enterprise: {
    planId: 'enterprise',
    monthlyCreditsIncluded: 10000,   // starting floor; actual set via override
    rolloverCapPct: 0.25,
    canPurchaseTopUps: true,
    requiresApprovalAfterDepletion: false,

    allowChat: true,
    allowResearch: true,
    allowImages: true,
    allowCreativeBatch: true,
    allowShortVideo: true,
    allowFullVideo: true,

    maxActivePlaybooks: 999,
    allowCustomPlaybooks: true,
    monthlyAutomationCreditBudget: 10000,  // matched to total; override per contract
    allowAutomationVideo: true,
    requireApprovalForHighCostAutomationSteps: false,
  },
};

// ---------------------------------------------------------------------------
// Top-Up Pack Definitions
// ---------------------------------------------------------------------------

export interface AIStudioTopUpPack {
  id: AIStudioTopUpPackId;
  name: string;
  credits: number;
  priceCents: number;
  priceDisplay: string;
}

export const AI_STUDIO_TOPUP_PACKS: AIStudioTopUpPack[] = [
  {
    id: 'topup_250',
    name: 'Starter Top-Up',
    credits: 250,
    priceCents: 2900,
    priceDisplay: '$29',
  },
  {
    id: 'topup_1000',
    name: 'Growth Top-Up',
    credits: 1000,
    priceCents: 9900,
    priceDisplay: '$99',
  },
  {
    id: 'topup_3000',
    name: 'Studio Top-Up',
    credits: 3000,
    priceCents: 24900,
    priceDisplay: '$249',
  },
];

export const TOPUP_PACK_BY_ID: Record<AIStudioTopUpPackId, AIStudioTopUpPack> =
  Object.fromEntries(AI_STUDIO_TOPUP_PACKS.map((p) => [p.id, p])) as Record<
    AIStudioTopUpPackId,
    AIStudioTopUpPack
  >;
