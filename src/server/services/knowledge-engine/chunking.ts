/**
 * Knowledge Engine — Chunking
 *
 * Prepares Firestore knowledge objects as flat LanceDB rows for vector search.
 * Follows the flat-schema constraint: no nested objects.
 */

import type {
  KnowledgeClaim,
  KnowledgeObservation,
  KnowledgeSource,
  KnowledgeDomain,
  KnowledgeChunkRow,
  KnowledgeEntityIndexRow,
  KnowledgeEntity,
} from './types';
import { computeRecencyScore } from './scoring';
import { generateKnowledgeId } from './ontology';

// =============================================================================
// CLAIM → CHUNK
// =============================================================================

export function chunkClaim(
  claim: KnowledgeClaim,
  domain: KnowledgeDomain,
  sourceTitles: string[],
  vector: number[]
): KnowledgeChunkRow {
  const observedAt = claim.createdAt.toDate();
  const recencyScore = computeRecencyScore(observedAt);

  return {
    id: generateKnowledgeId('chunk'),
    tenantId: claim.tenantId,
    chunkType: 'claim',
    entityIds: JSON.stringify(claim.entityIds),
    claimIds: JSON.stringify([claim.id]),
    sourceIds: JSON.stringify(claim.sourceIds),
    text: buildClaimChunkText(claim, sourceTitles),
    vector,
    confidenceScore: claim.confidenceScore,
    state: claim.state,
    domain,
    recencyScore,
    createdAtIso: observedAt.toISOString(),
  };
}

function buildClaimChunkText(claim: KnowledgeClaim, sourceTitles: string[]): string {
  const sourceNote = sourceTitles.length > 0 ? ` [Source: ${sourceTitles[0]}]` : '';
  return `${claim.claimText}${sourceNote} | Confidence: ${(claim.confidenceScore * 100).toFixed(0)}%`;
}

// =============================================================================
// OBSERVATION → CHUNK
// =============================================================================

export function chunkObservation(
  obs: KnowledgeObservation,
  domain: KnowledgeDomain,
  vector: number[]
): KnowledgeChunkRow {
  const observedAt = obs.observedAt.toDate();
  const recencyScore = computeRecencyScore(observedAt);

  return {
    id: generateKnowledgeId('chunk'),
    tenantId: obs.tenantId,
    chunkType: 'observation',
    entityIds: JSON.stringify(obs.entityIds),
    claimIds: JSON.stringify([]),
    sourceIds: JSON.stringify([obs.sourceId]),
    text: `${obs.title}: ${obs.summary}`,
    vector,
    confidenceScore: 0.5, // observations don't have confidence until elevated to claims
    state: 'signal',
    domain,
    recencyScore,
    createdAtIso: observedAt.toISOString(),
  };
}

// =============================================================================
// SOURCE EXCERPT → CHUNK
// =============================================================================

export function chunkSourceExcerpt(
  source: KnowledgeSource,
  excerpt: string,
  domain: KnowledgeDomain,
  vector: number[]
): KnowledgeChunkRow {
  const observedAt = source.observedAt.toDate();
  const recencyScore = computeRecencyScore(observedAt);

  return {
    id: generateKnowledgeId('chunk'),
    tenantId: source.tenantId,
    chunkType: 'source_excerpt',
    entityIds: JSON.stringify([]),
    claimIds: JSON.stringify([]),
    sourceIds: JSON.stringify([source.id]),
    text: excerpt,
    vector,
    confidenceScore: trustClassToScore(source.trustClass),
    state: 'signal',
    domain,
    recencyScore,
    createdAtIso: observedAt.toISOString(),
  };
}

function trustClassToScore(trustClass: KnowledgeSource['trustClass']): number {
  const scores: Record<string, number> = {
    first_party: 0.85,
    trusted_external: 0.70,
    external: 0.55,
    agent_generated: 0.45,
  };
  return scores[trustClass] ?? 0.50;
}

// =============================================================================
// ENTITY → INDEX ROW
// =============================================================================

export function indexEntity(
  entity: KnowledgeEntity,
  vector: number[]
): KnowledgeEntityIndexRow {
  const text = [
    entity.name,
    entity.entityType,
    ...entity.tags,
    ...Object.values(entity.metadata ?? {}).filter(v => typeof v === 'string'),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: entity.id,
    tenantId: entity.tenantId,
    entityType: entity.entityType,
    canonicalName: entity.canonicalName,
    text,
    vector,
    tags: JSON.stringify(entity.tags),
    createdAtIso: entity.createdAt.toDate().toISOString(),
  };
}

// =============================================================================
// PLAYBOOK CONTEXT → CHUNK
// =============================================================================

export function chunkPlaybookContext(input: {
  tenantId: string;
  playbookId: string;
  flowType: string;
  summary: string;
  domain: KnowledgeDomain;
  vector: number[];
}): KnowledgeChunkRow {
  return {
    id: generateKnowledgeId('chunk'),
    tenantId: input.tenantId,
    chunkType: 'playbook_context',
    entityIds: JSON.stringify([input.playbookId]),
    claimIds: JSON.stringify([]),
    sourceIds: JSON.stringify([]),
    text: `[${input.flowType}] ${input.summary}`,
    vector: input.vector,
    confidenceScore: 0.75,
    state: 'working_fact',
    domain: input.domain,
    recencyScore: 1.0,
    createdAtIso: new Date().toISOString(),
  };
}
