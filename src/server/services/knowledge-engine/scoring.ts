/**
 * Knowledge Engine — Confidence Scoring
 *
 * Computes confidence scores, bands, states, and recency for knowledge claims.
 */

import type { ClaimState, ConfidenceBand, ImpactLevel, RecencyBucket } from './types';
import { CONFIDENCE_BANDS, STATE_THRESHOLDS, IMPACT_WEIGHTS } from './constants';

// =============================================================================
// CONFIDENCE SCORE
// =============================================================================

export interface ScoringInput {
  trustClass: 'first_party' | 'trusted_external' | 'external' | 'agent_generated';
  sourceCount: number;
  repeatedAcrossRuns: boolean;
  firstPartyConfirmation: boolean;
  contradictionCount: number;
  ageDays: number;
}

const BASE_TRUST: Record<string, number> = {
  first_party: 0.85,
  trusted_external: 0.70,
  external: 0.55,
  agent_generated: 0.45,
};

/**
 * Compute a confidence score 0.00–1.00 for a knowledge claim.
 *
 * Age penalty is non-cumulative — apply the LARGER deduction only:
 *   ageDays > 30 → -0.10 (supersedes the -0.05 threshold)
 *   ageDays > 14 → -0.05
 */
export function computeConfidenceScore(input: ScoringInput): number {
  let score = BASE_TRUST[input.trustClass] ?? 0.45;

  if (input.sourceCount >= 2) score += 0.08;
  if (input.repeatedAcrossRuns) score += 0.07;
  if (input.firstPartyConfirmation) score += 0.10;

  // Contradictions: -0.10 each, max -0.20
  const contradictionPenalty = Math.min(input.contradictionCount * 0.10, 0.20);
  score -= contradictionPenalty;

  // Age penalty — non-cumulative, larger wins
  if (input.ageDays > 30) {
    score -= 0.10;
  } else if (input.ageDays > 14) {
    score -= 0.05;
  }

  return Math.round(Math.min(1.0, Math.max(0.0, score)) * 100) / 100;
}

// =============================================================================
// CONFIDENCE BAND
// =============================================================================

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score <= CONFIDENCE_BANDS.LOW_MAX) return 'low';
  if (score <= CONFIDENCE_BANDS.MEDIUM_MAX) return 'medium';
  return 'high';
}

// =============================================================================
// CLAIM STATE
// =============================================================================

export interface StateInput {
  confidenceScore: number;
  sourceCount: number;
  repeatedAcrossRuns: boolean;
  firstPartyConfirmed: boolean;
  contradicted: boolean;
  dismissed: boolean;
}

export function computeClaimState(input: StateInput): ClaimState {
  if (input.dismissed) return 'dismissed';

  // Verified: high score + corroboration
  if (
    input.confidenceScore >= STATE_THRESHOLDS.VERIFIED_FACT_MIN &&
    (input.firstPartyConfirmed || input.sourceCount >= 2 || input.repeatedAcrossRuns)
  ) {
    return 'verified_fact';
  }

  // Working fact: plausible with some support
  if (input.confidenceScore >= STATE_THRESHOLDS.WORKING_FACT_MIN) {
    return 'working_fact';
  }

  return 'signal';
}

// =============================================================================
// RECENCY
// =============================================================================

export function getRecencyBucket(observedAt: Date): RecencyBucket {
  const now = Date.now();
  const ageMs = now - observedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 1) return 'today';
  if (ageDays <= 7) return '7d';
  if (ageDays <= 14) return '14d';
  if (ageDays <= 30) return '30d';
  return 'stale';
}

export function computeRecencyScore(observedAt: Date): number {
  const bucket = getRecencyBucket(observedAt);
  const weights: Record<RecencyBucket, number> = {
    today: 1.00,
    '7d': 0.85,
    '14d': 0.65,
    '30d': 0.40,
    stale: 0.10,
  };
  return weights[bucket];
}

// =============================================================================
// IMPACT WEIGHT
// =============================================================================

export function getImpactWeight(impactLevel: ImpactLevel): number {
  return IMPACT_WEIGHTS[impactLevel] ?? 0.25;
}

// =============================================================================
// BLENDED RETRIEVAL SCORE
// =============================================================================

import { SCORE_WEIGHTS } from './constants';

export function computeBlendedScore(input: {
  vectorRelevance: number;
  confidenceScore: number;
  recencyScore: number;
  impactLevel: ImpactLevel;
}): number {
  const impactWeight = getImpactWeight(input.impactLevel);
  return (
    input.vectorRelevance * SCORE_WEIGHTS.VECTOR_RELEVANCE +
    input.confidenceScore * SCORE_WEIGHTS.CONFIDENCE +
    input.recencyScore * SCORE_WEIGHTS.RECENCY +
    impactWeight * SCORE_WEIGHTS.IMPACT
  );
}
