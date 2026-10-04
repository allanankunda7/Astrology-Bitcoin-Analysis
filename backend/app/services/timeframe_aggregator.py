"""
Multi-Timeframe OHLCV Aggregation Engine
========================================
Part of Phase 3 Market Data Ingestion Pipeline.
Resamples high-frequency 1-minute base candles or tick streams into higher timeframe bars
(3m, 5m, 15m, 30m, 1h, 4h, 12h, 1D, 1W) with:
1. Strict UTC boundary alignment
2. Exact OHLCV aggregation math
3. Volume-Weighted Average Price (VWAP)
4. Dynamic `is_closed` bar-completion detection
5. Zero-Lookahead Bias Protection for backtesting and signal generation
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np


TIMEFRAME_MAP = {
    "1m": "1min",
    "3m": "3min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "12h": "12h",
    "1D": "1D",
    "1W": "W-MON",
}

TIMEFRAME_SECONDS = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "12h": 43200,
    "1D": 86400,
    "1W": 604800,
}


class TimeframeAggregator:
    """
    Quantitative resampling engine converting base candles to multi-timeframe structures.
    """

    @classmethod
    def resample_ohlcv(
        cls,
        df: pd.DataFrame,
        target_timeframe: str,
        current_time: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        Resamples a 1-minute DataFrame into a higher target timeframe.
        Ensures strict boundary alignment and calculates:
        - Open: First price of the period
        - High: Max price during the period
        - Low: Min price during the period
        - Close: Last price of the period
        - Volume: Cumulative sum of base volumes
        - VWAP: Volume-weighted typical price
        - is_closed: 1 if period has elapsed, 0 if bar is currently forming
        """
        if df.empty:
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume", "vwap", "is_closed"])

        clean_df = df.copy()

        # Normalize column names to lowercase
        col_rename = {}
        for c in clean_df.columns:
            c_low = str(c).strip().lower()
            if c_low in ["time", "timestamp", "date", "datetime"]:
                col_rename[c] = "timestamp"
            elif c_low in ["open", "o"]:
                col_rename[c] = "open"
            elif c_low in ["high", "h"]:
                col_rename[c] = "high"
            elif c_low in ["low", "l"]:
                col_rename[c] = "low"
            elif c_low in ["close", "c"]:
                col_rename[c] = "close"
            elif c_low in ["volume", "vol", "v"]:
                col_rename[c] = "volume"

        clean_df.rename(columns=col_rename, inplace=True)

        # Parse timestamp to UTC DatetimeIndex
        clean_df["timestamp"] = pd.to_datetime(clean_df["timestamp"], utc=True)
        clean_df.set_index("timestamp", inplace=True)
        clean_df.sort_index(inplace=True)

        pandas_rule = TIMEFRAME_MAP.get(target_timeframe, "4h")
        step_seconds = TIMEFRAME_SECONDS.get(target_timeframe, 14400)

        # Custom aggregation dictionary
        # Open: first, High: max, Low: min, Close: last, Volume: sum
        resampler = clean_df.resample(pandas_rule, label="left", closed="left")

        resampled_df = pd.DataFrame()
        resampled_df["open"] = resampler["open"].first()
        resampled_df["high"] = resampler["high"].max()
        resampled_df["low"] = resampler["low"].min()
        resampled_df["close"] = resampler["close"].last()
        resampled_df["volume"] = resampler["volume"].sum()

        # Calculate VWAP for each aggregated candle
        # Typical Price = (High + Low + Close) / 3
        typical_price = (clean_df["high"] + clean_df["low"] + clean_df["close"]) / 3.0
        pv = typical_price * clean_df["volume"]
        pv_sum = pv.resample(pandas_rule, label="left", closed="left").sum()
        vol_sum = clean_df["volume"].resample(pandas_rule, label="left", closed="left").sum()

        resampled_df["vwap"] = (pv_sum / vol_sum.replace(0, np.nan)).round(4)

        # Drop any empty intervals where market had no bars
        resampled_df.dropna(subset=["close"], inplace=True)

        # Reset index to have 'timestamp' column
        resampled_df.reset_index(inplace=True)

        # Determine `is_closed` flag
        now_utc = current_time or datetime.now(timezone.utc)
        resampled_df["is_closed"] = resampled_df["timestamp"].apply(
            lambda bar_ts: 1 if (now_utc - bar_ts).total_seconds() >= step_seconds else 0
        )

        return resampled_df

    @classmethod
    def get_closed_candles_for_backtest(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Anti-Lookahead Bias Filter:
        Strips any uncompleted candle (is_closed == 0) from the dataset.
        Prevents strategy backtests and scoring algorithms from utilizing future
        price information of bars that have not finished forming.
        """
        if "is_closed" in df.columns:
            return df[df["is_closed"] == 1].copy()
        return df.copy()

    @classmethod
    def align_timestamp_boundary(cls, dt: datetime, timeframe: str) -> datetime:
        """
        Rounds down a datetime to the exact canonical period boundary.
        Example: 2026-10-02 06:45:10 with timeframe='4h' -> 2026-10-02 04:00:00
        """
        seconds = TIMEFRAME_SECONDS.get(timeframe, 3600)
        epoch = dt.timestamp()
        aligned_epoch = epoch - (epoch % seconds)
        return datetime.fromtimestamp(aligned_epoch, tz=dt.tzinfo or timezone.utc)
