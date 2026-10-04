"""
backend/app/models/signal.py
SQLAlchemy Model for Probabilistic Algorithmic Trading Setups and Signals.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Numeric, ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class TradingSignal(Base):
    """
    Stores transparent, probabilistic trading setups detected across markets.
    Contains complete technical rationale, multi-target geometry, and invalidation rules.
    
    Principles Enforced:
    - Never presents signals as guaranteed predictions.
    - Transparent scoring (0 to 10 points) broken down by criteria.
    - Explicit invalidation price and methodology.
    - Preserves supporting and conflicting factors in structured JSON.
    """
    __tablename__ = "trading_signals"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    timeframe = Column(String(10), nullable=False, index=True)          # e.g., '15m', '1h', '4h', '1D'
    direction = Column(String(10), nullable=False, index=True)          # 'LONG' or 'SHORT'
    
    # Technical Setup Score & Confidence
    technical_score = Column(Integer, nullable=False)                  # 0 to 10 (Weak: 0-3, Moderate: 4-6, Strong: 7-8, Very Strong: 9-10)
    confidence = Column(Numeric(precision=5, scale=4), nullable=False) # 0.0000 to 1.0000
    market_regime = Column(String(50), nullable=False)                 # "Strong Uptrend", "Ranging / Sideways", "High Volatility"
    
    # Trade Setup Geometry (All calculated with documented methodologies)
    entry_zone_low = Column(Numeric(precision=18, scale=8), nullable=False)
    entry_zone_high = Column(Numeric(precision=18, scale=8), nullable=False)
    entry_price_est = Column(Numeric(precision=18, scale=8), nullable=False)
    
    stop_loss = Column(Numeric(precision=18, scale=8), nullable=False)
    invalidation_price = Column(Numeric(precision=18, scale=8), nullable=False)
    invalidation_reason = Column(Text, nullable=False)                 # e.g., "Hourly close below swing low at 63,800"
    
    # Hypothical Take-Profit Targets
    target_1 = Column(Numeric(precision=18, scale=8), nullable=False)  # 1.0R (Conservative)
    target_2 = Column(Numeric(precision=18, scale=8), nullable=False)  # 2.0R (Runner / Key Resistance)
    target_3 = Column(Numeric(precision=18, scale=8), nullable=True)   # 3.0R (Macro Extension)
    risk_reward_ratio = Column(Numeric(precision=6, scale=2), nullable=False) # e.g. 2.85
    
    # Explainability & Evidence
    # JSON list of strings: ["Price above 200 EMA", "Bullish BOS confirmed", "RSI reset at 48.2"]
    supporting_factors = Column(JSON, nullable=False, default=list)
    # JSON list of strings: ["Funding rate elevated", "1H Bearish divergence forming"]
    conflicting_factors = Column(JSON, nullable=False, default=list)
    
    # Lifecycle & Status
    # 'ACTIVE', 'TRIGGERED', 'INVALIDATED', 'TARGET_HIT', 'EXPIRED'
    status = Column(String(20), default="ACTIVE", index=True, nullable=False)
    
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True)
    invalidated_at = Column(DateTime, nullable=True)
    
    # Relationships
    asset = relationship("Asset", back_populates="signals")
    strategy = relationship("Strategy", back_populates="signals")
    trade_entries = relationship("TradeJournalEntry", back_populates="signal")

    __table_args__ = (
        Index("idx_signal_asset_status", "asset_id", "status", "generated_at"),
    )

    def __repr__(self) -> str:
        return f"<TradingSignal id={self.id} asset={self.asset_id} dir='{self.direction}' score={self.technical_score}/10>"
