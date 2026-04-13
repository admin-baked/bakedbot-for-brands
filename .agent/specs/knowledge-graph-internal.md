# BakedKnow — Internal Knowledge Graph Design

> Build-your-own Cognee on our existing Supabase + Letta stack.
> Status: Design doc — not yet implemented.

---

## Why Build Internal vs Use Cognee

| Factor | Cognee | BakedKnow (Internal) |
|--------|--------|----------------------|
| Language | Python-first | TypeScript-native |
| Infrastructure | New service (Cloud Run) | Supabase already running |
| Multi-tenant | Docs say yes, untested | RLS + tenant_id column |
| Cost | Additional managed service | $0 incremental |
| Graph engine | Kuzu/Neo4j/PG | PostgreSQL recursive CTEs |
| Embedding | OpenAI default | Gemini (free) via existing pipeline |
| JS SDK | `@cognee/cognee-openclaw` (unclear) | Fully typed TS service we write |

**Verdict:** Internal wins on every axis except development time (~14h).
Cognee's experiment data will tell us whether knowledge graphs actually improve
Smokey's recall quality before we invest that time.

---

## What This Replaces

| Current | Problem | Replacement |
|---------|---------|-------------|
| `associative-memory.ts` (Firestore edges) | BFS fires N+1 Firestore queries per hop | Single PostgreSQL recursive CTE |
| `autoLinkSimilar` (in-memory cosine) | Requires full embeddings loaded in RAM | pgvector index, stays in DB |
| Opaque `memoryId` string references | No typed entity model | Typed `NodeRecord` with `entity_type` |
| No hybrid search | Can't combine semantic + graph in one query | `kg_hybrid_search()` SQL function |

Letta (Hive Mind blocks, episodic memory, agent-to-agent) is **not replaced**. 
BakedKnow handles domain knowledge graphs. Letta handles agent state.

---

## Directory Structure

```
src/server/services/knowledge-graph/
├── types.ts            # EntityType, RelationType, NodeRecord, EdgeRecord, SearchResult
├── client.ts           # Supabase client + RLS helper
├── nodes.ts            # Node CRUD — upsert, get, batchUpsert
├── edges.ts            # Edge CRUD — link, unlink, reinforce, weaken
├── search.ts           # kg_semantic_search, kg_graph_traverse, kg_hybrid_search
├── ingestion/
│   ├── strains.ts      # Cannabis strain → kg_nodes (from Supabase cannabis_science)
│   ├── terpenes.ts     # Terpene data → kg_nodes (static + live)
│   ├── competitors.ts  # Ezal competitive intel → kg_nodes (per-tenant)
│   └── products.ts     # Alleaves POS products → kg_nodes (per-tenant)
└── index.ts            # Exports + agent tools (kg_remember, kg_recall, kg_relate)
```

---

## Schema (Supabase Migration)

