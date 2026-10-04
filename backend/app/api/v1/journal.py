"""
backend/app/api/v1/journal.py
API endpoints for Trade Journal, Paper Trading Execution, and Quantitative Performance Metrics.
"""
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.trade_journal import (
    TradeJournalCreate, TradeJournalResponse, JournalAnalytics
)
from backend.app.crud.crud_trade_journal import crud_trade_journal

router = APIRouter(prefix="/journal", tags=["Trade Journal & Paper Trading"])


class CloseTradeRequest(BaseModel):
    exit_price: Decimal
    exit_reason: str = "Target reached / Manual close"


@router.get("/user/{user_id}", response_model=List[TradeJournalResponse])
def list_user_trades(
    user_id: int,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    List all trades logged by a trader, optionally filtered by status ('OPEN', 'CLOSED').
    """
    return crud_trade_journal.get_by_user(db=db, user_id=user_id, status=status, limit=limit)


@router.get("/user/{user_id}/analytics", response_model=JournalAnalytics)
def get_user_performance_analytics(user_id: int, db: Session = Depends(get_db)):
    """
    Computes rigorous trading statistics:
    - Win Rate (%)
    - Net Realized PnL ($)
    - Average R-Multiple
    - Profit Factor (Gross Profits / Gross Losses)
    - Largest Winner / Loser
    """
    return crud_trade_journal.get_user_analytics(db=db, user_id=user_id)


@router.post("", response_model=TradeJournalResponse, status_code=status.HTTP_201_CREATED)
def record_trade_entry(entry_in: TradeJournalCreate, db: Session = Depends(get_db)):
    """
    Log a new simulated (paper) or live trade into the journal.
    """
    return crud_trade_journal.create(db=db, obj_in=entry_in)


@router.post("/{trade_id}/close", response_model=TradeJournalResponse)
def close_trade_entry(
    trade_id: int,
    req: CloseTradeRequest,
    db: Session = Depends(get_db),
):
    """
    Close an active trade, computing exact PnL ($), percentage return, and R-Multiple.
    """
    trade = crud_trade_journal.close_trade(
        db=db,
        entry_id=trade_id,
        exit_price=req.exit_price,
        exit_reason=req.exit_reason,
    )
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trade #{trade_id} not found",
        )
    return trade
