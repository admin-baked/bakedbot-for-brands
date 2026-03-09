# Retrieval Plane Contract (Tool+ / BakedBot)

This document formalizes the retrieval-plane shape to keep agent tool surfaces minimal while LanceDB handles strategy complexity.

## Agent-facing tools

Only two retrieval-facing tools should be exposed by default:

1. `retrieve_context`
2. `hydrate_records`

## Contract

### `retrieve_context` input

- `query`
- `intent`
- `domain`
- `tenant_scope`
- `filters`
- `response_shape`
- `top_k`

### `retrieve_context` output

- `strategy_used` (`fts`, `vector`, `hybrid`, `multivector`)
- `reranker_used`
- `result_count`
- compact `results` with `id`, `entity_type`, `title`, `snippet`, `source`, optional `score`, `why_matched`, and `metadata`

### `hydrate_records` input

- `ids`
- optional `fields`
- optional `max_records`

### `hydrate_records` output

- `records[]`

## Server-side routing policy

Strategy is selected server-side, not by the model:

- **FTS-first**: exact identifiers and known-entity lookups with narrow filters
- **Vector-first**: conceptual/fuzzy semantic requests
- **Hybrid**: mixed business questions with lexical anchors + semantic intent
- **Multivector**: catalog/brand retrieval where multiple text facets need separate matching

## Telemetry required for retrieval benchmarking

Each retrieval call should emit:

- `retrieval_domain`
- `retrieval_strategy`
- `reranker_used`
- `applied_filters`
- `filter_selectivity`
- `top_k_requested`
- `top_k_returned`
- `hydrated_record_count`
- `retrieval_latency_ms`
- `result_payload_tokens`
- `zero_result`
- `user_followup_needed`
- `citation_hit_rate`

These are now supported via `retrievalMetrics` in agent telemetry and surfaced in the Super User benchmark dashboard.