```sql
-- Run: supabase migration new knowledge_graph

-- ─── Node table ──────────────────────────────────────────────────────────────

CREATE TABLE kg_nodes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL DEFAULT 'global',
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,                              -- external reference (Alleaves ID, etc.)
  label        TEXT NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}',
  embedding    vector(768),                       -- Gemini text-embedding-004
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'strain', 'terpene', 'effect', 'product',
    'customer_segment', 'competitor', 'brand',
    'dispensary', 'topic', 'fact'
  ))
);

CREATE INDEX ON kg_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON kg_nodes (tenant_id, entity_type);
CREATE INDEX ON kg_nodes (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX ON kg_nodes USING gin (properties);

-- ─── Edge table ───────────────────────────────────────────────────────────────

CREATE TABLE kg_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL DEFAULT 'global',
  from_node_id  UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  to_node_id    UUID NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  weight        FLOAT NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  properties    JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_loops CHECK (from_node_id != to_node_id),
  CONSTRAINT valid_relation CHECK (relation_type IN (
    'contains_terpene', 'produces_effect', 'similar_to', 'preferred_by',
    'competes_with', 'supersedes', 'contradicts', 'referenced_in',
    'belongs_to', 'followed_by', 'caused', 'influences'
  ))
);

CREATE INDEX ON kg_edges (from_node_id);
CREATE INDEX ON kg_edges (to_node_id);
CREATE INDEX ON kg_edges (tenant_id, relation_type);
CREATE INDEX ON kg_edges (from_node_id, to_node_id);  -- prevents duplicate edges

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE kg_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_edges ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (for server-side operations)
-- Client reads: tenant data OR global shared data
CREATE POLICY "read_own_or_global" ON kg_nodes
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true) OR tenant_id = 'global');

CREATE POLICY "read_own_or_global" ON kg_edges
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true) OR tenant_id = 'global');

-- ─── Graph traversal function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION kg_traverse(
  start_node_id UUID,
  p_tenant      TEXT,
  max_depth     INT DEFAULT 3,
  relation_filter TEXT[] DEFAULT NULL
) RETURNS TABLE (
  node_id      UUID,
  depth        INT,
  path         UUID[],
  total_weight FLOAT
) LANGUAGE SQL STABLE AS $$
  WITH RECURSIVE traversal AS (
    -- Seed: the start node at depth 0
    SELECT id AS node_id, 0 AS depth, ARRAY[id] AS path, 1.0::FLOAT AS total_weight
    FROM kg_nodes WHERE id = start_node_id

    UNION ALL

    -- Expand: follow outgoing edges up to max_depth
    SELECT
      e.to_node_id,
      t.depth + 1,
      t.path || e.to_node_id,
      t.total_weight * e.weight
    FROM traversal t
    JOIN kg_edges e ON e.from_node_id = t.node_id
      AND (e.tenant_id = p_tenant OR e.tenant_id = 'global')
      AND (relation_filter IS NULL OR e.relation_type = ANY(relation_filter))
      AND e.to_node_id != ALL(t.path)   -- prevent cycles
    WHERE t.depth < max_depth
  )
  SELECT node_id, depth, path, total_weight
  FROM traversal
  ORDER BY total_weight DESC;
$$;

-- ─── Hybrid search function ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION kg_hybrid_search(
  query_embedding    vector(768),
  p_tenant           TEXT,
  entity_type_filter TEXT DEFAULT NULL,
  semantic_k         INT DEFAULT 5,
  graph_hops         INT DEFAULT 2
) RETURNS TABLE (
  node_id     UUID,
  label       TEXT,
  entity_type TEXT,
  properties  JSONB,
  similarity  FLOAT,
  source      TEXT   -- 'semantic' | 'graph'
) LANGUAGE SQL STABLE AS $$
  WITH semantic_seeds AS (
    SELECT
      id,
      label,
      entity_type,
      properties,
      1 - (embedding <=> query_embedding) AS similarity
    FROM kg_nodes
    WHERE (tenant_id = p_tenant OR tenant_id = 'global')
      AND (entity_type_filter IS NULL OR entity_type = entity_type_filter)
      AND embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT semantic_k
  ),
  graph_expansion AS (
    SELECT DISTINCT
      n.id,
      n.label,
      n.entity_type,
      n.properties,
      s.similarity * t.total_weight AS similarity,
      'graph'::TEXT AS source
    FROM semantic_seeds s
    JOIN LATERAL kg_traverse(s.id, p_tenant, graph_hops) t ON t.depth > 0
    JOIN kg_nodes n ON n.id = t.node_id
  )
  SELECT id AS node_id, label, entity_type, properties, similarity, 'semantic' AS source FROM semantic_seeds
  UNION ALL
  SELECT * FROM graph_expansion
  ORDER BY similarity DESC;
$$;
```

---

## TypeScript Service Interface

