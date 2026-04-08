/**
 * AI Studio Action Costs
 *
 * Canonical base credit costs per action type.
 * Final cost = ceil(baseCost * modelTierMultiplier).
 *
 * Do not modify these values without updating the policy doc and plan examples.
 */

import type { AIStudioActionType } from '@/types/ai-studio';

export const ACTION_BASE_COSTS: Record<AIStudioActionType, number> = {
  chat: 1,
  research: 5,
  image_generate: 12,
  image_edit: 12,
  creative_batch: 25,
  video_short: 75,       // 75 × $0.02 (Optimize top-up) = $1.50 vs $0.40 Wan = 73% margin
  video_full: 150,       // 150 × $0.02 = $3.00 vs $0.80 Wan = 73% margin
};

/**
 * Returns the base credit cost for a given action type.
 * Does not apply model-tier multiplier — use computeCreditsCharged() for final cost.
 */
export function getBaseActionCost(actionType: AIStudioActionType): number {
  return ACTION_BASE_COSTS[actionType];
}

/**
 * Whether an action type is considered high-cost (requires explicit approval gates
 * in automation contexts on restricted plans).
 */
export function isHighCostAction(actionType: AIStudioActionType): boolean {
  return actionType === 'video_short' || actionType === 'video_full' || actionType === 'creative_batch';
}

/**
 * Whether an action type is a video generation action.
 */
export function isVideoAction(actionType: AIStudioActionType): boolean {
  return actionType === 'video_short' || actionType === 'video_full';
}
