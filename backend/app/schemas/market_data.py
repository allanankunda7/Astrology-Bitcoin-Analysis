"""
backend/app/schemas/market_data.py
Pydantic Schemas for OHLCV Candlestick Quotes.
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field


class CandleBase(BaseModel):
    asset_id: int
    timeframe: str = Field(..., example="4h")
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    quote_volume: Optional[Decimal] = None
    trade_count: Optional[int] = None
    vwap: Optional[Decimal] = None
    is_closed: int = 1


class CandleCreate(CandleBase):
    pass


class CandleBulkInsert(BaseModel):
    asset_symbol: str
    timeframe: str
    candles: List[CandleBase]


class CandleResponse(CandleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
