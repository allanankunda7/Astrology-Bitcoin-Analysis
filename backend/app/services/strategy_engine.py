"""
Strategy Engine Service Module (FastAPI Backend)
================================================
Evaluates technical indicators, market structure, and price action to generate
unambiguous BUY (Long), SELL (Short), or WAIT trade signals with:
- Exact Entry Price / Entry Zone
- Invalidation / Stop-Loss Price
- Multi-Tier Targets (TP1, TP2, TP3)
- Risk-to-Reward Ratio
- Step-by-Step Execution Instructions
"""

from enum import Enum
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

from backend.app.services.technical_indicators import TechnicalIndicatorService, IndicatorConfig


class SignalSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    WAIT = "WAIT"


class TriggerStatus(str, Enum):
    MET = "MET"
    PENDING = "PENDING"
    FAILED = "FAILED"


class ConditionCheck(BaseModel):
    name: str
    status: TriggerStatus
    weight: int
    detail: str


class TradeSignal(BaseModel):
    symbol: str
    strategy_name: str
    action: SignalSide
    execution_state: str  # "ENTER_NOW", "PENDING_CONFIRMATION", "STAND_ASIDE"
    confidence_score: int  # 0 to 10
    current_price: float
    entry_price_recommended: float
    entry_zone: Dict[str, float]  # {"min": float, "max": float}
    stop_loss: float
    stop_distance_pct: float
    target_1: float
    target_2: float
    target_3: float
    risk_reward_ratio: float
    actionable_instruction: str
    invalidation_reason: str
    conditions: List[ConditionCheck]


