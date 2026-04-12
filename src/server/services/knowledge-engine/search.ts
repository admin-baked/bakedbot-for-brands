/**
 * Knowledge Engine — Search
 *
 * Retrieval pipeline:
 * 1. Firestore entity exact-match lookup
 * 2. LanceDB claim chunk vector search
 * 3. Firestore edge expansion (1-hop)
 * 4. Blended score ranking
 *
 * Falls back to Firestore-only if LanceDB is unavailable.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { KnowledgeSearchRequest, KnowledgeSearchResult, KnowledgeClaim } from './types';
import { RETRIEVAL_DEFAULTS, KE_COLLECTIONS } from './constants';
import { searchChunks, searchEntityIndex, embedText } from './lancedb-repo';
import { getClaimsByIds, getEntitiesByIds, getEdgesFrom } from './firestore-repo';
import { computeBlendedScore, computeRecencyScore, getImpactWeight } from './scoring';

// =============================================================================
// PRIMARY SEARCH
// =============================================================================

export async function searchKnowledge(
  request: KnowledgeSearchRequest
): Promise<KnowledgeSearchResult[]> {
  const {
    tenantId,
    query,
    domain,
    minConfidence = RETRIEVAL_DEFAULTS.MIN_CONFIDENCE,
    state = ['working_fact', 'verified_fact'],
    lookbackDays = domain === 'welcome_playbooks' || domain === 'checkin_flow'
      ? RETRIEVAL_DEFAULTS.PLAYBOOK_LOOKBACK_DAYS
      : RETRIEVAL_DEFAULTS.LOOKBACK_DAYS,
    limit = RETRIEVAL_DEFAULTS.LIMIT,
  } = request;

  try {
    // Step 1: embed the query
    const queryVector = await embedText(query);

    // Step 2: LanceDB vector search
    const chunks = await searchChunks({
      tenantId,
      queryVector,
      limit: limit * 2,
      minConfidence,
      domainFilter: domain,
      stateFilter: state,
    });

    // Collect claimIds from chunks
    const claimIdSet = new Set<string>();
    for (const chunk of chunks) {
      const ids = safeParseJson<string[]>(chunk.claimIds, []);
      ids.forEach(id => claimIdSet.add(id));
    }

    // Step 3: load claims from Firestore
    const rawClaims = await getClaimsByIds(tenantId, [...claimIdSet]);

    // Step 4: filter by lookback
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);
    const claims = rawClaims.filter(c => c.createdAt.toDate() >= cutoff);

    // Step 5: edge expansion — collect related entity names
    const allEntityIds = new Set<string>(claims.flatMap(c => c.entityIds));
    const entityMap = await loadEntityNames(tenantId, [...allEntityIds]);

    // Step 6: load source titles
    const allSourceIds = new Set<string>(claims.flatMap(c => c.sourceIds));
    const sourceMap = await loadSourceTitles(tenantId, [...allSourceIds]);

    // Step 7: score and rank
    const results: KnowledgeSearchResult[] = claims.map(claim => {
      const chunk = chunks.find(ch => {
        const ids = safeParseJson<string[]>(ch.claimIds, []);
        return ids.includes(claim.id);
      });
      const vectorRelevance = chunk ? Math.max(0, 1 - ((chunk as Record<string, unknown>)['_distance'] as number ?? 0.5)) : 0.5;
      const recencyScore = computeRecencyScore(claim.createdAt.toDate());

      const score = computeBlendedScore({
        vectorRelevance,
        confidenceScore: claim.confidenceScore,
        recencyScore,
        impactLevel: claim.impactLevel,
      });

      return {
        claimId: claim.id,
        text: claim.claimText,
        confidenceScore: claim.confidenceScore,
        state: claim.state,
        sourceTitles: claim.sourceIds.map(id => sourceMap[id] ?? 'Unknown Source'),
        entityNames: claim.entityIds.map(id => entityMap[id] ?? id),
        explanation: buildExplanation(claim),
        score,
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (err) {
    logger.error('[KnowledgeEngine/search] searchKnowledge failed', { tenantId, error: err });
    // Fallback: recent Firestore claims only
    return firestoreFallbackSearch(tenantId, minConfidence, state, lookbackDays, limit);
  }
}

// =============================================================================
// EXECUTIVE BRIEF SEARCH
// =============================================================================

export async function searchKnowledgeForExecutiveBrief(input: {
  tenantId: string;
  lookbackDays: number;
  limit: number;
}): Promise<KnowledgeSearchResult[]> {
  const { tenantId, lookbackDays, limit } = input;

  // For executive brief: prioritize high-impact verified facts across all domains
  return searchKnowledge({
    tenantId,
    query: 'competitive landscape campaign performance playbook outcomes market changes',
    minConfidence: RETRIEVAL_DEFAULTS.MIN_CONFIDENCE,
    state: ['working_fact', 'verified_fact'],
    lookbackDays,
    limit,
  });
}

// =============================================================================
// FIRESTORE FALLBACK
// =============================================================================

async function firestoreFallbackSearch(
  tenantId: string,
  minConfidence: number,
  states: string[],
  lookbackDays: number,
  limit: number
): Promise<KnowledgeSearchResult[]> {
  const db = getAdminFirestore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const snap = await db
    .collection(KE_COLLECTIONS.CLAIMS)
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', Timestamp.fromDate(cutoff))
    .orderBy('createdAt', 'desc')
    .limit(limit * 3)
    .get();

  const claims = snap.docs
    .map(d => d.data() as KnowledgeClaim)
    .filter(c => states.includes(c.state) && c.confidenceScore >= minConfidence)
    .slice(0, limit);

  const allEntityIds = [...new Set(claims.flatMap(c => c.entityIds))];
  const allSourceIds = [...new Set(claims.flatMap(c => c.sourceIds))];
  const [entityMap, sourceMap] = await Promise.all([
    loadEntityNames(tenantId, allEntityIds),
    loadSourceTitles(tenantId, allSourceIds),
  ]);

  return claims.map(claim => ({
    claimId: claim.id,
    text: claim.claimText,
    confidenceScore: claim.confidenceScore,
    state: claim.state,
    sourceTitles: claim.sourceIds.map(id => sourceMap[id] ?? 'Unknown Source'),
    entityNames: claim.entityIds.map(id => entityMap[id] ?? id),
    explanation: buildExplanation(claim),
    score: claim.confidenceScore,
  }));
}

// =============================================================================
// HELPERS
// =============================================================================

async function loadEntityNames(
  tenantId: string,
  entityIds: string[]
): Promise<Record<string, string>> {
  if (entityIds.length === 0) return {};
  const entities = await getEntitiesByIds(tenantId, entityIds);
  return Object.fromEntries(entities.map(e => [e.id, e.name]));
}

async function loadSourceTitles(
  tenantId: string,
  sourceIds: string[]
): Promise<Record<string, string>> {
  if (sourceIds.length === 0) return {};
  const db = getAdminFirestore();
  const chunks = chunkArray(sourceIds, 10);
  const titles: Record<string, string> = {};

  for (const chunk of chunks) {
    const snap = await db
      .collection(KE_COLLECTIONS.SOURCES)
      .where('tenantId', '==', tenantId)
      .where('id', 'in', chunk)
      .get();
    snap.docs.forEach(d => {
      titles[d.id] = (d.data() as Record<string, unknown>)['title'] as string ?? 'Unknown Source';
    });
  }
  return titles;
}

function buildExplanation(claim: KnowledgeClaim): string {
  const stateLabel =
    claim.state === 'verified_fact'
      ? 'Verified fact'
      : claim.state === 'working_fact'
      ? 'Working fact'
      : 'Signal';
  return `${stateLabel} with ${(claim.confidenceScore * 100).toFixed(0)}% confidence from ${claim.sourceIds.length} source(s), observed within ${claim.recencyBucket}.`;
}

function safeParseJson<T>(val: string, fallback: T): T {
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
