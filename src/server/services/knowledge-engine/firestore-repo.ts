/**
 * Knowledge Engine — Firestore Repository
 *
 * CRUD for all 8 knowledge collections. Every write enforces tenantId scoping.
 * Uses getAdminFirestore() per existing project patterns.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { KE_COLLECTIONS } from './constants';
import {
  generateKnowledgeId,
  toCanonicalName,
  entityDedupKey,
  edgeDedupKey,
  computeSourceChecksum,
} from './ontology';
import type {
  KnowledgeEntity,
  KnowledgeSource,
  KnowledgeObservation,
  KnowledgeClaim,
  KnowledgeEdge,
  KnowledgeIngestionRun,
  KnowledgeRuntimePromotion,
  KnowledgeAlert,
  EntityType,
  ClaimState,
  ImpactLevel,
} from './types';

// =============================================================================
// ENTITIES
// =============================================================================

/**
 * Upsert a knowledge entity. Deduplicates by (tenantId, entityType, canonicalName).
 * Returns the existing or newly created entity id.
 */
export async function upsertEntity(input: {
  tenantId: string;
  entityType: EntityType;
  name: string;
  externalRef?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  sourceId: string;
}): Promise<string> {
  const db = getAdminFirestore();
  const canonicalName = toCanonicalName(input.name);

  // Check for existing entity
  const existing = await db
    .collection(KE_COLLECTIONS.ENTITIES)
    .where('tenantId', '==', input.tenantId)
    .where('entityType', '==', input.entityType)
    .where('canonicalName', '==', canonicalName)
    .limit(1)
    .get();

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    // Update sourceIds and updatedAt
    await db.collection(KE_COLLECTIONS.ENTITIES).doc(docId).update({
      sourceIds: FieldValue.arrayUnion(input.sourceId),
      updatedAt: Timestamp.now(),
    });
    return docId;
  }

  const id = generateKnowledgeId('ke');
  const entity: KnowledgeEntity = {
    id,
    tenantId: input.tenantId,
    entityType: input.entityType,
    name: input.name,
    canonicalName,
    externalRef: input.externalRef,
    status: 'active',
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    sourceIds: [input.sourceId],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection(KE_COLLECTIONS.ENTITIES).doc(id).set(entity);
  return id;
}

export async function getEntitiesByIds(
  tenantId: string,
  ids: string[]
): Promise<KnowledgeEntity[]> {
  if (ids.length === 0) return [];
  const db = getAdminFirestore();
  const chunks = chunkArray(ids, 10);
  const results: KnowledgeEntity[] = [];

  for (const chunk of chunks) {
    const snap = await db
      .collection(KE_COLLECTIONS.ENTITIES)
      .where('tenantId', '==', tenantId)
      .where('id', 'in', chunk)
      .get();
    snap.docs.forEach(d => results.push(d.data() as KnowledgeEntity));
  }
  return results;
}

// =============================================================================
// SOURCES
// =============================================================================

/**
 * Create a source, skipping if the checksum already exists (dedup).
 * Returns { id, isDuplicate }.
 */
export async function createSourceIfNew(input: {
  tenantId: string;
  sourceType: KnowledgeSource['sourceType'];
  title: string;
  sourceRef: string;
  url?: string;
  observedAt: Date;
  trustClass: KnowledgeSource['trustClass'];
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; isDuplicate: boolean }> {
  const db = getAdminFirestore();
  const checksum = computeSourceChecksum(input.tenantId, input.sourceRef, input.content);

  const existing = await db
    .collection(KE_COLLECTIONS.SOURCES)
    .where('tenantId', '==', input.tenantId)
    .where('checksum', '==', checksum)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { id: existing.docs[0].id, isDuplicate: true };
  }

  const id = generateKnowledgeId('ks');
  const source: KnowledgeSource = {
    id,
    tenantId: input.tenantId,
    sourceType: input.sourceType,
    title: input.title,
    sourceRef: input.sourceRef,
    url: input.url,
    observedAt: Timestamp.fromDate(input.observedAt),
    importedAt: Timestamp.now(),
    trustClass: input.trustClass,
    checksum,
    metadata: input.metadata ?? {},
  };

  await db.collection(KE_COLLECTIONS.SOURCES).doc(id).set(source);
  return { id, isDuplicate: false };
}