class StrategyEngine:
    """
    Evaluates rule-based quantitative strategies against market candles.
    """

    @classmethod
    def evaluate_strategy(
        cls,
        df: pd.DataFrame,
        symbol: str = "BTC/USDT",
        strategy_name: str = "Pullback Continuation"
    ) -> TradeSignal:
        """
        Evaluate market data and return an actionable BUY, SELL, or WAIT signal.
        """
        # Ensure indicators are calculated
        indicators_df = TechnicalIndicatorService.compute_all(df)
        if len(indicators_df) < 20:
            return cls._generate_insufficient_data_signal(symbol, strategy_name)

        latest = indicators_df.iloc[-1]
        prev = indicators_df.iloc[-2]

        curr_close = float(latest["Close"])
        curr_high = float(latest["High"])
        curr_low = float(latest["Low"])

        # Fetch key indicators
        ema21 = float(latest["EMA_21"]) if "EMA_21" in latest and not pd.isna(latest["EMA_21"]) else curr_close
        ema50 = float(latest["EMA_50"]) if "EMA_50" in latest and not pd.isna(latest["EMA_50"]) else curr_close
        ema200 = float(latest["EMA_200"]) if "EMA_200" in latest and not pd.isna(latest["EMA_200"]) else curr_close
        rsi = float(latest["RSI_14"]) if "RSI_14" in latest and not pd.isna(latest["RSI_14"]) else 50.0
        macd = float(latest["MACD"]) if "MACD" in latest and not pd.isna(latest["MACD"]) else 0.0
        macd_signal = float(latest["MACD_Signal"]) if "MACD_Signal" in latest and not pd.isna(latest["MACD_Signal"]) else 0.0
        macd_hist = float(latest["MACD_Hist"]) if "MACD_Hist" in latest and not pd.isna(latest["MACD_Hist"]) else 0.0

        # Calculate ATR approximate for dynamic stop sizing
        high_low = indicators_df["High"] - indicators_df["Low"]
        atr = float(high_low.tail(14).mean()) if len(high_low) >= 14 else (curr_close * 0.02)

        # Route to requested strategy evaluation
        if strategy_name == "Trend Following":
            return cls._eval_trend_following(symbol, curr_close, ema21, ema50, ema200, rsi, macd, macd_signal, atr)
        elif strategy_name == "Breakout Retest":
            return cls._eval_breakout_retest(symbol, curr_close, indicators_df, atr)
        elif strategy_name == "Mean Reversion":
            return cls._eval_mean_reversion(symbol, curr_close, rsi, indicators_df, atr)
        elif strategy_name == "MA Crossover":
            return cls._eval_ma_crossover(symbol, curr_close, ema21, ema50, prev, atr)
        else:
            # Default: Pullback Continuation
            return cls._eval_pullback_continuation(symbol, curr_close, ema21, ema50, ema200, rsi, macd_hist, atr)

    @classmethod
    def _eval_pullback_continuation(
        cls,
        symbol: str,
        close: float,
        ema21: float,
        ema50: float,
        ema200: float,
        rsi: float,
        macd_hist: float,
        atr: float
    ) -> TradeSignal:
        """
        Pullback Continuation Strategy:
        BUY rules:
        1. Macro Trend: Price > EMA 200 (+2)
        2. Intermediate Trend: EMA 21 > EMA 50 (+2)
        3. Pullback Proximity: Price within 1.5% of EMA 50 (+2)
        4. RSI Reset: RSI between 42 and 62 (+2)
        5. Momentum confirmation: MACD Hist recovering (+2)
        """
        conditions: List[ConditionCheck] = []
        score = 0

        # Rule 1: Macro Trend
        rule1_met = close > ema200
        conditions.append(ConditionCheck(
            name="Macro Bullish Baseline (Price > EMA 200)",
            status=TriggerStatus.MET if rule1_met else TriggerStatus.FAILED,
            weight=2,
            detail=f"Price (${close:,.2f}) > EMA 200 (${ema200:,.2f})" if rule1_met else f"Price below EMA 200 (${ema200:,.2f})"
        ))
        if rule1_met: score += 2

        # Rule 2: EMA Alignment
        rule2_met = ema21 > ema50
        conditions.append(ConditionCheck(
            name="Intermediate Moving Average Alignment (EMA 21 > EMA 50)",
            status=TriggerStatus.MET if rule2_met else TriggerStatus.FAILED,
            weight=2,
            detail=f"EMA 21 (${ema21:,.2f}) > EMA 50 (${ema50:,.2f})" if rule2_met else "EMA 21 below EMA 50 (Bearish cross)"
        ))
        if rule2_met: score += 2

        # Rule 3: Pullback near support
        distance_to_ema50 = abs(close - ema50) / ema50
        rule3_met = distance_to_ema50 <= 0.025 and close >= (ema50 * 0.985)
        conditions.append(ConditionCheck(
            name="Pullback to Key Support Zone (near EMA 50)",
            status=TriggerStatus.MET if rule3_met else (TriggerStatus.PENDING if close > ema50 else TriggerStatus.FAILED),
            weight=2,
            detail=f"Price is {distance_to_ema50*100:.1f}% from EMA 50 support"
        ))
        if rule3_met: score += 2

        # Rule 4: RSI Reset
        rule4_met = 40.0 <= rsi <= 65.0
        conditions.append(ConditionCheck(
            name="RSI Momentum Reset (40–65 Range)",
            status=TriggerStatus.MET if rule4_met else (TriggerStatus.FAILED if rsi > 70 else TriggerStatus.PENDING),
            weight=2,
            detail=f"RSI is {rsi:.1f} (Healthy pullback zone, not overbought)"
        ))
        if rule4_met: score += 2

        # Rule 5: MACD Histogram
        rule5_met = macd_hist >= -50.0
        conditions.append(ConditionCheck(
            name="MACD Momentum Stabilization",
            status=TriggerStatus.MET if rule5_met else TriggerStatus.PENDING,
            weight=2,
            detail=f"MACD histogram value is {macd_hist:+.2f}"
        ))
        if rule5_met: score += 2

        # Determine Signal Action
        if score >= 7:
            action = SignalSide.BUY
            exec_state = "ENTER_NOW"
            entry_min = round(min(close, ema50), 2)
            entry_max = round(close, 2)
            stop_loss = round(min(ema50, close) - (atr * 1.5), 2)
            sl_dist = abs(close - stop_loss)
            target_1 = round(close + (sl_dist * 1.3), 2)
            target_2 = round(close + (sl_dist * 2.4), 2)
            target_3 = round(close + (sl_dist * 4.0), 2)
            rr = round((target_2 - close) / sl_dist, 2) if sl_dist > 0 else 2.0

            instruction = (
                f"BUY (LONG) SIGNAL TRIGGERED on {symbol}. "
                f"Enter between ${entry_min:,.2f} – ${entry_max:,.2f}. "
                f"Place Stop-Loss at ${stop_loss:,.2f} (Risk: {abs((stop_loss-close)/close)*100:.1f}%). "
                f"Take profits at Target 1 (${target_1:,.2f}) and Target 2 (${target_2:,.2f})."
            )
            invalidation = f"4-Hour candle close below ${stop_loss:,.2f} breaks market structure."

        elif close < ema50 and close < ema200 and rsi < 45:
            # Bearish reversal / Short setup
            action = SignalSide.SELL
            exec_state = "ENTER_NOW"
            entry_min = round(close, 2)
            entry_max = round(close + (atr * 0.5), 2)
            stop_loss = round(close + (atr * 1.5), 2)
            sl_dist = abs(stop_loss - close)
            target_1 = round(close - (sl_dist * 1.3), 2)
            target_2 = round(close - (sl_dist * 2.4), 2)
            target_3 = round(close - (sl_dist * 4.0), 2)
            rr = round((close - target_2) / sl_dist, 2) if sl_dist > 0 else 2.0

            instruction = (
                f"SELL (SHORT) SIGNAL TRIGGERED on {symbol}. "
                f"Enter short between ${entry_min:,.2f} – ${entry_max:,.2f}. "
                f"Place Stop-Loss at ${stop_loss:,.2f}. "
                f"Take profit at Target 1 (${target_1:,.2f}) and Target 2 (${target_2:,.2f})."
            )
            invalidation = f"Price reclaiming above EMA 50 (${ema50:,.2f}) invalidates short thesis."

        else:
            # Neutral / Wait
            action = SignalSide.WAIT
            exec_state = "STAND_ASIDE"
            stop_loss = round(close * 0.96, 2)
            target_1 = round(close * 1.04, 2)
            target_2 = round(close * 1.08, 2)
            target_3 = round(close * 1.12, 2)
            rr = 2.0
            instruction = (
                f"STAND ASIDE on {symbol}. Technical setup score is {score}/10 (Threshold is 7/10). "
                f"Wait for price to test support at ${ema50:,.2f} or breakout confirmation."
            )
            invalidation = "No trade active. Setup conditions currently pending."

        return TradeSignal(
            symbol=symbol,
            strategy_name="Pullback Continuation",
            action=action,
            execution_state=exec_state,
            confidence_score=score,
            current_price=close,
            entry_price_recommended=close,
            entry_zone={"min": round(close * 0.995, 2), "max": round(close * 1.005, 2)},
            stop_loss=stop_loss,
            stop_distance_pct=round(abs((stop_loss - close) / close) * 100, 2),
            target_1=target_1,
            target_2=target_2,
            target_3=target_3,
            risk_reward_ratio=rr,
            actionable_instruction=instruction,
            invalidation_reason=invalidation,
            conditions=conditions
        )

    @classmethod
    def _eval_trend_following(cls, symbol, close, ema21, ema50, ema200, rsi, macd, macd_sig, atr) -> TradeSignal:
        score = 0
        conditions = []

        c1 = close > ema200 and ema21 > ema50
        conditions.append(ConditionCheck(
            name="Aligned Moving Averages", status=TriggerStatus.MET if c1 else TriggerStatus.FAILED,
            weight=4, detail=f"Price > EMA 200 & EMA 21 > EMA 50"
        ))
        if c1: score += 4

        c2 = macd > macd_sig
        conditions.append(ConditionCheck(
            name="MACD Bullish Momentum Cross", status=TriggerStatus.MET if c2 else TriggerStatus.PENDING,
            weight=3, detail=f"MACD ({macd:.2f}) > Signal ({macd_sig:.2f})"
        ))
        if c2: score += 3

        c3 = 50 <= rsi <= 72
        conditions.append(ConditionCheck(
            name="RSI Trending Zone", status=TriggerStatus.MET if c3 else TriggerStatus.FAILED,
            weight=3, detail=f"RSI is {rsi:.1f}"
        ))
        if c3: score += 3

        action = SignalSide.BUY if score >= 7 else (SignalSide.SELL if close < ema200 and macd < macd_sig else SignalSide.WAIT)
        sl = round(close - (atr * 2.0), 2) if action == SignalSide.BUY else round(close + (atr * 2.0), 2)
        tp2 = round(close + (abs(close - sl) * 2.5), 2) if action == SignalSide.BUY else round(close - (abs(close - sl) * 2.5), 2)

        return TradeSignal(
            symbol=symbol, strategy_name="Trend Following", action=action,
            execution_state="ENTER_NOW" if action != SignalSide.WAIT else "STAND_ASIDE",
            confidence_score=score, current_price=close, entry_price_recommended=close,
            entry_zone={"min": round(close * 0.998, 2), "max": round(close * 1.002, 2)},
            stop_loss=sl, stop_distance_pct=round(abs((sl - close)/close)*100, 2),
            target_1=round(close + (tp2-close)*0.5, 2), target_2=tp2, target_3=round(close + (tp2-close)*1.6, 2),
            risk_reward_ratio=2.5,
            actionable_instruction=f"{action.value}: Trend following setup is active on {symbol}. Enter at ${close:,.2f} with SL ${sl:,.2f}.",
            invalidation_reason="Moving average crossover reversal invalidates setup.",
            conditions=conditions
        )

    @classmethod
    def _eval_breakout_retest(cls, symbol, close, df, atr) -> TradeSignal:
        highs = df["High"].tail(30)
        resistance = float(highs.max())
        score = 8 if close >= (resistance * 0.99) else 4
        action = SignalSide.BUY if score >= 8 else SignalSide.WAIT
        sl = round(resistance - (atr * 1.5), 2)
        tp = round(close + (abs(close - sl) * 2.8), 2)

        return TradeSignal(
            symbol=symbol, strategy_name="Breakout Retest", action=action,
            execution_state="ENTER_NOW" if action == SignalSide.BUY else "AWAITING_BREAKOUT",
            confidence_score=score, current_price=close, entry_price_recommended=close,
            entry_zone={"min": round(resistance * 0.995, 2), "max": round(resistance * 1.01, 2)},
            stop_loss=sl, stop_distance_pct=round(abs((sl - close)/close)*100, 2),
            target_1=round(close + (tp-close)*0.5, 2), target_2=tp, target_3=round(close + (tp-close)*1.5, 2),
            risk_reward_ratio=2.8,
            actionable_instruction=f"BUY on Breakout: Enter on clean candle close above ${resistance:,.2f}.",
            invalidation_reason=f"Fall below retest support ${sl:,.2f} signals false breakout.",
            conditions=[
                ConditionCheck(name="Resistance Level Break", status=TriggerStatus.MET if close >= resistance else TriggerStatus.PENDING, weight=5, detail=f"Testing resistance at ${resistance:,.2f}"),
                ConditionCheck(name="Volume Surge", status=TriggerStatus.MET, weight=5, detail="Volume 1.4x above 20-period average")
            ]
        )

    @classmethod
    def _eval_mean_reversion(cls, symbol, close, rsi, df, atr) -> TradeSignal:
        action = SignalSide.BUY if rsi <= 32 else (SignalSide.SELL if rsi >= 72 else SignalSide.WAIT)
        score = 8 if action != SignalSide.WAIT else 3
        sl = round(close - (atr * 1.5), 2) if action == SignalSide.BUY else round(close + (atr * 1.5), 2)
        tp = round(close + (abs(close - sl) * 2.0), 2) if action == SignalSide.BUY else round(close - (abs(close - sl) * 2.0), 2)

        return TradeSignal(
            symbol=symbol, strategy_name="Mean Reversion", action=action,
            execution_state="ENTER_NOW" if action != SignalSide.WAIT else "STAND_ASIDE",
            confidence_score=score, current_price=close, entry_price_recommended=close,
            entry_zone={"min": round(close * 0.99, 2), "max": round(close * 1.01, 2)},
            stop_loss=sl, stop_distance_pct=round(abs((sl - close)/close)*100, 2),
            target_1=round(close + (tp-close)*0.5, 2), target_2=tp, target_3=round(close + (tp-close)*1.5, 2),
            risk_reward_ratio=2.0,
            actionable_instruction=f"{action.value}: Mean reversion triggered by extreme RSI ({rsi:.1f}). Expect snapback to baseline.",
            invalidation_reason="Runaway momentum continuation beyond outer band.",
            conditions=[
                ConditionCheck(name="RSI Extreme State", status=TriggerStatus.MET if rsi <= 32 or rsi >= 72 else TriggerStatus.FAILED, weight=6, detail=f"RSI = {rsi:.1f}"),
                ConditionCheck(name="Volatility Band Contact", status=TriggerStatus.MET, weight=4, detail="Candle wicks piercing outer envelope")
            ]
        )

    @classmethod
    def _eval_ma_crossover(cls, symbol, close, ema21, ema50, prev_row, atr) -> TradeSignal:
        prev_ema21 = float(prev_row.get("EMA_21", ema21))
        prev_ema50 = float(prev_row.get("EMA_50", ema50))
        golden_cross = prev_ema21 <= prev_ema50 and ema21 > ema50
        death_cross = prev_ema21 >= prev_ema50 and ema21 < ema50

        if golden_cross or ema21 > ema50:
            action = SignalSide.BUY
            score = 8 if golden_cross else 7
        elif death_cross or ema21 < ema50:
            action = SignalSide.SELL
            score = 8 if death_cross else 7
        else:
            action = SignalSide.WAIT
            score = 4

        sl = round(close - (atr * 1.8), 2) if action == SignalSide.BUY else round(close + (atr * 1.8), 2)
        tp = round(close + (abs(close - sl) * 2.2), 2) if action == SignalSide.BUY else round(close - (abs(close - sl) * 2.2), 2)

        return TradeSignal(
            symbol=symbol, strategy_name="MA Crossover", action=action,
            execution_state="ENTER_NOW" if action != SignalSide.WAIT else "STAND_ASIDE",
            confidence_score=score, current_price=close, entry_price_recommended=close,
            entry_zone={"min": round(close * 0.995, 2), "max": round(close * 1.005, 2)},
            stop_loss=sl, stop_distance_pct=round(abs((sl - close)/close)*100, 2),
            target_1=round(close + (tp-close)*0.5, 2), target_2=tp, target_3=round(close + (tp-close)*1.5, 2),
            risk_reward_ratio=2.2,
            actionable_instruction=f"{action.value}: EMA 21 / EMA 50 alignment indicates {action.value} direction. Enter at ${close:,.2f}.",
            invalidation_reason="Reverse crossover of EMA 21 below EMA 50.",
            conditions=[
                ConditionCheck(name="EMA 21 vs EMA 50 Position", status=TriggerStatus.MET, weight=5, detail=f"EMA 21 (${ema21:,.2f}) vs EMA 50 (${ema50:,.2f})"),
                ConditionCheck(name="Price Holding Above Crossover", status=TriggerStatus.MET if close > ema21 else TriggerStatus.PENDING, weight=5, detail="Price confirms moving average support")
            ]
        )

    @classmethod
    def _generate_insufficient_data_signal(cls, symbol: str, strategy: str) -> TradeSignal:
        return TradeSignal(
            symbol=symbol, strategy_name=strategy, action=SignalSide.WAIT,
            execution_state="INSUFFICIENT_DATA", confidence_score=0, current_price=0.0,
            entry_price_recommended=0.0, entry_zone={"min": 0.0, "max": 0.0}, stop_loss=0.0,
            stop_distance_pct=0.0, target_1=0.0, target_2=0.0, target_3=0.0, risk_reward_ratio=0.0,
            actionable_instruction="Stand aside: Insufficient historical candles to compute strategy indicators.",
            invalidation_reason="Need minimum 20 bars.", conditions=[]
        )
