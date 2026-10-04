"""
backend/app/models/trade_journal.py
SQLAlchemy Model for Paper Trading & Trade Journal Entries.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, Numeric, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class TradeJournalEntry(Base):
    """
    Trade Journal & Execution Log:
    Tracks simulated (paper) and recorded manual trades linked to algorithmic signals or discretionary setups.
    
    Calculates:
    - Realized PnL ($)
    - Percentage Return (%)
    - R-Multiple (Risk-adjusted return: Realized Profit / Initial Dollar Risk)
    - Trader Psychology & Setup Quality Review
    """
    __tablename__ = "trade_journal"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="RESTRICT"), nullable=False, index=True)
    signal_id = Column(Integer, ForeignKey("trading_signals.id", ondelete="SET NULL"), nullable=True, index=True)
    
    trade_type = Column(String(10), nullable=False)          # 'LONG' or 'SHORT'
    execution_mode = Column(String(10), default="PAPER", nullable=False) # 'PAPER' or 'LIVE'
    status = Column(String(20), default="OPEN", index=True, nullable=False) # 'PENDING', 'OPEN', 'CLOSED', 'CANCELLED'
    
    # Execution Geometry
    entry_price = Column(Numeric(precision=18, scale=8), nullable=False)
    exit_price = Column(Numeric(precision=18, scale=8), nullable=True)
    stop_loss = Column(Numeric(precision=18, scale=8), nullable=False)
    take_profit = Column(Numeric(precision=18, scale=8), nullable=True)
    
    # Position Sizing & Money Management
    position_size_usd = Column(Numeric(precision=18, scale=2), nullable=False) # Total dollar exposure
    quantity = Column(Numeric(precision=24, scale=8), nullable=False)          # e.g., 0.15 BTC
    initial_risk_usd = Column(Numeric(precision=18, scale=2), nullable=False)  # Dollar amount risked if SL hit
    
    # Performance & R-Multiple
    realized_pnl_usd = Column(Numeric(precision=18, scale=2), nullable=True)   # Profit/Loss in dollars
    return_percentage = Column(Numeric(precision=8, scale=4), nullable=True)   # e.g., +4.25%
    r_multiple = Column(Numeric(precision=6, scale=2), nullable=True)          # e.g., +2.3R or -1.0R
    
    # Journal & Psychology Reflection
    setup_grade = Column(String(5), nullable=True)                             # 'A+', 'A', 'B', 'C', 'F'
    emotional_state = Column(String(50), nullable=True)                        # "Calm / Patient", "FOMO", "Anxious", "Greedy"
    notes = Column(Text, nullable=True)
    exit_reason = Column(String(50), nullable=True)                            # "Take Profit 1 Hit", "Stop Loss Hit", "Manual Close"
    
    # Timestamps
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    closed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="trades")
    asset = relationship("Asset", back_populates="trades")
    signal = relationship("TradingSignal", back_populates="trade_entries")

    __table_args__ = (
        Index("idx_journal_user_status", "user_id", "status", "opened_at"),
    )

    def __repr__(self) -> str:
        return f"<TradeJournalEntry id={self.id} user={self.user_id} type='{self.trade_type}' pnl={self.realized_pnl_usd}>"
