"""
data.py - Step 1: Historical Bitcoin Data Collection & Return Engineering
========================================================================
Part of the "Astrology + Bitcoin Quantitative Backtesting System"

This module is responsible for:
1. Downloading daily historical BTC-USD market data using yfinance.
2. Cleaning and validating the time series (handling missing values, data integrity).
3. Calculating:
   - Daily percentage return: R_t = (Close_t - Close_{t-1}) / Close_{t-1}
   - Cumulative return: CR_t = (1 + R_1) * (1 + R_2) * ... * (1 + R_t) - 1
   - Rolling volatility (annualized): std(R_{t-N...t}) * sqrt(365)
"""

import sys
from typing import Optional
import numpy as np
import pandas as pd
import yfinance as yf


def fetch_btc_data(
    start_date: str = "2018-01-01",
    end_date: str = "2025-12-31",
    ticker: str = "BTC-USD"
) -> pd.DataFrame:
    """
    Download historical daily OHLCV data from Yahoo Finance for Bitcoin (BTC-USD).

    Parameters:
    -----------
    start_date : str
        Start date in 'YYYY-MM-DD' format (default: '2018-01-01').
    end_date : str
        End date in 'YYYY-MM-DD' format (default: '2025-12-31').
    ticker : str
        Market ticker symbol (default: 'BTC-USD').

    Returns:
    --------
    pd.DataFrame
        DataFrame indexed by timezone-naive Date with standard OHLCV columns.
    """
    print(f"[data.py] Fetching historical daily data for '{ticker}' from {start_date} to {end_date}...")

    # Download from yfinance
    # auto_adjust=False ensures we get clean raw Open, High, Low, Close, Volume
    raw_df = yf.download(
        tickers=ticker,
        start=start_date,
        end=end_date,
        interval="1d",
        auto_adjust=False,
        progress=False
    )

    if raw_df is None or raw_df.empty:
        raise ValueError(
            f"No data returned for ticker '{ticker}' between {start_date} and {end_date}. "
            "Please check your internet connection or date range."
        )

    # In newer versions of yfinance (>= 0.2.x), columns may be returned as MultiIndex tuples
    # e.g., ('Close', 'BTC-USD'). We flatten them if needed.
    if isinstance(raw_df.columns, pd.MultiIndex):
        raw_df.columns = [col[0] for col in raw_df.columns]

    # Standardize column names
    expected_cols = ["Open", "High", "Low", "Close", "Volume"]
    available_cols = [c for c in expected_cols if c in raw_df.columns]
    
    if len(available_cols) < 5:
        raise KeyError(
            f"Missing required price columns. Expected {expected_cols}, got {list(raw_df.columns)}"
        )

    df = raw_df[available_cols].copy()

    # Ensure index is standard timezone-naive datetime normalized to 00:00:00
    df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
    df.index.name = "Date"

    # Sort index chronologically
    df = df.sort_index()

    print(f"[data.py] Successfully fetched {len(df):,} trading days.")
    return df


