"""
Technical Indicators API Router
==============================
Provides REST endpoints to calculate SMA, EMA, RSI, and MACD indicators
using the TechnicalIndicatorService.
"""

from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.app.services.technical_indicators import (
    TechnicalIndicatorService,
    IndicatorConfig,
    CandleItem,
)

router = APIRouter(prefix="/indicators", tags=["Technical Analysis"])


class IndicatorComputeRequest(BaseModel):
    candles: List[CandleItem]
    config: Optional[IndicatorConfig] = None


class IndicatorComputeResponse(BaseModel):
    total_bars: int
    summary: dict
    latest_bar: dict
    data: List[dict]


@router.post("/compute", response_model=IndicatorComputeResponse, status_code=status.HTTP_200_OK)
async def compute_indicators(payload: IndicatorComputeRequest):
    """
    Calculate SMA, EMA, RSI, and MACD technical indicators on provided candlestick time series.
    """
    if not payload.candles or len(payload.candles) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 candlestick bars are required to compute indicators."
        )

    # Convert candles to DataFrame
    data_list = [c.model_dump() for c in payload.candles]
    df = pd.DataFrame(data_list)

    if "time" in df.columns:
        df.set_index("time", inplace=True)

    try:
        cfg = payload.config or IndicatorConfig()
        result_df = TechnicalIndicatorService.compute_all(df, cfg)
        summary = TechnicalIndicatorService.get_summary_signal(df, cfg)
        records = TechnicalIndicatorService.to_dict_records(result_df)

        return {
            "total_bars": len(records),
            "summary": summary,
            "latest_bar": records[-1] if records else {},
            "data": records,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing technical indicators: {str(exc)}"
        )


@router.get("/sample", status_code=status.HTTP_200_OK)
async def get_sample_indicators():
    """
    Demonstration endpoint computing indicators on synthetic BTC price data.
    """
    # Generate 50 realistic sample bars
    import numpy as np
    base = 85000.0
    candles = []
    for i in range(60):
        change = np.sin(i * 0.4) * 600 + (i * 80)
        close = base + change
        candles.append(
            CandleItem(
                time=f"2026-10-01T{i%24:02d}:00:00Z",
                open=close - 120,
                high=close + 250,
                low=close - 200,
                close=close,
                volume=1500000 + abs(change) * 200,
            )
        )

    req = IndicatorComputeRequest(candles=candles)
    return await compute_indicators(req)
