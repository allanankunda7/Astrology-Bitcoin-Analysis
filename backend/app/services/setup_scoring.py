"""
Technical Setup Scoring & Risk Management Engine (Phase 5)
==========================================================
Part of Phase 5: Multi-Factor Scoring (0–10), Entry Zones,
Invalidation Levels, Multi-Target R:R, and Institutional Position Sizing.

Dimensions evaluated (2.0 pts each, total 10.0 pts):
1. Higher Timeframe & Trend Alignment (EMA stack, VWAP, ADX)
2. Market Structure Confluence (Recent confirmed BOS / CHoCH, HH/HL sequence)
3. Key Reaction Zone Proximity (Dynamic S/R, high volume node, pivot levels)
4. Momentum & Oscillator Confirmation (RSI position, MACD expansion, Stochastic reset)
5. Volume & Liquidity Confirmation (RVOL >= 1.5, liquidity sweep wick rejection)
"""

from typing import List, Dict, Any, Optional
import math

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return {k: v.dict() if hasattr(v, 'dict') else v for k, v in self.__dict__.items()}
    def Field(default=..., **kwargs):
        return default if default is not ... else None


class FactorScore(BaseModel):
    category: str
    score: float = Field(..., ge=0.0, le=2.0)
    max_score: float = 2.0
    status: str  # 'EXCELLENT', 'GOOD', 'WEAK', 'UNFAVORABLE'
    rationale: str


class SetupScoreBreakdown(BaseModel):
    total_score: float = Field(..., ge=0.0, le=10.0)
    grade: str  # 'GRADE_A', 'GRADE_B', 'GRADE_C', 'UNQUALIFIED'
    trade_bias: str  # 'LONG', 'SHORT', 'NO_TRADE'
    factors: List[FactorScore]
    summary: str


class TradeTarget(BaseModel):
    target_id: int
    name: str
    price: float
    rr_ratio: float
    scale_out_pct: float
    rationale: str


class TradePlan(BaseModel):
    symbol: str
    direction: str  # 'LONG' or 'SHORT'
    entry_zone_lower: float
    entry_zone_upper: float
    entry_optimal: float
    invalidation_stop_loss: float
    stop_distance_pct: float
    targets: List[TradeTarget]
    blended_rr: float
    invalidation_rationale: str
    timeframe: str


class PositionSizingInput(BaseModel):
    account_balance: float = Field(default=100000.0, gt=0)
    risk_percentage: float = Field(default=1.0, ge=0.1, le=5.0)
    entry_price: float = Field(..., gt=0)
    stop_loss_price: float = Field(..., gt=0)
    direction: str = Field(default="LONG")


class PositionSizingResult(BaseModel):
    risk_amount_usd: float
    risk_percentage: float
    stop_distance_usd: float
    stop_distance_pct: float
    position_size_units: float
    position_notional_usd: float
    recommended_leverage: float
    est_liquidation_price: float
    liquidation_buffer_pct: float
    safe_from_stop: bool
    disclaimer: str = "Position sizing enforces capital preservation. Never risk more than your predefined tolerance."


class ExpectancyInput(BaseModel):
    win_rate_pct: float = Field(default=52.0, ge=1.0, le=99.0)
    avg_reward_risk_ratio: float = Field(default=2.4, gt=0.1)
    trades_per_month: int = Field(default=20, ge=1, le=500)
    risk_per_trade_usd: float = Field(default=1000.0, gt=0)


class ExpectancyResult(BaseModel):
    win_rate: float
    loss_rate: float
    reward_risk_ratio: float
    r_expectancy: float
    dollar_expectancy_per_trade: float
    projected_monthly_return_r: float
    projected_monthly_return_usd: float
    is_positive_expectancy: bool
    kelly_criterion_pct: float
    recommendation: str


