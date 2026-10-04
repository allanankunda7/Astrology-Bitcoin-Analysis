"""
backend/app/api/v1/setup_scoring.py
API endpoints for Phase 5: Technical Setup Scoring & Entry/Exit Engine
======================================================================
Provides:
1. Multi-factor algorithmic scoring (0-10) with categorical factor breakdown
2. Dynamic entry zones, invalidation stop loss, and multi-tier profit targets
3. Institutional fixed-fractional risk position sizing calculator & liquidation buffer
4. Trade expectancy & Kelly Criterion mathematical modeling
5. Live multi-market presets across Crypto, FX, and Commodities
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.setup_scoring import (
    setup_scoring_engine,
    SetupScoreBreakdown,
    TradePlan,
    PositionSizingInput,
    PositionSizingResult,
    ExpectancyInput,
    ExpectancyResult,
)

router = APIRouter(prefix="/setup-engine", tags=["Phase 5: Technical Setup Scoring & Risk Engine"])


class ScoreRequest(BaseModel):
    trend_aligned: bool = Field(default=True, description="Higher timeframe trend alignment (EMA stack & VWAP)")
    adx_strength: float = Field(default=28.5, ge=0.0, le=100.0, description="Welles Wilder ADX strength index")
    structure_bos_confirmed: bool = Field(default=True, description="Confirmed Break of Structure (BOS)")
    structure_regime: str = Field(default="STRONG_UPTREND", description="STRONG_UPTREND, WEAK_UPTREND, RANGING, WEAK_DOWNTREND, STRONG_DOWNTREND")
    at_key_reaction_zone: bool = Field(default=True, description="Price inside dynamic S/R or high-volume node")
    reaction_zone_strength: str = Field(default="STRONG", description="STRONG, MODERATE, WEAK")
    rsi_value: float = Field(default=54.0, ge=0.0, le=100.0, description="14-period Relative Strength Index")
    macd_momentum_bullish: bool = Field(default=True, description="MACD histogram expansion aligned with bias")
    rvol: float = Field(default=1.65, ge=0.0, le=20.0, description="Relative Volume vs 20-period moving average")
    liquidity_sweep_confirmed: bool = Field(default=True, description="Liquidity wick sweep and rejection confirmed")
    direction: str = Field(default="LONG", description="LONG or SHORT trade setup bias")


class TradePlanRequest(BaseModel):
    symbol: str = Field(default="BTC/USDT")
    current_price: float = Field(default=88400.0, gt=0)
    direction: str = Field(default="LONG")
    atr: float = Field(default=1380.0, gt=0)
    recent_swing_low: float = Field(default=85650.0, gt=0)
    recent_swing_high: float = Field(default=93200.0, gt=0)
    timeframe: str = Field(default="4h")


@router.post("/score", response_model=SetupScoreBreakdown)
def score_setup(req: ScoreRequest):
    """
    Evaluates multi-factor setup confluence across 5 key dimensions (0 to 10 points total):
    1. Higher Timeframe & Trend Alignment (0-2.0 pts)
    2. Market Structure Confluence (0-2.0 pts)
    3. Key Reaction Zone Proximity (0-2.0 pts)
    4. Momentum & Oscillator Confirmation (0-2.0 pts)
    5. Volume & Liquidity Confirmation (0-2.0 pts)
    """
    return setup_scoring_engine.calculate_score(
        trend_aligned=req.trend_aligned,
        adx_strength=req.adx_strength,
        structure_bos_confirmed=req.structure_bos_confirmed,
        structure_regime=req.structure_regime,
        at_key_reaction_zone=req.at_key_reaction_zone,
        reaction_zone_strength=req.reaction_zone_strength,
        rsi_value=req.rsi_value,
        macd_momentum_bullish=req.macd_momentum_bullish,
        rvol=req.rvol,
        liquidity_sweep_confirmed=req.liquidity_sweep_confirmed,
        direction=req.direction.upper(),
    )


@router.post("/plan", response_model=TradePlan)
def generate_trade_plan(req: TradePlanRequest):
    """
    Generates algorithmic entry zone, structural invalidation stop loss,
    and multi-tier take profit ladder with blended risk-to-reward ratio.
    """
    return setup_scoring_engine.generate_trade_plan(
        symbol=req.symbol,
        current_price=req.current_price,
        direction=req.direction.upper(),
        atr=req.atr,
        recent_swing_low=req.recent_swing_low,
        recent_swing_high=req.recent_swing_high,
        timeframe=req.timeframe,
    )


@router.post("/position-size", response_model=PositionSizingResult)
def calculate_position_size(req: PositionSizingInput):
    """
    Institutional fixed-fractional position sizing calculator.
    Guarantees that stopping out incurs strictly the user's allocated risk budget.
    Computes safe recommended leverage and liquidation buffer.
    """
    return setup_scoring_engine.calculate_position_sizing(req)


@router.post("/expectancy", response_model=ExpectancyResult)
def calculate_expectancy(req: ExpectancyInput):
    """
    Calculates mathematical trading expectancy per trade in R-multiples and dollars,
    monthly projected performance, and Kelly Criterion risk boundary.
    """
    return setup_scoring_engine.calculate_expectancy(req)


@router.get("/presets")
def list_setup_presets():
    """
    Returns pre-evaluated institutional setups across major markets,
    each loaded with complete confluence scoring, trade plan, and risk metrics.
    """
    raw_presets = setup_scoring_engine.get_market_presets()
    results = []

    for p in raw_presets:
        score_res = setup_scoring_engine.calculate_score(
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
            direction=p["direction"],
        )
        plan_res = setup_scoring_engine.generate_trade_plan(
            symbol=p["symbol"],
            current_price=p["current_price"],
            direction=p["direction"],
            atr=p["atr"],
            recent_swing_low=p["recent_swing_low"],
            recent_swing_high=p["recent_swing_high"],
            timeframe=p["timeframe"],
        )
        sizing_res = setup_scoring_engine.calculate_position_sizing(
            PositionSizingInput(
                account_balance=100000.0,
                risk_percentage=1.0,
                entry_price=p["current_price"],
                stop_loss_price=plan_res.invalidation_stop_loss,
                direction=p["direction"],
            )
        )
        results.append({
            "preset": p,
            "score": score_res,
            "plan": plan_res,
            "sizing": sizing_res,
        })

    return {
        "count": len(results),
        "presets": results,
    }
