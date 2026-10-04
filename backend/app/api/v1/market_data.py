"""
Market Data Ingestion & Technical Indicators API (Phase 3)
==========================================================
Provides endpoints for:
1. Fetching standardized OHLCV candles via CCXT / Multi-Market Pipeline
2. Multi-Timeframe Resampling (1m -> 5m, 15m, 1h, 4h, 1D, 1W)
3. Live WebSocket Telemetry & Stream Status
4. Vectorized Technical Indicators Computation (Trend, Momentum, Volatility, Volume)
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field
import pandas as pd

from backend.app.services.ccxt_pipeline import ccxt_pipeline
from backend.app.services.timeframe_aggregator import TimeframeAggregator
from backend.app.services.websocket_feed import binance_ws_feed
from backend.app.services.technical_indicators import (
    TechnicalIndicatorService, IndicatorConfig
)

router = APIRouter(prefix="/market-data", tags=["Market Data & Ingestion Pipeline"])


class ResampleRequest(BaseModel):
    source_timeframe: str = "1m"
    target_timeframe: str = "4h"
    candles: List[Dict[str, Any]]


class IndicatorsComputeRequest(BaseModel):
    symbol: str = "BTC/USDT"
    timeframe: str = "4h"
    candles: Optional[List[Dict[str, Any]]] = None
    config: Optional[IndicatorConfig] = None


@router.get("/candles")
def get_market_candles(
    symbol: str = Query("BTC/USDT", description="Market asset symbol (e.g. BTC/USDT, ETH/USDT, XAU/USD)"),
    timeframe: str = Query("4h", description="Candle interval (1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W)"),
    limit: int = Query(200, ge=10, le=1000, description="Number of bars to retrieve"),
):
    """
    Fetches clean, standardized OHLCV candles via CCXT with automatic fallback.
    """
    df = ccxt_pipeline.fetch_historical_ohlcv(symbol=symbol, timeframe=timeframe, limit=limit)
    candles = []
    for _, row in df.iterrows():
        candles.append({
            "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
            "vwap": float(row["vwap"]) if "vwap" in row else None,
            "is_closed": int(row.get("is_closed", 1)),
        })

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(candles),
        "source": "CCXT Pipeline (Binance / Macro)",
        "candles": candles,
    }


@router.post("/resample")
def resample_market_candles(req: ResampleRequest):
    """
    Resamples high-frequency base candles (e.g. 1m) into a target timeframe (e.g. 15m or 4h).
    Enforces strict UTC boundaries, VWAP math, and bar-completion detection.
    """
    if not req.candles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candle array cannot be empty for resampling"
        )

    df = pd.DataFrame(req.candles)
    resampled_df = TimeframeAggregator.resample_ohlcv(
        df=df,
        target_timeframe=req.target_timeframe
    )

    results = []
    for _, row in resampled_df.iterrows():
        results.append({
            "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
            "vwap": float(row["vwap"]) if pd.notnull(row["vwap"]) else None,
            "is_closed": int(row["is_closed"]),
        })

    return {
        "source_timeframe": req.source_timeframe,
        "target_timeframe": req.target_timeframe,
        "input_bars": len(req.candles),
        "resampled_bars": len(results),
        "candles": results,
    }


@router.get("/stream-telemetry")
def get_stream_telemetry():
    """
    Returns real-time health telemetry of the WebSocket ingestion pipeline.
    """
    return binance_ws_feed.get_telemetry()


@router.post("/indicators/compute")
def compute_technical_indicators(req: IndicatorsComputeRequest):
    """
    Computes complete multi-category technical indicators on the specified candle dataset.
    If no candles are provided in the payload, automatically fetches them via CCXT pipeline.
    """
    if req.candles and len(req.candles) > 0:
        df = pd.DataFrame(req.candles)
    else:
        df = ccxt_pipeline.fetch_historical_ohlcv(
            symbol=req.symbol,
            timeframe=req.timeframe,
            limit=250
        )

    computed_df = TechnicalIndicatorService.compute_all(df=df, config=req.config)

    # Convert DataFrame to records, replacing NaN with None for clean JSON serialization
    clean_records = computed_df.replace({np.nan: None}).to_dict(orient="records")

    # Serialize any timestamp objects
    for row in clean_records:
        for k, v in row.items():
            if hasattr(v, "isoformat"):
                row[k] = v.isoformat()

    latest_bar = clean_records[-1] if clean_records else {}

    return {
        "symbol": req.symbol,
        "timeframe": req.timeframe,
        "total_bars": len(clean_records),
        "latest_metrics": {
            "close": latest_bar.get("Close") or latest_bar.get("close"),
            "rsi_14": latest_bar.get("RSI"),
            "macd": latest_bar.get("MACD"),
            "macd_signal": latest_bar.get("MACD_Signal"),
            "macd_hist": latest_bar.get("MACD_Hist"),
            "adx_14": latest_bar.get("ADX"),
            "plus_di": latest_bar.get("Plus_DI"),
            "minus_di": latest_bar.get("Minus_DI"),
            "atr_14": latest_bar.get("ATR"),
            "atr_pct": latest_bar.get("ATR_Pct"),
            "bb_upper": latest_bar.get("BB_Upper"),
            "bb_middle": latest_bar.get("BB_Middle"),
            "bb_lower": latest_bar.get("BB_Lower"),
            "stoch_k": latest_bar.get("STOCH_K"),
            "stoch_d": latest_bar.get("STOCH_D"),
            "rvol": latest_bar.get("RVOL"),
            "volume_spike": latest_bar.get("Volume_Spike"),
            "vwap": latest_bar.get("VWAP"),
        },
        "indicators": clean_records,
    }
