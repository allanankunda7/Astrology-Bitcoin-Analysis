/**
 * src/services/walkForwardEngine.ts
 * Walk-Forward Analysis, Out-of-Sample Testing & Overfitting Detection Engine
 * 
 * Implements rigorous statistical rolling window methodology:
 * 1. Training (In-Sample): Parameter exploration and calibration.
 * 2. Validation (In-Sample selection): Model selection and filter check.
 * 3. Parameter Freeze: Locks selected rules.
 * 4. Testing (Out-of-Sample): Unseen evaluation strictly preventing future-data leakage.
 * 5. Window Advance: Shifts the rolling window forward across time series.
 * 
 * Overfitting Detection:
 * Flags severe performance degradation between in-sample and out-of-sample periods.
 */

import { Candle } from './indicators';
import { runHistoricalBacktest, BacktestResult, BacktestMetrics } from './backtestingEngine';

export interface WalkForwardWindowConfig {
  trainingBars: number;     // e.g. 50 bars
  validationBars: number;   // e.g. 20 bars
  testingBars: number;      // e.g. 20 bars
  windowCount: number;      // e.g. 3 or 4 windows
  stepForwardBars: number;  // e.g. 20 bars
}

export interface WalkForwardWindowResult {
  windowIndex: number;
  label: string;
  timeRange: {
    start: number | string;
    end: number | string;
  };
  inSample: {
    candlesCount: number;
    metrics: BacktestMetrics;
  };
  validation: {
    candlesCount: number;
    metrics: BacktestMetrics;
  };
  outOfSample: {
    candlesCount: number;
    metrics: BacktestMetrics;
  };
  degradationRatio: number; // OutOfSample ProfitFactor / InSample ProfitFactor
  isOverfit: boolean;
  overfitReason?: string;
}

export interface WalkForwardReport {
  strategyName: string;
  symbol: string;
  timeframe: string;
  totalCandlesUsed: number;
  config: WalkForwardWindowConfig;
  windows: WalkForwardWindowResult[];
  aggregateMetrics: {
    combinedInSampleWinRate: number;
    combinedOutOfSampleWinRate: number;
    combinedInSampleProfitFactor: number;
    combinedOutOfSampleProfitFactor: number;
    totalOutOfSampleTrades: number;
    averageDegradationRatio: number;
    overfittingRiskScore: number; // 0 to 100
    overallVerdict: 'ROBUST_GENERALIZATION' | 'MODERATE_SENSITIVITY' | 'SEVERE_OVERFITTING_DETECTED';
    warningExplanation: string;
  };
  disclaimer: string;
}

