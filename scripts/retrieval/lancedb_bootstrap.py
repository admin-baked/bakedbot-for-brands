"""
Bootstrap retrieval-plane LanceDB tables and indexes.

Usage:
  python scripts/retrieval/lancedb_bootstrap.py --uri ./data/bakedbot_lancedb --create-indexes
"""

from __future__ import annotations

import argparse
import lancedb

from lancedb_schemas import TABLE_SCHEMAS


def ensure_tables(db: lancedb.DBConnection) -> None:
    for table_name, schema in TABLE_SCHEMAS.items():
        db.create_table(table_name, schema=schema, exist_ok=True)
        print(f"[ok] ensured table: {table_name}")


def build_indexes(db: lancedb.DBConnection) -> None:
    knowledge = db.open_table("knowledge_chunks")
    catalog = db.open_table("catalog_entities")
    catalog_mv = db.open_table("catalog_late_interaction")
    events = db.open_table("operational_events")
    snaps = db.open_table("analytics_snapshots")

    # Vector indexes
    knowledge.create_index(metric="cosine", vector_column_name="search_vector", index_type="IVF_PQ")
    catalog.create_index(metric="cosine", vector_column_name="search_vector", index_type="IVF_PQ")
    catalog.create_index(metric="cosine", vector_column_name="name_vector", index_type="IVF_PQ")
    catalog.create_index(metric="cosine", vector_column_name="effects_vector", index_type="IVF_PQ")
    events.create_index(metric="cosine", vector_column_name="search_vector", index_type="IVF_PQ")
    snaps.create_index(metric="cosine", vector_column_name="search_vector", index_type="IVF_PQ")

    # Multivector phase-2
    catalog_mv.create_index(metric="cosine", vector_column_name="mv_vector")

    # FTS indexes
    knowledge.create_fts_index("title", "heading_path", "body")
    catalog.create_fts_index("name", "description", "sku")
    events.create_fts_index("summary", "details")
    snaps.create_fts_index("summary")

    # Scalar indexes
    common_scalar_indexes = (
        (knowledge, "updated_at"),
        (catalog, "updated_at"),
        (events, "created_at"),
        (snaps, "updated_at"),
    )
    for tbl, timestamp_column in common_scalar_indexes:
        tbl.create_scalar_index("tenant_id")
        tbl.create_scalar_index("role_scope")
        tbl.create_scalar_index(timestamp_column)

    catalog.create_scalar_index("store_id")
    catalog.create_scalar_index("brand_id")
    catalog.create_scalar_index("category")
    catalog.create_scalar_index("availability_status")

    events.create_scalar_index("event_type")
    events.create_scalar_index("severity")
    events.create_scalar_index("status")
    events.create_scalar_index("store_id")
    events.create_scalar_index("facility_id")

    snaps.create_scalar_index("snapshot_type")
    snaps.create_scalar_index("store_id")
    snaps.create_scalar_index("brand_id")
    snaps.create_scalar_index("facility_id")

    print("[ok] built indexes")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uri", default="./data/bakedbot_lancedb")
    parser.add_argument("--create-indexes", action="store_true")
    args = parser.parse_args()

    db = lancedb.connect(args.uri)
    ensure_tables(db)
    if args.create_indexes:
        build_indexes(db)


if __name__ == "__main__":
    main()
