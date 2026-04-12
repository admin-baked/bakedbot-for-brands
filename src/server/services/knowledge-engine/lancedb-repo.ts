/**
 * Knowledge Engine — LanceDB Repository
 *
 * Vector storage for knowledge chunks and entity index.
 * Reuses GCS connection pattern from src/server/services/ezal/lancedb-store.ts.
 * Storage: local /tmp for dev, gs://bakedbot-lancedb/knowledge for production.
 */

import * as lancedb from '@lancedb/lancedb';
import { logger } from '@/lib/logger';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import { KE_LANCE_TABLES } from './constants';
import type { KnowledgeChunkRow, KnowledgeEntityIndexRow } from './types';

// =============================================================================
// CONNECTION — mirrors ezal/lancedb-store.ts pattern
// =============================================================================

const LANCEDB_URI = process.env.LANCEDB_URI || '/tmp/bakedbot-lancedb';

let _connection: lancedb.Connection | null = null;

function buildStorageOptions(): Record<string, string> | undefined {
  if (!LANCEDB_URI.startsWith('gs://')) return undefined;
  // Firebase App Hosting provides ADC automatically.
  // LanceDB's object_store reads GOOGLE_APPLICATION_CREDENTIALS from env.
  return { timeout: '30s' };
}

async function getConnection(): Promise<lancedb.Connection> {
  if (_connection) return _connection;
  const storageOptions = buildStorageOptions();
  _connection = await lancedb.connect(
    LANCEDB_URI,
    storageOptions ? { storageOptions } : undefined
  );
  logger.info('[KnowledgeEngine/LanceDB] Connected', {
    uri: LANCEDB_URI,
    gcs: LANCEDB_URI.startsWith('gs://'),
  });
  return _connection;
}

const EMBEDDING_DIM = 768;

// =============================================================================
// CHUNKS TABLE
// =============================================================================

async function getOrCreateChunksTable(
  tenantId: string
): Promise<lancedb.Table> {
  const conn = await getConnection();
  const tableName = KE_LANCE_TABLES.chunks(tenantId);

  try {
    return await conn.openTable(tableName);
  } catch {
    // Table doesn't exist yet — create with a seed record
    const seed: KnowledgeChunkRow = {
      id: '_seed',
      tenantId,
      chunkType: 'claim',
      entityIds: '[]',
      claimIds: '[]',
      sourceIds: '[]',
      text: '',
      vector: new Array(EMBEDDING_DIM).fill(0),
      confidenceScore: 0,
      state: 'signal',
      domain: 'competitive_intel',
      recencyScore: 0,
      createdAtIso: new Date().toISOString(),
    };
    const table = await conn.createTable(tableName, [seed]);
    // Remove seed row
    await table.delete('id = "_seed"');
    return table;
  }
}

export async function upsertChunks(
  tenantId: string,
  rows: KnowledgeChunkRow[]
): Promise<void> {
  if (rows.length === 0) return;
  const table = await getOrCreateChunksTable(tenantId);
  await table.add(rows);
  logger.info('[KnowledgeEngine/LanceDB] Upserted chunks', {
    tenantId,
    count: rows.length,
  });
}

export async function searchChunks(input: {
  tenantId: string;
  queryVector: number[];
  limit?: number;
  minConfidence?: number;
  domainFilter?: string;
  stateFilter?: string[];
}): Promise<KnowledgeChunkRow[]> {
  const {
    tenantId,
    queryVector,
    limit = 10,
    minConfidence = 0.60,
    domainFilter,
    stateFilter,
  } = input;

  try {
    const table = await getOrCreateChunksTable(tenantId);
    let query = table.vectorSearch(queryVector).limit(limit * 3);

    const results = await query.toArray();

    return results
      .filter((r: Record<string, unknown>) => {
        if (r['tenantId'] !== tenantId) return false;
        if (typeof r['confidenceScore'] === 'number' && r['confidenceScore'] < minConfidence) return false;
        if (domainFilter && r['domain'] !== domainFilter) return false;
        if (stateFilter && stateFilter.length > 0 && !stateFilter.includes(r['state'] as string)) return false;
        return true;
      })
      .slice(0, limit)
      .map(r => ({
        id: r['id'] as string,
        tenantId: r['tenantId'] as string,
        chunkType: r['chunkType'] as KnowledgeChunkRow['chunkType'],
        entityIds: r['entityIds'] as string,
        claimIds: r['claimIds'] as string,
        sourceIds: r['sourceIds'] as string,
        text: r['text'] as string,
        vector: r['vector'] as number[],
        confidenceScore: r['confidenceScore'] as number,
        state: r['state'] as string,
        domain: r['domain'] as string,
        recencyScore: r['recencyScore'] as number,
        createdAtIso: r['createdAtIso'] as string,
        _distance: r['_distance'] as number | undefined,
      })) as KnowledgeChunkRow[];
  } catch (err) {
    logger.warn('[KnowledgeEngine/LanceDB] searchChunks failed — falling back to empty', {
      tenantId,
      error: err,
    });
    return [];
  }
}

// =============================================================================
// ENTITY INDEX TABLE
// =============================================================================

async function getOrCreateEntityIndexTable(
  tenantId: string
): Promise<lancedb.Table> {
  const conn = await getConnection();
  const tableName = KE_LANCE_TABLES.entitiesIndex(tenantId);

  try {
    return await conn.openTable(tableName);
  } catch {
    const seed: KnowledgeEntityIndexRow = {
      id: '_seed',
      tenantId,
      entityType: 'brand',
      canonicalName: '',
      text: '',
      vector: new Array(EMBEDDING_DIM).fill(0),
      tags: '[]',
      createdAtIso: new Date().toISOString(),
    };
    const table = await conn.createTable(tableName, [seed]);
    await table.delete('id = "_seed"');
    return table;
  }
}

export async function upsertEntityIndex(
  tenantId: string,
  rows: KnowledgeEntityIndexRow[]
): Promise<void> {
  if (rows.length === 0) return;
  const table = await getOrCreateEntityIndexTable(tenantId);
  await table.add(rows);
}

export async function searchEntityIndex(input: {
  tenantId: string;
  queryVector: number[];
  entityTypes?: string[];
  limit?: number;
}): Promise<KnowledgeEntityIndexRow[]> {
  const { tenantId, queryVector, entityTypes, limit = 5 } = input;

  try {
    const table = await getOrCreateEntityIndexTable(tenantId);
    const results = await table.vectorSearch(queryVector).limit(limit * 2).toArray();

    return results
      .filter((r: Record<string, unknown>) => {
        if (r['tenantId'] !== tenantId) return false;
        if (entityTypes && entityTypes.length > 0 && !entityTypes.includes(r['entityType'] as string)) return false;
        return true;
      })
      .slice(0, limit)
      .map(r => ({
        id: r['id'] as string,
        tenantId: r['tenantId'] as string,
        entityType: r['entityType'] as string,
        canonicalName: r['canonicalName'] as string,
        text: r['text'] as string,
        vector: r['vector'] as number[],
        tags: r['tags'] as string,
        createdAtIso: r['createdAtIso'] as string,
      })) as KnowledgeEntityIndexRow[];
  } catch (err) {
    logger.warn('[KnowledgeEngine/LanceDB] searchEntityIndex failed', { tenantId, error: err });
    return [];
  }
}

// =============================================================================
// EMBEDDING HELPER
// =============================================================================

export async function embedText(text: string): Promise<number[]> {
  return generateEmbedding(text);
}
