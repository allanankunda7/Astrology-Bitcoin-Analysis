"""
backend/app/models/strategy.py
SQLAlchemy Model for Quantitative and Rule-Based Trading Strategies.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class Strategy(Base):
    """
    Stores independent strategy definitions and parameterized rule-sets:
    1. Trend Following (EMA Stack + MACD + ADX + Market Structure)
    2. Breakout Retest (Key Level Break + Volume Expansion + Retest Confirmation)
    3. Pullback in Trend (HTF Trend + Fibonacci/EMA Retracement + Bullish Candle)
    4. Mean Reversion (Bollinger Bands + RSI Extremes + Divergence)
    5. Momentum RSI / Volatility Breakout
    """
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)           # e.g., "Trend Following Alpha"
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g., "TF_EMA_MACD_ADX"
    category = Column(String(50), index=True, nullable=False)         # "trend", "breakout", "pullback", "mean_reversion"
    description = Column(Text, nullable=True)
    
    # Strategy Rules Configuration (JSON allows modular, dynamic tuning without schema migrations)
    # Examples: {"fast_ema": 21, "slow_ema": 50, "trend_ema": 200, "adx_threshold": 25, "rsi_min": 45}
    parameters = Column(JSON, nullable=False, default=dict)
    
    # Multi-Timeframe Alignment requirements
    default_timeframe = Column(String(10), default="4h", nullable=False)
    required_htf = Column(String(10), default="1D", nullable=True)     # Higher timeframe trend filter
    
    # Operational Status
    is_active = Column(Boolean, default=True, index=True, nullable=False)
    author = Column(String(100), default="System", nullable=False)
    
    # Performance summary cache (from historical backtests)
    backtest_win_rate = Column(String(20), nullable=True)             # e.g. "62.4%"
    backtest_profit_factor = Column(String(20), nullable=True)        # e.g. "1.95"
    sample_size = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    signals = relationship("TradingSignal", back_populates="strategy", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Strategy id={self.id} code='{self.code}' category='{self.category}'>"
