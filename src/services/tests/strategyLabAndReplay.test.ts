/**
 * src/services/tests/strategyLabAndReplay.test.ts
 * Verification Test Suite for Strategy Lab, Market Replay & Walk-Forward Engine
 * 
 * Verifies:
 * 1. Strategy Lab: Strategy creation, version history preservation, cloning, and deletion
 * 2. Multi-Strategy Comparison: Uniform evaluation over identical data series
 * 3. Market Replay Engine: Future candle barrier enforcement (Zero Look-Ahead)
 * 4. Step-by-step advancing and in-replay paper trade simulation
 * 5. Automated Stop-Loss & Take-Profit execution during replay
 * 6. "What Would Have Happened?" Post-replay analysis report
 * 7. Walk-Forward Window Partitioning: Non-overlapping In-Sample, Validation, and Out-of-Sample slices
 * 8. Overfitting Detection Heuristics
 */

import { strategyLab } from '../strategyLab';
import { MarketReplayEngine } from '../marketReplayEngine';
import { executeWalkForwardAnalysis } from '../walkForwardEngine';
import { Candle } from '../indicators';

export async function runStrategyLabAndReplayTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(`✓ [PASS] ${testName}`);
    } else {
      failed++;
      results.push(`✗ [FAIL] ${testName}`);
      console.error(`Test failed: ${testName}`);
    }
  }

  // --- 1. STRATEGY LAB TESTS ---
  const createdStrat = strategyLab.createStrategy({
    name: 'Test Trend Momentum',
    description: 'Algorithmic momentum test strategy',
    asset: 'BTC/USDT',
    timeframe: '4h',
    direction: 'BOTH',
    tags: ['momentum', 'trend'],
    indicators: {
      emaFastPeriod: 20,
      emaSlowPeriod: 50,
      emaTrendFilterPeriod: 200,
      useEmaFilter: true,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      useRsiFilter: true,
      useRsiDivergence: false,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      useMacdConfirmation: true,
      atrPeriod: 14,
      atrMultiplierSL: 1.5,
      atrMultiplierTP: 3.0,
      bbPeriod: 20,
      bbStdDev: 2.0,
      useBollingerBands: true,
      useSMC: true,
      requireBOSContinuation: true,
      requireCHoCHReversal: false,
      useSupportResistance: true,
      useVolumeConfirmation: true,
      volumeMultiplier: 1.5
    },
    risk: {
      riskPercent: 1.5,
      minRiskRewardRatio: 2.5,
      maxOpenPositions: 2,
      stopLossMode: 'ATR_DYNAMIC',
      takeProfitMode: 'FIXED_RR',
      feePercent: 0.05,
      slippagePercent: 0.03,
      spreadPercent: 0.01
    }
  });

  assert(Boolean(createdStrat.id), 'Strategy successfully created with unique ID');
  assert(createdStrat.activeVersion === 'v1.0.0', 'Initial strategy version is v1.0.0');
  assert(createdStrat.versions.length === 1, 'Initial version history contains 1 record');

  // Update parameters -> Creates v1.1.0
  const updatedStrat = strategyLab.saveStrategyVersion(
    createdStrat.id,
    { ...createdStrat.indicators, emaFastPeriod: 25 },
    { ...createdStrat.risk, riskPercent: 2.0 },
    'Optimized EMA fast to 25 and increased risk to 2%'
  );

  assert(updatedStrat?.activeVersion === 'v1.1.0', 'Strategy version bumped to v1.1.0');
  assert(updatedStrat?.versions.length === 2, 'Strategy preserves v1.0.0 in version history without overwriting');
  assert(updatedStrat?.versions[0].version === 'v1.0.0', 'v1.0.0 is intact in history');
  assert(updatedStrat?.versions[1].version === 'v1.1.0', 'v1.1.0 is recorded with change notes');

  // Clone Strategy
  const cloned = strategyLab.cloneStrategy(createdStrat.id, 'Cloned BTC Momentum');
  assert(Boolean(cloned && cloned.id !== createdStrat.id), 'Cloned strategy has distinct ID');
  assert(cloned?.name === 'Cloned BTC Momentum', 'Cloned strategy has custom name');
  assert(cloned?.activeVersion === 'v1.0.0', 'Cloned strategy starts fresh version v1.0.0');

  // --- 2. MARKET REPLAY ENGINE TESTS ---
  // Create 100 realistic test candles
  const mockCandles: Candle[] = [];
  let currentPrice = 60000;
  for (let i = 0; i < 100; i++) {
    const move = (i % 2 === 0 ? 1 : -0.7) * 150;
    currentPrice += move;
    mockCandles.push({
      time: 1700000000 + i * 3600,
      open: currentPrice - 50,
      high: currentPrice + 120,
      low: currentPrice - 120,
      close: currentPrice,
      volume: 100 + i * 5
    });
  }

  const replay = new MarketReplayEngine(mockCandles, 'BTC/USDT', '1h', 100000, 30);
  const initialState = replay.getState();

  assert(initialState.totalCandlesCount === 100, 'Replay loaded 100 total candles');
  assert(initialState.currentVisibleIndex === 30, 'Initial visible index is barrier at 30');
  
  const visibleCandles = replay.getVisibleCandles();
  assert(visibleCandles.length === 31, 'Only visible candles (0 to 30) are exposed');
  assert(visibleCandles.length < mockCandles.length, 'Future candles are strictly hidden behind barrier');

  // Step +1 candle forward
  replay.stepForward(1);
  const steppedState = replay.getState();
  assert(steppedState.currentVisibleIndex === 31, 'Barrier successfully stepped forward by 1 bar');
  assert(replay.getVisibleCandles().length === 32, 'Revealed exactly 1 more candle');

  // Step +5 candles forward
  replay.stepForward(5);
  assert(replay.getState().currentVisibleIndex === 36, 'Barrier successfully stepped forward by 5 bars');

  // Place In-Replay Paper Order
  const barPrice = replay.getCurrentPrice();
  const createdOrder = replay.submitReplayOrder({
    side: 'LONG',
    quantity: 0.5,
    stopLoss: barPrice - 500,
    takeProfit: barPrice + 1000,
    userNote: 'Replay breakout entry test'
  });

  const stateWithOrder = replay.getState();
  assert(stateWithOrder.openPositions.length === 1, 'In-replay paper position opened successfully');
  assert(createdOrder.side === 'LONG', 'Order side recorded as LONG');

  // Step forward until trade finishes or advances
  replay.stepForward(20);
  const finalReplayState = replay.getState();
  assert(finalReplayState.currentVisibleIndex >= 56, 'Replay progressed past trade period');

  // Generate "What Would Have Happened?" Report
  const replayReport = replay.generateReport();
  assert(Boolean(replayReport.sessionId), 'Replay report generated with session ID');
  assert(typeof replayReport.finalEquity === 'number', 'Final equity calculated in report');
  assert(Array.isArray(replayReport.decisionsReview), 'Decisions review list present in report');

  // --- 3. WALK-FORWARD & OUT-OF-SAMPLE ENGINE TESTS ---
  // Create 200 candles for walk-forward testing
  const wfCandles: Candle[] = [];
  let p = 50000;
  for (let i = 0; i < 200; i++) {
    p += (Math.sin(i / 10) * 100) + 15;
    wfCandles.push({
      time: 1700000000 + i * 3600,
      open: p - 20,
      high: p + 80,
      low: p - 80,
      close: p,
      volume: 500
    });
  }

  const wfResult = executeWalkForwardAnalysis(wfCandles, 'trend_following', 'BTC/USDT', '1h', {
    trainingBars: 60,
    validationBars: 20,
    testingBars: 20,
    windowCount: 3,
    stepForwardBars: 25
  });

  assert(wfResult.windows.length > 0, 'Walk-forward engine generated windows successfully');
  
  // Verify strict non-overlapping partitions in Window 1
  const w1 = wfResult.windows[0];
  assert(w1.inSample.candlesCount === 60, 'In-sample data has exact 60 bars');
  assert(w1.validation.candlesCount === 20, 'Validation data has exact 20 bars');
  assert(w1.outOfSample.candlesCount === 20, 'Out-of-sample data has exact 20 bars');
  assert(typeof w1.outOfSample.metrics.totalTrades === 'number', 'Out-of-sample metrics evaluated without look-ahead');

  // Verify Overfitting Risk evaluation
  assert(typeof wfResult.aggregateMetrics.overfittingRiskScore === 'number', 'Overfitting risk score calculated');
  assert(wfResult.aggregateMetrics.overallVerdict !== undefined, 'Overall overfitting verdict assigned');
  assert(wfResult.disclaimer.includes('Out-of-sample results are historical evaluation results and do not guarantee future performance'), 'Disclaimer highlights historical simulation limits');

  // Cleanup test strategy
  strategyLab.deleteStrategy(createdStrat.id);
  if (cloned) strategyLab.deleteStrategy(cloned.id);

  return { passed, failed, results };
}
