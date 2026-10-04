"""
backend/tests/test_phase4_structure.py
Comprehensive Unit Test Suite for Phase 4:
- Fractal swing high & swing low extraction
- Structural pivot classification (HH, HL, LH, LL)
- Break of Structure (BOS) trend continuation
- Change of Character (CHoCH) trend reversal
- Liquidity sweeps (wick overshoot without body close)
- Support & Resistance clustering into reaction zones
- Multi-method pivot point formulas (Classical, Fibonacci, Camarilla)
"""

from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
import pytest

from backend.app.services.market_structure import (
    MarketStructureEngine, StructureConfig, SwingPoint
)


def test_swing_point_fractal_detection():
    """
    Verifies that local extrema with N-bar clearance on left and right are detected as swings.
    """
    # Create a clear peak at index 3 and a clear trough at index 7
    # 0, 1, 2, 3(peak), 4, 5, 6, 7(trough), 8, 9, 10
    prices = [100, 102, 104, 110, 106, 103, 98, 92, 95, 99, 102]
    dates = [datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(hours=4 * i) for i in range(len(prices))]

    df = pd.DataFrame({
        "timestamp": dates,
        "open": prices,
        "high": [p + 1.0 for p in prices],
        "low": [p - 1.0 for p in prices],
        "close": prices,
        "volume": [1000] * len(prices),
    })

    # Window = 2 bars
    sh, sl = MarketStructureEngine.find_swing_points(df, window=2)

    assert len(sh) >= 1
    # Highest high is at index 3 (high=111.0)
    assert any(h["index"] == 3 for h in sh)

    assert len(sl) >= 1
    # Lowest low is at index 7 (low=91.0)
    assert any(l["index"] == 7 for l in sl)


def test_swing_classification_hh_hl_lh_ll():
    """
    Verifies sequential classification of swing points:
    High 1: 100, High 2: 110 (HH)
    Low 1: 90, Low 2: 95 (HL)
    """
    swing_highs = [
        {"index": 2, "price": 100.0, "timestamp": "2026-01-01", "type": "HIGH"},
        {"index": 6, "price": 110.0, "timestamp": "2026-01-02", "type": "HIGH"},
        {"index": 10, "price": 105.0, "timestamp": "2026-01-03", "type": "HIGH"},
    ]
    swing_lows = [
        {"index": 4, "price": 90.0, "timestamp": "2026-01-01", "type": "LOW"},
        {"index": 8, "price": 95.0, "timestamp": "2026-01-02", "type": "LOW"},
        {"index": 12, "price": 85.0, "timestamp": "2026-01-03", "type": "LOW"},
    ]

    classified = MarketStructureEngine.classify_swings(swing_highs, swing_lows)

    highs_classified = [s for s in classified if s.point_type == "HIGH"]
    lows_classified = [s for s in classified if s.point_type == "LOW"]

    assert highs_classified[1].classification == "HH"  # 110 > 100
    assert highs_classified[2].classification == "LH"  # 105 < 110

    assert lows_classified[1].classification == "HL"   # 95 > 90
    assert lows_classified[2].classification == "LL"   # 85 < 95


def test_bos_and_choch_events():
    """
    Verifies detection of:
    - Bullish BOS: Price closes above previous swing high
    - Bearish CHoCH: Price breaks below previous swing low, reversing trend
    """
    classified_swings = [
        SwingPoint(index=2, timestamp="2026-01-01", price=100.0, point_type="HIGH", classification="HIGH"),
        SwingPoint(index=4, timestamp="2026-01-02", price=90.0, point_type="LOW", classification="LOW"),
    ]

    # Create price bars where bar 5 breaks above swing high (100.0) -> Bullish BOS
    # and bar 8 breaks below swing low (90.0) -> Bearish CHoCH
    bars = [
        {"timestamp": "2026-01-01", "open": 95, "high": 96, "low": 94, "close": 95},
        {"timestamp": "2026-01-02", "open": 95, "high": 97, "low": 94, "close": 96},
        {"timestamp": "2026-01-03", "open": 98, "high": 100, "low": 97, "close": 99}, # Sw High
        {"timestamp": "2026-01-04", "open": 97, "high": 98, "low": 92, "close": 93},
        {"timestamp": "2026-01-05", "open": 93, "high": 94, "low": 90, "close": 91}, # Sw Low
        {"timestamp": "2026-01-06", "open": 95, "high": 104, "low": 94, "close": 103}, # Bullish BOS
        {"timestamp": "2026-01-07", "open": 102, "high": 103, "low": 93, "close": 94},
        {"timestamp": "2026-01-08", "open": 93, "high": 94, "low": 86, "close": 87},   # Bearish CHoCH
    ]
    df = pd.DataFrame(bars)

    events = MarketStructureEngine.detect_bos_and_choch(df, classified_swings, require_close=True)

    assert len(events) >= 2
    assert events[0].event_type == "BOS_BULLISH"
    assert events[0].broken_level == 100.0

    assert events[1].event_type == "CHOCH_BEARISH"
    assert events[1].broken_level == 90.0