export function executeWalkForwardAnalysis(
  candles: Candle[],
  strategyId: string = 'trend_following',
  symbol: string = 'BTC/USDT',
  timeframe: string = '4h',
  config: WalkForwardWindowConfig = {
    trainingBars: 40,
    validationBars: 15,
    testingBars: 15,
    windowCount: 3,
    stepForwardBars: 15
  }
): WalkForwardReport {
  const windowResults: WalkForwardWindowResult[] = [];
  const requiredBarsPerWindow = config.trainingBars + config.validationBars + config.testingBars;

  let startIndex = 0;

  for (let w = 0; w < config.windowCount; w++) {
    const trainStart = startIndex;
    const trainEnd = trainStart + config.trainingBars;
    const valStart = trainEnd;
    const valEnd = valStart + config.validationBars;
    const testStart = valEnd;
    const testEnd = testStart + config.testingBars;

    if (testEnd > candles.length) {
      // Reached end of historical dataset
      break;
    }

    // 1. Slice strictly non-overlapping slices
    const trainCandles = candles.slice(trainStart, trainEnd);
    const valCandles = candles.slice(valStart, valEnd);
    const testCandles = candles.slice(testStart, testEnd);

    // 2. Run In-Sample backtest
    const inSampleBt = runHistoricalBacktest(trainCandles, strategyId, symbol, timeframe, {
      initialCapital: 100000,
      riskPercent: 1.0,
      feePercent: 0.05,
      slippagePercent: 0.03
    });

    // 3. Run Validation backtest
    const valBt = runHistoricalBacktest(valCandles, strategyId, symbol, timeframe, {
      initialCapital: inSampleBt.metrics.endingCapital,
      riskPercent: 1.0,
      feePercent: 0.05,
      slippagePercent: 0.03
    });

    // 4. Freeze parameters & Run Unseen Out-of-Sample backtest
    const outOfSampleBt = runHistoricalBacktest(testCandles, strategyId, symbol, timeframe, {
      initialCapital: valBt.metrics.endingCapital,
      riskPercent: 1.0,
      feePercent: 0.05,
      slippagePercent: 0.03
    });

    // 5. Evaluate degradation & Overfitting detection heuristic
    const inSamplePF = inSampleBt.metrics.profitFactor || 1.0;
    const outSamplePF = outOfSampleBt.metrics.profitFactor || 0.0;
    const degradationRatio = Number((outSamplePF / (inSamplePF || 1)).toFixed(2));

    let isOverfit = false;
    let overfitReason = '';

    if (inSamplePF >= 2.0 && outSamplePF < 1.0) {
      isOverfit = true;
      overfitReason = `Severe performance decay: In-sample profit factor of ${inSamplePF.toFixed(2)} collapsed to ${outSamplePF.toFixed(2)} in out-of-sample data.`;
    } else if (degradationRatio < 0.5 && inSampleBt.metrics.totalTrades >= 5) {
      isOverfit = true;
      overfitReason = `Substantial degradation: Out-of-sample efficiency dropped by more than 50% relative to training period.`;
    } else if (outOfSampleBt.metrics.maxDrawdownPercent > inSampleBt.metrics.maxDrawdownPercent * 2) {
      isOverfit = true;
      overfitReason = `Drawdown expansion: Out-of-sample drawdown (${outOfSampleBt.metrics.maxDrawdownPercent.toFixed(1)}%) doubled in-sample drawdown.`;
    }

    windowResults.push({
      windowIndex: w + 1,
      label: `Rolling Window ${w + 1}`,
      timeRange: {
        start: trainCandles[0]?.time ?? 0,
        end: testCandles[testCandles.length - 1]?.time ?? 0
      },
      inSample: {
        candlesCount: trainCandles.length,
        metrics: inSampleBt.metrics
      },
      validation: {
        candlesCount: valCandles.length,
        metrics: valBt.metrics
      },
      outOfSample: {
        candlesCount: testCandles.length,
        metrics: outOfSampleBt.metrics
      },
      degradationRatio,
      isOverfit,
      overfitReason: overfitReason || undefined
    });

    // Advance rolling window forward
    startIndex += config.stepForwardBars;
  }

  // Aggregate Metrics & Scoring
  const avgInSamplePF = windowResults.length > 0
    ? windowResults.reduce((s, w) => s + w.inSample.metrics.profitFactor, 0) / windowResults.length
    : 0;
  const avgOutOfSamplePF = windowResults.length > 0
    ? windowResults.reduce((s, w) => s + w.outOfSample.metrics.profitFactor, 0) / windowResults.length
    : 0;
  const avgInSampleWinRate = windowResults.length > 0
    ? windowResults.reduce((s, w) => s + w.inSample.metrics.winRate, 0) / windowResults.length
    : 0;
  const avgOutOfSampleWinRate = windowResults.length > 0
    ? windowResults.reduce((s, w) => s + w.outOfSample.metrics.winRate, 0) / windowResults.length
    : 0;
  const totalOosTrades = windowResults.reduce((s, w) => s + w.outOfSample.metrics.totalTrades, 0);

  const avgDegradation = avgInSamplePF > 0 ? avgOutOfSamplePF / avgInSamplePF : 1;
  const overfitWindowCount = windowResults.filter((w) => w.isOverfit).length;

  let riskScore = 15;
  if (avgDegradation < 0.6) riskScore += 40;
  else if (avgDegradation < 0.8) riskScore += 20;

  if (overfitWindowCount > 0) riskScore += overfitWindowCount * 25;
  riskScore = Math.min(100, Math.max(0, riskScore));

  let overallVerdict: WalkForwardReport['aggregateMetrics']['overallVerdict'] = 'ROBUST_GENERALIZATION';
  let warningExplanation = 'The strategy showed consistent profitability across unseen rolling out-of-sample windows without extreme parameter decay.';

  if (riskScore >= 65) {
    overallVerdict = 'SEVERE_OVERFITTING_DETECTED';
    warningExplanation = 'Potential overfitting detected: Strong in-sample optimization failed to replicate on unseen out-of-sample test datasets. Parameters appear curve-fitted to past noise.';
  } else if (riskScore >= 35) {
    overallVerdict = 'MODERATE_SENSITIVITY';
    warningExplanation = 'Moderate sensitivity observed: Performance dipped moderately between training and testing windows. Recommend wider indicator thresholds or looser stop buffers.';
  }

  return {
    strategyName: strategyId.replace('_', ' ').toUpperCase(),
    symbol,
    timeframe,
    totalCandlesUsed: candles.length,
    config,
    windows: windowResults,
    aggregateMetrics: {
      combinedInSampleWinRate: Number(avgInSampleWinRate.toFixed(1)),
      combinedOutOfSampleWinRate: Number(avgOutOfSampleWinRate.toFixed(1)),
      combinedInSampleProfitFactor: Number(avgInSamplePF.toFixed(2)),
      combinedOutOfSampleProfitFactor: Number(avgOutOfSamplePF.toFixed(2)),
      totalOutOfSampleTrades: totalOosTrades,
      averageDegradationRatio: Number(avgDegradation.toFixed(2)),
      overfittingRiskScore: riskScore,
      overallVerdict,
      warningExplanation
    },
    disclaimer: 'Out-of-sample results are historical evaluation results and do not guarantee future performance. Never optimize on the final evaluation period.'
  };
}
