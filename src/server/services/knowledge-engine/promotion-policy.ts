/**
 * Knowledge Engine — Promotion Policy
 *
 * Determines whether a claim is eligible for auto-promotion into Letta.
 * All criteria must pass — any failure blocks promotion.
 */

import type { KnowledgeClaim, KnowledgeDomain, TargetBlock, TargetAgent } from './types';
import { PROMOTION_THRESHOLD } from './constants';

// =============================================================================
// PROMOTION ELIGIBILITY
// =============================================================================

/**
 * Returns true if this claim should be auto-promoted to Letta.
 *
 * All of the following must be true:
 * 1. state === 'verified_fact'
 * 2. confidenceScore >= 0.85
 * 3. impactLevel in ['high','critical'] OR domain in ['welcome_playbooks','checkin_flow']
 * 4. recencyBucket in ['today','7d','14d']
 * 5. no contradictions
 */
export function isEligibleForLettaPromotion(
  claim: KnowledgeClaim,
  domain: KnowledgeDomain
): boolean {
  if (claim.state !== 'verified_fact') return false;
  if (claim.confidenceScore < PROMOTION_THRESHOLD) return false;
  if (claim.contradictedByClaimIds.length > 0) return false;
  if (!['today', '7d', '14d'].includes(claim.recencyBucket)) return false;

  const highImpact = ['high', 'critical'].includes(claim.impactLevel);
  const playbookDomain = ['welcome_playbooks', 'checkin_flow'].includes(domain);
  if (!highImpact && !playbookDomain) return false;

  return true;
}

// =============================================================================
// BLOCK MAPPING
// =============================================================================

/**
 * Maps (targetAgent, domain) to the correct Letta block label.
 */
export function resolveTargetBlock(
  targetAgent: TargetAgent,
  domain: KnowledgeDomain
): TargetBlock {
  if (domain === 'welcome_playbooks' || domain === 'checkin_flow') {
    return 'playbook_status';
  }

  switch (targetAgent) {
    case 'marty': return 'executive_workspace';
    case 'craig': return 'agent_craig_memory';
    case 'ezal':  return 'agent_ezal_memory';
    default:      return 'brand_context';
  }
}

// =============================================================================
// PAYLOAD FORMATTING
// =============================================================================

import { LETTA_LIMITS } from './constants';
import type { KnowledgeSearchResult } from './types';

export function formatLettaPayload(input: {
  domain: KnowledgeDomain;
  summary: string;
  topClaims: KnowledgeSearchResult[];
  actions?: string[];
}): string {
  const now = new Date().toISOString();
  const { domain, summary, topClaims, actions = [] } = input;

  let payload = `Knowledge Engine Runtime Context\n`;
  payload += `Domain: ${domain}\n`;
  payload += `Generated At: ${now}\n\n`;
  payload += `Summary:\n${summary}\n\n`;
  payload += `Top Verified Claims:\n`;

  for (const claim of topClaims) {
    const line = `- ${claim.text} [confidence: ${claim.confidenceScore.toFixed(2)} | sources: ${claim.sourceTitles.length}]\n`;
    payload += line;
  }

  if (actions.length > 0) {
    payload += `\nActions To Consider:\n`;
    for (const action of actions) {
      payload += `- ${action}\n`;
    }
  }

  // Trim to max chars — drop lowest-scoring claims first
  if (payload.length > LETTA_LIMITS.MAX_PAYLOAD_CHARS) {
    const sorted = [...topClaims].sort((a, b) => b.score - a.score);
    return formatLettaPayload({ domain, summary, topClaims: sorted.slice(0, sorted.length - 1), actions });
  }

  return payload;
}

// =============================================================================
// PLAYBOOK CONTEXT PAYLOAD
// =============================================================================

export function formatPlaybookContextPayload(input: {
  tenantId: string;
  domain: KnowledgeDomain;
  summary: string;
  topClaims: KnowledgeSearchResult[];
}): string {
  const { summary, topClaims } = input;
  let payload = `${summary}\n\n`;
  for (const claim of topClaims.slice(0, LETTA_LIMITS.DEFAULT_PROMOTION_LIMIT)) {
    payload += `• ${claim.text} [${(claim.confidenceScore * 100).toFixed(0)}% confidence]\n`;
  }
  if (payload.length > LETTA_LIMITS.PLAYBOOK_CONTEXT_CHARS) {
    payload = payload.slice(0, LETTA_LIMITS.PLAYBOOK_CONTEXT_CHARS - 3) + '...';
  }
  return payload;
}

// =============================================================================
// MATERIAL CHANGE DETECTION
// =============================================================================

import crypto from 'crypto';

/**
 * Returns true if the new payload is materially different from the existing one.
 * "Material" means: at least one new claimId, or summary hash changed.
 */
export function isMaterialChange(
  existingPayload: string,
  newPayload: string,
  existingClaimIds: string[],
  newClaimIds: string[]
): boolean {
  const existingHash = crypto.createHash('sha256').update(existingPayload).digest('hex').slice(0, 8);
  const newHash = crypto.createHash('sha256').update(newPayload).digest('hex').slice(0, 8);
  if (existingHash !== newHash) return true;

  const newOnes = newClaimIds.filter(id => !existingClaimIds.includes(id));
  return newOnes.length > 0;
}
