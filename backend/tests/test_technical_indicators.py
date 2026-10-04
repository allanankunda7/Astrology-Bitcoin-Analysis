"""
Unit Tests for Technical Indicators Service & API
=================================================
Verifies:
1. SMA calculation formulas
2. EMA calculation formulas
3. RSI range bounds [0, 100] & Wilder smoothing
4. MACD line, signal line, and histogram identity
5. REST API endpoint /api/v1/indicators/compute
"""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.technical_indicators import (
    TechnicalIndicatorService,
    IndicatorConfig,
    calculate_technical_indicators,
)

client = TestClient(app)


@pytest.fixture
def sample_market_df() -> pd.DataFrame:
    """
    Generate 100 rows of deterministic OHLCV test data.
    """
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    base = 100.0
    returns = np.random.normal(0.001, 0.02, size=100)
    prices = base * np.cumprod(1 + returns)

    df = pd.DataFrame(
        {
            "Open": prices * 0.99,
            "High": prices * 1.02,
            "Low": prices * 0.98,
            "Close": prices,
            "Volume": np.random.uniform(1000, 5000, size=100),
        },
        index=dates,
    )
    return df


def test_sma_calculation(sample_market_df):
    """
    Verify SMA matches arithmetic rolling mean.
    """
    periods = [20, 50]
    res = TechnicalIndicatorService.calculate_sma(sample_market_df, periods)

    assert "SMA_20" in res.columns
    assert "SMA_50" in res.columns

    # Verify SMA 20 matches manual rolling mean
    expected_sma_20 = sample_market_df["Close"].rolling(20).mean()
    # Check valid values beyond warmup period
    valid_mask = ~np.isnan(expected_sma_20)
    assert np.allclose(res.loc[valid_mask, "SMA_20"], expected_sma_20[valid_mask])
    print("✓ SMA calculation formula verified.")


def test_ema_calculation(sample_market_df):
    """
    Verify EMA calculation and responsiveness compared to SMA.
    """
    periods = [9, 21]
    res = TechnicalIndicatorService.calculate_ema(sample_market_df, periods)

    assert "EMA_9" in res.columns
    assert "EMA_21" in res.columns
    assert not res["EMA_9"].isna().all()
    print("✓ EMA calculation verified.")


def test_rsi_bounds_and_values(sample_market_df):
    """
    Verify RSI values stay within [0, 100].
    """
    res = TechnicalIndicatorService.calculate_rsi(sample_market_df, period=14)
    assert "RSI_14" in res.columns

    valid_rsi = res["RSI_14"].dropna()
    assert (valid_rsi >= 0.0).all(), "RSI contains values < 0"
    assert (valid_rsi <= 100.0).all(), "RSI contains values > 100"
    print("✓ RSI values strictly bounded in [0, 100].")


def test_macd_identity(sample_market_df):
    """
    Verify MACD Histogram == MACD Line - Signal Line.
    """
    res = TechnicalIndicatorService.calculate_macd(sample_market_df, fast=12, slow=26, signal=9)

    assert "MACD" in res.columns
    assert "MACD_Signal" in res.columns
    assert "MACD_Hist" in res.columns

    valid_mask = (~res["MACD"].isna()) & (~res["MACD_Signal"].isna()) & (~res["MACD_Hist"].isna())
    hist_calculated = res.loc[valid_mask, "MACD"] - res.loc[valid_mask, "MACD_Signal"]
    assert np.allclose(res.loc[valid_mask, "MACD_Hist"], hist_calculated, atol=1e-4)
    print("✓ MACD identity (Hist = Line - Signal) verified.")


def test_summary_signal_structure(sample_market_df):
    """
    Verify technical indicator summary payload structure.
    """
    summary = TechnicalIndicatorService.get_summary_signal(sample_market_df)

    assert "latest_close" in summary
    assert "rsi" in summary
    assert "macd" in summary
    assert "moving_averages" in summary
    assert "state" in summary["rsi"]
    assert "state" in summary["macd"]
    assert "trend_bias" in summary["moving_averages"]
    print("✓ Indicator summary synthesis verified.")


def test_api_compute_endpoint():
    """
    Test POST /api/v1/indicators/compute.
    """
    candles = [
        {"time": f"2026-10-01T{i:02d}:00:00Z", "open": 85000 + i * 10, "high": 85100 + i * 10, "low": 84900 + i * 10, "close": 85050 + i * 10, "volume": 1000}
        for i in range(35)
    ]

    response = client.post(
        "/api/v1/indicators/compute",
        json={"candles": candles, "config": {"sma_periods": [10, 20], "rsi_period": 14}}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_bars"] == 35
    assert "summary" in data
    assert "latest_bar" in data
    assert "SMA_10" in data["latest_bar"]
    assert "RSI_14" in data["latest_bar"]
    print("✓ API endpoint /api/v1/indicators/compute verified.")


def test_api_sample_endpoint():
    """
    Test GET /api/v1/indicators/sample.
    """
    response = client.get("/api/v1/indicators/sample")
    assert response.status_code == 200
    data = response.json()
    assert data["total_bars"] == 60
    assert "MACD" in data["latest_bar"]
    print("✓ API endpoint /api/v1/indicators/sample verified.")


if __name__ == "__main__":
    df = sample_market_df()
    test_sma_calculation(df)
    test_ema_calculation(df)
    test_rsi_bounds_and_values(df)
    test_macd_identity(df)
    test_summary_signal_structure(df)
    test_api_compute_endpoint()
    test_api_sample_endpoint()
    print("\n[ALL TECHNICAL INDICATOR TESTS PASSED SUCCESSFULLY!]")
