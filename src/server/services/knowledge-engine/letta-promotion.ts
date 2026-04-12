/**
 * Knowledge Engine — Letta Promotion
 *
 * Promotes high-value verified claims into Letta runtime memory blocks.
 * Uses existing lettaBlockManager + BLOCK_LABELS from block-manager.ts.
 *
 * Failure to promote NEVER fails ingestion — always log and continue.
 */

import { logger } from '@/lib/logger';
import { lettaBlockManager, BLOCK_LABELS } from '@/server/services/letta/block-manager';
import { lettaClient } from '@/server/services/letta/client';
import { recordRuntimePromotion, getRecentClaims, markClaimPromoted } from './firestore-repo';
import { isEligibleForLettaPromotion, resolveTargetBlock, formatLettaPayload, formatPlaybookContextPayload, isMaterialChange } from './promotion-policy';
import { searchKnowledge } from './search';
import type {
  KnowledgeDomain,
  TargetAgent,
  KnowledgeRuntimePromotion,
  KnowledgeSearchResult,
} from './types';

// =============================================================================
// MAIN PROMOTION ENTRY POINT
// =============================================================================

export async function promoteRuntimeKnowledgeToLetta(input: {
  tenantId: string;
  targetAgent: TargetAgent;
  domain: KnowledgeDomain;
  limit?: number;
}): Promise<{ promotionIds: string[]; promotedClaimIds: string[] }> {
  const { tenantId, targetAgent, domain, limit = 5 } = input;
  const promotionIds: string[] = [];
  const promotedClaimIds: string[] = [];

  try {
    // 1. Retrieve eligible claims
    const results = await searchKnowledge({
      tenantId,
      query: domainToQuery(domain),
      domain,
      minConfidence: 0.85,
      state: ['verified_fact'],
      lookbackDays: 14,
      limit,
    });

    if (results.length === 0) {
      logger.info('[KE/letta-promo] No eligible claims to promote', { tenantId, targetAgent, domain });
      return { promotionIds: [], promotedClaimIds: [] };
    }

    // 2. Load full claims to check eligibility
    const targetBlock = resolveTargetBlock(targetAgent, domain);
    const lettaBlock = resolveLettaBlockLabel(targetBlock);

    // 3. Format payload
    const summary = buildSummary(results, domain);
    const actions = buildActions(results, targetAgent);

    const isPlaybookDomain = domain === 'welcome_playbooks' || domain === 'checkin_flow' || domain === 'playbook_420';
    const payload = isPlaybookDomain
      ? formatPlaybookContextPayload({ tenantId, domain, summary, topClaims: results })
      : formatLettaPayload({ domain, summary, topClaims: results, actions });

    if (!payload.trim() || payload === 'No fresh verified runtime knowledge available.') {
      return { promotionIds: [], promotedClaimIds: [] };
    }

    // 4. Write to Letta block (get/create then overwrite with fresh payload)
    const block = await lettaBlockManager.getOrCreateBlock(tenantId, lettaBlock);
    await lettaClient.updateBlock(block.id, payload);

    // 5. Record promotion
    const promoId = await recordRuntimePromotion({
      tenantId,
      targetAgent,
      targetBlock,
      claimIds: results.map(r => r.claimId),
      reason: isPlaybookDomain ? 'playbook_runtime_context' : 'high_confidence_recent',
      payload,
    });
    promotionIds.push(promoId);

    // 6. Mark claims as promoted
    for (const result of results) {
      await markClaimPromoted(result.claimId);
      promotedClaimIds.push(result.claimId);
    }

    logger.info('[KE/letta-promo] Promoted to Letta', {
      tenantId,
      targetAgent,
      domain,
      block: lettaBlock,
      claims: promotedClaimIds.length,
    });

    return { promotionIds, promotedClaimIds };
  } catch (err) {
    // Never fail ingestion — always swallow and log
    logger.warn('[KE/letta-promo] Promotion failed — ingestion continues', {
      tenantId,
      targetAgent,
      domain,
      error: err,
    });
    return { promotionIds: [], promotedClaimIds: [] };
  }
}

