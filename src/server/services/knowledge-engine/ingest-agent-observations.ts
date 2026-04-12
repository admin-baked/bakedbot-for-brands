/**
 * Knowledge Engine — Agent Observation Ingestion
 *
 * Allows Ezal, Craig, and Marty to save structured observations to the knowledge engine.
 * Agent-authored notes enter as low-confidence signals and are promoted if corroborated.
 */

import { logger } from '@/lib/logger';
import {
  createSourceIfNew,
  createObservation,
  createClaim,
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

export async function ingestAgentObservation(input: {
  tenantId: string;
  agentId: 'ezal' | 'craig' | 'marty';
  domain: KnowledgeDomain;
  title: string;
  observation: string;
  entityIds?: string[];
  impactLevel?: KnowledgeClaim['impactLevel'];
  observedAt?: Date;
}): Promise<Omit<IngestResult, 'sourceId'>> {
  const {
    tenantId,
    agentId,
    domain,
    title,
    observation,
    entityIds = [],
    impactLevel = 'medium',
    observedAt = new Date(),
  } = input;

  const runId = await startIngestionRun({ tenantId, pipeline: 'agent_observations' });
  const startedAt = Date.now();
  const observationIds: string[] = [];
  const claimIds: string[] = [];

  try {
    // 1. Source
    const sourceRef = `${agentId}::${tenantId}::${observedAt.toISOString()}`;
    const sourceResult = await createSourceIfNew({
      tenantId,
      sourceType: 'agent_observation',
      title: `Agent observation by ${agentId}: ${title}`,
      sourceRef,
      observedAt,
      trustClass: 'agent_generated',
      content: observation,
      metadata: { agentId, domain },
    });

    if (sourceResult.isDuplicate) {
      await completeIngestionRun(runId, { sourceCount: 0, observationCount: 0, claimCount: 0, promotedCount: 0 });
      return { observationIds: [], claimIds: [] };
    }

    // 2. Observation
    const obsId = await createObservation({
      tenantId,
      sourceId: sourceResult.id,
      observationType: 'agent_note',
      title,
      summary: observation.slice(0, 300),
      entityIds,
      rawContent: observation,
      observedAt,
      createdBy: agentId,
      tags: [agentId, domain],
    });
    observationIds.push(obsId);

    // 3. Claim — agent observations always start as signals
    const ageDays = 0; // fresh
    const confidence = computeConfidenceScore({
      trustClass: 'agent_generated',
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmation: false,
      contradictionCount: 0,
      ageDays,
    });

    const state = computeClaimState({
      confidenceScore: confidence,
      sourceCount: 1,
      repeatedAcrossRuns: false,
      firstPartyConfirmed: false,
      contradicted: false,
      dismissed: false,
    });

    const claimId = generateKnowledgeId('kc');
    const claim: Omit<KnowledgeClaim, 'createdAt' | 'updatedAt'> = {
      id: claimId,
      tenantId,
      entityIds,
      observationIds: [obsId],
      sourceIds: [sourceResult.id],
      claimType: 'recommendation',
      claimText: validateClaimText(`[${agentId}] ${observation}`),
      state,
      confidenceScore: confidence,
      confidenceBand: getConfidenceBand(confidence),
      evidenceType: 'inferred',
      recencyBucket: getRecencyBucket(observedAt),
      impactLevel,
      promotedToLetta: false,
      contradictedByClaimIds: [],
    };

    await createClaim(claim);
    claimIds.push(claimId);

    // 4. LanceDB chunk
    try {
      const vector = await embedText(claim.claimText);
      const chunk = chunkClaim(
        { ...claim, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
        domain,
        [`Agent: ${agentId}`],
        vector
      );
      await upsertChunks(tenantId, [chunk]);
    } catch (embedErr) {
      logger.warn('[KE/ingest-agent] Embed failed', { claimId, error: embedErr });
    }

    const durationMs = Date.now() - startedAt;
    await completeIngestionRun(runId, {
      sourceCount: 1,
      observationCount: 1,
      claimCount: 1,
      promotedCount: 0,
    });

    logger.info('[KE/ingest-agent] Observation recorded', { tenantId, agentId, domain, durationMs });
    return { observationIds, claimIds };
  } catch (err) {
    await failIngestionRun(runId, String(err));
    logger.error('[KE/ingest-agent] Failed', { tenantId, agentId, error: err });
    throw err;
  }
}
