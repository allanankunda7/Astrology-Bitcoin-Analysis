"""
backend/app/models/asset.py
SQLAlchemy Model for Supported Financial Assets across all asset classes.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class Asset(Base):
    """
    Asset Registry for multi-market trading analysis:
    - Crypto (BTC/USDT, ETH/USDT, SOL/USDT)
    - Forex (EUR/USD, GBP/USD, USD/JPY)
    - Commodities (XAU/USD, WTI)
    - Indices (SPX, NDX, DJI)
    - Stocks (AAPL, NVDA, TSLA)
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(30), unique=True, index=True, nullable=False)  # e.g., "BTC/USDT", "XAU/USD"
    name = Column(String(100), nullable=False)                          # e.g., "Bitcoin / Tether"
    asset_class = Column(String(30), index=True, nullable=False)       # "crypto", "forex", "commodity", "index", "stock"
    
    # Currency specifications
    base_currency = Column(String(15), nullable=False)                  # e.g., "BTC", "EUR", "XAU"
    quote_currency = Column(String(15), nullable=False)                 # e.g., "USDT", "USD"
    
    # Precision & Execution parameters
    price_precision = Column(Integer, default=2, nullable=False)        # Decimals for price display
    quantity_precision = Column(Integer, default=6, nullable=False)     # Decimals for order quantity
    tick_size = Column(Numeric(precision=18, scale=8), default=0.01, nullable=False)
    min_order_size = Column(Numeric(precision=18, scale=8), default=0.0001, nullable=False)
    
    # State & Metadata
    is_active = Column(Boolean, default=True, index=True, nullable=False)
    metadata_info = Column(JSON, nullable=True)                        # Exchange info, trading hours, margin requirements
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    candles = relationship("MarketCandle", back_populates="asset", cascade="all, delete-orphan")
    signals = relationship("TradingSignal", back_populates="asset", cascade="all, delete-orphan")
    trades = relationship("TradeJournalEntry", back_populates="asset")

    def __repr__(self) -> str:
        return f"<Asset id={self.id} symbol='{self.symbol}' class='{self.asset_class}'>"
