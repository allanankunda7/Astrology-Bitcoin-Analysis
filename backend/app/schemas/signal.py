"""
backend/app/schemas/signal.py
Pydantic Schemas for Probabilistic Trading Signals & Scoring.
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field


class SignalBase(BaseModel):
    asset_id: int
    strategy_id: int
    timeframe: str = Field(..., example="4h")
    direction: str = Field(..., example="LONG") # "LONG" or "SHORT"
    technical_score: int = Field(..., ge=0, le=10, description="Score 0-10 based on transparent technical rules")
    confidence: Decimal = Field(..., ge=0, le=1, description="Confidence metric (0.0000 - 1.0000)")
    market_regime: str = Field(..., example="Strong Uptrend")
    
    # Levels
    entry_zone_low: Decimal
    entry_zone_high: Decimal
    entry_price_est: Decimal
    stop_loss: Decimal
    invalidation_price: Decimal
    invalidation_reason: str
    target_1: Decimal
    target_2: Decimal
    target_3: Optional[Decimal] = None
    risk_reward_ratio: Decimal
    
    # Factors
    supporting_factors: List[str] = Field(default_factory=list)
    conflicting_factors: List[str] = Field(default_factory=list)
    status: str = "ACTIVE" # 'ACTIVE', 'TRIGGERED', 'INVALIDATED', 'TARGET_HIT', 'EXPIRED'


class SignalCreate(SignalBase):
    expires_at: Optional[datetime] = None


class SignalUpdate(BaseModel):
    status: Optional[str] = None
    invalidated_at: Optional[datetime] = None
    invalidation_reason: Optional[str] = None


class SignalResponse(SignalBase):
    id: int
    generated_at: datetime
    expires_at: Optional[datetime] = None
    invalidated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
