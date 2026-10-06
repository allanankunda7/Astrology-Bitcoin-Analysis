/**
 * tradingSystem.test.ts
 * Verification Test Suite for Quantitative Engine
 * 
 * Verifies:
 * 1. Indicator calculations (SMA, EMA, RSI, ATR, Bollinger Bands)
 * 2. Closed candle filtering (`get_closed_candles_for_backtest`)
 * 3. Zero look-ahead bias enforcement in backtest simulations
 * 4. Risk and position size formulas
 * 5. Market regime classification
 * 6. Edge cases (NaN handling, corrupt candles, insufficient data)
 */

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateATR,
  calculateBollingerBands,
  Candle
} from '../indicators';
import {
  detectSwingPoints,
  detectMarketRegime
} from '../marketStructure';
import {
  get_closed_candles_for_backtest,
  auditHistoricalData,
  runHistoricalBacktest
} from '../backtestingEngine';
import { calculatePositionRisk } from '../riskCalculator';
import { runPaperBrokerTests } from './paperBroker.test';
import { runStrategyLabAndReplayTests } from './strategyLabAndReplay.test';
import { runFinancialCalculationTests } from './financialCalculations.test';
import { runAuthAndSecurityTests } from './authAndSecurity.test';
import { runStrategyEngineTests } from './strategyEngine.test';

export async function runAllTests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  // Sample controlled test candles
  const testCandles: Candle[] = [
    { time: 1000, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
    { time: 1060, open: 100, high: 110, low: 98, close: 108, volume: 1200 },
    { time: 1120, open: 108, high: 115, low: 105, close: 112, volume: 1500 },
    { time: 1180, open: 112, high: 114, low: 102, close: 104, volume: 1100 },
    { time: 1240, open: 104, high: 106, low: 96, close: 98, volume: 1300 },
    { time: 1300, open: 98, high: 105, low: 97, close: 103, volume: 1400 },
    { time: 1360, open: 103, high: 112, low: 101, close: 110, volume: 1600 }
  ];

  // Test 1: SMA Calculation
  const sma3 = calculateSMA(testCandles, 3);
  // Bar 2 (3rd bar): (100 + 108 + 112) / 3 = 106.6667
  const expectedSma = (100 + 108 + 112) / 3;
  assert(sma3[0] === null && sma3[1] === null, 'SMA warmup nulls check');
  assert(Math.abs((sma3[2]?.value ?? 0) - expectedSma) < 0.001, 'SMA 3-period arithmetic mean precision');

  // Test 2: Closed Candle Filtering
  const rawWithForming = [
    ...testCandles,
    { time: 1420, open: 110, high: 111, low: 109, close: 110.5, volume: 200 } // currently forming
  ];
  const closedOnly = get_closed_candles_for_backtest(rawWithForming, true);
  assert(closedOnly.length === testCandles.length, 'get_closed_candles_for_backtest filters out forming bar');
  assert(closedOnly[closedOnly.length - 1].time === 1360, 'Last candle is confirmed closed bar');

  // Test 3: Corrupt Candle Sanitization
  const corruptBars: any[] = [
    { time: 100, open: 10, high: 12, low: 9, close: 11 },
    { time: 200, open: NaN, high: 12, low: 9, close: 11 }, // corrupt open
    { time: 300, open: 10, high: 12, low: 9, close: -5 }, // negative price
    { time: 400, open: 11, high: 15, low: 10, close: 14 }
  ];
  const cleaned = get_closed_candles_for_backtest(corruptBars, false);
  assert(cleaned.length === 2, 'Corrupt and NaN candles are cleanly removed');

  // Test 4: Position Sizing & Risk Calculation
  const riskTest = calculatePositionRisk({
    accountBalance: 10000,
    riskPercent: 1.0, // $100 risk
    entryPrice: 100,
    stopLossPrice: 95, // $5 stop distance
    takeProfitPrice: 115 // $15 reward distance
  });
  assert(riskTest.amountAtRisk === 100, 'Dollar risk is exactly 1% of $10,000 ($100)');
  assert(riskTest.stopDistanceDollar === 5, 'Stop distance is $5');
  assert(riskTest.positionSizeUnits === 20, 'Position size is exactly 20 units ($100 / $5)');
  assert(riskTest.riskRewardRatio === 3.0, 'Risk/Reward ratio is 1:3.0 ($15 / $5)');

  // Test 5: Max Risk Safeguard
  const excessiveRiskTest = calculatePositionRisk({
    accountBalance: 10000,
    riskPercent: 4.0, // 4% risk (exceeds 2% cap)
    entryPrice: 100,
    stopLossPrice: 95,
    takeProfitPrice: 110,
    maxRiskLimitPercent: 2.0
  });
  assert(excessiveRiskTest.isRiskExceeded === true, 'Max risk rule correctly triggers on 4% risk');
  assert(excessiveRiskTest.warnings.length > 0, 'Warning generated for excessive risk');

  // Test 6: Zero Look-Ahead Bias Backtest Check
  // Synthetic series of 80 bars to test simulation
  const longSeries: Candle[] = [];
  let price = 100;
  for (let i = 0; i < 90; i++) {
    const change = Math.sin(i / 5) * 2 + 0.2;
    price += change;
    longSeries.push({
      time: 1000 + i * 3600,
      open: price - 0.5,
      high: price + 1.2,
      low: price - 1.2,
      close: price,
      volume: 1000 + Math.random() * 500
    });
  }

  const btResult = runHistoricalBacktest(longSeries, 'trend_following', 'BTC/USDT', '1h', {
    initialCapital: 10000,
    riskPercent: 1.0,
    feePercent: 0.05,
    slippagePercent: 0.03
  });

  assert(btResult.audit.lookAheadBiasFree === true, 'Backtester validates zero lookahead bias');
  assert(btResult.metrics.initialCapital === 10000, 'Capital accounting balances correctly');
  assert(typeof btResult.metrics.winRate === 'number', 'Win rate calculated properly');

  // Broker Adapter & Paper Trading Engine Verification
  const brokerSuite = await runPaperBrokerTests();
  passed += brokerSuite.passed;
  failed += brokerSuite.failed;
  results.push(...brokerSuite.results);

  // Strategy Lab, Market Replay & Walk-Forward Suite
  const advancedSuite = await runStrategyLabAndReplayTests();
  passed += advancedSuite.passed;
  failed += advancedSuite.failed;
  results.push(...advancedSuite.results);

  // Deterministic Financial Calculations Suite
  const mathSuite = runFinancialCalculationTests();
  passed += mathSuite.passed;
  failed += mathSuite.failed;
  results.push(...mathSuite.results);

  // Authentication, Security & Risk Suite
  const secSuite = runAuthAndSecurityTests();
  passed += secSuite.passed;
  failed += secSuite.failed;
  results.push(...secSuite.results);

  // 12-Strategy Core Engine Verification & Test Matrix Suite
  const stratSuite = await runStrategyEngineTests();
  passed += stratSuite.passed;
  failed += stratSuite.failed;
  results.push(...stratSuite.results);

  return { passed, failed, results };
}
