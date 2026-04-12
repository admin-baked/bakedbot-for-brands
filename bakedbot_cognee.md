# BakedBot Cognee — Knowledge Graph Architecture

> Comparing Cognee's approach to BakedBot's current stack and implementation plan.

---

## What is Cognee?

Cognee is an open-source AI memory engine that enhances LLMs with structured, context-aware memory. It combines:
- **Knowledge graphs** — entities and relationships as nodes/edges
- **Vector search** — semantic similarity via embeddings
- **Modular ECL pipelines** — Extract → Cognify → Load

### Core Architecture

| Storage Type | Purpose | Default Backend |
|--------------|---------|-----------------|
| Relational | Documents, chunks, provenance | SQLite / Postgres |
| Vector | Embeddings for semantic search | LanceDB / Qdrant / Weaviate |
| Graph | Entities + relationships | NetworkX / Neo4j |

### Main Operations

1. **Add** — Ingest data (text, PDF, JSON, etc.)
2. **Cognify** — LLM extracts entities/relationships → builds knowledge graph
3. **Memify** — Optional post-enrichment (derived nodes, triplet rules)
4. **Search** — Graph completion, RAG, Cypher queries

---

## BakedBot's Current Stack

| Component | Status | Location |
|-----------|--------|----------|
| **Vector Store** | ✅ Active | `src/server/services/ezal/lancedb-store.ts` |
| **Relational + pgvector** | ✅ Active | `src/lib/supabase.ts` — cannabis science KB |
| **Graph Store** | ❌ Missing | — |
| **ECL Pipeline** | ❌ Missing | — |
| **LLM Entity Extraction** | ❌ Missing | — |

### Existing Vector Capabilities

```typescript
// src/server/services/ezal/lancedb-store.ts
- Competitive products semantic search
- Price history time-series
- Insights search
- Hybrid vector + FTS queries
- GCS-backed storage (prod) / local (dev)
```

---

## BakedBot's Cognee Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    BAKEDBOT COGNEE                          │
├─────────────────────────────────────────────────────────────┤
│  INPUT: Documents, product data, customer interactions      │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  EXTRACT (Add)                                      │     │
│  │  • Parse PDFs, text, JSON                          │     │
│  │  • Chunk documents                                 │     │
│  └─────────────────────────────────────────────────────┘     │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  COGNIFY (Process)                                 │     │
│  │  • LLM extracts entities (products, brands, users) │     │
│  │  • LLM discovers relationships                     │     │
│  │  • Build graph nodes + edges                       │     │
│  │  • Generate embeddings for summaries               │     │
│  └─────────────────────────────────────────────────────┘     │
│                           ↓                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Relational  │ │    Vector    │ │    Graph     │        │
│  │  Supabase    │ │   LanceDB    │ │   NetworkX   │        │
│  │  (chunks)    │ │ (embeddings) │ │  (entities)  │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                           ↓                                  │
│  SEARCH: Hybrid vector + graph traversal                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Reuse Opportunities

| Existing Module | Reuse For |
|-----------------|-----------|
| `generateEmbedding()` (Gemini) | Embedding generation |
| `src/server/services/ezal/lancedb-store.ts` | Vector storage |
| `src/lib/supabase.ts` | Relational + pgvector |
| Agent telemetry | Track graph queries |

---

## Missing Components to Build

1. **Graph Store Adapter**
   - Local: NetworkX (already in Cognee defaults)
   - Prod: Neo4j
   - File: `src/server/services/cognee/graph-store.ts`

2. **Entity Extraction Service**
   - Use Gemini 2.5 Flash (free, fast)
   - Extract: products, brands, customers, topics
   - File: `src/server/services/cognee/entity-extractor.ts`

3. **ECL Pipeline Orchestrator**
   - Compose Add → Cognify → Search workflows
   - File: `src/server/services/cognee/pipeline.ts`

4. **Graph Search API**
   - Hybrid: vector similarity + graph traversal
   - File: `src/server/services/cognee/search.ts`

---

## Example Use Cases

1. **Product Intelligence** — Graph of products → brands → categories → customers
2. **Customer Journey** — Sessions → interactions → preferences → recommendations
3. **Competitive Analysis** — Competitors → products → pricing → market position
4. **Content Knowledge** — Articles → topics → entities → SEO clusters

---

## Next Steps

1. Draft graph store adapter spec
2. Prototype entity extraction with Gemini
3. Connect to existing LanceDB for embeddings
4. Add to agent toolbelt (Craig, Smokey, Linus)

---

*Generated: 2026-04-12*
*Context: BakedBot stack analysis vs Cognee architecture*