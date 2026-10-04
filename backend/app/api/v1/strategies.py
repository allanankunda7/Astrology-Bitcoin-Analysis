"""
Strategy Signals API Router
===========================
Provides REST endpoints to evaluate market data and generate deterministic
BUY, SELL, or WAIT trade signals with entry, stop loss, and target prices.
"""

from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.app.services.strategy_engine import StrategyEngine, TradeSignal, SignalSide
from backend.app.services.technical_indicators import CandleItem

router = APIRouter(prefix="/strategy", tags=["Trading Strategies & Signals"])


class StrategyEvaluationRequest(BaseModel):
    symbol: str = "BTC/USDT"
    strategy_name: str = "Pullback Continuation"
    candles: List[CandleItem]


@router.post("/evaluate", response_model=TradeSignal, status_code=status.HTTP_200_OK)
async def evaluate_trade_signal(payload: StrategyEvaluationRequest):
    """
    Evaluate market candles against the selected strategy to determine BUY / SELL / WAIT,
    exact entry price, invalidation stop-loss, and multi-tier targets.
    """
    if not payload.candles or len(payload.candles) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 20 historical candlestick bars are required to evaluate strategy indicators."
        )

    # Convert candles to DataFrame
    data_list = [c.model_dump() for c in payload.candles]
    df = pd.DataFrame(data_list)
    if "time" in df.columns:
        df.set_index("time", inplace=True)

    try:
        signal = StrategyEngine.evaluate_strategy(
            df=df,
            symbol=payload.symbol,
            strategy_name=payload.strategy_name
        )
        return signal
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating strategy: {str(exc)}"
        )


@router.get("/active-signal", response_model=TradeSignal, status_code=status.HTTP_200_OK)
async def get_active_signal(
    symbol: str = "BTC/USDT",
    strategy: str = "Pullback Continuation"
):
    """
    Returns active signal for standard market sample data for instant demonstration.
    """
    import numpy as np
    base = 88450.0
    candles = []
    for i in range(80):
        drift = i * 45
        osc = np.sin(i * 0.3) * 450
        close = base - 3500 + drift + osc
        candles.append(
            CandleItem(
                time=f"2026-10-01T{i%24:02d}:00:00Z",
                open=close - 80,
                high=close + 180,
                low=close - 120,
                close=close,
                volume=1800000 + abs(osc) * 500
            )
        )

    req = StrategyEvaluationRequest(symbol=symbol, strategy_name=strategy, candles=candles)
    return await evaluate_trade_signal(req)
