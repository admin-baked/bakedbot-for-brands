/**
 * Knowledge Engine — Playbook Run Ingestion
 *
 * Records playbook execution outcomes as structured knowledge.
 * Called by playbook-runner cron after completing welcome/checkin/returning/420 flows.
 *
 * Phase 1 flow types: checkin, new_customer, returning_customer, welcome, 420
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
import type { IngestResult, KnowledgeClaim, KnowledgeDomain } from './types';
import { Timestamp } from 'firebase-admin/firestore';

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

export async function ingestPlaybookRunKnowledge(input: {
  tenantId: string;
  playbookId: string;
  playbookName: string;
  flowType: 'checkin' | 'new_customer' | 'returning_customer' | 'welcome' | '420';
  runSummary: string;
  metrics: Record<string, number>;
  observedAt: Date;
}): Promise<Omit<IngestResult, 'sourceId'>> {
  const { tenantId, playbookId, playbookName, flowType, runSummary, metrics, observedAt } = input;

  const runId = await startIngestionRun({ tenantId, pipeline: 'playbook_runs' });
  const startedAt = Date.now();
  const observationIds: string[] = [];
  const claimIds: string[] = [];

  try {
    // 1. Source
    const sourceResult = await createSourceIfNew({
      tenantId,
      sourceType: 'playbook_run',
      title: `Playbook run: ${playbookName} (${flowType})`,
      sourceRef: `${playbookId}::${observedAt.toISOString()}`,
      observedAt,
      trustClass: 'first_party',
      content: runSummary,
      metadata: { metrics, flowType },
    });

    if (sourceResult.isDuplicate) {
      await completeIngestionRun(runId, { sourceCount: 0, observationCount: 0, claimCount: 0, promotedCount: 0 });
      return { observationIds: [], claimIds: [] };
    }

    // 2. Playbook entity
    const playbookEntityId = await upsertEntity({
      tenantId,
      entityType: 'playbook',
      name: playbookName,
      externalRef: playbookId,
      sourceId: sourceResult.id,
      tags: [flowType, 'playbook'],
      metadata: { flowType, metrics },
    });

    // 3. Observation
    const obsType = flowTypeToObsType(flowType);
    const obsId = await createObservation({
      tenantId,
      sourceId: sourceResult.id,
      observationType: obsType,
      title: `${playbookName} run — ${flowType}`,
      summary: runSummary.slice(0, 300),
      entityIds: [playbookEntityId],
      rawContent: runSummary,
      observedAt,
      createdBy: 'system',
      tags: ['playbook', flowType],
    });
    observationIds.push(obsId);

    // 4. Claim
    const ageDays = (Date.now() - observedAt.getTime()) / (1000 * 60 * 60 * 24);
    const performance = assessFlowPerformance(metrics, flowType);
    const claimText = buildPlaybookClaimText(playbookName, flowType, performance, runSummary);

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

    const domain: KnowledgeDomain =
      flowType === '420' ? 'playbook_420' :
      flowType === 'checkin' ? 'checkin_flow' :
      'welcome_playbooks';

    const claimId = generateKnowledgeId('kc');
    const claim: Omit<KnowledgeClaim, 'createdAt' | 'updatedAt'> = {
      id: claimId,
      tenantId,
      entityIds: [playbookEntityId],
      observationIds: [obsId],
      sourceIds: [sourceResult.id],
      claimType: 'playbook_pattern',
      claimText: validateClaimText(claimText),
      state,
      confidenceScore: confidence,
      confidenceBand: getConfidenceBand(confidence),
      evidenceType: 'first_party_system',
      recencyBucket: getRecencyBucket(observedAt),
      impactLevel: performance === 'strong' ? 'high' : performance === 'degraded' ? 'high' : 'medium',
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
      const vector = await embedText(claimText);
      const chunk = chunkClaim(
        { ...claim, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
        domain,
        [playbookName],
        vector
      );
      await upsertChunks(tenantId, [chunk]);
    } catch (embedErr) {
      logger.warn('[KE/ingest-playbook] Embed failed', { claimId, error: embedErr });
    }

    const durationMs = Date.now() - startedAt;
    await completeIngestionRun(runId, {
      sourceCount: 1,
      observationCount: observationIds.length,
      claimCount: claimIds.length,
      promotedCount: 0,
    });

    logger.info('[KE/ingest-playbook] Complete', { tenantId, playbookId, flowType, claims: claimIds.length, durationMs });
    return { observationIds, claimIds };
  } catch (err) {
    await failIngestionRun(runId, String(err));
    logger.error('[KE/ingest-playbook] Failed', { tenantId, playbookId, error: err });
    throw err;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function flowTypeToObsType(
  flowType: string
): 'playbook_outcome' | 'customer_flow_outcome' {
  return ['checkin', 'new_customer', 'returning_customer'].includes(flowType)
    ? 'customer_flow_outcome'
    : 'playbook_outcome';
}

type FlowPerformance = 'strong' | 'degraded' | 'normal';

function assessFlowPerformance(
  metrics: Record<string, number>,
  flowType: string
): FlowPerformance {
  const completionRate = metrics['completionRate'] ?? metrics['completion_rate'];
  const conversionRate = metrics['conversionRate'] ?? metrics['conversion_rate'];
  const engagementScore = metrics['engagementScore'] ?? metrics['engagement_score'];

  if (completionRate !== undefined) {
    if (completionRate >= 0.70) return 'strong';
    if (completionRate < 0.30) return 'degraded';
  }

  if (conversionRate !== undefined) {
    if (conversionRate >= 0.10) return 'strong';
    if (conversionRate < 0.02) return 'degraded';
  }

  return 'normal';
}

function buildPlaybookClaimText(
  playbookName: string,
  flowType: string,
  performance: FlowPerformance,
  summary: string
): string {
  const snippit = summary.slice(0, 150).trim();
  const performanceLabel =
    performance === 'strong' ? 'performs well' :
    performance === 'degraded' ? 'shows degraded performance' :
    'shows normal performance';
  return `${flowType} flow (${playbookName}) ${performanceLabel}: ${snippit}`;
}
