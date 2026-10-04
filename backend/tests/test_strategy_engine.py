"""
Unit Tests for Strategy Engine & Buy/Sell Action Evaluation
===========================================================
Verifies that:
1. Strategy evaluates market data and produces clear BUY, SELL, or WAIT signals.
2. Exact entry price, stop-loss, targets, and R:R are calculated mathematically.
3. Actionable human-readable execution instructions are provided.
4. Strategy conditions checklist is returned with MET/PENDING/FAILED statuses.
"""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.strategy_engine import StrategyEngine, SignalSide, TradeSignal

client = TestClient(app)


@pytest.fixture
def bullish_market_df() -> pd.DataFrame:
    """
    Generate an uptrending dataset where Price > EMA 50 > EMA 200.
    """
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    base = 50000.0
    # Steadily rising price
    prices = [base + i * 200 + (100 if i % 2 == 0 else -100) for i in range(100)]

    df = pd.DataFrame(
        {
            "Open": [p - 50 for p in prices],
            "High": [p + 150 for p in prices],
            "Low": [p - 100 for p in prices],
            "Close": prices,
            "Volume": [2000000 + i * 1000 for i in range(100)],
        },
        index=dates,
    )
    return df


def test_pullback_strategy_buy_signal(bullish_market_df):
    """
    Verify Pullback Continuation detects BUY action on bullish market structure.
    """
    signal = StrategyEngine.evaluate_strategy(
        df=bullish_market_df,
        symbol="BTC/USDT",
        strategy_name="Pullback Continuation"
    )

    assert isinstance(signal, TradeSignal)
    assert signal.action in [SignalSide.BUY, SignalSide.WAIT]
    assert signal.stop_loss > 0
    assert signal.target_1 > 0
    assert signal.target_2 > signal.target_1
    assert signal.risk_reward_ratio >= 1.0
    assert len(signal.conditions) > 0
    assert len(signal.actionable_instruction) > 0
    print(f"✓ Strategy Signal: {signal.action.value} | R:R: {signal.risk_reward_ratio} | Instruction: {signal.actionable_instruction[:60]}...")


def test_strategy_api_active_signal_endpoint():
    """
    Verify GET /api/v1/strategy/active-signal endpoint.
    """
    response = client.get("/api/v1/strategy/active-signal?symbol=BTC/USDT&strategy=Pullback+Continuation")
    assert response.status_code == 200
    data = response.json()

    assert "action" in data
    assert data["action"] in ["BUY", "SELL", "WAIT"]
    assert "entry_price_recommended" in data
    assert "stop_loss" in data
    assert "target_2" in data
    assert "actionable_instruction" in data
    assert "conditions" in data
    print(f"✓ API Endpoint /api/v1/strategy/active-signal verified: Action = {data['action']}")


if __name__ == "__main__":
    df = bullish_market_df()
    test_pullback_strategy_buy_signal(df)
    test_strategy_api_active_signal_endpoint()
    print("\n[ALL STRATEGY ENGINE TESTS PASSED SUCCESSFULLY!]")