```typescript
// src/server/services/knowledge-graph/types.ts

export type EntityType =
  | 'strain' | 'terpene' | 'effect' | 'product'
  | 'customer_segment' | 'competitor' | 'brand'
  | 'dispensary' | 'topic' | 'fact';

export type RelationType =
  | 'contains_terpene' | 'produces_effect' | 'similar_to'
  | 'preferred_by' | 'competes_with' | 'supersedes'
  | 'contradicts' | 'referenced_in' | 'belongs_to'
  | 'followed_by' | 'caused' | 'influences';

export interface NodeRecord {
  id: string;
  tenantId: string;         // 'global' for shared domain knowledge
  entityType: EntityType;
  entityId?: string;        // external reference
  label: string;
  properties: Record<string, unknown>;
  embedding?: number[];
}

export interface EdgeRecord {
  id: string;
  tenantId: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: RelationType;
  weight: number;           // 0–1
  properties: Record<string, unknown>;
}

export interface KGSearchResult {
  nodeId: string;
  label: string;
  entityType: EntityType;
  properties: Record<string, unknown>;
  similarity: number;
  source: 'semantic' | 'graph';
}

// Agent tools surface (replaces associative-memory.ts tools)
export interface KGService {
  // Store a node (upsert by entityId if provided)
  upsertNode(node: Omit<NodeRecord, 'id'>): Promise<NodeRecord>;
  
  // Create a typed relationship
  link(
    fromId: string, toId: string,
    relation: RelationType,
    tenantId: string,
    weight?: number
  ): Promise<EdgeRecord>;
  
  // Hybrid semantic + graph search (the main query path)
  search(
    query: string,
    tenantId: string,
    options?: { entityType?: EntityType; topK?: number; graphHops?: number }
  ): Promise<KGSearchResult[]>;
  
  // Multi-hop traversal from a known node
  traverse(
    startNodeId: string,
    tenantId: string,
    options?: { maxDepth?: number; relations?: RelationType[] }
  ): Promise<Array<{ node: NodeRecord; depth: number; weight: number }>>;
}
```

---

## Agent Tools (3 tools, replaces associative-memory.ts)

```typescript
// kg_remember — store a typed entity in the knowledge graph
// kg_recall   — hybrid semantic + graph search
// kg_relate   — create a typed relationship between two nodes
```

These replace the 3 Letta tools (`letta_find_related_memories`, `letta_link_memories`, `letta_find_related_memories`) for domain knowledge. Letta tools stay for agent episodic/working memory.

---

## Ingestion Pipelines

### Global (shared across all tenants)
| Source | Nodes | Edges | Trigger |
|--------|-------|-------|---------|
| Supabase `cannabis_science` (161K Q&A) | ~2K strain/terpene nodes | `contains_terpene`, `produces_effect` | One-time + weekly refresh |
| Static terpene data | 15 terpene nodes | — | One-time seed |

### Per-tenant
| Source | Nodes | Edges | Trigger |
|--------|-------|-------|---------|
| Alleaves POS product sync | `product` nodes | `belongs_to` (brand/dispensary) | POS sync webhook |
| Ezal competitive intel | `competitor` nodes | `competes_with` | Weekly cron |
| Customer segments (Firestore) | `customer_segment` nodes | `preferred_by` | Nightly |

---

## Migration Path from `associative-memory.ts`

1. **Implement schema** — run migration, add `@supabase/supabase-js` queries
2. **Parallel write** — new edges write to both Firestore (`memory_edges`) and `kg_edges`
3. **A/B test reads** — 50% queries use new `kg_hybrid_search`, 50% use BFS Firestore
4. **Validate** — compare result quality on Smokey strain queries
5. **Cut over** — delete `memory_edges` collection, deprecate `associative-memory.ts`

---

## Effort Estimate

| Task | Hours |
|------|-------|
| Schema + Supabase migration | 2h |
| `nodes.ts` + `edges.ts` CRUD | 3h |
| `search.ts` (hybrid search wrapper) | 2h |
| Strain/terpene ingestion pipeline | 4h |
| Agent tools (3 tools) | 2h |
| Tests + validation vs Firestore BFS | 3h |
| **Total** | **~16h** |

**Decision gate:** Run the Cognee experiment first. If `kg_recall` on the cannabis
dataset returns clearly better answers than Letta archival search on the same data,
build BakedKnow. If quality is similar, the investment isn't justified yet.
