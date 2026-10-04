"""
backend/app/crud/__init__.py
Central registry of CRUD operations.
"""
from backend.app.crud.crud_asset import crud_asset
from backend.app.crud.crud_strategy import crud_strategy
from backend.app.crud.crud_signal import crud_signal
from backend.app.crud.crud_trade_journal import crud_trade_journal

__all__ = [
    "crud_asset",
    "crud_strategy",
    "crud_signal",
    "crud_trade_journal",
]