// =============================================================================
// MEMORY-BRIDGE EXTENSIONS (exported for use from memory-bridge.ts)
// =============================================================================

export async function promoteKnowledgeSliceToLettaBlocks(input: {
  tenantId: string;
  targetAgent: TargetAgent;
  domain: KnowledgeDomain;
  limit?: number;
}): Promise<KnowledgeRuntimePromotion[]> {
  const { promotionIds } = await promoteRuntimeKnowledgeToLetta(input);
  return []; // Promotion records are in Firestore; return empty array — caller can query if needed
}

export async function buildKnowledgeBackedWorkingSet(input: {
  tenantId: string;
  domain: KnowledgeDomain;
  limit?: number;
}): Promise<{ tenantId: string; domain: KnowledgeDomain; summary: string; topClaims: KnowledgeSearchResult[]; promotedClaimIds: string[] }> {
  const { tenantId, domain, limit = 5 } = input;

  const topClaims = await searchKnowledge({
    tenantId,
    query: domainToQuery(domain),
    domain,
    minConfidence: 0.60,
    state: ['working_fact', 'verified_fact'],
    lookbackDays: 14,
    limit,
  });

  const summary = topClaims.length > 0
    ? buildSummary(topClaims, domain)
    : 'No fresh verified runtime knowledge available.';

  return { tenantId, domain, summary, topClaims, promotedClaimIds: [] };
}

// =============================================================================
// HELPERS
// =============================================================================

function resolveLettaBlockLabel(targetBlock: string): typeof BLOCK_LABELS[keyof typeof BLOCK_LABELS] {
  const mapping: Record<string, typeof BLOCK_LABELS[keyof typeof BLOCK_LABELS]> = {
    executive_workspace: BLOCK_LABELS.EXECUTIVE_WORKSPACE,
    brand_context: BLOCK_LABELS.BRAND_CONTEXT,
    playbook_status: BLOCK_LABELS.PLAYBOOK_STATUS,
    agent_craig_memory: BLOCK_LABELS.AGENT_CRAIG,
    agent_ezal_memory: BLOCK_LABELS.AGENT_EZAL,
  };
  return mapping[targetBlock] ?? BLOCK_LABELS.BRAND_CONTEXT;
}

function domainToQuery(domain: KnowledgeDomain): string {
  const queries: Record<KnowledgeDomain, string> = {
    competitive_intel: 'competitor promotions price changes product launches market threats',
    campaign_history: 'campaign performance patterns audience engagement conversion outcomes',
    welcome_playbooks: 'welcome playbook customer onboarding flow performance patterns',
    checkin_flow: 'check-in flow returning customer engagement loyalty patterns',
    playbook_420: '420 promotion campaign cannabis holiday engagement outcomes',
  };
  return queries[domain];
}

function buildSummary(results: KnowledgeSearchResult[], domain: KnowledgeDomain): string {
  const verified = results.filter(r => r.state === 'verified_fact').length;
  const working = results.filter(r => r.state === 'working_fact').length;

  return (
    `${verified} verified + ${working} working fact(s) for ${domain}. ` +
    (results[0] ? `Key: ${results[0].text.slice(0, 120)}` : '')
  );
}

function buildActions(results: KnowledgeSearchResult[], targetAgent: TargetAgent): string[] {
  const actions: string[] = [];
  for (const result of results.slice(0, 3)) {
    if (result.state === 'verified_fact' && result.confidenceScore >= 0.85) {
      actions.push(agentAction(targetAgent, result.text));
    }
  }
  return actions;
}

function agentAction(agent: TargetAgent, claimText: string): string {
  const snippet = claimText.slice(0, 80);
  switch (agent) {
    case 'craig': return `Review campaign implications: ${snippet}`;
    case 'ezal': return `Verify and expand on: ${snippet}`;
    case 'marty': return `Briefing update: ${snippet}`;
    default: return `Action required: ${snippet}`;
  }
}
