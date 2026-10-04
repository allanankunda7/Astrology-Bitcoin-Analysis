"""
backend/app/api/v1/schema_docs.py
API endpoint returning the complete relational database schema metadata,
tables, column types, relationships, indexes, and design rationale.
"""
from fastapi import APIRouter
from backend.app.models import Base

router = APIRouter(prefix="/schema", tags=["Database Architecture & Schema"])


@router.get("/tables")
def get_schema_metadata():
    """
    Returns structured introspected metadata of all Phase 2 tables:
    Users, Assets, Market Candles, Strategies, Trading Signals, and Trade Journal.
    """
    tables_meta = []
    
    for table_name, table in Base.metadata.tables.items():
        columns = []
        for col in table.columns:
            columns.append({
                "name": col.name,
                "type": str(col.type),
                "primary_key": col.primary_key,
                "nullable": col.nullable,
                "foreign_keys": [f"{fk.column.table.name}.{fk.column.name}" for fk in col.foreign_keys],
                "default": str(col.default.arg) if col.default is not None and hasattr(col.default, 'arg') else None
            })
            
        indexes = []
        for idx in table.indexes:
            indexes.append({
                "name": idx.name,
                "unique": idx.unique,
                "columns": [c.name for c in idx.columns]
            })
            
        tables_meta.append({
            "table_name": table_name,
            "columns": columns,
            "indexes": indexes,
            "row_count_estimate": 0
        })
        
    return {
        "database": "PostgreSQL 16+",
        "orm": "SQLAlchemy 2.0 (declarative)",
        "tables_count": len(tables_meta),
        "tables": tables_meta,
        "design_principles": [
            "Numeric(18, 8) precision avoids float roundoff in cryptocurrency prices and balances",
            "Composite index on (asset_id, timeframe, timestamp) optimizes timeseries range queries",
            "Idempotent upsert logic protects against duplicate candles on WebSocket re-connection",
            "Foreign key cascading ensures clean referential integrity",
            "JSON fields for parameters and evidence allow agile strategy evolution without migration thrash"
        ]
    }
