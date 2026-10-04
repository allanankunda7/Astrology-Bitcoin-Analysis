"""
backend/tests/test_phase5_scoring.py
Comprehensive Unit Test Suite for Phase 5:
- Multi-Factor Confluence Scoring (0-10) across 5 dimensions
- Grade Assignment (Grade A, B, C, Unqualified)
- Dynamic Entry Zones, Structural Invalidation SL & Multi-Target R:R
- Institutional Fixed-Fractional Position Sizing Math & Liquidation Safety
- Trade Expectancy & Kelly Criterion Mathematical Modeling
- Live Multi-Asset Presets Verification
"""
import math
from backend.app.services.setup_scoring import (
    setup_scoring_engine,
    PositionSizingInput,
    ExpectancyInput,
)


def approx_eq(a: float, b: float, tol: float = 0.05) -> bool:
    return abs(a - b) <= tol or math.isclose(a, b, rel_tol=1e-2)


def test_multifactor_scoring_grade_a():
    """
    Test setup scoring with prime institutional alignment (expect Grade A >= 8.5).
    """
    score = setup_scoring_engine.calculate_score(
        trend_aligned=True,
        adx_strength=32.0,
        structure_bos_confirmed=True,
        structure_regime="STRONG_UPTREND",
        at_key_reaction_zone=True,
        reaction_zone_strength="STRONG",
        rsi_value=55.0,
        macd_momentum_bullish=True,
        rvol=1.8,
        liquidity_sweep_confirmed=True,
        direction="LONG"
    )

    assert score.total_score >= 8.5
    assert score.grade == "GRADE_A"
    assert score.trade_bias == "LONG"
    assert len(score.factors) == 5
    for f in score.factors:
        assert 0.0 <= f.score <= 2.0


def test_multifactor_scoring_unqualified():
    """
    Test low confluence scenario: choppy market, counter-trend, low volume.
    Expect UNQUALIFIED grade (< 5.0) and NO_TRADE bias.
    """
    score = setup_scoring_engine.calculate_score(
        trend_aligned=False,
        adx_strength=12.0,
        structure_bos_confirmed=False,
        structure_regime="RANGING",
        at_key_reaction_zone=False,
        reaction_zone_strength="WEAK",
        rsi_value=50.0,
        macd_momentum_bullish=False,
        rvol=0.7,
        liquidity_sweep_confirmed=False,
        direction="LONG"
    )

    assert score.total_score < 5.0
    assert score.grade == "UNQUALIFIED"
    assert score.trade_bias == "NO_TRADE"


def test_long_trade_plan_mechanics():
    """
    Test long trade plan entry brackets, structural invalidation, and profit targets.
    """
    current_price = 88400.0
    swing_low = 85650.0
    atr = 1380.0

    plan = setup_scoring_engine.generate_trade_plan(
        symbol="BTC/USDT",
        current_price=current_price,
        direction="LONG",
        atr=atr,
        recent_swing_low=swing_low,
        recent_swing_high=93200.0,
        timeframe="4h"
    )

    # Invalidation SL must be strictly below swing low and cushioned by 0.5 * ATR
    expected_sl = swing_low - (0.5 * atr)
    assert approx_eq(plan.invalidation_stop_loss, expected_sl, tol=1.0)
    assert plan.invalidation_stop_loss < current_price

    # Entry zone must encompass current price
    assert plan.entry_zone_lower < current_price < plan.entry_zone_upper

    # Profit targets must be strictly above entry price with ascending R:R
    assert len(plan.targets) == 3
    assert plan.targets[0].price > current_price
    assert plan.targets[1].price > plan.targets[0].price
    assert plan.targets[2].price > plan.targets[1].price

    # Verify blended R:R: (1.5*0.4) + (2.8*0.4) + (4.5*0.2) = 0.6 + 1.12 + 0.9 = 2.62
    assert approx_eq(plan.blended_rr, 2.62, tol=0.05)


def test_short_trade_plan_mechanics():
    """
    Test short trade plan mechanics for bearish setups.
    """
    current_price = 2685.0
    swing_high = 2712.0
    atr = 18.5

    plan = setup_scoring_engine.generate_trade_plan(
        symbol="XAU/USD",
        current_price=current_price,
        direction="SHORT",
        atr=atr,
        recent_swing_low=2610.0,
        recent_swing_high=swing_high,
        timeframe="4h"
    )

    # Invalidation SL must be strictly above swing high cushioned by 0.5 * ATR
    expected_sl = swing_high + (0.5 * atr)
    assert approx_eq(plan.invalidation_stop_loss, expected_sl, tol=0.5)
    assert plan.invalidation_stop_loss > current_price

    # Targets must be below entry price
    assert plan.targets[0].price < current_price
    assert plan.targets[1].price < plan.targets[0].price
    assert plan.targets[2].price < plan.targets[1].price