class SetupScoringEngine:
    """
    Algorithmic Confluence Scoring & Risk Calculation Engine.
    """

    @classmethod
    def calculate_expectancy(cls, inp: ExpectancyInput) -> ExpectancyResult:
        """
        Calculates mathematical trade expectancy: E = (W * R) - (L * 1.0).
        Also calculates full and half Kelly Criterion sizing limits.
        """
        w = inp.win_rate_pct / 100.0
        l = 1.0 - w
        r = inp.avg_reward_risk_ratio

        # Expectancy in R-multiples
        e_r = (w * r) - (l * 1.0)
        dollar_e = e_r * inp.risk_per_trade_usd
        monthly_r = e_r * inp.trades_per_month
        monthly_usd = dollar_e * inp.trades_per_month

        # Kelly Criterion: K% = (W * (R + 1) - 1) / R
        kelly_fraction = (w * (r + 1.0) - 1.0) / r if r > 0 else 0.0
        kelly_pct = max(0.0, round(kelly_fraction * 100.0, 2))

        is_positive = e_r > 0.0
        if is_positive:
            rec = f"Statistically positive system (+{e_r:.2f}R/trade). Full Kelly: {kelly_pct:.1f}%, institutional 1/4 Kelly risk: {round(kelly_pct / 4, 1)}%."
        else:
            rec = f"Negative mathematical expectancy ({e_r:.2f}R/trade). Trading this model guarantees capital degradation over large sample size."

        return ExpectancyResult(
            win_rate=inp.win_rate_pct,
            loss_rate=round(l * 100.0, 1),
            reward_risk_ratio=r,
            r_expectancy=round(e_r, 3),
            dollar_expectancy_per_trade=round(dollar_e, 2),
            projected_monthly_return_r=round(monthly_r, 2),
            projected_monthly_return_usd=round(monthly_usd, 2),
            is_positive_expectancy=is_positive,
            kelly_criterion_pct=kelly_pct,
            recommendation=rec
        )

    @classmethod
    def get_market_presets(cls) -> List[Dict[str, Any]]:
        """
        Returns pre-evaluated institutional setups across major asset classes.
        """
        return [
            {
                "symbol": "BTC/USDT",
                "asset_name": "Bitcoin / Tether",
                "direction": "LONG",
                "current_price": 88400.0,
                "atr": 1380.0,
                "recent_swing_low": 85650.0,
                "recent_swing_high": 93200.0,
                "timeframe": "4h",
                "trend_aligned": True,
                "adx_strength": 31.4,
                "structure_bos_confirmed": True,
                "structure_regime": "STRONG_UPTREND",
                "at_key_reaction_zone": True,
                "reaction_zone_strength": "STRONG",
                "rsi_value": 53.8,
                "macd_momentum_bullish": True,
                "rvol": 1.78,
                "liquidity_sweep_confirmed": True,
                "narrative": "4H Bullish Order Block mitigation with confirmed Break of Structure and 1.78x relative volume absorption."
            },
            {
                "symbol": "ETH/USDT",
                "asset_name": "Ethereum / Tether",
                "direction": "LONG",
                "current_price": 3340.0,
                "atr": 64.0,
                "recent_swing_low": 3190.0,
                "recent_swing_high": 3580.0,
                "timeframe": "4h",
                "trend_aligned": True,
                "adx_strength": 27.2,
                "structure_bos_confirmed": True,
                "structure_regime": "STRONG_UPTREND",
                "at_key_reaction_zone": True,
                "reaction_zone_strength": "STRONG",
                "rsi_value": 51.2,
                "macd_momentum_bullish": True,
                "rvol": 1.54,
                "liquidity_sweep_confirmed": True,
                "narrative": "Liquidity sweep of prior swing low followed by immediate displacement back above VWAP anchor."
            },
            {
                "symbol": "SOL/USDT",
                "asset_name": "Solana / Tether",
                "direction": "LONG",
                "current_price": 182.50,
                "atr": 4.80,
                "recent_swing_low": 171.00,
                "recent_swing_high": 196.00,
                "timeframe": "1h",
                "trend_aligned": True,
                "adx_strength": 24.6,
                "structure_bos_confirmed": True,
                "structure_regime": "WEAK_UPTREND",
                "at_key_reaction_zone": True,
                "reaction_zone_strength": "MODERATE",
                "rsi_value": 56.4,
                "macd_momentum_bullish": True,
                "rvol": 1.42,
                "liquidity_sweep_confirmed": False,
                "narrative": "High volume consolidation retest with EMA 21 confluence; awaiting volume expansion confirmation."
            },
            {
                "symbol": "XAU/USD",
                "asset_name": "Gold Spot",
                "direction": "SHORT",
                "current_price": 2685.00,
                "atr": 18.50,
                "recent_swing_low": 2610.00,
                "recent_swing_high": 2712.00,
                "timeframe": "4h",
                "trend_aligned": True,
                "adx_strength": 26.0,
                "structure_bos_confirmed": True,
                "structure_regime": "STRONG_DOWNTREND",
                "at_key_reaction_zone": True,
                "reaction_zone_strength": "STRONG",
                "rsi_value": 44.5,
                "macd_momentum_bullish": False,
                "rvol": 1.62,
                "liquidity_sweep_confirmed": True,
                "narrative": "Macro Bearish Fair Value Gap rejection at $2,712 liquidity pool with bearish MACD divergence."
            },
            {
                "symbol": "EUR/USD",
                "asset_name": "Euro / US Dollar",
                "direction": "SHORT",
                "current_price": 1.0820,
                "atr": 0.0042,
                "recent_swing_low": 1.0740,
                "recent_swing_high": 1.0865,
                "timeframe": "1h",
                "trend_aligned": False,
                "adx_strength": 14.8,
                "structure_bos_confirmed": False,
                "structure_regime": "RANGING",
                "at_key_reaction_zone": False,
                "reaction_zone_strength": "WEAK",
                "rsi_value": 50.1,
                "macd_momentum_bullish": False,
                "rvol": 0.88,
                "liquidity_sweep_confirmed": False,
                "narrative": "Range chop with sub-15 ADX; unqualified setup failing minimum multi-factor confluence threshold."
            }
        ]


    @classmethod
    def calculate_score(
        cls,
        trend_aligned: bool = True,
        adx_strength: float = 28.5,
        structure_bos_confirmed: bool = True,
        structure_regime: str = "STRONG_UPTREND",
        at_key_reaction_zone: bool = True,
        reaction_zone_strength: str = "STRONG",
        rsi_value: float = 54.0,
        macd_momentum_bullish: bool = True,
        rvol: float = 1.65,
        liquidity_sweep_confirmed: bool = True,
        direction: str = "LONG"
    ) -> SetupScoreBreakdown:
        """
        Evaluates 5 quantitative factors (0.0 to 2.0 points each).
        """
        factors: List[FactorScore] = []

        # 1. Trend & HTF Alignment (0 - 2.0 pts)
        trend_score = 0.0
        if trend_aligned:
            trend_score += 1.2
            if adx_strength >= 25.0:
                trend_score += 0.8
            elif adx_strength >= 18.0:
                trend_score += 0.4
        else:
            if adx_strength < 20.0:
                trend_score = 0.5  # Mean-reverting range
        trend_score = min(2.0, trend_score)
        factors.append(FactorScore(
            category="Trend & HTF Alignment",
            score=round(trend_score, 2),
            status="EXCELLENT" if trend_score >= 1.6 else ("GOOD" if trend_score >= 1.0 else "WEAK"),
            rationale=f"Trend aligned with EMA stack and ADX strength ({adx_strength:.1f})"
        ))

        # 2. Market Structure (0 - 2.0 pts)
        struct_score = 0.0
        if structure_regime in ["STRONG_UPTREND", "STRONG_DOWNTREND"]:
            struct_score += 1.0
        elif structure_regime in ["WEAK_UPTREND", "WEAK_DOWNTREND"]:
            struct_score += 0.5

        if structure_bos_confirmed:
            struct_score += 1.0
        struct_score = min(2.0, struct_score)
        factors.append(FactorScore(
            category="Market Structure Confluence",
            score=round(struct_score, 2),
            status="EXCELLENT" if struct_score >= 1.6 else ("GOOD" if struct_score >= 1.0 else "WEAK"),
            rationale=f"Structure regime {structure_regime} with confirmed structural break (BOS)"
        ))

        # 3. Key Reaction Zone Proximity (0 - 2.0 pts)
        zone_score = 0.0
        if at_key_reaction_zone:
            zone_score = 2.0 if reaction_zone_strength == "STRONG" else 1.3
        else:
            zone_score = 0.5
        factors.append(FactorScore(
            category="Key Reaction Zone Proximity",
            score=round(zone_score, 2),
            status="EXCELLENT" if zone_score >= 1.6 else ("GOOD" if zone_score >= 1.0 else "WEAK"),
            rationale=f"Entry placed inside dynamic reaction zone ({reaction_zone_strength} anchor)"
        ))

        # 4. Momentum & Oscillators (0 - 2.0 pts)
        mom_score = 0.0
        if direction == "LONG":
            if 42.0 <= rsi_value <= 62.0:
                mom_score += 1.0  # Healthy momentum pullback
            elif rsi_value < 35.0:
                mom_score += 0.7  # Oversold rebound
            if macd_momentum_bullish:
                mom_score += 1.0
        else:
            if 38.0 <= rsi_value <= 58.0:
                mom_score += 1.0
            elif rsi_value > 65.0:
                mom_score += 0.7
            if not macd_momentum_bullish:
                mom_score += 1.0
        mom_score = min(2.0, mom_score)
        factors.append(FactorScore(
            category="Momentum & Oscillators",
            score=round(mom_score, 2),
            status="EXCELLENT" if mom_score >= 1.6 else ("GOOD" if mom_score >= 1.0 else "WEAK"),
            rationale=f"RSI ({rsi_value:.1f}) in optimal continuation band with favorable MACD expansion"
        ))

        # 5. Volume & Liquidity Confirmation (0 - 2.0 pts)
        vol_score = 0.0
        if rvol >= 1.5:
            vol_score += 1.2
        elif rvol >= 1.1:
            vol_score += 0.7

        if liquidity_sweep_confirmed:
            vol_score += 0.8
        vol_score = min(2.0, vol_score)
        factors.append(FactorScore(
            category="Volume & Liquidity",
            score=round(vol_score, 2),
            status="EXCELLENT" if vol_score >= 1.6 else ("GOOD" if vol_score >= 1.0 else "WEAK"),
            rationale=f"Relative Volume ({rvol:.2f}x) with confirmed liquidity absorption sweep"
        ))

        total = round(sum(f.score for f in factors), 1)

        if total >= 8.5:
            grade = "GRADE_A"
            summary = "High-Confluence Institutional Setup: Exceptional alignment across all structural and volume factors."
        elif total >= 7.0:
            grade = "GRADE_B"
            summary = "Standard Quality Setup: Strong trade parameters with solid structural foundation."
        elif total >= 5.0:
            grade = "GRADE_C"
            summary = "Speculative Setup: Moderate confluence; reduced position sizing and quick profit targets advised."
        else:
            grade = "UNQUALIFIED"
            summary = "Unqualified: Insufficient confluence to justify capital deployment."

        return SetupScoreBreakdown(
            total_score=total,
            grade=grade,
            trade_bias=direction if total >= 5.0 else "NO_TRADE",
            factors=factors,
            summary=summary
        )

    @classmethod
    def generate_trade_plan(
        cls,
        symbol: str,
        current_price: float,
        direction: str = "LONG",
        atr: float = 1250.0,
        recent_swing_low: float = 86450.0,
        recent_swing_high: float = 89920.0,
        timeframe: str = "4h"
    ) -> TradePlan:
        """
        Generates algorithmic entry zone, invalidation stop loss, and multi-tier take profit targets.
        """
        if direction.upper() == "LONG":
            entry_optimal = current_price
            entry_zone_lower = round(current_price * 0.995, 2)
            entry_zone_upper = round(current_price * 1.003, 2)

            # Invalidation: Below recent structural swing low minus 0.5 * ATR
            invalidation_sl = round(recent_swing_low - (0.5 * atr), 2)
            risk_distance = entry_optimal - invalidation_sl

            # Multi-tier Take Profits
            tp1_price = round(entry_optimal + (1.5 * risk_distance), 2)
            tp2_price = round(entry_optimal + (2.8 * risk_distance), 2)
            tp3_price = round(entry_optimal + (4.5 * risk_distance), 2)

            targets = [
                TradeTarget(
                    target_id=1,
                    name="TP1 (Conservative / Partial Scale)",
                    price=tp1_price,
                    rr_ratio=1.5,
                    scale_out_pct=40.0,
                    rationale="Immediate dynamic resistance cluster; locks in 1.5R gains and moves SL to breakeven."
                ),
                TradeTarget(
                    target_id=2,
                    name="TP2 (Macro Liquidity Pool)",
                    price=tp2_price,
                    rr_ratio=2.8,
                    scale_out_pct=40.0,
                    rationale="Structural swing high liquidity band; main institutional profit extraction."
                ),
                TradeTarget(
                    target_id=3,
                    name="TP3 (Fibonacci 1.618 Extension Runner)",
                    price=tp3_price,
                    rr_ratio=4.5,
                    scale_out_pct=20.0,
                    rationale="Trend expansion runner targeting unmitigated blue-sky order flow."
                ),
            ]
            blended_rr = round((1.5 * 0.40) + (2.8 * 0.40) + (4.5 * 0.20), 2)
            stop_dist_pct = round((risk_distance / entry_optimal) * 100.0, 2)
            inval_rationale = f"Close below Higher Low (${recent_swing_low:,.2f}) structurally invalidates the bullish sequence."

        else:
            entry_optimal = current_price
            entry_zone_lower = round(current_price * 0.997, 2)
            entry_zone_upper = round(current_price * 1.005, 2)

            invalidation_sl = round(recent_swing_high + (0.5 * atr), 2)
            risk_distance = invalidation_sl - entry_optimal

            tp1_price = round(entry_optimal - (1.5 * risk_distance), 2)
            tp2_price = round(entry_optimal - (2.8 * risk_distance), 2)
            tp3_price = round(entry_optimal - (4.5 * risk_distance), 2)

            targets = [
                TradeTarget(
                    target_id=1,
                    name="TP1 (Conservative / Partial Scale)",
                    price=tp1_price,
                    rr_ratio=1.5,
                    scale_out_pct=40.0,
                    rationale="Immediate support zone retest; lock in 1.5R and secure trade."
                ),
                TradeTarget(
                    target_id=2,
                    name="TP2 (Swing Low Liquidity)",
                    price=tp2_price,
                    rr_ratio=2.8,
                    scale_out_pct=40.0,
                    rationale="Break below intermediate structural low to target resting buy stops."
                ),
                TradeTarget(
                    target_id=3,
                    name="TP3 (Macro Demand Zone)",
                    price=tp3_price,
                    rr_ratio=4.5,
                    scale_out_pct=20.0,
                    rationale="Extended sell-off target at major higher-timeframe support."
                ),
            ]
            blended_rr = round((1.5 * 0.40) + (2.8 * 0.40) + (4.5 * 0.20), 2)
            stop_dist_pct = round((risk_distance / entry_optimal) * 100.0, 2)
            inval_rationale = f"Close above Lower High (${recent_swing_high:,.2f}) structurally invalidates the bearish sequence."

        return TradePlan(
            symbol=symbol,
            direction=direction.upper(),
            entry_zone_lower=entry_zone_lower,
            entry_zone_upper=entry_zone_upper,
            entry_optimal=entry_optimal,
            invalidation_stop_loss=invalidation_sl,
            stop_distance_pct=stop_dist_pct,
            targets=targets,
            blended_rr=blended_rr,
            invalidation_rationale=inval_rationale,
            timeframe=timeframe
        )

    @classmethod
    def calculate_position_sizing(cls, inp: PositionSizingInput) -> PositionSizingResult:
        """
        Calculates exact position size so that hitting stop loss costs exactly
        (Account Balance * Risk %).
        """
        risk_dollars = inp.account_balance * (inp.risk_percentage / 100.0)
        stop_distance = abs(inp.entry_price - inp.stop_loss_price)

        if stop_distance <= 0:
            stop_distance = inp.entry_price * 0.01  # Prevent zero div

        stop_dist_pct = (stop_distance / inp.entry_price) * 100.0
        units = risk_dollars / stop_distance
        notional = units * inp.entry_price

        # Recommended leverage: Notional / Account Balance
        raw_leverage = notional / inp.account_balance
        rec_leverage = max(1.0, round(raw_leverage, 1))

        # Estimated liquidation price under recommended leverage (assuming 0.5% maintenance margin)
        if inp.direction.upper() == "LONG":
            est_liq = inp.entry_price * (1.0 - (1.0 / rec_leverage) + 0.005)
            liq_buffer = ((inp.entry_price - est_liq) / inp.entry_price) * 100.0
            safe_from_stop = est_liq < inp.stop_loss_price
        else:
            est_liq = inp.entry_price * (1.0 + (1.0 / rec_leverage) - 0.005)
            liq_buffer = ((est_liq - inp.entry_price) / inp.entry_price) * 100.0
            safe_from_stop = est_liq > inp.stop_loss_price

        return PositionSizingResult(
            risk_amount_usd=round(risk_dollars, 2),
            risk_percentage=inp.risk_percentage,
            stop_distance_usd=round(stop_distance, 2),
            stop_distance_pct=round(stop_dist_pct, 2),
            position_size_units=round(units, 4),
            position_notional_usd=round(notional, 2),
            recommended_leverage=rec_leverage,
            est_liquidation_price=round(est_liq, 2),
            liquidation_buffer_pct=round(liq_buffer, 2),
            safe_from_stop=safe_from_stop,
        )


setup_scoring_engine = SetupScoringEngine()