def validate_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Verify and sanitize market data integrity.

    Checks:
    - Eliminates duplicate dates.
    - Ensures price values (Open, High, Low, Close) are strictly positive.
    - Checks High >= Low and High >= max(Open, Close).
    - Fills or drops unexpected NaN/missing values cleanly without look-ahead bias.

    Parameters:
    -----------
    df : pd.DataFrame
        Raw market OHLCV DataFrame.

    Returns:
    --------
    pd.DataFrame
        Validated and clean DataFrame.
    """
    clean_df = df.copy()

    # 1. Remove any duplicate dates (keep the first)
    if clean_df.index.has_duplicates:
        dups = clean_df.index.duplicated().sum()
        print(f"[data.py] Warning: Found {dups} duplicate date entries. Keeping first observation.")
        clean_df = clean_df[~clean_df.index.duplicated(keep="first")]

    # 2. Check for missing values
    missing_count = clean_df.isna().sum().sum()
    if missing_count > 0:
        print(f"[data.py] Found {missing_count} NaN values. Forward-filling prices to preserve chronological order...")
        clean_df = clean_df.ffill().bfill()

    # 3. Check for non-positive prices
    price_cols = ["Open", "High", "Low", "Close"]
    for col in price_cols:
        invalid_rows = clean_df[col] <= 0
        if invalid_rows.any():
            raise ValueError(f"Found non-positive price values in column '{col}'. Market data invalid.")

    # 4. Check basic candle logic: High should be >= Low
    candle_anomalies = clean_df["High"] < clean_df["Low"]
    if candle_anomalies.any():
        print(f"[data.py] Warning: Found {candle_anomalies.sum()} bars where High < Low. Correcting...")
        clean_df.loc[candle_anomalies, "High"] = clean_df.loc[candle_anomalies, ["Open", "Close", "Low"]].max(axis=1)

    return clean_df


def calculate_returns_and_volatility(
    df: pd.DataFrame,
    vol_window: int = 30,
    annualization_factor: float = 365.0
) -> pd.DataFrame:
    """
    Compute daily percentage return, cumulative return, and rolling annualized volatility.

    Formulas explained:
    -------------------
    1. Daily Percentage Return (R_t):
       R_t = (Close_t - Close_{t-1}) / Close_{t-1}
       Measures the simple arithmetic profit/loss percentage achieved by holding
       from the close of trading day t-1 to the close of day t.

    2. Cumulative Return (CR_t):
       CR_t = prod_{i=1}^{t} (1 + R_i) - 1  ==  (Close_t - Close_0) / Close_0
       Measures the total compound growth factor of $1.00 invested at Day 0.

    3. Rolling Annualized Volatility (sigma_ann):
       sigma_sample = std(R_{t-N+1 ... t})
       sigma_ann = sigma_sample * sqrt(365)
       
       *Note for Bitcoin*: Traditional equities use sqrt(252) because stock markets
       trade ~252 days/year (excluding weekends and market holidays).
       Bitcoin trades 24/7, 365 days a year, so we annualize using sqrt(365).

    Parameters:
    -----------
    df : pd.DataFrame
        DataFrame with validated 'Close' price column.
    vol_window : int
        Rolling window length in days (default: 30 days).
    annualization_factor : float
        Days per year for annualizing volatility (default: 365.0 for crypto).

    Returns:
    --------
    pd.DataFrame
        DataFrame augmented with:
        - 'Daily_Return'
        - 'Cumulative_Return'
        - 'Rolling_Vol_30d' (or custom window name)
    """
    res = df.copy()

    # 1. Daily percentage return
    # pct_change() automatically computes: (res['Close'] - res['Close'].shift(1)) / res['Close'].shift(1)
    res["Daily_Return"] = res["Close"].pct_change()

    # 2. Cumulative return from day 0
    # (1 + Daily_Return).cumprod() gives the equity curve starting from 1.0
    res["Cumulative_Return"] = (1.0 + res["Daily_Return"].fillna(0.0)).cumprod() - 1.0

    # 3. Rolling Volatility
    # Using sample standard deviation (ddof=1) over the rolling window, then scaling by sqrt(365)
    vol_col_name = f"Rolling_Vol_{vol_window}d"
    rolling_daily_std = res["Daily_Return"].rolling(window=vol_window).std(ddof=1)
    res[vol_col_name] = rolling_daily_std * np.sqrt(annualization_factor)

    return res


def print_data_summary(df: pd.DataFrame, vol_window: int = 30) -> None:
    """
    Print an informative, beginner-friendly summary of the prepared dataset.
    """
    vol_col = f"Rolling_Vol_{vol_window}d"
    returns = df["Daily_Return"].dropna()
    vols = df[vol_col].dropna()

    first_date = df.index[0].strftime("%Y-%m-%d")
    last_date = df.index[-1].strftime("%Y-%m-%d")
    start_close = df["Close"].iloc[0]
    end_close = df["Close"].iloc[-1]
    total_cum_return = df["Cumulative_Return"].iloc[-1] * 100

    mean_daily_return = returns.mean() * 100
    annualized_return = ((1.0 + returns.mean()) ** 365.0 - 1.0) * 100
    mean_ann_vol = vols.mean() * 100

    print("=" * 65)
    print("      BITCOIN HISTORICAL DATA SUMMARY (STEP 1 VALIDATION)       ")
    print("=" * 65)
    print(f"Date Range           : {first_date} to {last_date}")
    print(f"Total Observations   : {len(df):,} trading days")
    print(f"Starting Close Price : ${start_close:,.2f}")
    print(f"Ending Close Price   : ${end_close:,.2f}")
    print(f"Total Buy & Hold Gain: {total_cum_return:+,.2f}%")
    print("-" * 65)
    print(f"Mean Daily Return    : {mean_daily_return:+.3f}%")
    print(f"Compound Annualized  : {annualized_return:+,.2f}% (approx. arithmetic compounding)")
    print(f"Average {vol_window}d Ann. Vol : {mean_ann_vol:.2f}% (annualized with sqrt(365))")
    print(f"Max 1-Day Gain       : {returns.max() * 100:+.2f}% on {returns.idxmax().strftime('%Y-%m-%d')}")
    print(f"Max 1-Day Drop       : {returns.min() * 100:+.2f}% on {returns.idxmin().strftime('%Y-%m-%d')}")
    print("=" * 65)
    print("\nFirst 5 Rows:")
    print(df[["Close", "Daily_Return", "Cumulative_Return", vol_col]].head().to_string())
    print("\nLast 5 Rows:")
    print(df[["Close", "Daily_Return", "Cumulative_Return", vol_col]].tail().to_string())
    print("=" * 65)


def prepare_dataset(
    start_date: str = "2018-01-01",
    end_date: str = "2025-12-31",
    vol_window: int = 30
) -> pd.DataFrame:
    """
    End-to-end convenience pipeline for Step 1.
    Downloads, validates, and computes returns and volatility.
    """
    raw_df = fetch_btc_data(start_date=start_date, end_date=end_date)
    clean_df = validate_data(raw_df)
    final_df = calculate_returns_and_volatility(clean_df, vol_window=vol_window)
    return final_df


if __name__ == "__main__":
    print("[Step 1 Execution] Running data collection & validation pipeline...")
    try:
        btc_data = prepare_dataset(start_date="2018-01-01", end_date="2025-12-31")
        print_data_summary(btc_data)
        print("\n[Step 1 SUCCESS] Historical Bitcoin data downloaded and calculated successfully!")
    except Exception as exc:
        print(f"\n[Step 1 ERROR] {exc}", file=sys.stderr)
        sys.exit(1)
