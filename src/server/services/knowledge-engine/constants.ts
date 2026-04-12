/**
 * Knowledge Engine — Constants
 *
 * All collection names, thresholds, and limits in one place.
 */

// =============================================================================
// FIRESTORE COLLECTIONS
// =============================================================================

export const KE_COLLECTIONS = {
  ENTITIES: 'knowledge_entities',
  SOURCES: 'knowledge_sources',
  OBSERVATIONS: 'knowledge_observations',
  CLAIMS: 'knowledge_claims',
  EDGES: 'knowledge_edges',
  INGESTION_RUNS: 'knowledge_ingestion_runs',
  RUNTIME_PROMOTIONS: 'knowledge_runtime_promotions',
  ALERTS: 'knowledge_alerts',
} as const;

// =============================================================================
// LANCEDB TABLE NAMES
// =============================================================================

export const KE_LANCE_TABLES = {
  chunks: (tenantId: string) => `${tenantId}__knowledge_chunks`,
  entitiesIndex: (tenantId: string) => `${tenantId}__knowledge_entities_index`,
} as const;

// =============================================================================
// SCORING THRESHOLDS
// =============================================================================

export const CONFIDENCE_BANDS = {
  LOW_MAX: 0.34,
  MEDIUM_MIN: 0.35,
  MEDIUM_MAX: 0.59,
  HIGH_MIN: 0.60,
} as const;

export const STATE_THRESHOLDS = {
  WORKING_FACT_MIN: 0.60,
  VERIFIED_FACT_MIN: 0.85,
} as const;

export const PROMOTION_THRESHOLD = 0.85;

// =============================================================================
// RETRIEVAL DEFAULTS
// =============================================================================

export const RETRIEVAL_DEFAULTS = {
  MIN_CONFIDENCE: 0.60,
  LOOKBACK_DAYS: 14,
  PLAYBOOK_LOOKBACK_DAYS: 30,
  LIMIT: 10,
  PLAYBOOK_MIN_CONFIDENCE: 0.70,
  PLAYBOOK_TOP_CLAIMS: 5,
} as const;

// =============================================================================
// SCORE BLEND WEIGHTS
// =============================================================================

export const SCORE_WEIGHTS = {
  VECTOR_RELEVANCE: 0.45,
  CONFIDENCE: 0.25,
  RECENCY: 0.20,
  IMPACT: 0.10,
} as const;

// =============================================================================
// INGESTION RULES
// =============================================================================

export const INGESTION_RULES = {
  CLAIM_MAX_CHARS: 400,
  MATERIAL_PRICE_DROP_PCT: 15,
  PRICE_WAR_PCT: 30,
  PRICE_WAR_PRODUCT_COUNT: 2,
  PRICE_WAR_WINDOW_DAYS: 7,
} as const;

// =============================================================================
// LETTA PROMOTION LIMITS
// =============================================================================

export const LETTA_LIMITS = {
  MAX_PAYLOAD_CHARS: 3500,
  PLAYBOOK_CONTEXT_CHARS: 1200,
  DEFAULT_PROMOTION_LIMIT: 5,
} as const;

// =============================================================================
// COMPETITIVE INTEL CLAIM TYPES (Phase 1 only)
// =============================================================================

export const CI_CLAIM_TYPES = [
  'competitor_promo',
  'competitor_price_shift',
] as const;

// =============================================================================
// IMPACT LEVEL WEIGHTS (for score blend)
// =============================================================================

export const IMPACT_WEIGHTS: Record<string, number> = {
  low: 0.25,
  medium: 0.50,
  high: 0.75,
  critical: 1.00,
};
