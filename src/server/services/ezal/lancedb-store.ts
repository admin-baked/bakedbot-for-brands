/**
 * Ezal LanceDB Store — Competitive Intelligence Vector Storage
 *
 * Replaces Firestore for high-volume competitive intel data:
 *   - competitive_products: Product catalog from competitor scrapes
 *   - price_points: Time-series price history (append-only)
 *   - insights: Semantic-searchable competitive insights
 *
 * Storage: Local disk for dev, GCS (gs://bucket/lancedb) for production.
 * Embeddings: Google text-embedding-004 via existing generateEmbedding().
 *
 * This module is additive — it does NOT replace Firestore for real-time
 * UI data. It's a parallel store optimized for:
 *   1. Semantic search across historical intel
 *   2. Cheap, unbounded time-series storage
 *   3. Built-in versioning (automatic snapshots per scrape cycle)
 */

import * as lancedb from '@lancedb/lancedb';
import { logger } from '@/lib/logger';
import { generateEmbedding } from '@/ai/utils/generate-embedding';
import type {
  CompetitiveProduct,
  PricePoint,
  EzalInsight,
  ProductCategory,
  StrainType,
  InsightType,
  InsightSeverity,
} from '@/types/ezal-discovery';

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

// Local dev: /tmp/bakedbot-lancedb
// Production: gs://bakedbot-lancedb/ezal (set via LANCEDB_URI env var)
const LANCEDB_URI = process.env.LANCEDB_URI || '/tmp/bakedbot-lancedb';

let _connection: lancedb.Connection | null = null;

function buildStorageOptions(): Record<string, string> | undefined {
  // GCS paths (gs://) need service account credentials in production
  if (!LANCEDB_URI.startsWith('gs://')) return undefined;

  // Firebase App Hosting provides GOOGLE_APPLICATION_CREDENTIALS automatically.
  // LanceDB's object_store crate reads ADC (Application Default Credentials)
  // from the environment. No explicit key needed on App Hosting / Cloud Run.
  //
  // For local GCS dev, set GOOGLE_APPLICATION_CREDENTIALS to a service account
  // key file, or use `gcloud auth application-default login`.
  return {
    timeout: '30s',
  };
}

async function getConnection(): Promise<lancedb.Connection> {
  if (_connection && _connection.isOpen()) {
    return _connection;
  }

  const storageOptions = buildStorageOptions();
  _connection = await lancedb.connect(LANCEDB_URI, storageOptions ? { storageOptions } : undefined);
  logger.info('[LanceDB] Connected', { uri: LANCEDB_URI, gcs: LANCEDB_URI.startsWith('gs://') });
  return _connection;
}

// Embedding dimension for text-embedding-004
const EMBEDDING_DIM = 768;

// =============================================================================
// TABLE NAMES (tenant-scoped)
// =============================================================================

function productsTable(tenantId: string): string {
  return `${tenantId}__competitive_products`;
}

function pricePointsTable(tenantId: string): string {
  return `${tenantId}__price_points`;
}

function insightsTable(tenantId: string): string {
  return `${tenantId}__insights`;
}

// =============================================================================
// TYPES — Flat records for LanceDB (no nested objects)
// =============================================================================

interface LanceProduct {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  competitorId: string;
  externalProductId: string;
  brandName: string;
  productName: string;
  category: string;
  strainType: string;
  thcPct: number;
  cbdPct: number;
  priceCurrent: number;
  priceRegular: number;
  inStock: boolean;
  lastSeenAt: string; // ISO timestamp
  firstSeenAt: string;
  lastRunId: string;
  // Searchable text for semantic queries
  searchText: string;
  vector: number[];
}

interface LancePricePoint {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  productId: string;
  competitorId: string;
  brandName: string;
  productName: string;
  price: number;
  regularPrice: number;
  isPromo: boolean;
  capturedAt: string; // ISO timestamp
  runId: string;
}

interface LanceInsight {
  [key: string]: unknown;
  id: string;
  tenantId: string;
  type: string;
  brandName: string;
  competitorId: string;
  competitorProductId: string;
  previousValue: number;
  currentValue: number;
  deltaPercentage: number;
  severity: string;
  jurisdiction: string;
  createdAt: string; // ISO timestamp
  dismissed: boolean;
  // Searchable summary for semantic queries
  summary: string;
  vector: number[];
}

