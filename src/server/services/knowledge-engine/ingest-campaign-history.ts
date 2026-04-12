/**
 * Knowledge Engine — Campaign History Ingestion
 *
 * Converts campaign analytics summaries into structured knowledge claims.
 * Triggers from existing campaign analytics write path, or via daily backfill.
 *
 * Phase 1 claim types:
 * - campaign_pattern (succeeded/underperformed for similar product family)
 * - recommendation (timing or segment associated with better outcomes)
 */

import { logger } from '@/lib/logger';
import {
  createSourceIfNew,
  createObservation,
  createClaim,
  upsertEntity,
  upsertEdge,
  startIngestionRun,
  completeIngestionRun,
  failIngestionRun,
} from './firestore-repo';
import { upsertChunks, embedText } from './lancedb-repo';
import { chunkClaim } from './chunking';
import {
  computeConfidenceScore,
  computeClaimState,
  getConfidenceBand,
  getRecencyBucket,
} from './scoring';
import { validateClaimText, generateKnowledgeId } from './ontology';
import type { IngestResult, KnowledgeClaim } from './types';
import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

export async function ingestCampaignHistoryKnowledge(input: {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  metrics: Record<string, number>;
  summaryText: string;
  observedAt: Date;
}): Promise<Omit<IngestResult, 'sourceId'>> {
  const { tenantId, campaignId, campaignName, metrics, summaryText, observedAt } = input;

  const runId = await startIngestionRun({ tenantId, pipeline: 'campaign_history' });
  const startedAt = Date.now();
  const observationIds: string[] = [];
  const claimIds: string[] = [];

  try {
    // 1. Source
    const sourceResult = await createSourceIfNew({
      tenantId,
      sourceType: 'campaign_record',
      title: `Campaign: ${campaignName}`,
      sourceRef: campaignId,
      observedAt,
      trustClass: 'first_party',
      content: summaryText,
      metadata: { metrics },
    });

    if (sourceResult.isDuplicate) {
      await completeIngestionRun(runId, { sourceCount: 0, observationCount: 0, claimCount: 0, promotedCount: 0 });
      return { observationIds: [], claimIds: [] };
    }

    // 2. Campaign entity
    const campaignEntityId = await upsertEntity({
      tenantId,
      entityType: 'campaign',
      name: campaignName,
      externalRef: campaignId,
      sourceId: sourceResult.id,
      metadata: { metrics },
    });

    // 3. Observation
    const obsId = await createObservation({
      tenantId,
      sourceId: sourceResult.id,
      observationType: 'campaign_outcome',
      title: `Campaign outcome: ${campaignName}`,
      summary: summaryText.slice(0, 300),
      entityIds: [campaignEntityId],
      rawContent: summaryText,
      observedAt,
      createdBy: 'system',
      tags: ['campaign', 'history'],
    });
    observationIds.push(obsId);

    // 4. Extract claims from metrics + summary
    const ageDays = (Date.now() - observedAt.getTime()) / (1000 * 60 * 60 * 24);
    const performance = assessPerformance(metrics);
    const claimText = buildCampaignClaimText(campaignName, performance, metrics, summaryText);

    const confidence = computeConfidenceScore({
      trustClass: 'first_party',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: true,
      contradictionCount: 0,
      ageDays,
    });

    const state = computeClaimState({
      confidenceScore: confidence,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: true,
      contradicted: false,
      dismissed: false,
    });

    const claimId = generateKnowledgeId('kc');
    const claim: Omit<KnowledgeClaim, 'createdAt' | 'updatedAt'> = {
      id: claimId,
      tenantId,
      entityIds: [campaignEntityId],
      observationIds: [obsId],
      sourceIds: [sourceResult.id],
      claimType: 'campaign_pattern',
      claimText: validateClaimText(claimText),
      state,
      confidenceScore: confidence,
      confidenceBand: getConfidenceBand(confidence),
      evidenceType: 'first_party_system',
      recencyBucket: getRecencyBucket(observedAt),
      impactLevel: performance === 'succeeded' ? 'high' : performance === 'underperformed' ? 'medium' : 'low',
      promotedToLetta: false,
      contradictedByClaimIds: [],
    };

    await createClaim(claim);
    claimIds.push(claimId);

    await upsertEdge({
      tenantId,
      fromId: obsId,
      toId: claimId,
      edgeType: 'supports_claim',
      sourceIds: [sourceResult.id],
    });

    // 5. LanceDB chunk
    try {
      const vector = await embedText(claim.claimText);
      const chunk = chunkClaim(
        { ...claim, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
        'campaign_history',
        [campaignName],
        vector
      );
      await upsertChunks(tenantId, [chunk]);
    } catch (embedErr) {
      logger.warn('[KE/ingest-campaign] Embed failed', { claimId, error: embedErr });
    }

    const durationMs = Date.now() - startedAt;
    await completeIngestionRun(runId, {
      sourceCount: 1,
      observationCount: observationIds.length,
      claimCount: claimIds.length,
      promotedCount: 0,
    });

    logger.info('[KE/ingest-campaign] Complete', { tenantId, campaignId, claims: claimIds.length, durationMs });
    return { observationIds, claimIds };
  } catch (err) {
    await failIngestionRun(runId, String(err));
    logger.error('[KE/ingest-campaign] Failed', { tenantId, campaignId, error: err });
    throw err;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function assessPerformance(metrics: Record<string, number>): 'succeeded' | 'underperformed' | 'neutral' {
  const conversionRate = metrics['conversionRate'] ?? metrics['conversion_rate'];
  const openRate = metrics['openRate'] ?? metrics['open_rate'];
  const roi = metrics['roi'];

  if (roi !== undefined) {
    if (roi >= 2.0) return 'succeeded';
    if (roi < 0.5) return 'underperformed';
  }

  if (conversionRate !== undefined) {
    if (conversionRate >= 0.05) return 'succeeded';
    if (conversionRate < 0.01) return 'underperformed';
  }

  if (openRate !== undefined) {
    if (openRate >= 0.25) return 'succeeded';
    if (openRate < 0.10) return 'underperformed';
  }

  return 'neutral';
}

function buildCampaignClaimText(
  campaignName: string,
  performance: string,
  metrics: Record<string, number>,
  summary: string
): string {
  const summarySnippet = summary.slice(0, 150).trim();
  if (performance !== 'neutral') {
    return `Campaign "${campaignName}" ${performance}: ${summarySnippet}`;
  }
  return `Campaign "${campaignName}" results recorded: ${summarySnippet}`;
}