// =============================================================================
// OBSERVATIONS
// =============================================================================

export async function createObservation(input: {
  tenantId: string;
  sourceId: string;
  observationType: KnowledgeObservation['observationType'];
  title: string;
  summary: string;
  entityIds?: string[];
  rawContent: string;
  observedAt: Date;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const db = getAdminFirestore();
  const id = generateKnowledgeId('ko');
  const observation: KnowledgeObservation = {
    id,
    tenantId: input.tenantId,
    sourceId: input.sourceId,
    observationType: input.observationType,
    title: input.title,
    summary: input.summary,
    entityIds: input.entityIds ?? [],
    rawContent: input.rawContent,
    observedAt: Timestamp.fromDate(input.observedAt),
    createdBy: input.createdBy,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection(KE_COLLECTIONS.OBSERVATIONS).doc(id).set(observation);
  return id;
}

// =============================================================================
// CLAIMS
// =============================================================================

export async function createClaim(claim: Omit<KnowledgeClaim, 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = getAdminFirestore();
  const id = claim.id || generateKnowledgeId('kc');
  const doc: KnowledgeClaim = {
    ...claim,
    id,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  await db.collection(KE_COLLECTIONS.CLAIMS).doc(id).set(doc);
  return id;
}

export async function updateClaim(
  claimId: string,
  updates: Partial<KnowledgeClaim>
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(KE_COLLECTIONS.CLAIMS).doc(claimId).update({
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function getClaimsByIds(
  tenantId: string,
  ids: string[]
): Promise<KnowledgeClaim[]> {
  if (ids.length === 0) return [];
  const db = getAdminFirestore();
  const chunks = chunkArray(ids, 10);
  const results: KnowledgeClaim[] = [];
  for (const chunk of chunks) {
    const snap = await db
      .collection(KE_COLLECTIONS.CLAIMS)
      .where('tenantId', '==', tenantId)
      .where('id', 'in', chunk)
      .get();
    snap.docs.forEach(d => results.push(d.data() as KnowledgeClaim));
  }
  return results;
}

export async function getRecentClaims(input: {
  tenantId: string;
  states?: ClaimState[];
  minConfidence?: number;
  impactLevels?: ImpactLevel[];
  lookbackDays?: number;
  limit?: number;
}): Promise<KnowledgeClaim[]> {
  const db = getAdminFirestore();
  const {
    tenantId,
    states = ['working_fact', 'verified_fact'],
    minConfidence = 0.60,
    lookbackDays = 14,
    limit = 20,
  } = input;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let query = db
    .collection(KE_COLLECTIONS.CLAIMS)
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', Timestamp.fromDate(cutoff))
    .orderBy('createdAt', 'desc')
    .limit(limit * 3); // over-fetch to allow client-side confidence filter

  const snap = await query.get();
  return snap.docs
    .map(d => d.data() as KnowledgeClaim)
    .filter(c => states.includes(c.state) && c.confidenceScore >= minConfidence)
    .slice(0, limit);
}

export async function markClaimPromoted(claimId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(KE_COLLECTIONS.CLAIMS).doc(claimId).update({
    promotedToLetta: true,
    promotedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

// =============================================================================
// EDGES
// =============================================================================

/**
 * Create an edge. Deduplicates by (tenantId, fromId, toId, edgeType).
 */
export async function upsertEdge(input: {
  tenantId: string;
  fromId: string;
  toId: string;
  edgeType: KnowledgeEdge['edgeType'];
  strength?: number;
  sourceIds?: string[];
}): Promise<string> {
  const db = getAdminFirestore();
  const dedupKey = edgeDedupKey(input.tenantId, input.fromId, input.toId, input.edgeType);

  const existing = await db
    .collection(KE_COLLECTIONS.EDGES)
    .where('tenantId', '==', input.tenantId)
    .where('fromId', '==', input.fromId)
    .where('toId', '==', input.toId)
    .where('edgeType', '==', input.edgeType)
    .limit(1)
    .get();

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await db.collection(KE_COLLECTIONS.EDGES).doc(docId).update({
      strength: Math.min((existing.docs[0].data().strength ?? 0.5) + 0.05, 1.0),
      updatedAt: Timestamp.now(),
    });
    return docId;
  }

  const id = generateKnowledgeId('kedge');
  const edge: KnowledgeEdge = {
    id,
    tenantId: input.tenantId,
    fromId: input.fromId,
    toId: input.toId,
    edgeType: input.edgeType,
    strength: input.strength ?? 0.5,
    sourceIds: input.sourceIds ?? [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection(KE_COLLECTIONS.EDGES).doc(id).set(edge);
  return id;
}

export async function getEdgesFrom(tenantId: string, fromId: string): Promise<KnowledgeEdge[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection(KE_COLLECTIONS.EDGES)
    .where('tenantId', '==', tenantId)
    .where('fromId', '==', fromId)
    .get();
  return snap.docs.map(d => d.data() as KnowledgeEdge);
}

// =============================================================================
// INGESTION RUNS
// =============================================================================

export async function startIngestionRun(input: {
  tenantId: string;
  pipeline: KnowledgeIngestionRun['pipeline'];
}): Promise<string> {
  const db = getAdminFirestore();
  const id = generateKnowledgeId('krun');
  const run: KnowledgeIngestionRun = {
    id,
    tenantId: input.tenantId,
    pipeline: input.pipeline,
    status: 'running',
    sourceCount: 0,
    observationCount: 0,
    claimCount: 0,
    promotedCount: 0,
    startedAt: Timestamp.now(),
  };
  await db.collection(KE_COLLECTIONS.INGESTION_RUNS).doc(id).set(run);
  return id;
}

export async function completeIngestionRun(
  runId: string,
  counts: { sourceCount: number; observationCount: number; claimCount: number; promotedCount: number }
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(KE_COLLECTIONS.INGESTION_RUNS).doc(runId).update({
    status: 'completed',
    ...counts,
    completedAt: Timestamp.now(),
  });
}

export async function failIngestionRun(runId: string, error: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(KE_COLLECTIONS.INGESTION_RUNS).doc(runId).update({
    status: 'failed',
    error,
    completedAt: Timestamp.now(),
  });
}

// =============================================================================
// RUNTIME PROMOTIONS
// =============================================================================

export async function recordRuntimePromotion(
  promotion: Omit<KnowledgeRuntimePromotion, 'id' | 'createdAt'>
): Promise<string> {
  const db = getAdminFirestore();
  const id = generateKnowledgeId('kpromo');
  const doc: KnowledgeRuntimePromotion = {
    ...promotion,
    id,
    createdAt: Timestamp.now(),
  };
  await db.collection(KE_COLLECTIONS.RUNTIME_PROMOTIONS).doc(id).set(doc);
  return id;
}

// =============================================================================
// ALERTS
// =============================================================================

export async function createAlert(
  alert: Omit<KnowledgeAlert, 'id' | 'createdAt'>
): Promise<string> {
  const db = getAdminFirestore();
  const id = generateKnowledgeId('kalert');
  const doc: KnowledgeAlert = {
    ...alert,
    id,
    createdAt: Timestamp.now(),
  };
  await db.collection(KE_COLLECTIONS.ALERTS).doc(id).set(doc);
  return id;
}

export async function getRecentAlerts(input: {
  tenantId: string;
  severity?: KnowledgeAlert['severity'];
  lookbackDays?: number;
  limit?: number;
}): Promise<KnowledgeAlert[]> {
  const db = getAdminFirestore();
  const { tenantId, severity, lookbackDays = 7, limit = 20 } = input;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  let query = db
    .collection(KE_COLLECTIONS.ALERTS)
    .where('tenantId', '==', tenantId)
    .where('createdAt', '>=', Timestamp.fromDate(cutoff))
    .orderBy('createdAt', 'desc')
    .limit(limit);

  const snap = await query.get();
  const alerts = snap.docs.map(d => d.data() as KnowledgeAlert);

  return severity ? alerts.filter(a => a.severity === severity) : alerts;
}

// =============================================================================
// UTILITIES
// =============================================================================

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
