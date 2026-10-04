"""
backend/app/models/__init__.py
Central registry of all SQLAlchemy models for clean imports and Alembic autogenerate migrations.
"""
from backend.app.db.base import Base
from backend.app.models.user import User
from backend.app.models.asset import Asset
from backend.app.models.market_data import MarketCandle
from backend.app.models.strategy import Strategy
from backend.app.models.signal import TradingSignal
from backend.app.models.trade_journal import TradeJournalEntry

__all__ = [
    "Base",
    "User",
    "Asset",
    "MarketCandle",
    "Strategy",
    "TradingSignal",
    "TradeJournalEntry",
]
