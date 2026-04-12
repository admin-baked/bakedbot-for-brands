/**
 * Knowledge Engine — Runtime Context
 *
 * Builds scoped knowledge contexts for playbook runner and competitive intel agents.
 * Consumed by letta-promotion.ts and playbook-runner cron.
 */

import { logger } from '@/lib/logger';
import type { KnowledgeDomain, RuntimeKnowledgeContext } from './types';
import { searchKnowledge } from './search';
import { RETRIEVAL_DEFAULTS } from './constants';

// =============================================================================
// WELCOME PLAYBOOK CONTEXT
// =============================================================================

export async function buildWelcomePlaybookKnowledgeContext(input: {
  tenantId: string;
  flowType: 'checkin' | 'new_customer' | 'returning_customer' | 'welcome' | '420';
  limit?: number;
}): Promise<RuntimeKnowledgeContext> {
  const { tenantId, flowType, limit = RETRIEVAL_DEFAULTS.PLAYBOOK_TOP_CLAIMS } = input;

  const domain: KnowledgeDomain =
    flowType === '420' ? 'playbook_420' :
    flowType === 'checkin' ? 'checkin_flow' :
    'welcome_playbooks';

  const query = buildPlaybookQuery(flowType);

  try {
    const topClaims = await searchKnowledge({
      tenantId,
      query,
      domain,
      minConfidence: RETRIEVAL_DEFAULTS.PLAYBOOK_MIN_CONFIDENCE,
      state: ['working_fact', 'verified_fact'],
      lookbackDays: RETRIEVAL_DEFAULTS.PLAYBOOK_LOOKBACK_DAYS,
      limit,
    });

    if (topClaims.length === 0) {
      return emptyContext(tenantId, domain);
    }

    const summary = buildPlaybookSummary(flowType, topClaims);

    return {
      tenantId,
      domain,
      summary,
      topClaims,
      promotedClaimIds: topClaims.map(c => c.claimId),
    };
  } catch (err) {
    logger.error('[KnowledgeEngine/runtime] buildWelcomePlaybookKnowledgeContext failed', {
      tenantId,
      flowType,
      error: err,
    });
    return emptyContext(tenantId, domain);
  }
}

// =============================================================================
// COMPETITIVE INTEL CONTEXT
// =============================================================================

export async function buildCompetitiveIntelActionContext(input: {
  tenantId: string;
  limit?: number;
}): Promise<RuntimeKnowledgeContext> {
  const { tenantId, limit = RETRIEVAL_DEFAULTS.LIMIT } = input;

  try {
    const topClaims = await searchKnowledge({
      tenantId,
      query: 'competitor promotions price changes product launches competitive threats',
      domain: 'competitive_intel',
      minConfidence: RETRIEVAL_DEFAULTS.MIN_CONFIDENCE,
      state: ['working_fact', 'verified_fact'],
      lookbackDays: RETRIEVAL_DEFAULTS.LOOKBACK_DAYS,
      limit,
    });

    if (topClaims.length === 0) {
      return emptyContext(tenantId, 'competitive_intel');
    }

    const summary = buildCompetitiveSummary(topClaims);

    return {
      tenantId,
      domain: 'competitive_intel',
      summary,
      topClaims,
      promotedClaimIds: topClaims.map(c => c.claimId),
    };
  } catch (err) {
    logger.error('[KnowledgeEngine/runtime] buildCompetitiveIntelActionContext failed', {
      tenantId,
      error: err,
    });
    return emptyContext(tenantId, 'competitive_intel');
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function emptyContext(tenantId: string, domain: KnowledgeDomain): RuntimeKnowledgeContext {
  return {
    tenantId,
    domain,
    summary: 'No fresh verified runtime knowledge available.',
    topClaims: [],
    promotedClaimIds: [],
  };
}

function buildPlaybookQuery(flowType: string): string {
  const queries: Record<string, string> = {
    checkin: 'customer check-in flow performance patterns returning customer behavior',
    new_customer: 'new customer onboarding welcome first visit conversion patterns',
    returning_customer: 'returning customer loyalty repeat visit engagement patterns',
    welcome: 'welcome playbook performance customer acquisition engagement',
    '420': '420 promotion campaign performance cannabis holiday engagement patterns',
  };
  return queries[flowType] ?? 'playbook performance customer flow outcomes';
}

function buildPlaybookSummary(
  flowType: string,
  claims: RuntimeKnowledgeContext['topClaims']
): string {
  const topClaim = claims[0];
  const verifiedCount = claims.filter(c => c.state === 'verified_fact').length;
  return (
    `${verifiedCount} verified pattern(s) for ${flowType} flow. ` +
    (topClaim ? `Key insight: ${topClaim.text}` : '')
  );
}

function buildCompetitiveSummary(
  claims: RuntimeKnowledgeContext['topClaims']
): string {
  const critical = claims.filter(c =>
    c.text.toLowerCase().includes('price') || c.text.toLowerCase().includes('promo')
  );
  if (critical.length > 0) {
    return `${critical.length} competitive movement(s) detected. Most recent: ${critical[0].text}`;
  }
  return `${claims.length} competitive signal(s) observed in the past 14 days.`;
}
