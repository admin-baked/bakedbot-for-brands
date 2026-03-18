/**
 * AI Studio Model Routing
 *
 * Resolves the effective AIStudioModelTier for a given request.
 *
 * Resolution order:
 * 1. Explicit override from the caller (requestedModelTier)
 * 2. Playbook step config tier (if automation-triggered)
 * 3. Source-surface default routing rule
 * 4. Model name / provider mapping fallback
 *
 * Default routing by surface:
 *   inbox / quick chat / campaigns     → economy
 *   playbooks / automations            → economy (unless step requests higher)
 *   deep research / creative           → premium_reasoning
 *   boardroom / code eval / strategic  → flagship
 *   media generation                   → economy (action cost governs; multiplier 1x)
 */

import type {
  AIStudioModelTier,
  AIStudioSourceSurface,
  AIStudioActionType,
} from '@/types/ai-studio';
import { resolveModelTierByName } from '@/lib/ai-studio/model-tier-map';

// ---------------------------------------------------------------------------
// Surface Default Routing Table
// ---------------------------------------------------------------------------

const SURFACE_DEFAULT_TIER: Record<AIStudioSourceSurface, AIStudioModelTier> = {
  inbox: 'economy',
  campaigns: 'economy',
  playbooks: 'economy',
  creative_center: 'premium_reasoning',
  vibe_studio: 'premium_reasoning',
  media: 'economy',             // action cost (image/video) governs; multiplier stays low
  boardroom: 'flagship',
  unknown: 'economy',
};

// ---------------------------------------------------------------------------
// Action Default Routing Table (override when no surface is provided)
// ---------------------------------------------------------------------------

const ACTION_DEFAULT_TIER: Record<AIStudioActionType, AIStudioModelTier> = {
  chat: 'economy',
  research: 'premium_reasoning',
  image_generate: 'economy',
  image_edit: 'economy',
  creative_batch: 'premium_reasoning',
  video_short: 'economy',
  video_full: 'economy',
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export interface ResolveModelTierInput {
  requestedModelTier?: AIStudioModelTier;
  automationTriggered?: boolean;
  playbookStepTier?: AIStudioModelTier;   // explicit tier set on playbook step config
  sourceSurface?: AIStudioSourceSurface;
  actionType?: AIStudioActionType;
  modelOrProvider?: string;
}

/**
 * Resolve the effective model tier for an AI Studio action.
 *
 * Returns the tier and the reason it was selected (for audit/logging).
 */
export function resolveModelTier(input: ResolveModelTierInput): {
  tier: AIStudioModelTier;
  reason: string;
} {
  // 1. Explicit caller override
  if (input.requestedModelTier) {
    return { tier: input.requestedModelTier, reason: 'explicit_override' };
  }

  // 2. Automation: playbook step config
  if (input.automationTriggered && input.playbookStepTier) {
    return { tier: input.playbookStepTier, reason: 'playbook_step_config' };
  }

  // 3. Automation: default to economy
  if (input.automationTriggered) {
    return { tier: 'economy', reason: 'automation_default' };
  }

  // 4. Source surface routing
  if (input.sourceSurface && input.sourceSurface !== 'unknown') {
    return {
      tier: SURFACE_DEFAULT_TIER[input.sourceSurface],
      reason: `surface_default:${input.sourceSurface}`,
    };
  }

  // 5. Action type fallback
  if (input.actionType) {
    return {
      tier: ACTION_DEFAULT_TIER[input.actionType],
      reason: `action_default:${input.actionType}`,
    };
  }

  // 6. Model name mapping
  if (input.modelOrProvider) {
    return {
      tier: resolveModelTierByName(input.modelOrProvider),
      reason: `model_name_mapping:${input.modelOrProvider}`,
    };
  }

  return { tier: 'economy', reason: 'fallback_default' };
}

/**
 * Compute the final credit charge.
 * creditsCharged = ceil(baseActionCost * modelMultiplier)
 */
export function computeCreditsCharged(baseActionCost: number, multiplier: number): number {
  return Math.ceil(baseActionCost * multiplier);
}
