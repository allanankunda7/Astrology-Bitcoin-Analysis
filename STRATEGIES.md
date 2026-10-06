# Strategy Engine & Strategy Lab Guide

## Strategy Architecture

The Strategy Lab (`src/services/strategyLab.ts`) provides a modular system for developing, backtesting, versioning, comparing, and managing quantitative trading models.

---

## 1. Supported Technical & Structural Indicators

Strategies can utilize arbitrary combinations of:
- **Moving Averages**: Fast EMA, Slow EMA, Baseline SMA, Trend Filter EMA (e.g. 200 EMA).
- **Momentum**: RSI (Wilder's smoothed), RSI overbought/oversold boundaries, RSI bullish/bearish divergence.
- **Trend & Cycles**: MACD (12/26/9), MACD histogram momentum confirmation.
- **Volatility**: Average True Range (ATR) dynamic stop-loss and take-profit multiples, Bollinger Bands bandwidth filter.
- **Smart Money Concepts (SMC)**: Break of Structure (BOS), Change of Character (CHoCH), Order Block retests, Support & Resistance confirmation.
- **Volume**: Volume expansion filters (e.g. volume > 1.5x 20-period volume SMA).

---

## 2. Immutable Strategy Versioning

Every strategy maintains an immutable audit history:
- When a strategy is created, it begins at version `v1.0.0`.
- When parameters (indicators, risk thresholds, timeframe) are modified, `saveStrategyVersion` increments the version (e.g., `v1.1.0`) and preserves the historical snapshot.
- Historical backtest results remain permanently tied to the exact version configuration under which they were generated.

---

## 3. Multi-Strategy Benchmarking

The comparison module executes parallel backtests over identical candlestick feeds and evaluates:
- Total Trades, Winning Trades, Losing Trades
- Win Rate %
- Net Return ($ and %)
- Profit Factor
- Expectancy ($ per trade)
- Average Win vs Average Loss
- Maximum Drawdown %
- Max Consecutive Wins & Losses
- Annualized Sharpe Estimate
- Sortino Ratio (downside deviation penalization)
- Recovery Factor (Net Return / Max Drawdown)
- Average Trade Duration in Bars