def test_position_sizing_risk_preservation():
    """
    Test institutional position sizing:
    $100,000 balance with 1.0% risk ($1,000 max dollar loss).
    Stop loss hit MUST cost exactly $1,000.
    """
    balance = 100000.0
    risk_pct = 1.0
    entry = 88400.0
    sl = 85650.0  # Stop distance = 2750.0

    res = setup_scoring_engine.calculate_position_sizing(
        PositionSizingInput(
            account_balance=balance,
            risk_percentage=risk_pct,
            entry_price=entry,
            stop_loss_price=sl,
            direction="LONG"
        )
    )

    assert res.risk_amount_usd == 1000.0
    assert res.stop_distance_usd == 2750.0

    # Units = Risk / Distance = 1000 / 2750 = ~0.3636 BTC
    expected_units = 1000.0 / 2750.0
    assert approx_eq(res.position_size_units, expected_units, tol=1e-3)

    # Realized loss if SL is hit:
    realized_loss = res.position_size_units * (entry - sl)
    assert approx_eq(realized_loss, 1000.0, tol=1.0)

    # Recommended leverage
    assert res.recommended_leverage >= 1.0
    assert res.safe_from_stop is True


def test_position_sizing_zero_stop_edge_case():
    """
    Test zero or near-zero stop loss distance edge case protection.
    """
    res = setup_scoring_engine.calculate_position_sizing(
        PositionSizingInput(
            account_balance=50000.0,
            risk_percentage=1.0,
            entry_price=100.0,
            stop_loss_price=100.0,  # Zero distance
            direction="LONG"
        )
    )

    assert res.stop_distance_usd > 0
    assert res.position_size_units > 0


def test_trade_expectancy_and_kelly():
    """
    Test mathematical expectancy and Kelly Criterion.
    Win rate = 55%, R:R = 2.0
    E = (0.55 * 2.0) - (0.45 * 1.0) = 1.10 - 0.45 = +0.65R
    Kelly = (0.55 * 3.0 - 1) / 2.0 = (1.65 - 1) / 2.0 = 0.325 (32.5%)
    """
    exp = setup_scoring_engine.calculate_expectancy(
        ExpectancyInput(
            win_rate_pct=55.0,
            avg_reward_risk_ratio=2.0,
            trades_per_month=20,
            risk_per_trade_usd=1000.0
        )
    )

    assert exp.is_positive_expectancy is True
    assert approx_eq(exp.r_expectancy, 0.65, tol=0.01)
    assert approx_eq(exp.dollar_expectancy_per_trade, 650.0, tol=10.0)
    assert approx_eq(exp.projected_monthly_return_r, 13.0, tol=0.2)
    assert approx_eq(exp.kelly_criterion_pct, 32.5, tol=0.5)


def test_market_presets_integrity():
    """
    Test that all market presets (BTC, ETH, SOL, XAU, EUR) evaluate properly.
    """
    presets = setup_scoring_engine.get_market_presets()
    assert len(presets) >= 5

    symbols = [p["symbol"] for p in presets]
    assert "BTC/USDT" in symbols
    assert "ETH/USDT" in symbols
    assert "SOL/USDT" in symbols
    assert "XAU/USD" in symbols
    assert "EUR/USD" in symbols

    for p in presets:
        score = setup_scoring_engine.calculate_score(
            trend_aligned=p["trend_aligned"],
            adx_strength=p["adx_strength"],
            structure_bos_confirmed=p["structure_bos_confirmed"],
            structure_regime=p["structure_regime"],
            at_key_reaction_zone=p["at_key_reaction_zone"],
            reaction_zone_strength=p["reaction_zone_strength"],
            rsi_value=p["rsi_value"],
            macd_momentum_bullish=p["macd_momentum_bullish"],
            rvol=p["rvol"],
            liquidity_sweep_confirmed=p["liquidity_sweep_confirmed"],
            direction=p["direction"]
        )
        assert 0.0 <= score.total_score <= 10.0
        assert score.grade in ["GRADE_A", "GRADE_B", "GRADE_C", "UNQUALIFIED"]
