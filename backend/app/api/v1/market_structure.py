"""
Market Structure & Support/Resistance API (Phase 4)
===================================================
Provides endpoints for:
1. Automated algorithmic market structure analysis (HH, HL, LH, LL)
2. Break of Structure (BOS) & Change of Character (CHoCH) event detection
3. Liquidity Sweeps (Wick breaches with candle body rejections)
4. Dynamic Support & Resistance reaction zones with clustering tolerance
5. Classical & Multi-Method Pivot Points
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field
import pandas as pd

from backend.app.services.market_structure import (
    market_structure_engine, StructureConfig, MarketStructureAnalysisResult
)
from backend.app.services.ccxt_pipeline import ccxt_pipeline

router = APIRouter(prefix="/market-structure", tags=["Market Structure & Key Levels"])


class StructureAnalyzeRequest(BaseModel):
    symbol: str = "BTC/USDT"
    timeframe: str = "4h"
    candles: Optional[List[Dict[str, Any]]] = None
    config: Optional[StructureConfig] = None


@router.post("/analyze", response_model=MarketStructureAnalysisResult)
def analyze_market_structure(req: StructureAnalyzeRequest):
    """
    Executes algorithmic market structure detection:
    - Extracts fractal swing points (HH, HL, LH, LL)
    - Detects Break of Structure (BOS) trend continuation
    - Detects Change of Character (CHoCH) trend reversal
    - Flags Liquidity Sweeps
    - Clusters dynamic Support and Resistance reaction zones
    """
    if req.candles and len(req.candles) >= 15:
        df = pd.DataFrame(req.candles)
    else:
        df = ccxt_pipeline.fetch_historical_ohlcv(
            symbol=req.symbol,
            timeframe=req.timeframe,
            limit=120
        )

    if len(df) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 15 candlestick bars required for reliable market structure fractal detection"
        )

    return market_structure_engine.analyze_structure(df=df, config=req.config)


@router.get("/pivots")
def get_pivot_points(
    high: float = Query(..., description="Period high price"),
    low: float = Query(..., description="Period low price"),
    close: float = Query(..., description="Period close price"),
):
    """
    Calculates Classical Floor, Fibonacci, and Camarilla pivot points from High, Low, and Close.
    """
    # 1. Classical
    p = (high + low + close) / 3.0
    r1_classic = (2.0 * p) - low
    s1_classic = (2.0 * p) - high
    r2_classic = p + (high - low)
    s2_classic = p - (high - low)
    r3_classic = high + 2.0 * (p - low)
    s3_classic = low - 2.0 * (high - p)

    # 2. Fibonacci Pivots
    rng = high - low
    r1_fib = p + (0.382 * rng)
    r2_fib = p + (0.618 * rng)
    r3_fib = p + (1.000 * rng)
    s1_fib = p - (0.382 * rng)
    s2_fib = p - (0.618 * rng)
    s3_fib = p - (1.000 * rng)

    # 3. Camarilla Pivots
    r1_cam = close + (rng * 1.1 / 12.0)
    r2_cam = close + (rng * 1.1 / 6.0)
    r3_cam = close + (rng * 1.1 / 4.0)
    r4_cam = close + (rng * 1.1 / 2.0)
    s1_cam = close - (rng * 1.1 / 12.0)
    s2_cam = close - (rng * 1.1 / 6.0)
    s3_cam = close - (rng * 1.1 / 4.0)
    s4_cam = close - (rng * 1.1 / 2.0)

    return {
        "classical": {
            "pivot": round(p, 2), "r1": round(r1_classic, 2), "r2": round(r2_classic, 2), "r3": round(r3_classic, 2),
            "s1": round(s1_classic, 2), "s2": round(s2_classic, 2), "s3": round(s3_classic, 2)
        },
        "fibonacci": {
            "pivot": round(p, 2), "r1": round(r1_fib, 2), "r2": round(r2_fib, 2), "r3": round(r3_fib, 2),
            "s1": round(s1_fib, 2), "s2": round(s2_fib, 2), "s3": round(s3_fib, 2)
        },
        "camarilla": {
            "r1": round(r1_cam, 2), "r2": round(r2_cam, 2), "r3": round(r3_cam, 2), "r4": round(r4_cam, 2),
            "s1": round(s1_cam, 2), "s2": round(s2_cam, 2), "s3": round(s3_cam, 2), "s4": round(s4_cam, 2)
        },
        "range": round(rng, 2),
    }