def test_liquidity_sweep_detection():
    """
    Verifies that a candle whose high exceeds a swing high, but whose close finishes
    below the swing high, is recognized as a Liquidity Sweep.
    """
    classified_swings = [
        SwingPoint(index=2, timestamp="2026-01-01", price=100.0, point_type="HIGH", classification="HIGH"),
    ]

    # Bar 5: High = 102.5 (+2.5% sweep), but Close = 98.0 (failed break)
    bars = [
        {"timestamp": "2026-01-01", "open": 95, "high": 96, "low": 94, "close": 95},
        {"timestamp": "2026-01-02", "open": 95, "high": 97, "low": 94, "close": 96},
        {"timestamp": "2026-01-03", "open": 98, "high": 100, "low": 97, "close": 99}, # Sw High
        {"timestamp": "2026-01-04", "open": 97, "high": 98, "low": 95, "close": 96},
        {"timestamp": "2026-01-05", "open": 96, "high": 97, "low": 95, "close": 96},
        {"timestamp": "2026-01-06", "open": 97, "high": 102.5, "low": 96, "close": 98.0}, # Sweep
    ]
    df = pd.DataFrame(bars)

    sweeps = MarketStructureEngine.detect_liquidity_sweeps(df, classified_swings)

    assert len(sweeps) == 1
    assert sweeps[0].event_type == "LIQUIDITY_SWEEP_HIGH"
    assert sweeps[0].broken_level == 100.0
    assert sweeps[0].trigger_price == 102.5


def test_support_resistance_clustering():
    """
    Verifies that nearby swing levels (within tolerance percentage)
    are merged into dynamic reaction zones.
    """
    swings = [
        SwingPoint(index=1, timestamp="1", price=100.0, point_type="HIGH", classification="HIGH"),
        SwingPoint(index=3, timestamp="2", price=100.3, point_type="HIGH", classification="HH"),
        SwingPoint(index=5, timestamp="3", price=85.0, point_type="LOW", classification="LOW"),
        SwingPoint(index=7, timestamp="4", price=85.2, point_type="LOW", classification="HL"),
    ]

    current_price = 92.0
    sup_zones, res_zones = MarketStructureEngine.calculate_support_resistance_zones(
        swings, current_price, tolerance_pct=0.5
    )

    # 100.0 and 100.3 are clustered into 1 resistance zone
    assert len(res_zones) == 1
    assert res_zones[0].touch_count == 2
    assert 99.0 <= res_zones[0].mid_price <= 101.0

    # 85.0 and 85.2 are clustered into 1 support zone
    assert len(sup_zones) == 1
    assert sup_zones[0].touch_count == 2
    assert 84.0 <= sup_zones[0].mid_price <= 86.0


def test_classical_pivot_formulas():
    """
    Verifies standard floor pivot calculation mathematics:
    P = (H + L + C) / 3
    R1 = 2P - L, S1 = 2P - H
    """
    pivots = MarketStructureEngine.calculate_classical_pivots(high=100.0, low=80.0, close=90.0)

    # P = (100 + 80 + 90) / 3 = 90.0
    assert pivots.pivot == 90.0
    # R1 = 2*90 - 80 = 100.0
    assert pivots.r1 == 100.0
    # S1 = 2*90 - 100 = 80.0
    assert pivots.s1 == 80.0
    # R2 = 90 + (100 - 80) = 110.0
    assert pivots.r2 == 110.0
    # S2 = 90 - (100 - 80) = 70.0
    assert pivots.s2 == 70.0
