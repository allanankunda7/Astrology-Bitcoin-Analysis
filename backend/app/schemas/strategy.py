"""
backend/app/schemas/strategy.py
Pydantic Schemas for Strategy Registration & Rules Tuning.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class StrategyBase(BaseModel):
    name: str = Field(..., example="Trend Following Alpha")
    code: str = Field(..., example="TF_EMA_MACD_ADX")
    category: str = Field(..., example="trend") # "trend", "breakout", "pullback", "mean_reversion"
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    default_timeframe: str = "4h"
    required_htf: Optional[str] = "1D"
    is_active: bool = True
    author: str = "System"
    backtest_win_rate: Optional[str] = None
    backtest_profit_factor: Optional[str] = None
    sample_size: int = 0


class StrategyCreate(StrategyBase):
    pass


class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    default_timeframe: Optional[str] = None
    required_htf: Optional[str] = None
    is_active: Optional[bool] = None


class StrategyResponse(StrategyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
