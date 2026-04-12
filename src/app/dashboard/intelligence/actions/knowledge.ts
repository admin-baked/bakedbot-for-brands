'use server';

/**
 * Intelligence Dashboard — Knowledge Engine Server Actions
 *
 * Server-side data fetching for knowledge change feed, confidence panel, and recommendations.
 */

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  searchKnowledge,
  getRecentAlerts,
  getRecentClaims,
} from '@/server/services/knowledge-engine';
import type { KnowledgeSearchResult, KnowledgeAlert } from '@/server/services/knowledge-engine';

// =============================================================================
// CHANGE FEED
// =============================================================================

export async function getKnowledgeChangeFeed(input: {
  tenantId: string;
  domain: 'competitive_intel' | 'campaign_history';
  limit?: number;
}): Promise<KnowledgeSearchResult[]> {
  try {
    return await searchKnowledge({
      tenantId: input.tenantId,
      query: 'recent competitive changes campaign patterns market signals',
      domain: input.domain,
      minConfidence: 0.45,
      state: ['signal', 'working_fact', 'verified_fact'],
      lookbackDays: 14,
      limit: input.limit ?? 10,
    });
  } catch (err) {
    logger.error('[intelligence/knowledge] getKnowledgeChangeFeed failed', { error: err });
    return [];
  }
}

// =============================================================================
// CONFIDENCE PANEL
// =============================================================================

export interface KnowledgeConfidenceSummary {
  averageConfidence: number;
  verifiedCount: number;
  workingFactCount: number;
  signalCount: number;
}

export async function getKnowledgeConfidenceSummary(tenantId: string): Promise<KnowledgeConfidenceSummary> {
  try {
    const claims = await getRecentClaims({
      tenantId,
      states: ['signal', 'working_fact', 'verified_fact'],
      minConfidence: 0,
      lookbackDays: 30,
      limit: 100,
    });

    const verified = claims.filter(c => c.state === 'verified_fact');
    const working = claims.filter(c => c.state === 'working_fact');
    const signals = claims.filter(c => c.state === 'signal');

    const avgConfidence =
      claims.length > 0
        ? claims.reduce((sum, c) => sum + c.confidenceScore, 0) / claims.length
        : 0;

    return {
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      verifiedCount: verified.length,
      workingFactCount: working.length,
      signalCount: signals.length,
    };
  } catch (err) {
    logger.error('[intelligence/knowledge] getKnowledgeConfidenceSummary failed', { error: err });
    return { averageConfidence: 0, verifiedCount: 0, workingFactCount: 0, signalCount: 0 };
  }
}

// =============================================================================
// ACTION RECOMMENDATIONS
// =============================================================================

export async function getKnowledgeActionRecommendations(input: {
  tenantId: string;
  limit?: number;
}): Promise<KnowledgeSearchResult[]> {
  try {
    return await searchKnowledge({
      tenantId: input.tenantId,
      query: 'competitive threats campaign opportunities playbook improvements actions needed',
      minConfidence: 0.70,
      state: ['working_fact', 'verified_fact'],
      lookbackDays: 14,
      limit: input.limit ?? 5,
    });
  } catch (err) {
    logger.error('[intelligence/knowledge] getKnowledgeActionRecommendations failed', { error: err });
    return [];
  }
}

// =============================================================================
// ALERTS (for side panel)
// =============================================================================

export async function getIntelligenceKnowledgeAlerts(tenantId: string): Promise<KnowledgeAlert[]> {
  try {
    return await getRecentAlerts({ tenantId, lookbackDays: 7, limit: 10 });
  } catch (err) {
    logger.error('[intelligence/knowledge] getIntelligenceKnowledgeAlerts failed', { error: err });
    return [];
  }
}