// =============================================================================
// HELPER: Generate search text for a competitive product
// =============================================================================

function buildProductSearchText(product: {
  brandName: string;
  productName: string;
  category: string;
  strainType: string;
  priceCurrent: number;
  competitorId: string;
}): string {
  return [
    product.brandName,
    product.productName,
    product.category,
    product.strainType,
    `$${product.priceCurrent.toFixed(2)}`,
    `competitor:${product.competitorId}`,
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildInsightSummary(insight: {
  type: string;
  brandName: string;
  previousValue?: number;
  currentValue: number;
  deltaPercentage?: number;
  severity: string;
}): string {
  const parts = [insight.type.replace(/_/g, ' '), insight.brandName];
  if (insight.previousValue !== undefined && insight.deltaPercentage !== undefined) {
    parts.push(
      `from $${insight.previousValue.toFixed(2)} to $${(insight.currentValue as number).toFixed(2)}`,
      `${insight.deltaPercentage > 0 ? '+' : ''}${insight.deltaPercentage.toFixed(1)}%`
    );
  }
  parts.push(`severity:${insight.severity}`);
  return parts.join(' | ');
}

// =============================================================================
// ENSURE TABLE EXISTS (create-on-first-write pattern)
// =============================================================================

async function ensureProductsTable(
  db: lancedb.Connection,
  tenantId: string,
  seedRecord: LanceProduct
): Promise<lancedb.Table> {
  const name = productsTable(tenantId);
  const existing = await db.tableNames();
  if (existing.includes(name)) {
    return db.openTable(name);
  }
  return db.createTable(name, [seedRecord], { mode: 'create', existOk: true });
}

async function ensurePricePointsTable(
  db: lancedb.Connection,
  tenantId: string,
  seedRecord: LancePricePoint
): Promise<lancedb.Table> {
  const name = pricePointsTable(tenantId);
  const existing = await db.tableNames();
  if (existing.includes(name)) {
    return db.openTable(name);
  }
  return db.createTable(name, [seedRecord], { mode: 'create', existOk: true });
}

async function ensureInsightsTable(
  db: lancedb.Connection,
  tenantId: string,
  seedRecord: LanceInsight
): Promise<lancedb.Table> {
  const name = insightsTable(tenantId);
  const existing = await db.tableNames();
  if (existing.includes(name)) {
    return db.openTable(name);
  }
  return db.createTable(name, [seedRecord], { mode: 'create', existOk: true });
}

// =============================================================================
// WRITE: Upsert competitive products
// =============================================================================

export async function upsertCompetitiveProducts(
  tenantId: string,
  competitorId: string,
  runId: string,
  products: Array<{
    externalProductId: string;
    brandName: string;
    productName: string;
    category: ProductCategory;
    strainType: StrainType;
    thcPct: number | null;
    cbdPct: number | null;
    price: number;
    regularPrice: number | null;
    inStock: boolean;
  }>
): Promise<{ upserted: number; errors: number }> {
  if (products.length === 0) return { upserted: 0, errors: 0 };

  const db = await getConnection();
  const now = new Date().toISOString();
  let errors = 0;

  // Build records with embeddings
  const records: LanceProduct[] = [];
  for (const p of products) {
    try {
      const searchText = buildProductSearchText({
        brandName: p.brandName,
        productName: p.productName,
        category: p.category,
        strainType: p.strainType,
        priceCurrent: p.price,
        competitorId,
      });
      const vector = await generateEmbedding(searchText);

      records.push({
        id: `${competitorId}__${p.externalProductId}`,
        tenantId,
        competitorId,
        externalProductId: p.externalProductId,
        brandName: p.brandName,
        productName: p.productName,
        category: p.category,
        strainType: p.strainType,
        thcPct: p.thcPct ?? 0,
        cbdPct: p.cbdPct ?? 0,
        priceCurrent: p.price,
        priceRegular: p.regularPrice ?? 0,
        inStock: p.inStock,
        lastSeenAt: now,
        firstSeenAt: now,
        lastRunId: runId,
        searchText,
        vector,
      });
    } catch (err) {
      errors++;
      logger.error('[LanceDB] Failed to embed product', {
        product: p.productName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (records.length === 0) return { upserted: 0, errors };

  try {
    const table = await ensureProductsTable(db, tenantId, records[0]);

    // Use mergeInsert for upsert semantics on the compound key
    await table
      .mergeInsert('id')
      .whenMatchedUpdateAll()
      .whenNotMatchedInsertAll()
      .execute(records);

    logger.info('[LanceDB] Upserted competitive products', {
      tenantId,
      competitorId,
      count: records.length,
    });

    return { upserted: records.length, errors };
  } catch (err) {
    logger.error('[LanceDB] Failed to upsert products', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { upserted: 0, errors: errors + records.length };
  }
}

// =============================================================================
// WRITE: Append price points (time-series, never updated)
// =============================================================================

export async function appendPricePoints(
  tenantId: string,
  points: Array<{
    productId: string;
    competitorId: string;
    brandName: string;
    productName: string;
    price: number;
    regularPrice: number | null;
    isPromo: boolean;
    runId: string;
  }>
): Promise<{ appended: number }> {
  if (points.length === 0) return { appended: 0 };

  const db = await getConnection();
  const now = new Date().toISOString();

  const records: LancePricePoint[] = points.map((p, i) => ({
    id: `${p.runId}__${p.productId}__${i}`,
    tenantId,
    productId: p.productId,
    competitorId: p.competitorId,
    brandName: p.brandName,
    productName: p.productName,
    price: p.price,
    regularPrice: p.regularPrice ?? 0,
    isPromo: p.isPromo,
    capturedAt: now,
    runId: p.runId,
  }));

  try {
    const table = await ensurePricePointsTable(db, tenantId, records[0]);
    await table.add(records);

    logger.info('[LanceDB] Appended price points', {
      tenantId,
      count: records.length,
    });

    return { appended: records.length };
  } catch (err) {
    logger.error('[LanceDB] Failed to append price points', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { appended: 0 };
  }
}

// =============================================================================
// WRITE: Store insights with embeddings
// =============================================================================

export async function storeInsight(
  tenantId: string,
  insight: Omit<EzalInsight, 'id'>
): Promise<string | null> {
  const db = await getConnection();
  const id = `insight__${Date.now()}__${Math.random().toString(36).slice(2, 8)}`;

  try {
    const summary = buildInsightSummary({
      type: insight.type,
      brandName: insight.brandName,
      previousValue: typeof insight.previousValue === 'number' ? insight.previousValue : undefined,
      currentValue: typeof insight.currentValue === 'number' ? insight.currentValue : 0,
      deltaPercentage: insight.deltaPercentage,
      severity: insight.severity,
    });

    const vector = await generateEmbedding(summary);

    const record: LanceInsight = {
      id,
      tenantId,
      type: insight.type,
      brandName: insight.brandName,
      competitorId: insight.competitorId,
      competitorProductId: insight.competitorProductId,
      previousValue: typeof insight.previousValue === 'number' ? insight.previousValue : 0,
      currentValue: typeof insight.currentValue === 'number' ? insight.currentValue : 0,
      deltaPercentage: insight.deltaPercentage ?? 0,
      severity: insight.severity,
      jurisdiction: insight.jurisdiction,
      createdAt: insight.createdAt.toISOString(),
      dismissed: insight.dismissed,
      summary,
      vector,
    };

    const table = await ensureInsightsTable(db, tenantId, record);
    await table.add([record]);

    return id;
  } catch (err) {
    logger.error('[LanceDB] Failed to store insight', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// =============================================================================
// READ: Semantic search across competitive products
// =============================================================================

export interface ProductSearchResult {
  id: string;
  competitorId: string;
  brandName: string;
  productName: string;
  category: string;
  priceCurrent: number;
  inStock: boolean;
  score: number;
}

export async function searchProducts(
  tenantId: string,
  query: string,
  options?: {
    competitorId?: string;
    category?: string;
    inStockOnly?: boolean;
    limit?: number;
  }
): Promise<ProductSearchResult[]> {
  const db = await getConnection();
  const tableName = productsTable(tenantId);

  const existing = await db.tableNames();
  if (!existing.includes(tableName)) {
    return [];
  }

  try {
    const table = await db.openTable(tableName);
    const queryVector = await generateEmbedding(query);

    let search = table.vectorSearch(queryVector).limit(options?.limit ?? 20);

    // Build filter string
    const filters: string[] = [];
    if (options?.competitorId) {
      filters.push(`competitorId = '${options.competitorId}'`);
    }
    if (options?.category) {
      filters.push(`category = '${options.category}'`);
    }
    if (options?.inStockOnly) {
      filters.push('inStock = true');
    }
    if (filters.length > 0) {
      search = search.where(filters.join(' AND '));
    }

    const results = await search
      .select([
        'id',
        'competitorId',
        'brandName',
        'productName',
        'category',
        'priceCurrent',
        'inStock',
        '_distance',
      ])
      .toArray();

    return results.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      competitorId: row.competitorId as string,
      brandName: row.brandName as string,
      productName: row.productName as string,
      category: row.category as string,
      priceCurrent: row.priceCurrent as number,
      inStock: row.inStock as boolean,
      score: row._distance != null ? 1 - (row._distance as number) : 0,
    }));
  } catch (err) {
    logger.error('[LanceDB] Product search failed', {
      tenantId,
      query,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// =============================================================================
// READ: Semantic search across insights
// =============================================================================

export interface InsightSearchResult {
  id: string;
  type: string;
  brandName: string;
  competitorId: string;
  severity: string;
  deltaPercentage: number;
  createdAt: string;
  summary: string;
  score: number;
}

export async function searchInsights(
  tenantId: string,
  query: string,
  options?: {
    severity?: InsightSeverity;
    type?: InsightType;
    limit?: number;
  }
): Promise<InsightSearchResult[]> {
  const db = await getConnection();
  const tableName = insightsTable(tenantId);

  const existing = await db.tableNames();
  if (!existing.includes(tableName)) {
    return [];
  }

  try {
    const table = await db.openTable(tableName);
    const queryVector = await generateEmbedding(query);

    let search = table.vectorSearch(queryVector).limit(options?.limit ?? 20);

    const filters: string[] = ['dismissed = false'];
    if (options?.severity) {
      filters.push(`severity = '${options.severity}'`);
    }
    if (options?.type) {
      filters.push(`type = '${options.type}'`);
    }
    search = search.where(filters.join(' AND '));

    const results = await search
      .select([
        'id',
        'type',
        'brandName',
        'competitorId',
        'severity',
        'deltaPercentage',
        'createdAt',
        'summary',
        '_distance',
      ])
      .toArray();

    return results.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      type: row.type as string,
      brandName: row.brandName as string,
      competitorId: row.competitorId as string,
      severity: row.severity as string,
      deltaPercentage: row.deltaPercentage as number,
      createdAt: row.createdAt as string,
      summary: row.summary as string,
      score: row._distance != null ? 1 - (row._distance as number) : 0,
    }));
  } catch (err) {
    logger.error('[LanceDB] Insight search failed', {
      tenantId,
      query,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// =============================================================================
// READ: Price history for a product (time-range query)
// =============================================================================

export async function getPriceHistory(
  tenantId: string,
  productId: string,
  options?: {
    days?: number;
    limit?: number;
  }
): Promise<Array<{
  price: number;
  regularPrice: number;
  isPromo: boolean;
  capturedAt: string;
  runId: string;
}>> {
  const db = await getConnection();
  const tableName = pricePointsTable(tenantId);

  const existing = await db.tableNames();
  if (!existing.includes(tableName)) {
    return [];
  }

  try {
    const table = await db.openTable(tableName);
    const days = options?.days ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const results = await table
      .query()
      .where(`productId = '${productId}' AND capturedAt >= '${cutoff.toISOString()}'`)
      .select(['price', 'regularPrice', 'isPromo', 'capturedAt', 'runId'])
      .limit(options?.limit ?? 500)
      .toArray();

    return results.map((row: Record<string, unknown>) => ({
      price: row.price as number,
      regularPrice: row.regularPrice as number,
      isPromo: row.isPromo as boolean,
      capturedAt: row.capturedAt as string,
      runId: row.runId as string,
    }));
  } catch (err) {
    logger.error('[LanceDB] Price history query failed', {
      tenantId,
      productId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}



// =============================================================================
// READ: Hydrate products by IDs
// =============================================================================

export async function getProductsByIds(
  tenantId: string,
  ids: string[]
): Promise<Array<Record<string, unknown>>> {
  if (ids.length === 0) return [];

  const db = await getConnection();
  const tableName = productsTable(tenantId);
  const existing = await db.tableNames();
  if (!existing.includes(tableName)) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids));

  try {
    const table = await db.openTable(tableName);
    const escaped = uniqueIds.map((id) => `'${id.replace(/'/g, "\\'")}'`).join(', ');
    const rows = await table
      .query()
      .where(`id IN (${escaped})`)
      .limit(uniqueIds.length)
      .toArray();

    return rows.map((row: Record<string, unknown>) => ({ ...row }));
  } catch (err) {
    logger.error('[LanceDB] Hydrate products by IDs failed', {
      tenantId,
      count: uniqueIds.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// =============================================================================
// READ: Aggregate stats for a tenant's competitive data
// =============================================================================

export async function getStoreStats(tenantId: string): Promise<{
  productCount: number;
  pricePointCount: number;
  insightCount: number;
  tables: string[];
}> {
  const db = await getConnection();
  const allTables = await db.tableNames();
  const tenantTables = allTables.filter((t) => t.startsWith(`${tenantId}__`));

  let productCount = 0;
  let pricePointCount = 0;
  let insightCount = 0;

  for (const name of tenantTables) {
    try {
      const table = await db.openTable(name);
      const count = await table.countRows();
      if (name.endsWith('__competitive_products')) productCount = count;
      else if (name.endsWith('__price_points')) pricePointCount = count;
      else if (name.endsWith('__insights')) insightCount = count;
    } catch {
      // Table may be empty or corrupted, skip
    }
  }

  return { productCount, pricePointCount, insightCount, tables: tenantTables };
}

// =============================================================================
// MAINTENANCE: Optimize tables (compact + prune old versions)
// =============================================================================

export async function optimizeTables(tenantId: string): Promise<void> {
  const db = await getConnection();
  const allTables = await db.tableNames();
  const tenantTables = allTables.filter((t) => t.startsWith(`${tenantId}__`));

  for (const name of tenantTables) {
    try {
      const table = await db.openTable(name);
      const olderThan = new Date();
      olderThan.setDate(olderThan.getDate() - 7);
      await table.optimize({ cleanupOlderThan: olderThan, deleteUnverified: false });
      logger.info('[LanceDB] Optimized table', { table: name });
    } catch (err) {
      logger.error('[LanceDB] Optimization failed', {
        table: name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// =============================================================================
// WRITE: Upsert tenant's OWN products (from POS sync)
// =============================================================================

/**
 * Index the tenant's own product catalog in LanceDB.
 * Uses competitorId = '__self__' to distinguish from competitor products.
 * This enables semantic search across both own + competitor catalogs.
 */
export async function upsertOwnProducts(
  tenantId: string,
  runId: string,
  products: Array<{
    externalProductId: string;
    brandName: string;
    productName: string;
    category: ProductCategory;
    strainType: StrainType;
    thcPct: number | null;
    cbdPct: number | null;
    price: number;
    regularPrice: number | null;
    inStock: boolean;
  }>
): Promise<{ upserted: number; errors: number }> {
  return upsertCompetitiveProducts(tenantId, '__self__', runId, products);
}

// =============================================================================
// EXPORT: Main API surface
// =============================================================================

export const lancedbStore = {
  // Write
  upsertCompetitiveProducts,
  upsertOwnProducts,
  appendPricePoints,
  storeInsight,

  // Read
  searchProducts,
  searchInsights,
  getPriceHistory,
  getProductsByIds,

  // Admin
  getStoreStats,
  optimizeTables,
};
