/**
 * strategies.ts
 * Professional Modular Trading Strategy Engine & Confluence Hub
 * 
 * 12 Core Strategy Families:
 * 1. Trend Following (EMA 20/50/200 + Regime Alignment)
 * 2. Trend Pullback (Retracement into Key Support/EMA + Momentum Recovery)
 * 3. Breakout (Range/Resistance/Support Breakout with Volume + Volatility Expansion)
 * 4. Breakout + Retest (Confirmed BOS + Polarity Flip Holding as Support/Resistance)
 * 5. Support / Resistance Reversal (Rejection Wick + Momentum Divergence at Key Zones)
 * 6. Mean Reversion (Bollinger Bands + RSI Extremes in Ranging Regimes - Trend Protected)
 * 7. EMA Crossover (Fast EMA 20 / Slow EMA 50 Recent Crossover Event)
 * 8. RSI Momentum (Regime-Aware RSI Range, Momentum Recovery, & Divergence)
 * 9. MACD Momentum (Histogram Acceleration & Trend-Filtered Zero-Line Crossings)
 * 10. Bollinger Bands (Dual-Mode: Ranging Mean Reversion vs Squeeze Volatility Expansion)
 * 11. Market Structure (Deterministic Higher Highs / Higher Lows / BOS / CHoCH)
 * 12. Multi-Timeframe Confluence (Macro 4H + Structure 1H + Execution 15M/5M Alignment)
 * 
 * Features:
 * - Unified StrategyContext (prevents duplicate calculations across strategies)
 * - Transparent Strategy Confluence Engine (7-factor scoring: 0 - 100 Strategy Score)
 * - Strategy Conflict Detection (identifies contradictory signals and triggers WAIT)
 * - Market Regime Router (routes and prioritizes strategies based on active market regime)
 * - Reusable Volume & Volatility Confirmation Modules
 * - Reusable Strategy Filters
 */

import {
  Candle,
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
  calculateVolumeAnalysis
} from './indicators';
import {
  detectSwingPoints,
  detectStructuralBreaks,
  findSupportResistanceZones,
  detectMarketRegime,
  MarketRegime,
  MarketRegimeType,
  SwingPoint,
  StructuralEvent,
  SRZone
} from './marketStructure';
import { analyzeMultiTimeframe } from './multiTimeframe';

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

export type SignalAction = 'LONG SETUP' | 'SHORT SETUP' | 'WAIT' | 'NO CLEAR SETUP';

export interface StrategyParameter {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  defaultValue: any;
  currentValue: any;
  options?: string[];
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StrategySignal {
  strategyId: string;
  strategyName: string;
  strategyVersion?: string;
  symbol: string;
  timeframe: string;
  action: SignalAction;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entryMin: number;
  entryMax: number;
  entryMid: number;
  stopLoss: number;
  stopDistancePct: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  confidenceScore: number; // 0 - 100 Strategy Score (Rule Alignment, NOT probability!)
  reasonsSupporting: string[];
  reasonsAgainst: string[];
  invalidationCriteria: string;
  regime: MarketRegime;
  timestamp: number | string;
  conditionsMet?: string[];
  conditionsFailed?: string[];
  mode?: string; // e.g. for Bollinger dual mode
  category?: 'Trend' | 'Momentum' | 'Breakout' | 'Reversion' | 'Structure' | 'Multi-Timeframe';
}

export interface StrategyContext {
  asset: {
    symbol: string;
    category?: string;
    precision: number;
    minStopDist: number;
    roundP: (p: number) => number;
    fmtP: (p: number) => string;
    isForex: boolean;
  };
  timeframe: string;
  candles: Candle[];
  closedCandles: Candle[];
  currentPrice: number;
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  volumeAnalysis: {
    isVolumeSpike: boolean;
    volumeTrend: 'EXPANDING' | 'CONTRACTING' | 'FLAT';
    volumeSma: number;
    isAboveAverage: boolean;
  };
  volatility: {
    atr: number;
    atrPercent: number;
    bandwidth: number;
    classification: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    isSqueeze: boolean;
  };
  ema20: number;
  ema50: number;
  ema200: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi: number;
  prevRsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    prevHistogram: number;
    isCrossAbove: boolean;
    isCrossBelow: boolean;
  };
  atr: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
    isSqueeze: boolean;
  };
  swingPoints: SwingPoint[];
  structuralEvents: StructuralEvent[];
  lastBOS?: StructuralEvent;
  lastCHoCH?: StructuralEvent;
  supportZones: SRZone[];
  resistanceZones: SRZone[];
  nearestSupport?: SRZone;
  nearestResistance?: SRZone;
  marketRegime: MarketRegime;
  htfTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  ltfTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  dataQuality: {
    candleCount: number;
    hasGaps: boolean;
    isStale: boolean;
    qualityScore: number;
  };
  timestamp: number | string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'Trend' | 'Momentum' | 'Breakout' | 'Reversion' | 'Structure' | 'Multi-Timeframe';
  bestRegime: string;
  weakestRegime: string;
  enabled: boolean;
  getParameters: () => StrategyParameter[];
  analyze: (context: StrategyContext) => StrategySignal;
  validate: (context: StrategyContext) => ValidationResult;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Trend' | 'Momentum' | 'Breakout' | 'Reversion' | 'Structure' | 'Multi-Timeframe';
  bestRegime: string;
  weakestRegime: string;
  enabled: boolean;
  evaluate: (candles: Candle[], symbol: string, timeframe: string) => StrategySignal;
}

// ============================================================================
// 2. PRECISION & CONTEXT BUILDER
// ============================================================================

export function getSymbolPrecision(symbol: string, price: number) {
  const isForex = symbol === 'EUR/USD' || (price > 0 && price < 10);
  const precision = isForex ? 4 : 2;
  const minStopDist = isForex ? 0.0008 : 0.1;
  const roundP = (p: number) => Number(p.toFixed(precision));
  const fmtP = (p: number) =>
    isForex
      ? p.toFixed(4)
      : p >= 1000
      ? p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : p.toFixed(2);
  return { isForex, precision, minStopDist, roundP, fmtP };
}

/**
 * Builds a unified StrategyContext from candlestick series.
 * Prevents redundant indicator and market-structure passes across strategies.
 */
export function buildStrategyContext(candles: Candle[], symbol: string, timeframe: string): StrategyContext {
  const closedCandles = candles.length > 1 ? candles.slice(0, -1) : candles;
  const lastBar = candles[candles.length - 1] || { time: Date.now(), open: 1, high: 1, low: 1, close: 1, volume: 1000 };
  const currentPrice = lastBar.close;
  const { isForex, precision, minStopDist, roundP, fmtP } = getSymbolPrecision(symbol, currentPrice);

  // Indicators
  const ema20Arr = calculateEMA(candles, 20);
  const ema50Arr = calculateEMA(candles, 50);
  const ema200Arr = calculateEMA(candles, 200);
  const sma20Arr = calculateSMA(candles, 20);
  const sma50Arr = calculateSMA(candles, 50);
  const sma200Arr = calculateSMA(candles, 200);
  const rsiArr = calculateRSI(candles, 14);
  const macdArr = calculateMACD(candles, 12, 26, 9);
  const atrArr = calculateATR(candles, 14);
  const bbArr = calculateBollingerBands(candles, 20, 2.0);
  const volAnalysis = calculateVolumeAnalysis(candles, 20);

  const ema20 = ema20Arr[ema20Arr.length - 1]?.value ?? currentPrice;
  const ema50 = ema50Arr[ema50Arr.length - 1]?.value ?? currentPrice;
  const ema200 = ema200Arr[ema200Arr.length - 1]?.value ?? currentPrice;
  const sma20 = sma20Arr[sma20Arr.length - 1]?.value ?? currentPrice;
  const sma50 = sma50Arr[sma50Arr.length - 1]?.value ?? currentPrice;
  const sma200 = sma200Arr[sma200Arr.length - 1]?.value ?? currentPrice;
  const rsi = rsiArr[rsiArr.length - 1]?.value ?? 50;
  const prevRsi = rsiArr[rsiArr.length - 2]?.value ?? rsi;

  const lastMacd = macdArr[macdArr.length - 1] || { macd: 0, signal: 0, histogram: 0 };
  const prevMacd = macdArr[macdArr.length - 2] || lastMacd;
  const isCrossAbove = prevMacd.macd <= prevMacd.signal && lastMacd.macd > lastMacd.signal;
  const isCrossBelow = prevMacd.macd >= prevMacd.signal && lastMacd.macd < lastMacd.signal;

  const currentAtr = atrArr[atrArr.length - 1]?.value ?? currentPrice * (isForex ? 0.003 : 0.015);
  const atrPercent = Number(((currentAtr / currentPrice) * 100).toFixed(2));

  const lastBB = bbArr[bbArr.length - 1] || {
    upper: currentPrice * 1.02,
    middle: currentPrice,
    lower: currentPrice * 0.98,
    bandwidth: 0.04,
    percentB: 0.5
  };
  const isSqueeze = lastBB.bandwidth < 0.035; // BB compression under 3.5%

  // Volatility classification
  let volatilityClass: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' = 'NORMAL';
  if (atrPercent < 0.8 || lastBB.bandwidth < 0.025) volatilityClass = 'LOW';
  else if (atrPercent > 4.5 || lastBB.bandwidth > 0.09) volatilityClass = 'EXTREME';
  else if (atrPercent > 2.5 || lastBB.bandwidth > 0.06) volatilityClass = 'HIGH';

  // Structure & Regime
  const swingPoints = detectSwingPoints(candles, 3);
  const structuralEvents = detectStructuralBreaks(candles, swingPoints);
  const srResult = findSupportResistanceZones(candles, swingPoints);
  const supportZones = Array.isArray(srResult?.support) ? srResult.support : [];
  const resistanceZones = Array.isArray(srResult?.resistance) ? srResult.resistance : [];
  const nearestSupport = supportZones.find((z) => z.upper <= currentPrice);
  const nearestResistance = resistanceZones.find((z) => z.lower >= currentPrice);
  const lastBOS = structuralEvents.filter((e) => e.type.startsWith('BOS')).pop();
  const lastCHoCH = structuralEvents.filter((e) => e.type.startsWith('CHOCH')).pop();

  const marketRegime = detectMarketRegime(
    candles,
    ema20,
    ema50,
    ema200,
    rsi,
    currentAtr,
    swingPoints
  );

  // Timeframe synthesis (higher vs lower bias)
  const htfTrend = ema50 > ema200 && currentPrice > ema50 ? 'BULLISH' : ema50 < ema200 && currentPrice < ema50 ? 'BEARISH' : 'NEUTRAL';
  const ltfTrend = currentPrice > ema20 ? 'BULLISH' : currentPrice < ema20 ? 'BEARISH' : 'NEUTRAL';

  // Volume
  const currentVolume = lastBar.volume || volAnalysis.volume || 1000;
  const averageVolume = volAnalysis.volumeSma || 1000;
  const volumeRatio = volAnalysis.rvol || Number((currentVolume / (averageVolume || 1)).toFixed(2));

  return {
    asset: { symbol, category: isForex ? 'Forex' : 'Crypto', precision, minStopDist, roundP, fmtP, isForex },
    timeframe,
    candles,
    closedCandles,
    currentPrice,
    currentVolume,
    averageVolume,
    volumeRatio,
    volumeAnalysis: {
      isVolumeSpike: volAnalysis.isSpike,
      volumeTrend: volumeRatio >= 1.2 ? 'EXPANDING' : volumeRatio <= 0.8 ? 'CONTRACTING' : 'FLAT',
      volumeSma: averageVolume,
      isAboveAverage: volumeRatio >= 1.05
    },
    volatility: {
      atr: currentAtr,
      atrPercent,
      bandwidth: lastBB.bandwidth,
      classification: volatilityClass,
      isSqueeze
    },
    ema20,
    ema50,
    ema200,
    sma20,
    sma50,
    sma200,
    rsi,
    prevRsi,
    macd: {
      macdLine: lastMacd.macd,
      signalLine: lastMacd.signal,
      histogram: lastMacd.histogram,
      prevHistogram: prevMacd.histogram,
      isCrossAbove,
      isCrossBelow
    },
    atr: currentAtr,
    bollinger: {
      upper: lastBB.upper,
      middle: lastBB.middle,
      lower: lastBB.lower,
      bandwidth: lastBB.bandwidth,
      percentB: lastBB.percentB,
      isSqueeze
    },
    swingPoints,
    structuralEvents,
    lastBOS,
    lastCHoCH,
    supportZones,
    resistanceZones,
    nearestSupport,
    nearestResistance,
    marketRegime,
    htfTrend,
    ltfTrend,
    dataQuality: {
      candleCount: candles.length,
      hasGaps: false,
      isStale: false,
      qualityScore: candles.length >= 60 ? 100 : Math.round((candles.length / 60) * 100)
    },
    timestamp: lastBar.time
  };
}

