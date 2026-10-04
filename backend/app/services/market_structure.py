"""
Market Structure Analysis Engine
================================
Part of Phase 4: Market Structure & Support/Resistance.
Algorithmic detection of:
1. Swing Highs & Swing Lows (Fractal-based pivot identification)
2. Structural Pivot Classification (Higher High, Higher Low, Lower High, Lower Low)
3. Break of Structure (BOS) - Trend Continuation
4. Change of Character (CHoCH) - Trend Reversal Shift
5. Liquidity Sweeps (Wick breach without candle close confirmation)
6. Dynamic Support and Resistance Reaction Zones (Price Clustering & Density)
7. Multi-method Pivot Points (Classical, Fibonacci, Camarilla)

Principles Enforced:
- Clear labeling of algorithmic detections as mathematical approximations.
- Explicit requirement for candle close confirmation for structural breaks.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field


class StructureConfig(BaseModel):
    """
    Configuration parameters for market structure detection.
    """
    pivot_window: int = Field(default=3, ge=1, le=10, description="Bars left and right for swing fractal detection")
    require_close_for_bos: bool = Field(default=True, description="Require candle close beyond swing point for BOS confirmation")
    liquidity_sweep_wick_min_pct: float = Field(default=0.10, description="Minimum wick penetration percentage for sweep qualification")
    zone_cluster_tolerance_pct: float = Field(default=0.45, description="Percentage proximity to cluster nearby levels into S/R zones")
    min_touches_for_zone: int = Field(default=2, description="Minimum pivot touches to confirm a validated S/R zone")


class SwingPoint(BaseModel):
    index: int
    timestamp: str
    price: float
    point_type: str  # 'HIGH' or 'LOW'
    classification: str  # 'HH', 'HL', 'LH', 'LL', or 'UNCONFIRMED'
    bar_time: Optional[str] = None


class StructuralEvent(BaseModel):
    event_type: str  # 'BOS_BULLISH', 'BOS_BEARISH', 'CHOCH_BULLISH', 'CHOCH_BEARISH', 'LIQUIDITY_SWEEP_HIGH', 'LIQUIDITY_SWEEP_LOW'
    timestamp: str
    broken_level: float
    trigger_price: float
    bar_index: int
    direction: str  # 'BULLISH' or 'BEARISH'
    description: str


class SupportResistanceZone(BaseModel):
    zone_type: str  # 'SUPPORT' or 'RESISTANCE'
    lower_bound: float
    upper_bound: float
    mid_price: float
    touch_count: int
    strength: str  # 'WEAK', 'MODERATE', 'STRONG'
    source_pivots: List[float]


class PivotPoints(BaseModel):
    pivot: float
    r1: float
    r2: float
    r3: float
    s1: float
    s2: float
    s3: float
    method: str = "Classical"


class MarketStructureAnalysisResult(BaseModel):
    regime: str  # 'STRONG_UPTREND', 'WEAK_UPTREND', 'STRONG_DOWNTREND', 'WEAK_DOWNTREND', 'RANGING'
    trend_bias: str  # 'BULLISH', 'BEARISH', 'NEUTRAL'
    swing_points: List[SwingPoint]
    events: List[StructuralEvent]
    support_zones: List[SupportResistanceZone]
    resistance_zones: List[SupportResistanceZone]
    pivots: PivotPoints
    disclaimer: str = "Algorithmic market structure detection is a probabilistic approximation of historical price action, not a guarantee."


class MarketStructureEngine:
    """
    Quantitative Market Structure & Dynamic Support/Resistance Engine.
    """

    @classmethod
    def find_swing_points(
        cls,
        df: pd.DataFrame,
        window: int = 3
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Identifies swing highs and swing lows using an N-bar fractal window.
        A swing high requires high[i] > high[i-k] and high[i] > high[i+k] for k in 1..window.
        A swing low requires low[i] < low[i-k] and low[i] < low[i+k] for k in 1..window.
        """
        highs = df["high"].values
        lows = df["low"].values
        timestamps = df["timestamp"].values
        n = len(df)

        swing_highs = []
        swing_lows = []

        for i in range(window, n - window):
            # Check swing high
            is_high = True
            curr_h = highs[i]
            for k in range(1, window + 1):
                if highs[i - k] >= curr_h or highs[i + k] >= curr_h:
                    is_high = False
                    break
            if is_high:
                ts_str = timestamps[i].isoformat() if hasattr(timestamps[i], "isoformat") else str(timestamps[i])
                swing_highs.append({
                    "index": i,
                    "price": float(curr_h),
                    "timestamp": ts_str,
                    "type": "HIGH"
                })

            # Check swing low
            is_low = True
            curr_l = lows[i]
            for k in range(1, window + 1):
                if lows[i - k] <= curr_l or lows[i + k] <= curr_l:
                    is_low = False
                    break
            if is_low:
                ts_str = timestamps[i].isoformat() if hasattr(timestamps[i], "isoformat") else str(timestamps[i])
                swing_lows.append({
                    "index": i,
                    "price": float(curr_l),
                    "timestamp": ts_str,
                    "type": "LOW"
                })

        return swing_highs, swing_lows

    @classmethod
    def classify_swings(
        cls,
        swing_highs: List[Dict[str, Any]],
        swing_lows: List[Dict[str, Any]]
    ) -> List[SwingPoint]:
        """
        Classifies swing points sequentially into:
        - Higher High (HH): Current High > Previous High
        - Lower High (LH): Current High < Previous High
        - Higher Low (HL): Current Low > Previous Low
        - Lower Low (LL): Current Low < Previous Low
        """
        classified: List[SwingPoint] = []

        # Classify Highs
        for idx, sh in enumerate(swing_highs):
            if idx == 0:
                cls_label = "HIGH"
            else:
                prev_p = swing_highs[idx - 1]["price"]
                cls_label = "HH" if sh["price"] > prev_p else "LH"

            classified.append(SwingPoint(
                index=sh["index"],
                timestamp=sh["timestamp"],
                price=sh["price"],
                point_type="HIGH",
                classification=cls_label,
            ))

        # Classify Lows
        for idx, sl in enumerate(swing_lows):
            if idx == 0:
                cls_label = "LOW"
            else:
                prev_p = swing_lows[idx - 1]["price"]
                cls_label = "HL" if sl["price"] > prev_p else "LL"

            classified.append(SwingPoint(
                index=sl["index"],
                timestamp=sl["timestamp"],
                price=sl["price"],
                point_type="LOW",
                classification=cls_label,
            ))

        # Sort chronologically by bar index
        classified.sort(key=lambda x: x.index)
        return classified

    @classmethod
    def detect_bos_and_choch(
        cls,
        df: pd.DataFrame,
        classified_swings: List[SwingPoint],
        require_close: bool = True
    ) -> List[StructuralEvent]:
        """
        Detects Break of Structure (BOS) and Change of Character (CHoCH):
        - Bullish BOS: Price breaks above recent swing high while in an established uptrend.
        - Bearish BOS: Price breaks below recent swing low while in an established downtrend.
        - Bullish CHoCH: In a downtrend, price breaks above the last Lower High (LH), signaling reversal.
        - Bearish CHoCH: In an uptrend, price breaks below the last Higher Low (HL), signaling reversal.
        """
        events: List[StructuralEvent] = []
        if len(classified_swings) < 3:
            return events

        highs = df["high"].values
        lows = df["low"].values
        closes = df["close"].values
        timestamps = df["timestamp"].values

        # Track active swing levels
        active_high: Optional[SwingPoint] = None
        active_low: Optional[SwingPoint] = None
        current_trend = "NEUTRAL"  # 'BULLISH', 'BEARISH', 'NEUTRAL'

        swing_iter = iter(classified_swings)
        next_swing = next(swing_iter, None)

        for i in range(len(df)):
            # Update active swings as time advances
            while next_swing and next_swing.index <= i:
                if next_swing.point_type == "HIGH":
                    active_high = next_swing
                else:
                    active_low = next_swing
                next_swing = next(swing_iter, None)

            if not active_high or not active_low:
                continue

            test_high_val = closes[i] if require_close else highs[i]
            test_low_val = closes[i] if require_close else lows[i]
            ts_str = timestamps[i].isoformat() if hasattr(timestamps[i], "isoformat") else str(timestamps[i])

            # Check Bullish Breakout above active high
            if test_high_val > active_high.price and i > active_high.index:
                if current_trend == "BEARISH":
                    # Trend reversal -> Bullish CHoCH
                    events.append(StructuralEvent(
                        event_type="CHOCH_BULLISH",
                        timestamp=ts_str,
                        broken_level=active_high.price,
                        trigger_price=float(test_high_val),
                        bar_index=i,
                        direction="BULLISH",
                        description=f"Bullish Change of Character: Price closed above swing high at ${active_high.price:,.2f}"
                    ))
                    current_trend = "BULLISH"
                elif current_trend in ["BULLISH", "NEUTRAL"]:
                    # Trend continuation -> Bullish BOS
                    events.append(StructuralEvent(
                        event_type="BOS_BULLISH",
                        timestamp=ts_str,
                        broken_level=active_high.price,
                        trigger_price=float(test_high_val),
                        bar_index=i,
                        direction="BULLISH",
                        description=f"Bullish Break of Structure: Trend continuation above swing high at ${active_high.price:,.2f}"
                    ))
                    current_trend = "BULLISH"

            # Check Bearish Breakdown below active low
            elif test_low_val < active_low.price and i > active_low.index:
                if current_trend == "BULLISH":
                    # Trend reversal -> Bearish CHoCH
                    events.append(StructuralEvent(
                        event_type="CHOCH_BEARISH",
                        timestamp=ts_str,
                        broken_level=active_low.price,
                        trigger_price=float(test_low_val),
                        bar_index=i,
                        direction="BEARISH",
                        description=f"Bearish Change of Character: Price closed below swing low at ${active_low.price:,.2f}"
                    ))
                    current_trend = "BEARISH"
                elif current_trend in ["BEARISH", "NEUTRAL"]:
                    # Trend continuation -> Bearish BOS
                    events.append(StructuralEvent(
                        event_type="BOS_BEARISH",
                        timestamp=ts_str,
                        broken_level=active_low.price,
                        trigger_price=float(test_low_val),
                        bar_index=i,
                        direction="BEARISH",
                        description=f"Bearish Break of Structure: Trend continuation below swing low at ${active_low.price:,.2f}"
                    ))
                    current_trend = "BEARISH"

        return events

    @classmethod
    def detect_liquidity_sweeps(
        cls,
        df: pd.DataFrame,
        classified_swings: List[SwingPoint]
    ) -> List[StructuralEvent]:
        """
        Detects Liquidity Sweeps / Stop Hunts / False Breakouts:
        - Sweep High: Candle high penetrates swing high, but candle close finishes BACK BELOW the swing level.
        - Sweep Low: Candle low penetrates swing low, but candle close finishes BACK ABOVE the swing level.
        """
        sweeps: List[StructuralEvent] = []
        highs = df["high"].values
        lows = df["low"].values
        closes = df["close"].values
        timestamps = df["timestamp"].values

        for sp in classified_swings:
            start_i = sp.index + 1
            # Search following 30 bars
            end_i = min(len(df), sp.index + 35)

            for i in range(start_i, end_i):
                ts_str = timestamps[i].isoformat() if hasattr(timestamps[i], "isoformat") else str(timestamps[i])

                if sp.point_type == "HIGH":
                    # Wick pierced above, but close stayed below
                    if highs[i] > sp.price and closes[i] <= sp.price:
                        wick_penetration = (highs[i] - sp.price) / sp.price * 100.0
                        if wick_penetration >= 0.05:  # At least 0.05% wick breach
                            sweeps.append(StructuralEvent(
                                event_type="LIQUIDITY_SWEEP_HIGH",
                                timestamp=ts_str,
                                broken_level=sp.price,
                                trigger_price=float(highs[i]),
                                bar_index=i,
                                direction="BEARISH",
                                description=f"Liquidity Sweep above ${sp.price:,.2f} with wick rejection (+{wick_penetration:.2f}% overshoot)"
                            ))
                            break

                elif sp.point_type == "LOW":
                    # Wick pierced below, but close stayed above
                    if lows[i] < sp.price and closes[i] >= sp.price:
                        wick_penetration = (sp.price - lows[i]) / sp.price * 100.0
                        if wick_penetration >= 0.05:
                            sweeps.append(StructuralEvent(
                                event_type="LIQUIDITY_SWEEP_LOW",
                                timestamp=ts_str,
                                broken_level=sp.price,
                                trigger_price=float(lows[i]),
                                bar_index=i,
                                direction="BULLISH",
                                description=f"Liquidity Sweep below ${sp.price:,.2f} with wick absorption (-{wick_penetration:.2f}% undershoot)"
                            ))
                            break

        return sweeps

    @classmethod
    def calculate_support_resistance_zones(
        cls,
        classified_swings: List[SwingPoint],
        current_price: float,
        tolerance_pct: float = 0.45
    ) -> Tuple[List[SupportResistanceZone], List[SupportResistanceZone]]:
        """
        Clusters swing highs and lows into dynamic Support and Resistance zones.
        Levels within `tolerance_pct` proximity are merged into reaction bands.
        """
        high_prices = [sp.price for sp in classified_swings if sp.point_type == "HIGH"]
        low_prices = [sp.price for sp in classified_swings if sp.point_type == "LOW"]

        all_pivots = high_prices + low_prices
        all_pivots.sort()

        clusters: List[List[float]] = []
        for p in all_pivots:
            matched = False
            for c in clusters:
                avg_c = sum(c) / len(c)
                diff_pct = abs(p - avg_c) / avg_c * 100.0
                if diff_pct <= tolerance_pct:
                    c.append(p)
                    matched = True
                    break
            if not matched:
                clusters.append([p])

        support_zones: List[SupportResistanceZone] = []
        resistance_zones: List[SupportResistanceZone] = []

        for c in clusters:
            mid = float(np.mean(c))
            spread = max(c) - min(c)
            # Minimum zone width of 0.25%
            half_width = max(spread / 2.0, mid * 0.0015)
            touches = len(c)
            strength = "STRONG" if touches >= 3 else ("MODERATE" if touches == 2 else "WEAK")

            zone = SupportResistanceZone(
                zone_type="SUPPORT" if mid < current_price else "RESISTANCE",
                lower_bound=round(mid - half_width, 2),
                upper_bound=round(mid + half_width, 2),
                mid_price=round(mid, 2),
                touch_count=touches,
                strength=strength,
                source_pivots=[round(x, 2) for x in c],
            )

            if mid < current_price:
                support_zones.append(zone)
            else:
                resistance_zones.append(zone)

        # Sort support descending (closest to current price first)
        support_zones.sort(key=lambda z: z.mid_price, reverse=True)
        # Sort resistance ascending (closest to current price first)
        resistance_zones.sort(key=lambda z: z.mid_price)

        return support_zones, resistance_zones

    @classmethod
    def calculate_classical_pivots(
        cls,
        high: float,
        low: float,
        close: float
    ) -> PivotPoints:
        """
        Calculates Standard Classical Floor Pivot Points:
        P = (H + L + C) / 3
        R1 = (2 * P) - L, S1 = (2 * P) - H
        R2 = P + (H - L), S2 = P - (H - L)
        R3 = H + 2 * (P - L), S3 = L - 2 * (H - P)
        """
        p = (high + low + close) / 3.0
        r1 = (2.0 * p) - low
        s1 = (2.0 * p) - high
        r2 = p + (high - low)
        s2 = p - (high - low)
        r3 = high + 2.0 * (p - low)
        s3 = low - 2.0 * (high - p)

        return PivotPoints(
            pivot=round(p, 2),
            r1=round(r1, 2),
            r2=round(r2, 2),
            r3=round(r3, 2),
            s1=round(s1, 2),
            s2=round(s2, 2),
            s3=round(s3, 2),
            method="Classical Floor"
        )

    @classmethod
    def analyze_structure(
        cls,
        df: pd.DataFrame,
        config: Optional[StructureConfig] = None
    ) -> MarketStructureAnalysisResult:
        """
        Complete end-to-end market structure pipeline:
        1. Swing points fractal extraction
        2. HH, HL, LH, LL classification
        3. BOS and CHoCH event extraction
        4. Liquidity sweeps detection
        5. Support & Resistance clustering
        6. Classical pivot levels
        7. Regime determination
        """
        cfg = config or StructureConfig()
        clean_df = df.copy()

        # Normalize column names
        col_map = {c: c.lower() for c in clean_df.columns}
        clean_df.rename(columns=col_map, inplace=True)

        for col in ["open", "high", "low", "close"]:
            clean_df[col] = pd.to_numeric(clean_df[col], errors="coerce")

        current_price = float(clean_df["close"].iloc[-1])
        last_high = float(clean_df["high"].max())
        last_low = float(clean_df["low"].min())

        # 1. Swings & Classification
        swing_h, swing_l = cls.find_swing_points(clean_df, window=cfg.pivot_window)
        classified_swings = cls.classify_swings(swing_h, swing_l)

        # 2. Structural Events (BOS & CHoCH)
        bos_events = cls.detect_bos_and_choch(
            clean_df, classified_swings, require_close=cfg.require_close_for_bos
        )

        # 3. Liquidity Sweeps
        sweeps = cls.detect_liquidity_sweeps(clean_df, classified_swings)
        all_events = bos_events + sweeps
        all_events.sort(key=lambda e: e.bar_index)

        # 4. Support and Resistance Zones
        sup_zones, res_zones = cls.calculate_support_resistance_zones(
            classified_swings, current_price, tolerance_pct=cfg.zone_cluster_tolerance_pct
        )

        # 5. Classical Pivots
        pivots = cls.calculate_classical_pivots(last_high, last_low, current_price)

        # 6. Regime Determination
        recent_swings = classified_swings[-4:] if len(classified_swings) >= 4 else classified_swings
        hh_count = sum(1 for s in recent_swings if s.classification == "HH")
        hl_count = sum(1 for s in recent_swings if s.classification == "HL")
        ll_count = sum(1 for s in recent_swings if s.classification == "LL")
        lh_count = sum(1 for s in recent_swings if s.classification == "LH")

        if hh_count >= 1 and hl_count >= 1 and ll_count == 0:
            regime = "STRONG_UPTREND"
            bias = "BULLISH"
        elif ll_count >= 1 and lh_count >= 1 and hh_count == 0:
            regime = "STRONG_DOWNTREND"
            bias = "BEARISH"
        elif hh_count > ll_count:
            regime = "WEAK_UPTREND"
            bias = "BULLISH"
        elif ll_count > hh_count:
            regime = "WEAK_DOWNTREND"
            bias = "BEARISH"
        else:
            regime = "RANGING"
            bias = "NEUTRAL"

        return MarketStructureAnalysisResult(
            regime=regime,
            trend_bias=bias,
            swing_points=classified_swings,
            events=all_events,
            support_zones=sup_zones[:4],
            resistance_zones=res_zones[:4],
            pivots=pivots,
        )


market_structure_engine = MarketStructureEngine()
