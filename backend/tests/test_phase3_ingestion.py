"""
backend/tests/test_phase3_ingestion.py
Comprehensive Unit Test Suite for Phase 3:
- Multi-timeframe OHLCV resampling & aggregation math
- Lookahead bias prevention filter
- Technical indicator accuracy (EMA, RSI, MACD, Bollinger Bands, ATR, ADX, RVOL)
- Binance WebSocket kline payload normalization
"""

import json
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
import pytest

from backend.app.services.timeframe_aggregator import TimeframeAggregator
from backend.app.services.technical_indicators import TechnicalIndicatorService, IndicatorConfig
from backend.app.services.websocket_feed import BinanceWebSocketFeed
from backend.app.services.ccxt_pipeline import CCXTMarketDataPipeline


def test_timeframe_resampling_math():
    """
    Verifies that multi-timeframe aggregation accurately preserves:
    - First bar open
    - Highest high across period
    - Lowest low across period
    - Last bar close
    - Volume sum
    """
    base_time = datetime(2026, 10, 2, 4, 0, 0, tzinfo=timezone.utc)
    one_min_bars = []

    # Create 5 1-minute bars
    prices = [
        {"o": 100.0, "h": 102.0, "l": 99.0, "c": 101.5, "v": 10.0},
        {"o": 101.5, "h": 105.0, "l": 101.0, "c": 104.0, "v": 20.0},
        {"o": 104.0, "h": 106.0, "l": 103.5, "c": 105.5, "v": 15.0},
        {"o": 105.5, "h": 105.8, "l": 98.0, "c": 99.5, "v": 25.0},
        {"o": 99.5, "h": 102.0, "l": 99.0, "c": 101.0, "v": 30.0},
    ]

    for i, p in enumerate(prices):
        one_min_bars.append({
            "timestamp": base_time + timedelta(minutes=i),
            "open": p["o"],
            "high": p["h"],
            "low": p["l"],
            "close": p["c"],
            "volume": p["v"],
        })

    df = pd.DataFrame(one_min_bars)
    resampled = TimeframeAggregator.resample_ohlcv(df, target_timeframe="5m")

    assert len(resampled) == 1
    bar = resampled.iloc[0]

    assert bar["open"] == 100.0          # First bar Open
    assert bar["high"] == 106.0          # Max High (bar 3)
    assert bar["low"] == 98.0            # Min Low (bar 4)
    assert bar["close"] == 101.0         # Last bar Close (bar 5)
    assert bar["volume"] == 100.0        # 10 + 20 + 15 + 25 + 30 = 100
    assert bar["vwap"] is not None


def test_lookahead_bias_prevention():
    """
    Verifies that unclosed forming bars are filtered out of the dataset
    when querying for historical backtests and setup scoring.
    """
    df = pd.DataFrame([
        {"timestamp": "2026-10-02T00:00:00Z", "close": 100.0, "is_closed": 1},
        {"timestamp": "2026-10-02T04:00:00Z", "close": 105.0, "is_closed": 1},
        {"timestamp": "2026-10-02T08:00:00Z", "close": 108.0, "is_closed": 0}, # In progress
    ])

    backtest_data = TimeframeAggregator.get_closed_candles_for_backtest(df)
    assert len(backtest_data) == 2
    assert (backtest_data["is_closed"] == 1).all()


def test_technical_indicator_suite():
    """
    Verifies mathematical properties of Trend, Momentum, Volatility, and Volume indicators.
    """
    np.random.seed(123)
    n = 60
    base = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, n))
    highs = base + np.abs(np.random.normal(0.5, 0.2, n))
    lows = base - np.abs(np.random.normal(0.5, 0.2, n))
    volumes = np.random.uniform(500, 2500, n)

    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=n, freq="4h"),
        "open": base,
        "high": highs,
        "low": lows,
        "close": base,
        "volume": volumes,
    })

    result = TechnicalIndicatorService.compute_all(df)

    # 1. EMA
    assert "EMA_21" in result.columns
    assert pd.notnull(result["EMA_21"].iloc[-1])

    # 2. RSI (bounded between 0 and 100)
    assert "RSI" in result.columns
    valid_rsi = result["RSI"].dropna()
    assert (valid_rsi >= 0).all() and (valid_rsi <= 100).all()

    # 3. MACD: Histogram = MACD - Signal
    assert "MACD" in result.columns
    assert "MACD_Signal" in result.columns
    assert "MACD_Hist" in result.columns
    last_row = result.iloc[-1]
    expected_hist = last_row["MACD"] - last_row["MACD_Signal"]
    assert np.isclose(last_row["MACD_Hist"], expected_hist, atol=1e-5)

    # 4. Bollinger Bands: Upper > Middle > Lower
    assert "BB_Upper" in result.columns
    assert "BB_Middle" in result.columns
    assert "BB_Lower" in result.columns
    assert last_row["BB_Upper"] > last_row["BB_Middle"] > last_row["BB_Lower"]

    # 5. ATR: strictly non-negative
    assert "ATR" in result.columns
    valid_atr = result["ATR"].dropna()
    assert (valid_atr > 0).all()

    # 6. Volume RVOL & Spike
    assert "RVOL" in result.columns
    assert "Volume_Spike" in result.columns
    assert isinstance(bool(last_row["Volume_Spike"]), bool)


def test_binance_websocket_kline_parser():
    """
    Verifies that raw Binance kline JSON payloads are parsed into standard schema.
    """
    raw_payload = {
        "e": "kline",
        "E": 1727856000000,
        "s": "BTCUSDT",
        "k": {
            "t": 1727856000000,
            "T": 1727856059999,
            "s": "BTCUSDT",
            "i": "1m",
            "f": 100,
            "L": 200,
            "o": "88400.00",
            "c": "88450.50",
            "h": "88470.00",
            "l": "88390.00",
            "v": "14.250",
            "n": 45,
            "x": False,
            "q": "1260450.00",
            "V": "7.100",
            "Q": "628000.00",
            "B": "0"
        }
    }

    feed = BinanceWebSocketFeed()
    parsed = feed.parse_kline_payload(json.dumps(raw_payload))

    assert parsed is not None
    assert parsed["symbol"] == "BTCUSDT"
    assert parsed["timeframe"] == "1m"
    assert parsed["open"] == 88400.00
    assert parsed["high"] == 88470.00
    assert parsed["low"] == 88390.00
    assert parsed["close"] == 88450.50
    assert parsed["volume"] == 14.25
    assert parsed["is_closed"] == 0
    assert feed.message_count == 1
    assert feed.last_price == 88450.50