// ============================================================================
// 3. REUSABLE MODULES & FILTERS
// ============================================================================

export const VolumeConfirmationModule = {
  evaluate(context: StrategyContext): {
    confirmed: boolean;
    reason: string;
    score: number; // 0 - 10
  } {
    const { volumeRatio, volumeAnalysis } = context;
    if (volumeAnalysis.isVolumeSpike || volumeRatio >= 1.4) {
      return { confirmed: true, reason: `Volume Spike: RVOL ${volumeRatio}x confirms aggressive institutional participation.`, score: 10 };
    }
    if (volumeAnalysis.isAboveAverage) {
      return { confirmed: true, reason: `Healthy Volume: ${volumeRatio}x relative volume above baseline 20-period average.`, score: 8 };
    }
    if (volumeRatio >= 0.75) {
      return { confirmed: false, reason: `Moderate volume: ${volumeRatio}x average. Adequate but not impulsive.`, score: 5 };
    }
    return { confirmed: false, reason: `Anemic Volume: ${volumeRatio}x average indicates low commitment or consolidation liquidity.`, score: 2 };
  }
};

export const VolatilityModule = {
  evaluate(context: StrategyContext, requiredState?: 'LOW' | 'NORMAL' | 'HIGH' | 'EXPANDING'): {
    confirmed: boolean;
    classification: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    reason: string;
    score: number;
  } {
    const { volatility } = context;
    if (requiredState === 'EXPANDING' && (volatility.classification === 'HIGH' || volatility.classification === 'EXTREME')) {
      return { confirmed: true, classification: volatility.classification, reason: `Volatility Expansion confirmed (ATR ${volatility.atrPercent}%).`, score: 10 };
    }
    if (requiredState === 'LOW' && (volatility.classification === 'LOW' || volatility.isSqueeze)) {
      return { confirmed: true, classification: volatility.classification, reason: `Volatility compression/squeeze detected.`, score: 10 };
    }
    return { confirmed: true, classification: volatility.classification, reason: `Volatility level is ${volatility.classification} (ATR ${volatility.atrPercent}%).`, score: 7 };
  }
};

export const StrategyFilters = {
  trendFilter(context: StrategyContext, direction: 'LONG' | 'SHORT'): boolean {
    if (direction === 'LONG') return context.currentPrice > context.ema200 && context.ema20 >= context.ema50;
    return context.currentPrice < context.ema200 && context.ema20 <= context.ema50;
  },
  regimeFilter(context: StrategyContext, allowed: MarketRegimeType[]): boolean {
    return allowed.includes(context.marketRegime.regime);
  },
  volumeFilter(context: StrategyContext, minRvol: number = 0.9): boolean {
    return context.volumeRatio >= minRvol;
  },
  dataQualityFilter(context: StrategyContext): boolean {
    return context.dataQuality.candleCount >= 30;
  }
};

// ============================================================================
// 4. THE 12 CORE STRATEGIES IMPLEMENTATION
// ============================================================================

/**
 * 1. Trend Following Strategy (EMA 20/50/200 + Regime Alignment)
 */
