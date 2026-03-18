/**
 * AI Studio Model Tier Map
 *
 * Maps model/provider names to their billing tier.
 * Tiers determine the credit multiplier applied to base action costs.
 *
 * Multipliers:
 *   economy           → 1.0x
 *   premium_reasoning → 2.5x
 *   flagship          → 4.0x
 */

import type { AIStudioModelTier } from '@/types/ai-studio';

// ---------------------------------------------------------------------------
// Tier Multipliers
// ---------------------------------------------------------------------------

export const MODEL_TIER_MULTIPLIERS: Record<AIStudioModelTier, number> = {
  economy: 1.0,
  premium_reasoning: 2.5,
  flagship: 4.0,
};

// ---------------------------------------------------------------------------
// Model → Tier Map
// ---------------------------------------------------------------------------

export const MODEL_TIER_MAP: Record<string, AIStudioModelTier> = {
  // Anthropic — Claude
  'claude-haiku-4-5-20251001': 'economy',
  'claude-haiku': 'economy',
  'claude-sonnet-4-6': 'premium_reasoning',
  'claude-sonnet': 'premium_reasoning',
  'claude-opus-4-6': 'flagship',
  'claude-opus': 'flagship',

  // GLM / Zhipu
  'glm-4-flash': 'economy',
  'glm-4': 'premium_reasoning',
  'glm-4-plus': 'premium_reasoning',

  // Google Gemini
  'gemini-2.5-flash-lite': 'economy',
  'gemini-2.5-flash': 'economy',
  'gemini-2.5-pro': 'premium_reasoning',

  // OpenAI (future-proofing)
  'gpt-4o-mini': 'economy',
  'gpt-4o': 'premium_reasoning',
  'gpt-4.1-mini': 'economy',
  'gpt-5-reasoning': 'premium_reasoning',

  // fal.ai (image/video generation — tier applies model-cost multiplier on top of action cost)
  'fal-flux': 'economy',
  'fal-flux-pro': 'premium_reasoning',
};

/**
 * Resolve a model name/provider string to its billing tier.
 * Defaults to 'economy' if unknown (fail-safe: unknown models don't get flagship pricing).
 */
export function resolveModelTierByName(modelOrProvider: string): AIStudioModelTier {
  const normalized = modelOrProvider.toLowerCase().trim();

  if (MODEL_TIER_MAP[normalized]) return MODEL_TIER_MAP[normalized];

  // Prefix matching for versioned model names
  if (normalized.startsWith('claude-opus')) return 'flagship';
  if (normalized.startsWith('claude-sonnet')) return 'premium_reasoning';
  if (normalized.startsWith('claude-haiku')) return 'economy';
  if (normalized.startsWith('gemini-2.5-pro')) return 'premium_reasoning';
  if (normalized.startsWith('gemini-2.5-flash')) return 'economy';
  if (normalized.startsWith('gpt-5')) return 'premium_reasoning';
  if (normalized.startsWith('gpt-4o-mini')) return 'economy';
  if (normalized.startsWith('gpt-4o')) return 'premium_reasoning';

  return 'economy';
}

/**
 * Get the credit multiplier for a model tier.
 */
export function getModelMultiplier(tier: AIStudioModelTier): number {
  return MODEL_TIER_MULTIPLIERS[tier];
}
