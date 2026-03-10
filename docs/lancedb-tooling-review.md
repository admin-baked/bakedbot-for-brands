# LanceDB Integration Review for Tool+ / BakedBot

## Current integration status

The current LanceDB integration is centered in `src/server/services/ezal/lancedb-store.ts` and is already production-oriented:

- tenant-scoped tables for products, price history, and insights
- vectorized indexing via `generateEmbedding`
- semantic retrieval with metadata filters
- append-only historical price points
- store-level stats and optimize hooks

## What is strong today

1. **Retrieval substrate is consolidated**
   - One backend supports semantic retrieval, filters, and historical lookup.
2. **Tenant scoping is explicit**
   - Table naming enforces org isolation (`tenantId__*`).
3. **Clear retrieval split**
   - Candidate search (`searchProducts` / `searchInsights`) is separate from detail retrieval (`getPriceHistory`), reducing payload bloat.

## Gaps to close next

1. **Retrieval strategy visibility**
   - Current telemetry does not consistently expose whether retrieval was vector, FTS, or hybrid.
2. **Consumption efficiency tracking**
   - We need candidate retrieved vs candidate consumed metrics to tune top-k and reranking.
3. **Mode-level quality attribution**
   - Empty-result and latency attribution by retrieval mode should be benchmarked in the Super User dashboard.

## Benchmarking updates in this PR

The benchmarking stack now supports LanceDB retrieval KPIs directly:

- `lancedbQueryCount`
- `lancedbVectorQueryCount`
- `lancedbFtsQueryCount`
- `lancedbHybridQueryCount`
- `lancedbRerankCount`
- `lancedbEmptyResultCount`
- `lancedbRetrievedCandidateCount`
- `lancedbConsumedCandidateCount`
- `lancedbFilterSelectivityAvg`

And reports these in Admin DevTools:

- mode mix (vector / fts / hybrid)
- empty-result rate
- rerank rate
- candidate consumption rate
- filter selectivity average

## Recommendation

Use LanceDB as an internal retrieval plane behind a small tool surface (`retrieve_knowledge`, `fetch_records`) and keep mode selection server-side. The benchmark UI should be the go/no-go gate for deleting redundant retrieval tools.
