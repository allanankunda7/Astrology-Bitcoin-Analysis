"""
backend/app/models/market_data.py
SQLAlchemy Model for OHLCV Time-Series Market Candles across Multiple Timeframes.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Numeric, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class MarketCandle(Base):
    """
    Stores historical and live OHLCV candlestick quotes.
    Timeframes supported: '1m', '3m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'.
    
    Database Design Note:
    - High-precision Decimal / Numeric(18, 8) avoids floating-point inaccuracies.
    - Composite unique index on (asset_id, timeframe, timestamp) guarantees idempotency
      and enables fast range scans for indicators and backtesting.
    """
    __tablename__ = "market_candles"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False, index=True)  # '1m', '5m', '15m', '1h', '4h', '1D', '1W'
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # High-precision Financial OHLCV
    open = Column(Numeric(precision=18, scale=8), nullable=False)
    high = Column(Numeric(precision=18, scale=8), nullable=False)
    low = Column(Numeric(precision=18, scale=8), nullable=False)
    close = Column(Numeric(precision=18, scale=8), nullable=False)
    volume = Column(Numeric(precision=24, scale=8), nullable=False)
    
    # Supplemental Quantitative Data
    quote_volume = Column(Numeric(precision=24, scale=8), nullable=True) # e.g. Volume in USDT
    trade_count = Column(Integer, nullable=True)
    vwap = Column(Numeric(precision=18, scale=8), nullable=True)
    is_closed = Column(Integer, default=1, nullable=False)               # 1 if candle is completed, 0 if forming
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="candles")

    # Constraints & Indexes for fast timeseries slicing
    __table_args__ = (
        UniqueConstraint("asset_id", "timeframe", "timestamp", name="uq_candle_asset_tf_ts"),
        Index("idx_candle_lookup", "asset_id", "timeframe", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<MarketCandle asset_id={self.asset_id} tf='{self.timeframe}' ts='{self.timestamp}' close={self.close}>"
