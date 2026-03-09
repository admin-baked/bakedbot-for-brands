"""
LanceDB retrieval-plane schemas for Tool+/BakedBot.

This file mirrors docs/retrieval-plane-contract.md and is intended as a
bootstrap-ready schema source for Python ingestion/index setup jobs.
"""

from __future__ import annotations

import pyarrow as pa

DENSE_DIM = 1024
TITLE_DIM = 1024
MV_DIM = 128

knowledge_chunks_schema = pa.schema([
    pa.field("id", pa.string()),
    pa.field("tenant_id", pa.string()),
    pa.field("role_scope", pa.string()),
    pa.field("permissions", pa.list_(pa.string())),
    pa.field("source_system", pa.string()),
    pa.field("source_url", pa.string()),
    pa.field("doc_id", pa.string()),
    pa.field("chunk_id", pa.string()),
    pa.field("doc_type", pa.string()),
    pa.field("title", pa.string()),
    pa.field("heading_path", pa.string()),
    pa.field("body", pa.string()),
    pa.field("tags", pa.list_(pa.string())),
    pa.field("freshness_tier", pa.string()),
    pa.field("geography", pa.string()),
    pa.field("updated_at", pa.timestamp("us", tz="UTC")),
    pa.field("search_vector", pa.list_(pa.float32(), DENSE_DIM)),
    pa.field("title_vector", pa.list_(pa.float32(), TITLE_DIM)),
])

catalog_entities_schema = pa.schema([
    pa.field("id", pa.string()),
    pa.field("tenant_id", pa.string()),
    pa.field("role_scope", pa.string()),
    pa.field("permissions", pa.list_(pa.string())),
    pa.field("source_system", pa.string()),
    pa.field("entity_type", pa.string()),
    pa.field("store_id", pa.string()),
    pa.field("brand_id", pa.string()),
    pa.field("facility_id", pa.string()),
    pa.field("sku", pa.string()),
    pa.field("name", pa.string()),
    pa.field("description", pa.string()),
    pa.field("category", pa.string()),
    pa.field("subcategory", pa.string()),
    pa.field("product_type", pa.string()),
    pa.field("ingredients", pa.list_(pa.string())),
    pa.field("effects_tags", pa.list_(pa.string())),
    pa.field("benefit_tags", pa.list_(pa.string())),
    pa.field("compliance_flags", pa.list_(pa.string())),
    pa.field("availability_status", pa.string()),
    pa.field("price_band", pa.string()),
    pa.field("geography", pa.string()),
    pa.field("updated_at", pa.timestamp("us", tz="UTC")),
    pa.field("search_vector", pa.list_(pa.float32(), DENSE_DIM)),
    pa.field("name_vector", pa.list_(pa.float32(), DENSE_DIM)),
    pa.field("effects_vector", pa.list_(pa.float32(), DENSE_DIM)),
])

catalog_late_interaction_schema = pa.schema([
    pa.field("id", pa.string()),
    pa.field("tenant_id", pa.string()),
    pa.field("entity_type", pa.string()),
    pa.field("store_id", pa.string()),
    pa.field("brand_id", pa.string()),
    pa.field("name", pa.string()),
    pa.field("text", pa.string()),
    pa.field("mv_vector", pa.list_(pa.list_(pa.float32(), MV_DIM))),
    pa.field("updated_at", pa.timestamp("us", tz="UTC")),
])

operational_events_schema = pa.schema([
    pa.field("id", pa.string()),
    pa.field("tenant_id", pa.string()),
    pa.field("role_scope", pa.string()),
    pa.field("permissions", pa.list_(pa.string())),
    pa.field("source_system", pa.string()),
    pa.field("event_type", pa.string()),
    pa.field("entity_type", pa.string()),
    pa.field("entity_id", pa.string()),
    pa.field("severity", pa.string()),
    pa.field("status", pa.string()),
    pa.field("summary", pa.string()),
    pa.field("details", pa.string()),
    pa.field("tags", pa.list_(pa.string())),
    pa.field("store_id", pa.string()),
    pa.field("facility_id", pa.string()),
    pa.field("geography", pa.string()),
    pa.field("created_at", pa.timestamp("us", tz="UTC")),
    pa.field("resolved_at", pa.timestamp("us", tz="UTC")),
    pa.field("search_vector", pa.list_(pa.float32(), DENSE_DIM)),
])

analytics_snapshots_schema = pa.schema([
    pa.field("id", pa.string()),
    pa.field("tenant_id", pa.string()),
    pa.field("role_scope", pa.string()),
    pa.field("permissions", pa.list_(pa.string())),
    pa.field("source_system", pa.string()),
    pa.field("snapshot_type", pa.string()),
    pa.field("store_id", pa.string()),
    pa.field("brand_id", pa.string()),
    pa.field("facility_id", pa.string()),
    pa.field("period_start", pa.timestamp("us", tz="UTC")),
    pa.field("period_end", pa.timestamp("us", tz="UTC")),
    pa.field("summary", pa.string()),
    pa.field("insight_tags", pa.list_(pa.string())),
    pa.field("metrics_json", pa.string()),
    pa.field("geography", pa.string()),
    pa.field("updated_at", pa.timestamp("us", tz="UTC")),
    pa.field("search_vector", pa.list_(pa.float32(), DENSE_DIM)),
])

TABLE_SCHEMAS = {
    "knowledge_chunks": knowledge_chunks_schema,
    "catalog_entities": catalog_entities_schema,
    "catalog_late_interaction": catalog_late_interaction_schema,
    "operational_events": operational_events_schema,
    "analytics_snapshots": analytics_snapshots_schema,
}
