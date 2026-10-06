# Backtesting Methodology & Verification

## Zero Look-Ahead Bias Guarantee

The backtesting engine in `src/services/backtestingEngine.ts` enforces institutional quantitative standards:

1. **Closed Candle Filtering**:
   - `get_closed_candles_for_backtest(candles)` strictly discards the currently forming candlestick bar.
   - Signals are calculated strictly using confirmed close prices of bar `i`.
   - Simulated orders are filled at the open price of bar `i+1`.
   - Indicators never reference future bars (`i+1`, `i+2`).

2. **Realistic Execution Frictions**:
   - **Commissions**: Deducts maker and taker brokerage fees (default 0.05% per side).
   - **Slippage**: Incorporates adverse price movement on market entry and stop triggers (default 0.03%).
   - **Spread**: Bid/ask spread buffer applied during fill evaluation.

3. **Data Quality Audit**:
   - Evaluates candle sequences for timestamp gaps, duplicates, zero volume, and NaN values.
   - Discards invalid bars before indicator calculation.

---

## Walk-Forward & Out-of-Sample Testing

To prevent curve-fitting and statistical snooping:

1. **Rolling Window Partitioning**:
   - **In-Sample (Training)**: Explores indicator parameters and thresholds.
   - **Validation**: Selects and verifies candidate parameter sets.
   - **Out-of-Sample (Testing)**: Unseen test set with frozen parameters.
   - Strict chronologic boundary enforcement: `train.end < validation.start < test.start`.

2. **Overfitting Detection**:
   - Computes degradation ratio: `OutOfSample ProfitFactor / InSample ProfitFactor`.
   - Flags strategies where in-sample profit factor is abnormally high (>2.0) but out-of-sample deteriorates significantly (<1.0).
   - Prominently displays:
     > *"Out-of-sample results are historical evaluation results and do not guarantee future performance. Never optimize on the final evaluation period."*

---

## Market Replay Engine

The Market Replay mode in `src/services/marketReplayEngine.ts` provides interactive historical simulation:
- **Future Barrier**: All bars beyond `currentVisibleIndex` are physically isolated from memory and inaccessible to charts, strategies, or AI.
- **Controls**: Advance by +1 bar, +5 bars, +10 bars, or automated variable-speed playback.
- **In-Replay Execution**: Discretionary or algorithmic Long/Short order submission.
- **"What Would Have Happened?" Report**: Full post-session forensic audit analyzing every trade decision against subsequent market movements.
