"""
backend/app/schemas/trade_journal.py
Pydantic Schemas for Paper Trading and Trade Journal Entries.
"""
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field


class TradeJournalBase(BaseModel):
    user_id: int
    asset_id: int
    signal_id: Optional[int] = None
    trade_type: str = Field(..., example="LONG") # "LONG" or "SHORT"
    execution_mode: str = "PAPER" # "PAPER" or "LIVE"
    status: str = "OPEN" # "PENDING", "OPEN", "CLOSED", "CANCELLED"
    
    entry_price: Decimal
    exit_price: Optional[Decimal] = None
    stop_loss: Decimal
    take_profit: Optional[Decimal] = None
    
    position_size_usd: Decimal
    quantity: Decimal
    initial_risk_usd: Decimal
    
    realized_pnl_usd: Optional[Decimal] = None
    return_percentage: Optional[Decimal] = None
    r_multiple: Optional[Decimal] = None
    
    setup_grade: Optional[str] = "A" # "A+", "A", "B", "C", "F"
    emotional_state: Optional[str] = "Calm / Patient"
    notes: Optional[str] = None
    exit_reason: Optional[str] = None


class TradeJournalCreate(TradeJournalBase):
    opened_at: Optional[datetime] = None


class TradeJournalUpdate(BaseModel):
    exit_price: Optional[Decimal] = None
    status: Optional[str] = None
    realized_pnl_usd: Optional[Decimal] = None
    return_percentage: Optional[Decimal] = None
    r_multiple: Optional[Decimal] = None
    exit_reason: Optional[str] = None
    setup_grade: Optional[str] = None
    emotional_state: Optional[str] = None
    notes: Optional[str] = None
    closed_at: Optional[datetime] = None


class TradeJournalResponse(TradeJournalBase):
    id: int
    opened_at: datetime
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JournalAnalytics(BaseModel):
    total_trades: int
    open_trades: int
    closed_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    total_realized_pnl: Decimal
    average_r_multiple: float
    profit_factor: float
    largest_winner: Decimal
    largest_loser: Decimal