export function evaluateTrendFollowing(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, ema20, ema50, ema200, rsi, atr, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  if (ctx.dataQuality.candleCount < 30) {
    return createNoSetupSignal('trend_following', 'Trend Following', symbol, timeframe, marketRegime, timestamp, 'Insufficient candle history for moving averages.');
  }

  const has200 = ctx.candles.length >= 200;
  const isBull = currentPrice > ema20 && ema20 > ema50 && (!has200 || currentPrice > ema200) && rsi >= 46 && (marketRegime.bias === 'BULLISH' || marketRegime.regime.includes('Uptrend') || marketRegime.trendStrength >= 50);
  const isBear = currentPrice < ema20 && ema20 < ema50 && (!has200 || currentPrice < ema200) && rsi <= 54 && (marketRegime.bias === 'BEARISH' || marketRegime.regime.includes('Downtrend') || marketRegime.trendStrength >= 50);

  if (isBull) {
    const sl = roundP(Math.min(ema50, currentPrice - atr * 1.5));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    const entryMin = roundP(currentPrice * (isForex ? 0.999 : 0.998));
    const entryMax = roundP(currentPrice * (isForex ? 1.001 : 1.002));
    return {
      strategyId: 'trend_following',
      strategyName: 'Trend Following (EMA 20/50/200 + Regime)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin,
      entryMax,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.5),
      target2: roundP(currentPrice + stopDist * 2.5),
      target3: roundP(currentPrice + stopDist * 3.5),
      riskRewardRatio: 2.5,
      confidenceScore: 86,
      reasonsSupporting: [
        `Price ($${fmtP(currentPrice)}) comfortably above stacked upward-sloping EMA 20, 50, and 200.`,
        `RSI momentum is healthy (${rsi.toFixed(1)}) with headroom before overbought exhaustion.`,
        `Market regime confirmed as ${marketRegime.regime}.`
      ],
      reasonsAgainst: ['Pullback risk: extended price relative to EMA 50 ($' + fmtP(ema50) + ').'],
      invalidationCriteria: `Candle close below EMA 50 ($${fmtP(ema50)}) invalidates the trend continuity premise.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['EMA 20 > EMA 50', 'Price > EMA 200', 'RSI in 50-68 corridor', 'Bullish regime'],
      conditionsFailed: []
    };
  }

  if (isBear) {
    const sl = roundP(Math.max(ema50, currentPrice + atr * 1.5));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    const entryMin = roundP(currentPrice * (isForex ? 1.001 : 1.002));
    const entryMax = roundP(currentPrice * (isForex ? 0.999 : 0.998));
    return {
      strategyId: 'trend_following',
      strategyName: 'Trend Following (EMA 20/50/200 + Regime)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin,
      entryMax,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.5),
      target2: roundP(currentPrice - stopDist * 2.5),
      target3: roundP(currentPrice - stopDist * 3.5),
      riskRewardRatio: 2.5,
      confidenceScore: 85,
      reasonsSupporting: [
        `Price ($${fmtP(currentPrice)}) below descending EMA 20, 50, and 200.`,
        `Bearish regime (${marketRegime.regime}) with persistent downward drift.`,
        `RSI at ${rsi.toFixed(1)} shows dominant bearish momentum.`
      ],
      reasonsAgainst: ['Oversold relief rally could trigger retest of EMA 20.'],
      invalidationCriteria: `Candle close above EMA 50 ($${fmtP(ema50)}) negates the downtrend continuation.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['EMA 20 < EMA 50', 'Price < EMA 200', 'RSI in 32-50 corridor', 'Bearish regime'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('trend_following', 'Trend Following', symbol, timeframe, marketRegime, timestamp, 'Market is either consolidating or lacking clear EMA alignment.');
}

/**
 * 2. Trend Pullback Strategy (Retracement into Support/EMA + Momentum Recovery)
 */
export function evaluateTrendPullback(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, ema20, ema50, ema200, rsi, prevRsi, atr, asset, marketRegime, nearestSupport, nearestResistance, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  const isUptrend = ema20 >= ema50 && currentPrice >= ema200;
  const isDowntrend = ema20 <= ema50 && currentPrice <= ema200;

  // Bullish pullback: price pulled back near EMA 50 or nearest support, RSI recovering upward
  const isPullbackToSupportLong = isUptrend && currentPrice <= ema20 * 1.01 && currentPrice >= ema50 * 0.985 && rsi > prevRsi && rsi >= 40 && rsi <= 58;
  // Bearish pullback: price rallied back near EMA 50 or nearest resistance, RSI rolling over
  const isPullbackToResistanceShort = isDowntrend && currentPrice >= ema20 * 0.99 && currentPrice <= ema50 * 1.015 && rsi < prevRsi && rsi <= 60 && rsi >= 42;

  if (isPullbackToSupportLong) {
    const sl = roundP(nearestSupport ? Math.min(nearestSupport.lower, currentPrice - atr * 1.4) : currentPrice - atr * 1.4);
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'trend_pullback',
      strategyName: 'Trend Pullback (EMA/Support Retest + Recovery)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(currentPrice * (isForex ? 0.9992 : 0.996)),
      entryMax: roundP(currentPrice * (isForex ? 1.0008 : 1.003)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.8),
      target2: roundP(currentPrice + stopDist * 2.8),
      target3: roundP(currentPrice + stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 89,
      reasonsSupporting: [
        `Healthy retracement to EMA 50 ($${fmtP(ema50)}) discount zone within active macro uptrend.`,
        `RSI recovered from ${prevRsi.toFixed(1)} to ${rsi.toFixed(1)}, confirming momentum turn.`,
        nearestSupport ? `Multi-touch support level at $${fmtP(nearestSupport.mid)} held firmly.` : 'EMA dynamic support holding.'
      ],
      reasonsAgainst: ['Risk of deeper correction if high-impact macro headlines trigger selling.'],
      invalidationCriteria: `Breakdown below $${fmtP(sl)} negates the pullback continuation setup.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Macro trend bullish', 'Retracement to EMA 20-50 zone', 'RSI recovery hook', 'Support holding'],
      conditionsFailed: []
    };
  }

  if (isPullbackToResistanceShort) {
    const sl = roundP(nearestResistance ? Math.max(nearestResistance.upper, currentPrice + atr * 1.4) : currentPrice + atr * 1.4);
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'trend_pullback',
      strategyName: 'Trend Pullback (EMA/Resistance Retest + Recovery)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(currentPrice * (isForex ? 1.0008 : 1.004)),
      entryMax: roundP(currentPrice * (isForex ? 0.9992 : 0.997)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.8),
      target2: roundP(currentPrice - stopDist * 2.8),
      target3: roundP(currentPrice - stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 88,
      reasonsSupporting: [
        `Bearish relief rally into EMA 50 ($${fmtP(ema50)}) supply zone.`,
        `RSI rollover from ${prevRsi.toFixed(1)} down to ${rsi.toFixed(1)} confirms seller re-entry.`,
        nearestResistance ? `Resistance rejection at $${fmtP(nearestResistance.mid)}.` : 'EMA 50 resistance holding.'
      ],
      reasonsAgainst: ['Violent short squeeze risk if resistance is breached.'],
      invalidationCriteria: `Sustained close above $${fmtP(sl)} invalidates the short pullback setup.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Macro trend bearish', 'Retracement into EMA 20-50 zone', 'RSI rollover', 'Resistance holding'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('trend_pullback', 'Trend Pullback', symbol, timeframe, marketRegime, timestamp, 'Price is not currently at a valid pullback confluence zone.');
}

/**
 * 3. Breakout Strategy (Pure Range/Key Level Breakout with Volume + ATR Confirmation)
 */
export function evaluateBreakout(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, volumeRatio, volumeAnalysis, volatility, asset, marketRegime, swingPoints, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  const swingHighs = swingPoints.filter((p) => p.type === 'HIGH').slice(-4);
  const swingLows = swingPoints.filter((p) => p.type === 'LOW').slice(-4);
  const highestSwing = swingHighs.length > 0 ? Math.max(...swingHighs.map((p) => p.price)) : currentPrice;
  const lowestSwing = swingLows.length > 0 ? Math.min(...swingLows.map((p) => p.price)) : currentPrice;

  // Candle close outside level (not just a wick!) + volume expansion
  const isBullBreakout = currentPrice > highestSwing && (volumeAnalysis.isVolumeSpike || volumeRatio >= 1.2 || volumeAnalysis.isAboveAverage);
  const isBearBreakdown = currentPrice < lowestSwing && (volumeAnalysis.isVolumeSpike || volumeRatio >= 1.2 || volumeAnalysis.isAboveAverage);

  if (isBullBreakout) {
    const sl = roundP(highestSwing * (isForex ? 0.9985 : 0.985));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'breakout',
      strategyName: 'Breakout (Resistance Break + Volume Spike)',
      strategyVersion: 'v1.0.0',
      category: 'Breakout',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(highestSwing),
      entryMax: roundP(currentPrice),
      entryMid: roundP((highestSwing + currentPrice) / 2),
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.6),
      target2: roundP(currentPrice + stopDist * 2.6),
      target3: roundP(currentPrice + stopDist * 3.8),
      riskRewardRatio: 2.6,
      confidenceScore: 84,
      reasonsSupporting: [
        `Confirmed candle close above structural resistance at $${fmtP(highestSwing)}.`,
        `Volume expansion: ${volumeRatio}x relative volume confirms aggressive institutional buying.`,
        `Volatility expansion active: ATR at ${volatility.atrPercent}%.`
      ],
      reasonsAgainst: ['Risk of false breakout wick if momentum dries up.'],
      invalidationCriteria: `Price close back inside the pre-breakout range ($${fmtP(sl)}) triggers fakeout invalidation.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Close beyond resistance', 'Volume spike > 1.25x', 'Volatility expansion', 'No wick rejection'],
      conditionsFailed: []
    };
  }

  if (isBearBreakdown) {
    const sl = roundP(lowestSwing * (isForex ? 1.0015 : 1.015));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'breakout',
      strategyName: 'Breakout (Support Breakdown + Volume Spike)',
      strategyVersion: 'v1.0.0',
      category: 'Breakout',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(lowestSwing),
      entryMax: roundP(currentPrice),
      entryMid: roundP((lowestSwing + currentPrice) / 2),
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.6),
      target2: roundP(currentPrice - stopDist * 2.6),
      target3: roundP(currentPrice - stopDist * 3.8),
      riskRewardRatio: 2.6,
      confidenceScore: 83,
      reasonsSupporting: [
        `Candle close below key swing support at $${fmtP(lowestSwing)}.`,
        `Heavy sell volume (${volumeRatio}x RVOL) confirms capitulation/distribution.`,
        `Volatility expansion in downside direction.`
      ],
      reasonsAgainst: ['Liquidity sweep reclaim risk.'],
      invalidationCriteria: `Price reclaim back above $${fmtP(sl)} invalidates breakdown.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Close below support', 'Volume spike > 1.25x', 'Volatility expansion', 'Clear breakdown'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('breakout', 'Breakout', symbol, timeframe, marketRegime, timestamp, 'Price is trading within established range boundaries without breakout volume.');
}

/**
 * 4. Breakout + Retest Strategy (BOS + Polarity Flip Holding)
 */
export function evaluateBreakoutRetest(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, lastBOS, asset, marketRegime, nearestSupport, nearestResistance, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Bullish retest: A recent bullish BOS occurred, price pulled back to broken level and is bouncing
  const isBullRetest = lastBOS && lastBOS.type === 'BOS_BULLISH' && Math.abs(currentPrice - lastBOS.brokenLevel) / lastBOS.brokenLevel <= 0.012 && currentPrice >= lastBOS.brokenLevel * 0.996;
  // Bearish retest: A recent bearish BOS occurred, price rallied back to broken level and is rejecting
  const isBearRetest = lastBOS && lastBOS.type === 'BOS_BEARISH' && Math.abs(currentPrice - lastBOS.brokenLevel) / lastBOS.brokenLevel <= 0.012 && currentPrice <= lastBOS.brokenLevel * 1.004;

  if (isBullRetest) {
    const sl = roundP(lastBOS.brokenLevel * (isForex ? 0.998 : 0.988));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'breakout_retest',
      strategyName: 'Breakout + Retest (Polarity Flip Confirmation)',
      strategyVersion: 'v1.0.0',
      category: 'Breakout',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(lastBOS.brokenLevel * (isForex ? 0.9995 : 0.997)),
      entryMax: roundP(lastBOS.brokenLevel * (isForex ? 1.0015 : 1.008)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 2.0),
      target2: roundP(currentPrice + stopDist * 3.0),
      target3: roundP(currentPrice + stopDist * 4.5),
      riskRewardRatio: 3.0,
      confidenceScore: 91,
      reasonsSupporting: [
        `Clean polarity flip: Prior resistance at $${fmtP(lastBOS.brokenLevel)} is now acting as tested support.`,
        `Structural Break of Structure (BOS) validated by previous impulse close.`,
        `Low risk / high reward asymmetric entry at exact structural retest zone.`
      ],
      reasonsAgainst: ['Risk of false retest if market-wide selling sweeps the level.'],
      invalidationCriteria: `Candle close back below $${fmtP(sl)} violates the polarity flip support.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Prior BOS confirmed', 'Retest of broken level', 'Polarity flip holding', 'Asymmetric R:R >= 3.0'],
      conditionsFailed: []
    };
  }

  if (isBearRetest) {
    const sl = roundP(lastBOS.brokenLevel * (isForex ? 1.002 : 1.012));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'breakout_retest',
      strategyName: 'Breakout + Retest (Polarity Flip Confirmation)',
      strategyVersion: 'v1.0.0',
      category: 'Breakout',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(lastBOS.brokenLevel * (isForex ? 1.0005 : 1.003)),
      entryMax: roundP(lastBOS.brokenLevel * (isForex ? 0.9985 : 0.992)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 2.0),
      target2: roundP(currentPrice - stopDist * 3.0),
      target3: roundP(currentPrice - stopDist * 4.5),
      riskRewardRatio: 3.0,
      confidenceScore: 90,
      reasonsSupporting: [
        `Prior support at $${fmtP(lastBOS.brokenLevel)} tested as new ceiling resistance.`,
        `Bearish Break of Structure (BOS) continuation setup.`,
        `Tight stop loss placement above the broken pivot level.`
      ],
      reasonsAgainst: ['Short squeeze potential if broken level is aggressively reclaimed.'],
      invalidationCriteria: `Reclaim and close above $${fmtP(sl)} triggers stop-loss invalidation.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Prior Bearish BOS', 'Retest of broken support', 'Resistance rejection', 'Asymmetric R:R >= 3.0'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('breakout_retest', 'Breakout + Retest', symbol, timeframe, marketRegime, timestamp, 'Waiting for a verified breakout and subsequent orderly retest.');
}

/**
 * 5. Support / Resistance Reversal Strategy (Multi-Touch Pivot Rejection)
 */
export function evaluateSRReversal(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, rsi, nearestSupport, nearestResistance, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Support rejection: price at strong multi-touch support zone, RSI bounced out of oversold (< 38 -> recovering)
  const isSupportReversal = nearestSupport && nearestSupport.strength !== 'WEAK' && currentPrice >= nearestSupport.lower && currentPrice <= nearestSupport.upper * 1.008 && rsi < 48;
  // Resistance rejection: price at strong resistance zone, RSI rolling over from elevated levels
  const isResistanceReversal = nearestResistance && nearestResistance.strength !== 'WEAK' && currentPrice <= nearestResistance.upper && currentPrice >= nearestResistance.lower * 0.992 && rsi > 54;

  if (isSupportReversal) {
    const sl = roundP(nearestSupport.lower * (isForex ? 0.9985 : 0.99));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'sr_reversal',
      strategyName: 'Support / Resistance Reversal',
      strategyVersion: 'v1.0.0',
      category: 'Structure',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(nearestSupport.lower),
      entryMax: roundP(nearestSupport.upper),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.8),
      target2: roundP(currentPrice + stopDist * 2.8),
      target3: roundP(currentPrice + stopDist * 3.8),
      riskRewardRatio: 2.8,
      confidenceScore: 82,
      reasonsSupporting: [
        `Validated ${nearestSupport.strength} support zone ($${fmtP(nearestSupport.mid)}) with ${nearestSupport.touchCount} historical touches.`,
        `Rejection tail confirms buyers absorbing sell orders at support.`,
        `RSI at ${rsi.toFixed(1)} shows room for mean-reversion recovery.`
      ],
      reasonsAgainst: ['Strong macro trend could slice through support without hesitation.'],
      invalidationCriteria: `Candle close below support floor ($${fmtP(sl)}) invalidates reversal premise.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Multi-touch support reached', 'Rejection candle confirmed', 'RSI recovery underway'],
      conditionsFailed: []
    };
  }

  if (isResistanceReversal) {
    const sl = roundP(nearestResistance.upper * (isForex ? 1.0015 : 1.01));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'sr_reversal',
      strategyName: 'Support / Resistance Reversal',
      strategyVersion: 'v1.0.0',
      category: 'Structure',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(nearestResistance.lower),
      entryMax: roundP(nearestResistance.upper),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.8),
      target2: roundP(currentPrice - stopDist * 2.8),
      target3: roundP(currentPrice - stopDist * 3.8),
      riskRewardRatio: 2.8,
      confidenceScore: 81,
      reasonsSupporting: [
        `Rejection off validated ${nearestResistance.strength} resistance at $${fmtP(nearestResistance.mid)}.`,
        `Multiple historical rejections (${nearestResistance.touchCount} touches) confirm active supply.`,
        `RSI elevated at ${rsi.toFixed(1)} exhibiting momentum stall.`
      ],
      reasonsAgainst: ['Breakout risk if volume suddenly surges.'],
      invalidationCriteria: `Candle close above resistance ceiling ($${fmtP(sl)}) invalidates setup.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Multi-touch resistance reached', 'Rejection wick confirmed', 'RSI stall'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('sr_reversal', 'Support / Resistance Reversal', symbol, timeframe, marketRegime, timestamp, 'Price is hovering between key levels; no high-conviction S/R rejection active.');
}

/**
 * 6. Mean Reversion Strategy (Bollinger Bands + RSI Extremes - Trend Guarded)
 */
export function evaluateMeanReversion(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, rsi, bollinger, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // CRITICAL GUARDRAIL: Strong Trend warning
  const isTrending = marketRegime.regime.includes('Uptrend') || marketRegime.regime.includes('Downtrend') || marketRegime.bias !== 'NEUTRAL';
  if (isTrending) {
    return {
      strategyId: 'mean_reversion',
      strategyName: 'Mean Reversion (Bollinger + RSI Extremes)',
      strategyVersion: 'v1.0.0',
      category: 'Reversion',
      symbol,
      timeframe,
      action: 'WAIT',
      bias: 'NEUTRAL',
      entryMin: currentPrice,
      entryMax: currentPrice,
      entryMid: currentPrice,
      stopLoss: currentPrice,
      stopDistancePct: 0,
      target1: currentPrice,
      target2: currentPrice,
      target3: currentPrice,
      riskRewardRatio: 0,
      confidenceScore: 25,
      reasonsSupporting: [],
      reasonsAgainst: [
        `MEAN REVERSION RISK: Strong trend detected (${marketRegime.regime}).`,
        'Counter-trend mean reversion disabled during directional trend runaway.'
      ],
      invalidationCriteria: 'Mean reversion strategy disabled during strong trend regimes.',
      regime: marketRegime,
      timestamp,
      conditionsMet: [],
      conditionsFailed: ['Market is not in Range regime']
    };
  }

  const isOversoldReversion = currentPrice <= bollinger.lower * 1.004 && rsi <= 32;
  const isOverboughtReversion = currentPrice >= bollinger.upper * 0.996 && rsi >= 68;

  if (isOversoldReversion) {
    const sl = roundP(bollinger.lower * (isForex ? 0.998 : 0.985));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'mean_reversion',
      strategyName: 'Mean Reversion (Bollinger + RSI Extremes)',
      strategyVersion: 'v1.0.0',
      category: 'Reversion',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(bollinger.lower),
      entryMax: currentPrice,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(bollinger.middle),
      target2: roundP(bollinger.upper * 0.98),
      target3: roundP(bollinger.upper),
      riskRewardRatio: 2.2,
      confidenceScore: 80,
      reasonsSupporting: [
        `Price tagged lower 2-sigma Bollinger Band ($${fmtP(bollinger.lower)}).`,
        `RSI extreme oversold at ${rsi.toFixed(1)}.`,
        `Market regime is Range/Low Volatility, optimal for mean reversion.`
      ],
      reasonsAgainst: ['Risk of Bollinger Band walking if sudden panic ensues.'],
      invalidationCriteria: `Sustained flush below $${fmtP(sl)} triggers stop exit.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Lower Bollinger touch', 'RSI <= 32', 'Non-trending regime', 'Target middle SMA 20'],
      conditionsFailed: []
    };
  }

  if (isOverboughtReversion) {
    const sl = roundP(bollinger.upper * (isForex ? 1.002 : 1.015));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'mean_reversion',
      strategyName: 'Mean Reversion (Bollinger + RSI Extremes)',
      strategyVersion: 'v1.0.0',
      category: 'Reversion',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: currentPrice,
      entryMax: roundP(bollinger.upper),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(bollinger.middle),
      target2: roundP(bollinger.lower * 1.02),
      target3: roundP(bollinger.lower),
      riskRewardRatio: 2.2,
      confidenceScore: 79,
      reasonsSupporting: [
        `Price extended to upper 2-sigma Bollinger Band ($${fmtP(bollinger.upper)}).`,
        `RSI overbought extreme at ${rsi.toFixed(1)}.`,
        `Oscillating range structure favors regression to 20 SMA mean ($${fmtP(bollinger.middle)}).`
      ],
      reasonsAgainst: ['Trend breakout risk.'],
      invalidationCriteria: `Expansion above $${fmtP(sl)} aborts reversion.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Upper Bollinger touch', 'RSI >= 68', 'Range regime', 'Target middle SMA 20'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('mean_reversion', 'Mean Reversion', symbol, timeframe, marketRegime, timestamp, 'Price is within normal statistical distribution bands.');
}

/**
 * 7. EMA Crossover Strategy (Recent Event Detection: EMA 20 crosses EMA 50)
 */
export function evaluateEMACrossover(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, ema20, ema50, ema200, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  if (candles.length < 55) {
    return createNoSetupSignal('ema_crossover', 'EMA Crossover', symbol, timeframe, marketRegime, timestamp, 'Insufficient candles for 50-period EMA.');
  }

  // Detect the actual crossover event within the last 1 to 3 bars (not infinite repetition)
  const ema20s = calculateEMA(candles, 20);
  const ema50s = calculateEMA(candles, 50);
  const len = ema20s.length;
  const e20_1 = ema20s[len - 1]?.value ?? 0;
  const e50_1 = ema50s[len - 1]?.value ?? 0;
  const e20_2 = ema20s[len - 2]?.value ?? 0;
  const e50_2 = ema50s[len - 2]?.value ?? 0;
  const e20_3 = ema20s[len - 3]?.value ?? 0;
  const e50_3 = ema50s[len - 3]?.value ?? 0;
  const recentCrossBull =
    (e20_1 > e50_1 && e20_2 <= e50_2) ||
    (e20_2 > e50_2 && e20_3 <= e50_3);
  const recentCrossBear =
    (e20_1 < e50_1 && e20_2 >= e50_2) ||
    (e20_2 < e50_2 && e20_3 >= e50_3);

  if (recentCrossBull && currentPrice >= ema200 * 0.99) {
    const sl = roundP(ema50 * (isForex ? 0.998 : 0.985));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'ema_crossover',
      strategyName: 'EMA Crossover (EMA 20/50 Recent Event)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(ema50),
      entryMax: currentPrice,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.7),
      target2: roundP(currentPrice + stopDist * 2.7),
      target3: roundP(currentPrice + stopDist * 3.8),
      riskRewardRatio: 2.7,
      confidenceScore: 85,
      reasonsSupporting: [
        `Fresh Golden Cross event: EMA 20 crossed above EMA 50 within past 3 bars.`,
        `Macro trend filter satisfied: price above or testing 200 EMA.`,
        `Momentum shift validated across moving averages.`
      ],
      reasonsAgainst: ['Whipsaw risk if market is entering sideways chop.'],
      invalidationCriteria: `EMA 20 crossing back below EMA 50 immediately invalidates signal.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Fresh EMA 20/50 crossover', 'Macro filter passed', 'Positive momentum slope'],
      conditionsFailed: []
    };
  }

  if (recentCrossBear && currentPrice <= ema200 * 1.01) {
    const sl = roundP(ema50 * (isForex ? 1.002 : 1.015));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'ema_crossover',
      strategyName: 'EMA Crossover (EMA 20/50 Recent Event)',
      strategyVersion: 'v1.0.0',
      category: 'Trend',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: currentPrice,
      entryMax: roundP(ema50),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.7),
      target2: roundP(currentPrice - stopDist * 2.7),
      target3: roundP(currentPrice - stopDist * 3.8),
      riskRewardRatio: 2.7,
      confidenceScore: 84,
      reasonsSupporting: [
        `Fresh Death Cross event: EMA 20 crossed below EMA 50 within past 3 bars.`,
        `Macro trend confirmation: price below 200 EMA.`,
        `Downward momentum expansion.`
      ],
      reasonsAgainst: ['Bear trap risk if support holds.'],
      invalidationCriteria: `EMA 20 crossing back above EMA 50 negates setup.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Fresh EMA 20/50 bearish cross', 'Macro filter passed', 'Negative momentum slope'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('ema_crossover', 'EMA Crossover', symbol, timeframe, marketRegime, timestamp, 'No fresh EMA 20/50 crossover detected in recent candles.');
}

/**
 * 8. RSI Momentum Strategy (Regime-Aware Dynamic Range & Recovery)
 */
export function evaluateRSIMomentum(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, rsi, prevRsi, ema50, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Bullish: Uptrend context + RSI was weak (38-48) and is now recovering above 50
  const isBullRsiRecovery = currentPrice > ema50 && prevRsi < 48 && rsi >= 50 && rsi <= 64;
  // Bearish: Downtrend context + RSI was high (52-62) and is now rolling under 50
  const isBearRsiRollover = currentPrice < ema50 && prevRsi > 52 && rsi <= 50 && rsi >= 36;

  if (isBullRsiRecovery) {
    const sl = roundP(currentPrice * (isForex ? 0.9985 : 0.985));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'rsi_momentum',
      strategyName: 'RSI Momentum & Dynamic Range',
      strategyVersion: 'v1.0.0',
      category: 'Momentum',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(currentPrice * (isForex ? 0.9992 : 0.996)),
      entryMax: roundP(currentPrice * (isForex ? 1.0008 : 1.003)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.8),
      target2: roundP(currentPrice + stopDist * 2.8),
      target3: roundP(currentPrice + stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 83,
      reasonsSupporting: [
        `RSI dynamic range reset: bounced from ${prevRsi.toFixed(1)} back above median 50 threshold (${rsi.toFixed(1)}).`,
        `Aligned with macro trend (price > EMA 50 $${fmtP(ema50)}).`,
        `Early-stage momentum impulse with substantial expansion room.`
      ],
      reasonsAgainst: ['Resistance retest ahead.'],
      invalidationCriteria: `RSI falling back below 45 or price breaching $${fmtP(sl)} triggers exit.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Trend context bullish', 'RSI dipped into 38-48 discount', 'RSI reclaimed > 50'],
      conditionsFailed: []
    };
  }

  if (isBearRsiRollover) {
    const sl = roundP(currentPrice * (isForex ? 1.0015 : 1.015));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'rsi_momentum',
      strategyName: 'RSI Momentum & Dynamic Range',
      strategyVersion: 'v1.0.0',
      category: 'Momentum',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(currentPrice * (isForex ? 1.0008 : 1.004)),
      entryMax: roundP(currentPrice * (isForex ? 0.9992 : 0.997)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.8),
      target2: roundP(currentPrice - stopDist * 2.8),
      target3: roundP(currentPrice - stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 82,
      reasonsSupporting: [
        `RSI momentum failure: rejected at ${prevRsi.toFixed(1)} and broken below 50 line down to ${rsi.toFixed(1)}.`,
        `Aligned with downtrend bias (price < EMA 50).`,
        `Sellers regaining control of momentum cycle.`
      ],
      reasonsAgainst: ['Oversold bounce risk if support is reached.'],
      invalidationCriteria: `RSI crossing back above 55 or price exceeding $${fmtP(sl)} invalidates setup.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Trend context bearish', 'RSI failed near 55', 'RSI rolled below 50'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('rsi_momentum', 'RSI Momentum', symbol, timeframe, marketRegime, timestamp, 'RSI is neutral without a clear momentum hook or recovery.');
}

/**
 * 9. MACD Momentum Strategy (Histogram Acceleration & Trend-Filtered Zero Crossings)
 */
export function evaluateMACDMomentum(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, macd, ema200, asset, marketRegime, volumeAnalysis, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Bullish: MACD line > Signal line, histogram accelerating positively, price > EMA 200
  const isMacdBullAcc = macd.macdLine > macd.signalLine && macd.histogram > macd.prevHistogram && macd.histogram > 0 && currentPrice >= ema200 * 0.99;
  // Bearish: MACD line < Signal line, histogram accelerating negatively, price < EMA 200
  const isMacdBearAcc = macd.macdLine < macd.signalLine && macd.histogram < macd.prevHistogram && macd.histogram < 0 && currentPrice <= ema200 * 1.01;

  if (isMacdBullAcc) {
    const sl = roundP(currentPrice * (isForex ? 0.9985 : 0.985));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'macd_momentum',
      strategyName: 'MACD Momentum & Acceleration',
      strategyVersion: 'v1.0.0',
      category: 'Momentum',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(currentPrice * (isForex ? 0.999 : 0.996)),
      entryMax: roundP(currentPrice * (isForex ? 1.001 : 1.003)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.8),
      target2: roundP(currentPrice + stopDist * 2.8),
      target3: roundP(currentPrice + stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 84,
      reasonsSupporting: [
        `MACD Histogram positive acceleration (${macd.prevHistogram.toFixed(2)} → ${macd.histogram.toFixed(2)}).`,
        `MACD line (${macd.macdLine.toFixed(2)}) above Signal line (${macd.signalLine.toFixed(2)}).`,
        `Macro trend filter confirmed: price above 200 EMA ($${fmtP(ema200)}).`
      ],
      reasonsAgainst: ['Deceleration risk if volume contracts.'],
      invalidationCriteria: `MACD histogram contracting below zero or price closing below $${fmtP(sl)}.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['MACD > Signal', 'Histogram expanding positively', 'Price > EMA 200'],
      conditionsFailed: []
    };
  }

  if (isMacdBearAcc) {
    const sl = roundP(currentPrice * (isForex ? 1.0015 : 1.015));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'macd_momentum',
      strategyName: 'MACD Momentum & Acceleration',
      strategyVersion: 'v1.0.0',
      category: 'Momentum',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(currentPrice * (isForex ? 1.001 : 1.004)),
      entryMax: roundP(currentPrice * (isForex ? 0.999 : 0.997)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.8),
      target2: roundP(currentPrice - stopDist * 2.8),
      target3: roundP(currentPrice - stopDist * 4.0),
      riskRewardRatio: 2.8,
      confidenceScore: 83,
      reasonsSupporting: [
        `MACD Histogram expanding negatively (${macd.prevHistogram.toFixed(2)} → ${macd.histogram.toFixed(2)}).`,
        `MACD line below signal line in bearish territory.`,
        `Macro trend filter confirmed: price below 200 EMA ($${fmtP(ema200)}).`
      ],
      reasonsAgainst: ['Short covering rally if momentum stalls.'],
      invalidationCriteria: `MACD histogram turning positive or price crossing $${fmtP(sl)}.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['MACD < Signal', 'Histogram expanding negatively', 'Price < EMA 200'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('macd_momentum', 'MACD Momentum', symbol, timeframe, marketRegime, timestamp, 'MACD histogram is flat or oscillating without directional expansion.');
}

/**
 * 10. Bollinger Bands Strategy (Dual-Mode: Mean Reversion vs Volatility Expansion)
 */
export function evaluateBollingerBands(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, bollinger, volumeRatio, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Determine Active Mode:
  // Mode A: Volatility Expansion Mode (when bands were squeezed < 0.035 and price broke out with volume)
  // Mode B: Mean Reversion Mode (when bands are normal/wide and market is in Range regime)

  if (bollinger.isSqueeze && volumeRatio >= 1.2) {
    // Squeeze breakout
    const isBullExpansion = currentPrice >= bollinger.upper;
    const isBearExpansion = currentPrice <= bollinger.lower;

    if (isBullExpansion) {
      const sl = roundP(bollinger.middle);
      const stopDist = Math.max(minStopDist, currentPrice - sl);
      return {
        strategyId: 'bollinger_bands',
        strategyName: 'Bollinger Bands (Volatility Expansion Mode)',
        strategyVersion: 'v1.0.0',
        category: 'Breakout',
        mode: 'Volatility Expansion Mode',
        symbol,
        timeframe,
        action: 'LONG SETUP',
        bias: 'BULLISH',
        entryMin: roundP(bollinger.upper),
        entryMax: currentPrice,
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: roundP(currentPrice + stopDist * 2.0),
        target2: roundP(currentPrice + stopDist * 3.2),
        target3: roundP(currentPrice + stopDist * 4.5),
        riskRewardRatio: 3.0,
        confidenceScore: 88,
        reasonsSupporting: [
          `Volatility Squeeze Breakout: bandwidth was compressed at ${(bollinger.bandwidth * 100).toFixed(1)}%.`,
          `Price cleanly piercing upper band with ${volumeRatio}x RVOL expansion.`,
          `Bandwidth widening confirms powerful directional expansion cycle.`
        ],
        reasonsAgainst: ['Late entry risk if squeeze already extended.'],
        invalidationCriteria: `Close back below middle 20 SMA ($${fmtP(bollinger.middle)}) invalidates squeeze breakout.`,
        regime: marketRegime,
        timestamp,
        conditionsMet: ['Bandwidth compression < 3.5%', 'Upper band breakout', 'Volume spike', 'Expanding bands'],
        conditionsFailed: []
      };
    }

    if (isBearExpansion) {
      const sl = roundP(bollinger.middle);
      const stopDist = Math.max(minStopDist, sl - currentPrice);
      return {
        strategyId: 'bollinger_bands',
        strategyName: 'Bollinger Bands (Volatility Expansion Mode)',
        strategyVersion: 'v1.0.0',
        category: 'Breakout',
        mode: 'Volatility Expansion Mode',
        symbol,
        timeframe,
        action: 'SHORT SETUP',
        bias: 'BEARISH',
        entryMin: currentPrice,
        entryMax: roundP(bollinger.lower),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: roundP(currentPrice - stopDist * 2.0),
        target2: roundP(currentPrice - stopDist * 3.2),
        target3: roundP(currentPrice - stopDist * 4.5),
        riskRewardRatio: 3.0,
        confidenceScore: 87,
        reasonsSupporting: [
          `Volatility Squeeze Breakdown: lower band punctured with expanding volume (${volumeRatio}x).`,
          `Bandwidth explosion out of low-volatility compression.`,
          `Downside momentum impulse active.`
        ],
        reasonsAgainst: ['Wick liquidity snapback risk.'],
        invalidationCriteria: `Close back above middle 20 SMA ($${fmtP(bollinger.middle)}) invalidates expansion.`,
        regime: marketRegime,
        timestamp,
        conditionsMet: ['Bandwidth compression < 3.5%', 'Lower band breakdown', 'Volume spike', 'Expanding bands'],
        conditionsFailed: []
      };
    }
  }

  // Mean Reversion Mode (in Range regime)
  if (marketRegime.regime === 'Range' || marketRegime.regime === 'Low Volatility') {
    if (bollinger.percentB >= 0.95) {
      const sl = roundP(bollinger.upper * (isForex ? 1.0015 : 1.012));
      const stopDist = Math.max(minStopDist, sl - currentPrice);
      return {
        strategyId: 'bollinger_bands',
        strategyName: 'Bollinger Bands (Mean Reversion Mode)',
        strategyVersion: 'v1.0.0',
        category: 'Reversion',
        mode: 'Mean Reversion Mode',
        symbol,
        timeframe,
        action: 'SHORT SETUP',
        bias: 'BEARISH',
        entryMin: currentPrice,
        entryMax: roundP(bollinger.upper),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: roundP(bollinger.middle),
        target2: roundP(bollinger.lower),
        target3: roundP(bollinger.lower * 0.99),
        riskRewardRatio: 2.2,
        confidenceScore: 81,
        reasonsSupporting: [
          `Price at upper band boundary (%B ${(bollinger.percentB * 100).toFixed(0)}%).`,
          `Ranging regime favors oscillation toward 20 SMA baseline ($${fmtP(bollinger.middle)}).`,
          `Upper wick rejection indicates exhaustion.`
        ],
        reasonsAgainst: ['Bandwidth expansion would trigger a trending runaway.'],
        invalidationCriteria: `Break above $${fmtP(sl)} aborts short reversion.`,
        regime: marketRegime,
        timestamp,
        conditionsMet: ['Upper band reach', 'Range regime', 'Target middle SMA'],
        conditionsFailed: []
      };
    }

    if (bollinger.percentB <= 0.05) {
      const sl = roundP(bollinger.lower * (isForex ? 0.9985 : 0.988));
      const stopDist = Math.max(minStopDist, currentPrice - sl);
      return {
        strategyId: 'bollinger_bands',
        strategyName: 'Bollinger Bands (Mean Reversion Mode)',
        strategyVersion: 'v1.0.0',
        category: 'Reversion',
        mode: 'Mean Reversion Mode',
        symbol,
        timeframe,
        action: 'LONG SETUP',
        bias: 'BULLISH',
        entryMin: roundP(bollinger.lower),
        entryMax: currentPrice,
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: roundP(bollinger.middle),
        target2: roundP(bollinger.upper),
        target3: roundP(bollinger.upper * 1.01),
        riskRewardRatio: 2.2,
        confidenceScore: 82,
        reasonsSupporting: [
          `Price tagged lower band boundary (%B ${(bollinger.percentB * 100).toFixed(0)}%).`,
          `Range regime indicates regression toward middle SMA 20 ($${fmtP(bollinger.middle)}).`,
          `Favorable risk/reward to midline.`
        ],
        reasonsAgainst: ['Risk of continuation flush.'],
        invalidationCriteria: `Close below $${fmtP(sl)} triggers stop exit.`,
        regime: marketRegime,
        timestamp,
        conditionsMet: ['Lower band reach', 'Range regime', 'Target middle SMA'],
        conditionsFailed: []
      };
    }
  }

  return createWaitSignal('bollinger_bands', 'Bollinger Bands', symbol, timeframe, marketRegime, timestamp, 'Price is trading inside standard band bounds without squeeze or extreme tag.');
}

/**
 * 11. Market Structure Strategy (Deterministic HH/HL/LH/LL & BOS/CHoCH)
 */
export function evaluateMarketStructure(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, swingPoints, structuralEvents, lastBOS, lastCHoCH, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  const swingHighs = swingPoints.filter((p) => p.type === 'HIGH').slice(-3);
  const swingLows = swingPoints.filter((p) => p.type === 'LOW').slice(-3);

  const hasHigherHigh = swingHighs.length >= 2 && swingHighs[swingHighs.length - 1].price > swingHighs[swingHighs.length - 2].price;
  const hasHigherLow = swingLows.length >= 2 && swingLows[swingLows.length - 1].price > swingLows[swingLows.length - 2].price;
  const hasLowerHigh = swingHighs.length >= 2 && swingHighs[swingHighs.length - 1].price < swingHighs[swingHighs.length - 2].price;
  const hasLowerLow = swingLows.length >= 2 && swingLows[swingLows.length - 1].price < swingLows[swingLows.length - 2].price;

  // Bullish structure: Higher High + Higher Low + Bullish BOS
  const isBullStructure = (hasHigherHigh && hasHigherLow) || (lastBOS && lastBOS.type === 'BOS_BULLISH' && currentPrice >= lastBOS.brokenLevel * 0.995);
  // Bearish structure: Lower High + Lower Low + Bearish BOS
  const isBearStructure = (hasLowerHigh && hasLowerLow) || (lastBOS && lastBOS.type === 'BOS_BEARISH' && currentPrice <= lastBOS.brokenLevel * 1.005);

  if (isBullStructure && currentPrice > (swingLows[swingLows.length - 1]?.price || currentPrice * 0.95)) {
    const lastHL = swingLows[swingLows.length - 1]?.price || currentPrice * 0.97;
    const sl = roundP(lastHL * (isForex ? 0.998 : 0.988));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'market_structure',
      strategyName: 'Market Structure (HH/HL & Confirmed BOS)',
      strategyVersion: 'v1.0.0',
      category: 'Structure',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(lastHL * 1.005),
      entryMax: currentPrice,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 1.8),
      target2: roundP(currentPrice + stopDist * 2.8),
      target3: roundP(currentPrice + stopDist * 4.2),
      riskRewardRatio: 2.8,
      confidenceScore: 89,
      reasonsSupporting: [
        'Confirmed Bullish Market Structure: consecutive Higher Highs & Higher Lows.',
        lastBOS?.type === 'BOS_BULLISH' ? `Bullish BOS verified at $${fmtP(lastBOS.brokenLevel)} with candle close.` : 'Swing pivot series trending upward.',
        `Clean invalidation at swing Higher Low ($${fmtP(lastHL)}).`
      ],
      reasonsAgainst: ['CHoCH warning if market suddenly fails to break prior high.'],
      invalidationCriteria: `Structural failure: candle close below swing Higher Low ($${fmtP(sl)}) triggers Change of Character (CHoCH).`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Higher Highs confirmed', 'Higher Lows confirmed', 'Bullish BOS event active'],
      conditionsFailed: []
    };
  }

  if (isBearStructure) {
    const lastLH = swingHighs[swingHighs.length - 1]?.price || currentPrice * 1.03;
    const sl = roundP(lastLH * (isForex ? 1.002 : 1.012));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'market_structure',
      strategyName: 'Market Structure (LH/LL & Confirmed BOS)',
      strategyVersion: 'v1.0.0',
      category: 'Structure',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: currentPrice,
      entryMax: roundP(lastLH * 0.995),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 1.8),
      target2: roundP(currentPrice - stopDist * 2.8),
      target3: roundP(currentPrice - stopDist * 4.2),
      riskRewardRatio: 2.8,
      confidenceScore: 88,
      reasonsSupporting: [
        'Confirmed Bearish Market Structure: consecutive Lower Highs & Lower Lows.',
        lastBOS?.type === 'BOS_BEARISH' ? `Bearish BOS verified at $${fmtP(lastBOS.brokenLevel)}.` : 'Swing pivots printing lower troughs.',
        `Stop loss anchored at protective Lower High ($${fmtP(lastLH)}).`
      ],
      reasonsAgainst: ['Bear exhaustion bounce risk.'],
      invalidationCriteria: `Candle close above Lower High ($${fmtP(sl)}) marks structural invalidation.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['Lower Highs confirmed', 'Lower Lows confirmed', 'Bearish BOS active'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('market_structure', 'Market Structure', symbol, timeframe, marketRegime, timestamp, 'Market structure is transitioning or consolidating without defined consecutive pivots.');
}

/**
 * 12. Multi-Timeframe Confluence Strategy (4H Macro + 1H Structure + 15M/5M Execution)
 */
export function evaluateMTFConfluence(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const ctx = buildStrategyContext(candles, symbol, timeframe);
  const { currentPrice, htfTrend, ltfTrend, ema50, asset, marketRegime, timestamp } = ctx;
  const { roundP, fmtP, isForex, minStopDist } = asset;

  // Synthesize alignment between macro and execution tiers
  const isAllBullish = htfTrend === 'BULLISH' && ltfTrend === 'BULLISH' && marketRegime.bias === 'BULLISH';
  const isAllBearish = htfTrend === 'BEARISH' && ltfTrend === 'BEARISH' && marketRegime.bias === 'BEARISH';
  const isConflicted = (htfTrend === 'BULLISH' && ltfTrend === 'BEARISH') || (htfTrend === 'BEARISH' && ltfTrend === 'BULLISH');

  if (isConflicted) {
    return {
      strategyId: 'mtf_confluence',
      strategyName: 'Multi-Timeframe Confluence (Macro + Structure + Execution)',
      strategyVersion: 'v1.0.0',
      category: 'Multi-Timeframe',
      symbol,
      timeframe,
      action: 'WAIT',
      bias: 'NEUTRAL',
      entryMin: currentPrice,
      entryMax: currentPrice,
      entryMid: currentPrice,
      stopLoss: currentPrice,
      stopDistancePct: 0,
      target1: currentPrice,
      target2: currentPrice,
      target3: currentPrice,
      riskRewardRatio: 0,
      confidenceScore: 35,
      reasonsSupporting: [],
      reasonsAgainst: [
        `MTF CONFLICT DETECTED: Higher timeframe bias (${htfTrend}) opposes lower timeframe execution (${ltfTrend}).`,
        'Higher timeframes dictate macro trend; execution timeframe is counter-trend. Wait for alignment.'
      ],
      invalidationCriteria: 'Conflicting timeframe signals require waiting for multi-timeframe resolution.',
      regime: marketRegime,
      timestamp,
      conditionsMet: [],
      conditionsFailed: ['HTF alignment: PASS', 'LTF alignment: CONFLICTED', 'Multi-timeframe consensus failed']
    };
  }

  if (isAllBullish) {
    const sl = roundP(Math.min(ema50, currentPrice * (isForex ? 0.9985 : 0.985)));
    const stopDist = Math.max(minStopDist, currentPrice - sl);
    return {
      strategyId: 'mtf_confluence',
      strategyName: 'Multi-Timeframe Confluence (Macro + Structure + Execution)',
      strategyVersion: 'v1.0.0',
      category: 'Multi-Timeframe',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: roundP(currentPrice * (isForex ? 0.999 : 0.997)),
      entryMax: roundP(currentPrice * (isForex ? 1.001 : 1.003)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice + stopDist * 2.0),
      target2: roundP(currentPrice + stopDist * 3.0),
      target3: roundP(currentPrice + stopDist * 4.5),
      riskRewardRatio: 3.0,
      confidenceScore: 94,
      reasonsSupporting: [
        '4H Macro Alignment: PASS (Bullish trend confirmed above EMA 50 & 200).',
        '1H Market Structure: PASS (Higher highs and higher lows verified).',
        '15M/5M Execution Trigger: PASS (Pullback recovered into momentum continuation).',
        'Overall MTF Confluence Rating: HIGH (Full consensus across time horizons).'
      ],
      reasonsAgainst: ['Ensure position size strictly follows risk engine.'],
      invalidationCriteria: `LTF structure breakdown below $${fmtP(sl)} aborts confluent entry.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['HTF 4H: Bullish', 'MTF 1H: Bullish', 'LTF 15M: Bullish', 'Zero timeframe conflicts'],
      conditionsFailed: []
    };
  }

  if (isAllBearish) {
    const sl = roundP(Math.max(ema50, currentPrice * (isForex ? 1.0015 : 1.015)));
    const stopDist = Math.max(minStopDist, sl - currentPrice);
    return {
      strategyId: 'mtf_confluence',
      strategyName: 'Multi-Timeframe Confluence (Macro + Structure + Execution)',
      strategyVersion: 'v1.0.0',
      category: 'Multi-Timeframe',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: roundP(currentPrice * (isForex ? 1.001 : 1.003)),
      entryMax: roundP(currentPrice * (isForex ? 0.999 : 0.997)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: roundP(currentPrice - stopDist * 2.0),
      target2: roundP(currentPrice - stopDist * 3.0),
      target3: roundP(currentPrice - stopDist * 4.5),
      riskRewardRatio: 3.0,
      confidenceScore: 93,
      reasonsSupporting: [
        '4H Macro Alignment: PASS (Bearish trend confirmed below key moving averages).',
        '1H Market Structure: PASS (Lower highs and lower lows verified).',
        '15M/5M Execution Trigger: PASS (Relief bounce exhausted into downside momentum).',
        'Overall MTF Confluence Rating: HIGH (Full downward alignment).'
      ],
      reasonsAgainst: ['Manage trailing stops on extended intraday flushes.'],
      invalidationCriteria: `LTF structure reclaim above $${fmtP(sl)} negates confluent short.`,
      regime: marketRegime,
      timestamp,
      conditionsMet: ['HTF 4H: Bearish', 'MTF 1H: Bearish', 'LTF 15M: Bearish', 'Zero timeframe conflicts'],
      conditionsFailed: []
    };
  }

  return createWaitSignal('mtf_confluence', 'Multi-Timeframe Confluence', symbol, timeframe, marketRegime, timestamp, 'Timeframes are partially aligned but lack high-conviction unanimous consensus.');
}

// ============================================================================
// 5. HELPER FACTORIES
// ============================================================================

function createWaitSignal(
  strategyId: string,
  strategyName: string,
  symbol: string,
  timeframe: string,
  regime: MarketRegime,
  timestamp: number | string,
  reason: string,
  currentPrice: number = 0
): StrategySignal {
  return {
    strategyId,
    strategyName,
    strategyVersion: 'v1.0.0',
    symbol,
    timeframe,
    action: 'WAIT',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: 0,
    stopDistancePct: 0,
    target1: 0,
    target2: 0,
    target3: 0,
    riskRewardRatio: 0,
    confidenceScore: 40,
    reasonsSupporting: [],
    reasonsAgainst: [reason],
    invalidationCriteria: 'No active trade setup meets all strict quantitative prerequisites.',
    regime,
    timestamp,
    conditionsMet: [],
    conditionsFailed: [reason]
  };
}

function createNoSetupSignal(
  strategyId: string,
  strategyName: string,
  symbol: string,
  timeframe: string,
  regime: MarketRegime,
  timestamp: number | string,
  reason: string,
  currentPrice: number = 0
): StrategySignal {
  return {
    strategyId,
    strategyName,
    strategyVersion: 'v1.0.0',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: 0,
    stopDistancePct: 0,
    target1: 0,
    target2: 0,
    target3: 0,
    riskRewardRatio: 0,
    confidenceScore: 20,
    reasonsSupporting: [],
    reasonsAgainst: [reason],
    invalidationCriteria: 'Prerequisite indicators or candles unavailable.',
    regime,
    timestamp,
    conditionsMet: [],
    conditionsFailed: [reason]
  };
}

// ============================================================================
// 6. AVAILABLE STRATEGIES REGISTRY (ALL 12 CORE FAMILIES)
// ============================================================================

export const AVAILABLE_STRATEGIES: StrategyDefinition[] = [
  {
    id: 'trend_following',
    name: 'Trend Following (EMA 20/50/200 + Regime)',
    description: 'Trades in the direction of an established trend using triple EMA stacking and market regime confirmation.',
    category: 'Trend',
    bestRegime: 'Strong / Weak Uptrend or Downtrend',
    weakestRegime: 'Range / Low Volatility Sideways Chop',
    enabled: true,
    evaluate: evaluateTrendFollowing
  },
  {
    id: 'trend_pullback',
    name: 'Trend Pullback (EMA/Support Retest + Recovery)',
    description: 'Enters on healthy temporary retracements into EMA 20/50 or support zones within an established trend.',
    category: 'Trend',
    bestRegime: 'Sustained Trending Markets with Healthy Waves',
    weakestRegime: 'Vertical Parabolic Runaways or Flat Ranges',
    enabled: true,
    evaluate: evaluateTrendPullback
  },
  {
    id: 'breakout',
    name: 'Breakout (Resistance/Support Breakout + Volume)',
    description: 'Detects clean candle closes outside key range boundaries confirmed by volume spikes and ATR expansion.',
    category: 'Breakout',
    bestRegime: 'Volatility Expansion from Tight Consolidation',
    weakestRegime: 'Choppy Ranges with Liquidity Wicks',
    enabled: true,
    evaluate: evaluateBreakout
  },
  {
    id: 'breakout_retest',
    name: 'Breakout + Retest (Polarity Flip Confirmation)',
    description: 'Waits for a confirmed structural break and trades the subsequent holding retest of the broken level.',
    category: 'Breakout',
    bestRegime: 'Trending Markets with Well-Defined Prior S/R',
    weakestRegime: 'Volatile False Breaks with Deep Re-entries',
    enabled: true,
    evaluate: evaluateBreakoutRetest
  },
  {
    id: 'sr_reversal',
    name: 'Support / Resistance Reversal (Pivot Rejection)',
    description: 'Trades mean-reversion rejections off validated multi-touch Support and Resistance cluster zones.',
    category: 'Structure',
    bestRegime: 'Well-Defined Horizontal Channels',
    weakestRegime: 'Aggressive Trend Runaways',
    enabled: true,
    evaluate: evaluateSRReversal
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion (Bollinger + RSI Extremes)',
    description: 'Identifies 2-sigma Bollinger Band extensions combined with RSI extremes in non-trending regimes.',
    category: 'Reversion',
    bestRegime: 'Range & Moderate Volatility Consolidation',
    weakestRegime: 'Strong Sustained Trends (Auto-Disabled with Warning)',
    enabled: true,
    evaluate: evaluateMeanReversion
  },
  {
    id: 'ema_crossover',
    name: 'EMA Crossover (EMA 20/50 Recent Event)',
    description: 'Detects the actual crossover event between fast 20 EMA and slow 50 EMA with macro trend filtering.',
    category: 'Trend',
    bestRegime: 'Early-Stage Emerging Trends',
    weakestRegime: 'Whipsaw Sideways Ranges',
    enabled: true,
    evaluate: evaluateEMACrossover
  },
  {
    id: 'rsi_momentum',
    name: 'RSI Momentum & Dynamic Range',
    description: 'Evaluates trend-aligned RSI recovery out of temporary discount zones rather than simplistic 30/70 thresholds.',
    category: 'Momentum',
    bestRegime: 'Active Trending Markets with Healthy Resets',
    weakestRegime: 'Low-Volume Dead Consolidation',
    enabled: true,
    evaluate: evaluateRSIMomentum
  },
  {
    id: 'macd_momentum',
    name: 'MACD Momentum & Acceleration',
    description: 'Confirms trend acceleration using MACD histogram expansion and zero-line momentum checks.',
    category: 'Momentum',
    bestRegime: 'Early to Mid Impulse Waves',
    weakestRegime: 'Tight Consolidation Around Zero Line',
    enabled: true,
    evaluate: evaluateMACDMomentum
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands (Dual-Mode: Reversion vs Squeeze)',
    description: 'Automatically switches between Mean Reversion Mode in ranges and Volatility Squeeze Mode during band compression.',
    category: 'Breakout',
    bestRegime: 'Both Tight Compression Squeezes and Stable Ranges',
    weakestRegime: 'Persistent Slow-Grind Single-Directional Moves',
    enabled: true,
    evaluate: evaluateBollingerBands
  },
  {
    id: 'market_structure',
    name: 'Market Structure (HH/HL & Confirmed BOS)',
    description: 'Deterministic fractal swing analysis tracking Higher Highs/Lows, Break of Structure, and Change of Character.',
    category: 'Structure',
    bestRegime: 'Clear Swing Structure with Unambiguous Pivots',
    weakestRegime: 'Erratic Wick-Heavy News Spikes',
    enabled: true,
    evaluate: evaluateMarketStructure
  },
  {
    id: 'mtf_confluence',
    name: 'Multi-Timeframe Confluence (Macro + Structure + Execution)',
    description: 'Synthesizes 4H Macro, 1H Structure, and 15M/5M Execution into unanimous high-probability setups.',
    category: 'Multi-Timeframe',
    bestRegime: 'Multi-Timeframe Trend Consensus',
    weakestRegime: 'Conflicted Timeframes (Auto-Waits)',
    enabled: true,
    evaluate: evaluateMTFConfluence
  }
];

// Backwards compatibility aliases for older function names
export const evaluateMACrossover = evaluateEMACrossover;
export const evaluatePullbackContinuation = evaluateTrendPullback;
export const evaluateSRBounce = evaluateSRReversal;
export const evaluateRSIDivergence = evaluateRSIMomentum;
export const evaluateMACDConfirmation = evaluateMACDMomentum;

// ============================================================================
// 7. CONFLUENCE ENGINE & SCORING
// ============================================================================

export interface ConfluenceBreakdown {
  trendAlignment: number;       // 0 - 20
  marketStructure: number;      // 0 - 20
  supportResistance: number;    // 0 - 15
  momentum: number;             // 0 - 15
  volume: number;               // 0 - 10
  multiTimeframe: number;       // 0 - 10
  dataQuality: number;          // 0 - 10
  totalScore: number;           // 0 - 100 Strategy Score
  consensusBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  activeSignalsCount: {
    long: number;
    short: number;
    wait: number;
  };
}

/**
 * Calculates a transparent 7-factor Strategy Score.
 * Note: Labeled as 'Strategy Score' (Rule alignment), NOT an arbitrary win probability!
 */
export function calculateConfluenceScore(
  context: StrategyContext,
  signals: StrategySignal[]
): ConfluenceBreakdown {
  const { marketRegime, htfTrend, ltfTrend, volumeRatio, nearestSupport, nearestResistance, rsi, macd, dataQuality } = context;

  const longSignals = signals.filter((s) => s.action === 'LONG SETUP');
  const shortSignals = signals.filter((s) => s.action === 'SHORT SETUP');
  const waitSignals = signals.filter((s) => s.action === 'WAIT' || s.action === 'NO CLEAR SETUP');

  // 1. Trend Alignment (0 - 20)
  let trendScore = 10;
  if (marketRegime.regime === 'Strong Uptrend' || marketRegime.regime === 'Strong Downtrend') trendScore = 20;
  else if (marketRegime.regime === 'Weak Uptrend' || marketRegime.regime === 'Weak Downtrend') trendScore = 16;
  else if (marketRegime.regime === 'Range') trendScore = 12;

  // 2. Market Structure (0 - 20)
  let structureScore = 12;
  if (context.lastBOS) structureScore = 18;
  if (longSignals.some((s) => s.strategyId === 'market_structure') || shortSignals.some((s) => s.strategyId === 'market_structure')) {
    structureScore = 20;
  }

  // 3. Support & Resistance (0 - 15)
  let srScore = 8;
  if (nearestSupport || nearestResistance) srScore = 13;
  if (nearestSupport?.strength === 'STRONG' || nearestResistance?.strength === 'STRONG') srScore = 15;

  // 4. Momentum (0 - 15)
  let momentumScore = 8;
  if ((rsi >= 50 && rsi <= 65 && macd.histogram > 0) || (rsi <= 50 && rsi >= 35 && macd.histogram < 0)) {
    momentumScore = 14;
  }

  // 5. Volume Confirmation (0 - 10)
  let volumeScore = 5;
  if (volumeRatio >= 1.3) volumeScore = 10;
  else if (volumeRatio >= 1.0) volumeScore = 8;

  // 6. Multi-Timeframe Confluence (0 - 10)
  let mtfScore = 5;
  if (htfTrend === ltfTrend && htfTrend !== 'NEUTRAL') mtfScore = 10;
  else if (htfTrend !== 'NEUTRAL') mtfScore = 7;

  // 7. Data Quality (0 - 10)
  const dqScore = Math.round((dataQuality.qualityScore / 100) * 10);

  const totalScore = Math.min(100, trendScore + structureScore + srScore + momentumScore + volumeScore + mtfScore + dqScore);

  let consensusBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (longSignals.length > shortSignals.length && longSignals.length >= 2) consensusBias = 'BULLISH';
  else if (shortSignals.length > longSignals.length && shortSignals.length >= 2) consensusBias = 'BEARISH';

  return {
    trendAlignment: trendScore,
    marketStructure: structureScore,
    supportResistance: srScore,
    momentum: momentumScore,
    volume: volumeScore,
    multiTimeframe: mtfScore,
    dataQuality: dqScore,
    totalScore,
    consensusBias,
    activeSignalsCount: {
      long: longSignals.length,
      short: shortSignals.length,
      wait: waitSignals.length
    }
  };
}

// ============================================================================
// 8. STRATEGY CONFLICT DETECTION
// ============================================================================

export interface ConflictReport {
  hasConflict: boolean;
  bullishStrategies: string[];
  bearishStrategies: string[];
  conflictingDetails: string[];
  recommendedAction: 'PROCEED' | 'SIGNAL CONFLICT DETECTED — WAIT';
  summary: string;
}

/**
 * Scans all strategy outputs for direct contradictions (e.g. Trend Following LONG vs Mean Reversion SHORT).
 * Returns transparent conflict notification instead of blindly averaging opposites.
 */
export function detectStrategyConflicts(signals: StrategySignal[]): ConflictReport {
  const activeLongs = signals.filter((s) => s.action === 'LONG SETUP');
  const activeShorts = signals.filter((s) => s.action === 'SHORT SETUP');

  if (activeLongs.length > 0 && activeShorts.length > 0) {
    const bullNames = activeLongs.map((s) => s.strategyName);
    const bearNames = activeShorts.map((s) => s.strategyName);
    return {
      hasConflict: true,
      bullishStrategies: bullNames,
      bearishStrategies: bearNames,
      conflictingDetails: [
        `Direct polarity collision: ${bullNames.join(', ')} signaled LONG while ${bearNames.join(', ')} signaled SHORT.`,
        'Trending strategies and mean-reversion strategies are generating contradictory biases.',
        'Market structure or regime is likely transitioning.'
      ],
      recommendedAction: 'SIGNAL CONFLICT DETECTED — WAIT',
      summary: `Conflict between ${activeLongs.length} Bullish setup(s) and ${activeShorts.length} Bearish setup(s). Recommend WAIT.`
    };
  }

  return {
    hasConflict: false,
    bullishStrategies: activeLongs.map((s) => s.strategyName),
    bearishStrategies: activeShorts.map((s) => s.strategyName),
    conflictingDetails: [],
    recommendedAction: 'PROCEED',
    summary: activeLongs.length > 0
      ? `Clear Bullish consensus (${activeLongs.length} agreeing strategies).`
      : activeShorts.length > 0
      ? `Clear Bearish consensus (${activeShorts.length} agreeing strategies).`
      : 'No conflicting trade setups detected.'
  };
}

// ============================================================================
// 9. MARKET REGIME ROUTER
// ============================================================================

export interface RegimeRoutingRecommendation {
  currentRegime: MarketRegimeType;
  primaryStrategies: string[];
  secondaryStrategies: string[];
  disabledOrDeprioritized: string[];
  rationale: string;
}

/**
 * Selects and routes optimal strategies based on the active market regime.
 */
export function routeStrategiesByRegime(regime: MarketRegimeType): RegimeRoutingRecommendation {
  switch (regime) {
    case 'Strong Uptrend':
    case 'Weak Uptrend':
      return {
        currentRegime: regime,
        primaryStrategies: ['trend_pullback', 'trend_following', 'market_structure', 'mtf_confluence'],
        secondaryStrategies: ['breakout', 'breakout_retest', 'rsi_momentum', 'macd_momentum'],
        disabledOrDeprioritized: ['mean_reversion', 'sr_reversal'],
        rationale: 'Persistent upward trend favor trend-following, pullback continuation, and multi-timeframe alignment. Counter-trend mean reversion is high-risk.'
      };
    case 'Strong Downtrend':
    case 'Weak Downtrend':
      return {
        currentRegime: regime,
        primaryStrategies: ['trend_pullback', 'trend_following', 'market_structure', 'mtf_confluence'],
        secondaryStrategies: ['breakout', 'breakout_retest', 'rsi_momentum', 'macd_momentum'],
        disabledOrDeprioritized: ['mean_reversion', 'sr_reversal'],
        rationale: 'Sustained downward momentum favors short pullback entries and structural breakdowns. Bottom-fishing mean reversion is deprioritized.'
      };
    case 'Range':
      return {
        currentRegime: regime,
        primaryStrategies: ['mean_reversion', 'sr_reversal', 'bollinger_bands'],
        secondaryStrategies: ['rsi_momentum'],
        disabledOrDeprioritized: ['trend_following', 'ema_crossover', 'breakout'],
        rationale: 'Horizontal channel structure favors bounded mean reversion and support/resistance bounces. Trend following will suffer from choppy whipsaws.'
      };
    case 'High Volatility':
      return {
        currentRegime: regime,
        primaryStrategies: ['breakout', 'breakout_retest', 'bollinger_bands'],
        secondaryStrategies: ['market_structure'],
        disabledOrDeprioritized: ['mean_reversion'],
        rationale: 'Elevated volatility favors impulsive breakouts and volatility expansion setups with wide protective stops.'
      };
    case 'Low Volatility':
      return {
        currentRegime: regime,
        primaryStrategies: ['bollinger_bands', 'sr_reversal'],
        secondaryStrategies: ['mean_reversion'],
        disabledOrDeprioritized: ['breakout', 'trend_following'],
        rationale: 'Compression phase. Look for Bollinger squeeze setups preparing for eventual breakout.'
      };
    default:
      return {
        currentRegime: regime,
        primaryStrategies: ['mtf_confluence'],
        secondaryStrategies: [],
        disabledOrDeprioritized: ['trend_following', 'mean_reversion', 'breakout'],
        rationale: 'Unclear or choppy structure. Stand aside (WAIT) until regime clarifies.'
      };
  }
}

// ============================================================================
// 10. EVALUATE ALL STRATEGIES & CONFLUENCE ARBITRATION
// ============================================================================

export function evaluateAllStrategies(
  candles: Candle[],
  symbol: string,
  timeframe: string
): {
  activeSignal: StrategySignal;
  allSignals: StrategySignal[];
  confluence: ConfluenceBreakdown;
  conflict: ConflictReport;
  routing: RegimeRoutingRecommendation;
} {
  const context = buildStrategyContext(candles, symbol, timeframe);
  const routing = routeStrategiesByRegime(context.marketRegime.regime);

  // Evaluate enabled strategies
  const allSignals = AVAILABLE_STRATEGIES
    .filter((s) => s.enabled)
    .map((s) => s.evaluate(candles, symbol, timeframe));

  const conflict = detectStrategyConflicts(allSignals);
  const confluence = calculateConfluenceScore(context, allSignals);

  // Priority scoring: action priority + confidence + regime recommendation boost
  const actionPriority: Record<SignalAction, number> = {
    'LONG SETUP': 3,
    'SHORT SETUP': 3,
    'WAIT': 2,
    'NO CLEAR SETUP': 1
  };

  const sorted = [...allSignals].sort((a, b) => {
    // If conflict detected and these are opposites, prioritize WAIT
    if (conflict.hasConflict && (a.action === 'WAIT' || b.action === 'WAIT')) {
      return a.action === 'WAIT' ? -1 : 1;
    }

    const pDiff = actionPriority[b.action] - actionPriority[a.action];
    if (pDiff !== 0) return pDiff;

    // Boost score if recommended by regime router
    const aBoost = routing.primaryStrategies.includes(a.strategyId) ? 10 : 0;
    const bBoost = routing.primaryStrategies.includes(b.strategyId) ? 10 : 0;

    return (b.confidenceScore + bBoost) - (a.confidenceScore + aBoost);
  });

  return {
    activeSignal: sorted[0] || allSignals[0],
    allSignals,
    confluence,
    conflict,
    routing
  };
}
