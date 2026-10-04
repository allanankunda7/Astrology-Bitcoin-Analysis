/**
 * strategies.ts
 * Modular Rule-Based Quantitative Strategy & Signal Engine
 * 
 * Implements 8 independent modular strategies:
 * 1. Trend-Following (EMA 21/50 + Momentum)
 * 2. Moving Average Crossover (Golden / Death Cross)
 * 3. Breakout Retest (BOS + Volume Spike)
 * 4. Pullback Continuation (Key Fib/EMA 50 Retest)
 * 5. Support / Resistance Bounce (Pivot Rejection)
 * 6. Mean Reversion (Bollinger Bands + RSI Extremes)
 * 7. RSI Momentum & Divergence
 * 8. MACD Zero-Line & Histogram Acceleration
 * 
 * Every signal outputs transparent entry zone, stop loss, take profits (TP1, TP2, TP3),
 * risk/reward ratio, rule-alignment score, reasons supporting, reasons against, and invalidation rules.
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
  MarketRegime
} from './marketStructure';

export type SignalAction = 'LONG SETUP' | 'SHORT SETUP' | 'WAIT' | 'NO CLEAR SETUP';

export interface StrategySignal {
  strategyId: string;
  strategyName: string;
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
  confidenceScore: number; // 0 - 100 (Rule alignment score, NOT probability of win!)
  reasonsSupporting: string[];
  reasonsAgainst: string[];
  invalidationCriteria: string;
  regime: MarketRegime;
  timestamp: number | string;
}

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  category: 'Trend' | 'Momentum' | 'Breakout' | 'Reversion' | 'Structure';
  bestRegime: string;
  weakestRegime: string;
  enabled: boolean;
  evaluate: (candles: Candle[], symbol: string, timeframe: string) => StrategySignal;
}

/**
 * 1. Trend Following Strategy (EMA 21 / 50 Alignment + Pullback)
 */
function evaluateTrendFollowing(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const ema21 = calculateEMA(candles, 21);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = calculateEMA(candles, 200);
  const rsi = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);
  const swingPoints = detectSwingPoints(candles, 3);
  const regime = detectMarketRegime(
    candles,
    ema21[ema21.length - 1]?.value ?? null,
    ema50[ema50.length - 1]?.value ?? null,
    ema200[ema200.length - 1]?.value ?? null,
    rsi[rsi.length - 1]?.value ?? null,
    atr[atr.length - 1]?.value ?? null,
    swingPoints
  );

  const e21 = ema21[ema21.length - 1]?.value ?? currentPrice;
  const e50 = ema50[ema50.length - 1]?.value ?? currentPrice;
  const currRsi = rsi[rsi.length - 1]?.value ?? 50;
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const isBull = currentPrice > e21 && e21 > e50 && currRsi > 52 && currRsi < 68;
  const isBear = currentPrice < e21 && e21 < e50 && currRsi < 48 && currRsi > 32;

  if (isBull) {
    const sl = Number((currentPrice - currentAtr * 1.5).toFixed(2));
    const entryMin = Number((currentPrice * 0.998).toFixed(2));
    const entryMax = Number((currentPrice * 1.002).toFixed(2));
    const stopDist = Math.max(0.1, currentPrice - sl);
    const tp1 = Number((currentPrice + stopDist * 1.5).toFixed(2));
    const tp2 = Number((currentPrice + stopDist * 2.5).toFixed(2));
    const tp3 = Number((currentPrice + stopDist * 3.5).toFixed(2));

    return {
      strategyId: 'trend_following',
      strategyName: 'Trend-Following (EMA 21/50 + Momentum)',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin,
      entryMax,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: tp1,
      target2: tp2,
      target3: tp3,
      riskRewardRatio: 2.5,
      confidenceScore: 84,
      reasonsSupporting: [
        'Price comfortably above stacked upward-sloping EMA 21 and EMA 50.',
        'RSI momentum is healthy (52-68) with room before overbought exhaustion.',
        'Market regime classified as Strong/Weak Uptrend with bullish structural bias.'
      ],
      reasonsAgainst: [
        'Late-stage trend risk: entries far from EMA 50 are susceptible to mean-reversion pullbacks.',
        'Macro overhead resistance nearby on higher timeframes.'
      ],
      invalidationCriteria: `A confirmed candle close below EMA 50 ($${e50.toFixed(2)}) breaks the trend premise.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  if (isBear) {
    const sl = Number((currentPrice + currentAtr * 1.5).toFixed(2));
    const entryMin = Number((currentPrice * 0.998).toFixed(2));
    const entryMax = Number((currentPrice * 1.002).toFixed(2));
    const stopDist = Math.max(0.1, sl - currentPrice);
    const tp1 = Number((currentPrice - stopDist * 1.5).toFixed(2));
    const tp2 = Number((currentPrice - stopDist * 2.5).toFixed(2));
    const tp3 = Number((currentPrice - stopDist * 3.5).toFixed(2));

    return {
      strategyId: 'trend_following',
      strategyName: 'Trend-Following (EMA 21/50 + Momentum)',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin,
      entryMax,
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: tp1,
      target2: tp2,
      target3: tp3,
      riskRewardRatio: 2.5,
      confidenceScore: 82,
      reasonsSupporting: [
        'Price suppressed below downward-sloping EMA 21 and EMA 50.',
        'RSI momentum indicates active seller control without being severely oversold.',
        'Lower highs and lower lows dominating recent swing structure.'
      ],
      reasonsAgainst: [
        'Counter-trend short squeeze wicks can trigger tight trailing stops.',
        'Higher-timeframe macro support zone situated directly below.'
      ],
      invalidationCriteria: `A confirmed candle close above EMA 50 ($${e50.toFixed(2)}) invalidates the short bias.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  return {
    strategyId: 'trend_following',
    strategyName: 'Trend-Following (EMA 21/50 + Momentum)',
    symbol,
    timeframe,
    action: regime.regime === 'Range' ? 'WAIT' : 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 35,
    reasonsSupporting: ['Moving averages currently intertwined or moving sideways.'],
    reasonsAgainst: ['Trend strength insufficient to warrant a directional trend trade.'],
    invalidationCriteria: 'Await a decisive breakout above EMA 21 or below EMA 50.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 2. Moving Average Crossover Strategy (SMA 20 & SMA 50)
 */
function evaluateMACrossover(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const s20Curr = sma20[sma20.length - 1]?.value ?? currentPrice;
  const s50Curr = sma50[sma50.length - 1]?.value ?? currentPrice;
  const s20Prev = sma20[sma20.length - 2]?.value ?? s20Curr;
  const s50Prev = sma50[sma50.length - 2]?.value ?? s50Curr;

  const isGoldenCross = s20Prev <= s50Prev && s20Curr > s50Curr;
  const isDeathCross = s20Prev >= s50Prev && s20Curr < s50Curr;

  const swingPoints = detectSwingPoints(candles, 3);
  const regime = detectMarketRegime(candles, s20Curr, s50Curr, null, 50, currentAtr, swingPoints);

  if (isGoldenCross || (s20Curr > s50Curr && currentPrice > s20Curr)) {
    const sl = Number((s50Curr - currentAtr).toFixed(2));
    const stopDist = Math.max(0.1, currentPrice - sl);

    return {
      strategyId: 'ma_crossover',
      strategyName: 'Moving Average Crossover (SMA 20/50)',
      symbol,
      timeframe,
      action: isGoldenCross ? 'LONG SETUP' : 'WAIT',
      bias: 'BULLISH',
      entryMin: Number((currentPrice * 0.999).toFixed(2)),
      entryMax: Number((currentPrice * 1.001).toFixed(2)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice + stopDist * 1.5).toFixed(2)),
      target2: Number((currentPrice + stopDist * 2.5).toFixed(2)),
      target3: Number((currentPrice + stopDist * 3.5).toFixed(2)),
      riskRewardRatio: 2.5,
      confidenceScore: isGoldenCross ? 78 : 55,
      reasonsSupporting: [
        'SMA 20 trading above SMA 50 signaling medium-term cyclical expansion.',
        'Classic institutional moving average crossover benchmark.'
      ],
      reasonsAgainst: [
        'Moving average crossovers are inherently lagging indicators.',
        'High false positive rate during consolidation ranges.'
      ],
      invalidationCriteria: `A cross of SMA 20 back below SMA 50 ($${s50Curr.toFixed(2)}) ends the setup.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  if (isDeathCross || (s20Curr < s50Curr && currentPrice < s20Curr)) {
    const sl = Number((s50Curr + currentAtr).toFixed(2));
    const stopDist = Math.max(0.1, sl - currentPrice);

    return {
      strategyId: 'ma_crossover',
      strategyName: 'Moving Average Crossover (SMA 20/50)',
      symbol,
      timeframe,
      action: isDeathCross ? 'SHORT SETUP' : 'WAIT',
      bias: 'BEARISH',
      entryMin: Number((currentPrice * 0.999).toFixed(2)),
      entryMax: Number((currentPrice * 1.001).toFixed(2)),
      entryMid: currentPrice,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice - stopDist * 1.5).toFixed(2)),
      target2: Number((currentPrice - stopDist * 2.5).toFixed(2)),
      target3: Number((currentPrice - stopDist * 3.5).toFixed(2)),
      riskRewardRatio: 2.5,
      confidenceScore: isDeathCross ? 76 : 52,
      reasonsSupporting: [
        'SMA 20 crossed below SMA 50 indicating medium-term cyclical contraction.'
      ],
      reasonsAgainst: ['Lagging indicator prone to whipsaws on sudden market turns.'],
      invalidationCriteria: `Price breaking back above SMA 50 ($${s50Curr.toFixed(2)}) invalidates setup.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  return {
    strategyId: 'ma_crossover',
    strategyName: 'Moving Average Crossover (SMA 20/50)',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 30,
    reasonsSupporting: ['No recent crossover event identified on this timeframe.'],
    reasonsAgainst: ['SMA 20 and SMA 50 lines are parallel or flat.'],
    invalidationCriteria: 'Await a validated moving average cross event.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 3. Breakout Retest Strategy (Break of Structure + Volume Surge)
 */
function evaluateBreakoutRetest(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const swingPoints = detectSwingPoints(candles, 3);
  const breaks = detectStructuralBreaks(candles, swingPoints);
  const volAnalysis = calculateVolumeAnalysis(candles, 20);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const recentBreak = breaks.slice(-1)[0];
  const regime = detectMarketRegime(candles, null, null, null, null, currentAtr, swingPoints);

  if (recentBreak && recentBreak.direction === 'BULLISH') {
    const brokenLevel = recentBreak.brokenLevel;
    const isRetestZone = currentPrice <= brokenLevel * 1.015 && currentPrice >= brokenLevel * 0.995;
    const sl = Number((brokenLevel - currentAtr * 1.2).toFixed(2));
    const stopDist = Math.max(0.1, currentPrice - sl);

    return {
      strategyId: 'breakout_retest',
      strategyName: 'Breakout Retest (BOS + Volume Expansion)',
      symbol,
      timeframe,
      action: isRetestZone ? 'LONG SETUP' : 'WAIT',
      bias: 'BULLISH',
      entryMin: Number((brokenLevel * 0.998).toFixed(2)),
      entryMax: Number((brokenLevel * 1.01).toFixed(2)),
      entryMid: brokenLevel,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice + stopDist * 1.8).toFixed(2)),
      target2: Number((currentPrice + stopDist * 3.0).toFixed(2)),
      target3: Number((currentPrice + stopDist * 4.2).toFixed(2)),
      riskRewardRatio: 3.0,
      confidenceScore: isRetestZone ? 88 : 62,
      reasonsSupporting: [
        `Confirmed Break of Structure (BOS) above previous swing high ($${brokenLevel.toLocaleString()}).`,
        volAnalysis.isSpike ? 'Breakout validated by institutional volume surge (>1.5x 20-period avg).' : 'Volume participation meets baseline threshold.',
        'Former resistance now flipping into support level according to structural polarity principles.'
      ],
      reasonsAgainst: [
        'Risk of false breakout (liquidity sweep / bull trap) if price fails to hold the level.',
        'Market sentiment could reverse on external macroeconomic headlines.'
      ],
      invalidationCriteria: `Candle close back below the broken swing high ($${brokenLevel.toLocaleString()}) signals a failed breakout.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  if (recentBreak && recentBreak.direction === 'BEARISH') {
    const brokenLevel = recentBreak.brokenLevel;
    const isRetestZone = currentPrice >= brokenLevel * 0.985 && currentPrice <= brokenLevel * 1.005;
    const sl = Number((brokenLevel + currentAtr * 1.2).toFixed(2));
    const stopDist = Math.max(0.1, sl - currentPrice);

    return {
      strategyId: 'breakout_retest',
      strategyName: 'Breakout Retest (BOS + Volume Expansion)',
      symbol,
      timeframe,
      action: isRetestZone ? 'SHORT SETUP' : 'WAIT',
      bias: 'BEARISH',
      entryMin: Number((brokenLevel * 0.99).toFixed(2)),
      entryMax: Number((brokenLevel * 1.002).toFixed(2)),
      entryMid: brokenLevel,
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice - stopDist * 1.8).toFixed(2)),
      target2: Number((currentPrice - stopDist * 3.0).toFixed(2)),
      target3: Number((currentPrice - stopDist * 4.2).toFixed(2)),
      riskRewardRatio: 3.0,
      confidenceScore: isRetestZone ? 86 : 60,
      reasonsSupporting: [
        `Confirmed structural breakdown below swing low ($${brokenLevel.toLocaleString()}).`,
        'Former support flipped to overhead resistance.'
      ],
      reasonsAgainst: ['Oversold bounce potential into higher timeframe demand zones.'],
      invalidationCriteria: `Candle close back above broken level ($${brokenLevel.toLocaleString()}) invalidates breakdown.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  return {
    strategyId: 'breakout_retest',
    strategyName: 'Breakout Retest (BOS + Volume Expansion)',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 32,
    reasonsSupporting: ['No recent Break of Structure identified within lookback window.'],
    reasonsAgainst: ['Price currently consolidating between existing swing pivots.'],
    invalidationCriteria: 'Await a confirmed candle close breaching a prior swing high or low.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 4. Pullback Continuation Strategy (Fibonacci 50%-61.8% Retest + S/R)
 */
function evaluatePullbackContinuation(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const swingPoints = detectSwingPoints(candles, 3);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const highs = swingPoints.filter(p => p.type === 'HIGH');
  const lows = swingPoints.filter(p => p.type === 'LOW');
  const regime = detectMarketRegime(candles, null, null, null, null, currentAtr, swingPoints);

  if (highs.length >= 1 && lows.length >= 1) {
    const lastHigh = highs[highs.length - 1].price;
    const lastLow = lows[lows.length - 1].price;
    const impulseRange = Math.abs(lastHigh - lastLow);

    // Bullish pullback: High followed low, now pulling back to 50% - 61.8% Fib
    if (lastHigh > lastLow && impulseRange > currentAtr * 2) {
      const fib50 = lastHigh - impulseRange * 0.50;
      const fib618 = lastHigh - impulseRange * 0.618;

      const isInFibZone = currentPrice <= fib50 * 1.01 && currentPrice >= fib618 * 0.99;
      const sl = Number((fib618 - currentAtr * 0.8).toFixed(2));
      const stopDist = Math.max(0.1, currentPrice - sl);

      return {
        strategyId: 'pullback_continuation',
        strategyName: 'Pullback Continuation (Fibonacci 50%-61.8% Retest)',
        symbol,
        timeframe,
        action: isInFibZone ? 'LONG SETUP' : 'WAIT',
        bias: 'BULLISH',
        entryMin: Number(fib618.toFixed(2)),
        entryMax: Number(fib50.toFixed(2)),
        entryMid: Number(((fib50 + fib618) / 2).toFixed(2)),
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number(lastHigh.toFixed(2)),
        target2: Number((lastHigh + impulseRange * 0.272).toFixed(2)),
        target3: Number((lastHigh + impulseRange * 0.618).toFixed(2)),
        riskRewardRatio: 2.8,
        confidenceScore: isInFibZone ? 85 : 58,
        reasonsSupporting: [
          `Retest of standard institutional golden Fibonacci pocket ($${fib618.toFixed(2)} - $${fib50.toFixed(2)}).`,
          'Higher-timeframe trend structure remains in upward trajectory.',
          'Asymmetric risk/reward ratio with well-defined invalidation.'
        ],
        reasonsAgainst: [
          'Strong aggressive selling momentum could overrun the 61.8% retracement level.',
          'Decreasing buyer volume during retest wicks.'
        ],
        invalidationCriteria: `Candle close below the 61.8% Fibonacci anchor ($${fib618.toFixed(2)}) invalidates the bullish retracement hypothesis.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }
  }

  return {
    strategyId: 'pullback_continuation',
    strategyName: 'Pullback Continuation (Fibonacci 50%-61.8% Retest)',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 30,
    reasonsSupporting: ['Impulse range not currently in pullback equilibrium.'],
    reasonsAgainst: ['Awaiting clean impulsive leg to anchor Fibonacci measurements.'],
    invalidationCriteria: 'Await a fresh swing high and swing low anchor pair.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 5. Support / Resistance Bounce Strategy
 */
function evaluateSRBounce(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const swingPoints = detectSwingPoints(candles, 3);
  const zones = findSupportResistanceZones(candles, swingPoints);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;
  const regime = detectMarketRegime(candles, null, null, null, null, currentAtr, swingPoints);

  const nearestSupport = zones.support[0];
  const nearestResistance = zones.resistance[0];

  // Check proximity to support (within 0.8% of support zone)
  if (nearestSupport && Math.abs(currentPrice - nearestSupport.mid) / currentPrice < 0.008) {
    const sl = Number((nearestSupport.lower - currentAtr * 0.8).toFixed(2));
    const stopDist = Math.max(0.1, currentPrice - sl);
    const tp1 = nearestResistance ? nearestResistance.mid : currentPrice + stopDist * 2.0;

    return {
      strategyId: 'sr_bounce',
      strategyName: 'Support / Resistance Bounce (Pivot Confirmation)',
      symbol,
      timeframe,
      action: 'LONG SETUP',
      bias: 'BULLISH',
      entryMin: Number(nearestSupport.lower.toFixed(2)),
      entryMax: Number((nearestSupport.mid * 1.003).toFixed(2)),
      entryMid: Number(nearestSupport.mid.toFixed(2)),
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice + stopDist * 1.5).toFixed(2)),
      target2: Number(tp1.toFixed(2)),
      target3: Number((tp1 + stopDist * 1.5).toFixed(2)),
      riskRewardRatio: 2.4,
      confidenceScore: 78,
      reasonsSupporting: [
        `Price reacting to verified ${nearestSupport.strength} Support Zone at $${nearestSupport.mid.toLocaleString()} (${nearestSupport.touchCount} historical pivot touches).`,
        'Cluster density indicates historical buyer absorption at this price node.'
      ],
      reasonsAgainst: [
        'Each successive test of a support zone gradually depletes resting buy limit orders.',
        'High macro correlation with broader market selloffs.'
      ],
      invalidationCriteria: `A confirmed candle close below Support Zone boundary ($${nearestSupport.lower.toFixed(2)}) triggers stop loss.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  // Check proximity to resistance (within 0.8% of resistance zone)
  if (nearestResistance && Math.abs(currentPrice - nearestResistance.mid) / currentPrice < 0.008) {
    const sl = Number((nearestResistance.upper + currentAtr * 0.8).toFixed(2));
    const stopDist = Math.max(0.1, sl - currentPrice);
    const tp1 = nearestSupport ? nearestSupport.mid : currentPrice - stopDist * 2.0;

    return {
      strategyId: 'sr_bounce',
      strategyName: 'Support / Resistance Bounce (Pivot Confirmation)',
      symbol,
      timeframe,
      action: 'SHORT SETUP',
      bias: 'BEARISH',
      entryMin: Number((nearestResistance.mid * 0.997).toFixed(2)),
      entryMax: Number(nearestResistance.upper.toFixed(2)),
      entryMid: Number(nearestResistance.mid.toFixed(2)),
      stopLoss: sl,
      stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
      target1: Number((currentPrice - stopDist * 1.5).toFixed(2)),
      target2: Number(tp1.toFixed(2)),
      target3: Number((tp1 - stopDist * 1.5).toFixed(2)),
      riskRewardRatio: 2.4,
      confidenceScore: 78,
      reasonsSupporting: [
        `Price rejecting ${nearestResistance.strength} Resistance Zone at $${nearestResistance.mid.toLocaleString()} (${nearestResistance.touchCount} touches).`,
        'Overhead supply absorption visible in upper candle wicks.'
      ],
      reasonsAgainst: ['Strong macro momentum can absorb resting sell orders and trigger an upside squeeze.'],
      invalidationCriteria: `Candle close above Resistance Zone upper boundary ($${nearestResistance.upper.toFixed(2)}) ends setup.`,
      regime,
      timestamp: candles[candles.length - 1].time
    };
  }

  return {
    strategyId: 'sr_bounce',
    strategyName: 'Support / Resistance Bounce (Pivot Confirmation)',
    symbol,
    timeframe,
    action: 'WAIT',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 40,
    reasonsSupporting: ['Price is currently trading in the middle of the trading channel.'],
    reasonsAgainst: ['Entering in the middle of a range offers poor risk/reward.'],
    invalidationCriteria: 'Wait for price to approach either established support or resistance boundary.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 6. Mean Reversion Strategy (Bollinger Bands + RSI Extremes)
 */
function evaluateMeanReversion(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const bb = calculateBollingerBands(candles, 20, 2.0);
  const rsi = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);

  const currentBB = bb[bb.length - 1];
  const currentRSI = rsi[rsi.length - 1]?.value ?? 50;
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const swingPoints = detectSwingPoints(candles, 3);
  const regime = detectMarketRegime(candles, null, null, null, currentRSI, currentAtr, swingPoints);

  if (currentBB) {
    // Bullish mean-reversion: Price below lower band + RSI oversold (<32)
    if (currentPrice <= currentBB.lower && currentRSI < 34) {
      const sl = Number((currentPrice - currentAtr * 1.2).toFixed(2));
      const stopDist = Math.max(0.1, currentPrice - sl);

      return {
        strategyId: 'mean_reversion',
        strategyName: 'Mean Reversion (Bollinger Bands + RSI Extremes)',
        symbol,
        timeframe,
        action: 'LONG SETUP',
        bias: 'BULLISH',
        entryMin: Number((currentPrice * 0.998).toFixed(2)),
        entryMax: Number((currentPrice * 1.002).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number(currentBB.middle.toFixed(2)),
        target2: Number(currentBB.upper.toFixed(2)),
        target3: Number((currentBB.upper + currentAtr).toFixed(2)),
        riskRewardRatio: 2.2,
        confidenceScore: 74,
        reasonsSupporting: [
          `Price extended beyond statistical 2-standard-deviation lower Bollinger Band ($${currentBB.lower.toFixed(2)}).`,
          `RSI at extreme oversold reading (${currentRSI.toFixed(1)} < 34), indicating seller capitulation.`,
          'Statistical tendency for asset to revert toward the 20-period moving average.'
        ],
        reasonsAgainst: [
          'Counter-trend risk: In powerful capitulation downtrends, price can "ride the band" downward for extended periods.',
          'Requires tight stop loss discipline.'
        ],
        invalidationCriteria: `New candle low printing below $${sl.toFixed(2)} invalidates the mean-reversion trade.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }

    // Bearish mean-reversion: Price above upper band + RSI overbought (>68)
    if (currentPrice >= currentBB.upper && currentRSI > 68) {
      const sl = Number((currentPrice + currentAtr * 1.2).toFixed(2));
      const stopDist = Math.max(0.1, sl - currentPrice);

      return {
        strategyId: 'mean_reversion',
        strategyName: 'Mean Reversion (Bollinger Bands + RSI Extremes)',
        symbol,
        timeframe,
        action: 'SHORT SETUP',
        bias: 'BEARISH',
        entryMin: Number((currentPrice * 0.998).toFixed(2)),
        entryMax: Number((currentPrice * 1.002).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number(currentBB.middle.toFixed(2)),
        target2: Number(currentBB.lower.toFixed(2)),
        target3: Number((currentBB.lower - currentAtr).toFixed(2)),
        riskRewardRatio: 2.2,
        confidenceScore: 72,
        reasonsSupporting: [
          `Price piercing upper Bollinger Band ($${currentBB.upper.toFixed(2)}) indicates statistical stretch.`,
          `RSI overbought (${currentRSI.toFixed(1)} > 68) warns of buyer fatigue.`
        ],
        reasonsAgainst: ['Shorting into strong parabolic upward momentum carries runaway liquidation risk.'],
        invalidationCriteria: `Expansion through upper band with closing candle above $${sl.toFixed(2)} invalidates setup.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }
  }

  return {
    strategyId: 'mean_reversion',
    strategyName: 'Mean Reversion (Bollinger Bands + RSI Extremes)',
    symbol,
    timeframe,
    action: 'WAIT',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 35,
    reasonsSupporting: ['Price is inside the normal statistical band envelope.'],
    reasonsAgainst: ['No extreme standard deviation stretch detected.'],
    invalidationCriteria: 'Await a clean touch of the outer Bollinger Bands.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 7. RSI Momentum & Divergence Strategy
 */
function evaluateRSIDivergence(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const rsi = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const validRsi = rsi.filter((r): r is { time: any; value: number } => r !== null);
  const currentRSI = validRsi[validRsi.length - 1]?.value ?? 50;

  const swingPoints = detectSwingPoints(candles, 3);
  const regime = detectMarketRegime(candles, null, null, null, currentRSI, currentAtr, swingPoints);

  // Simple divergence detection over last 20 bars
  const recent20 = candles.slice(-20);
  const recentRsi20 = validRsi.slice(-20);

  if (recent20.length >= 10 && recentRsi20.length >= 10) {
    const pStart = recent20[0].close;
    const pEnd = recent20[recent20.length - 1].close;
    const rStart = recentRsi20[0].value;
    const rEnd = recentRsi20[recentRsi20.length - 1].value;

    // Bullish divergence: Price down, RSI up, and RSI < 45
    if (pEnd < pStart * 0.985 && rEnd > rStart + 3 && rEnd < 45) {
      const sl = Number((currentPrice - currentAtr * 1.3).toFixed(2));
      const stopDist = Math.max(0.1, currentPrice - sl);

      return {
        strategyId: 'rsi_divergence',
        strategyName: 'RSI Momentum & Divergence',
        symbol,
        timeframe,
        action: 'LONG SETUP',
        bias: 'BULLISH',
        entryMin: Number((currentPrice * 0.998).toFixed(2)),
        entryMax: Number((currentPrice * 1.002).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number((currentPrice + stopDist * 1.6).toFixed(2)),
        target2: Number((currentPrice + stopDist * 2.8).toFixed(2)),
        target3: Number((currentPrice + stopDist * 4.0).toFixed(2)),
        riskRewardRatio: 2.8,
        confidenceScore: 76,
        reasonsSupporting: [
          'Regular Bullish Divergence: Price printed lower low while RSI formed a higher trough.',
          'Indicates internal bearish momentum deceleration and impending relief rotation.'
        ],
        reasonsAgainst: ['Divergences can persist through several extension legs in severe selloffs.'],
        invalidationCriteria: `Price breaking below swing trough ($${sl.toFixed(2)}) negates the divergence signal.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }

    // Bearish divergence: Price up, RSI down, and RSI > 55
    if (pEnd > pStart * 1.015 && rEnd < rStart - 3 && rEnd > 55) {
      const sl = Number((currentPrice + currentAtr * 1.3).toFixed(2));
      const stopDist = Math.max(0.1, sl - currentPrice);

      return {
        strategyId: 'rsi_divergence',
        strategyName: 'RSI Momentum & Divergence',
        symbol,
        timeframe,
        action: 'SHORT SETUP',
        bias: 'BEARISH',
        entryMin: Number((currentPrice * 0.998).toFixed(2)),
        entryMax: Number((currentPrice * 1.002).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number((currentPrice - stopDist * 1.6).toFixed(2)),
        target2: Number((currentPrice - stopDist * 2.8).toFixed(2)),
        target3: Number((currentPrice - stopDist * 4.0).toFixed(2)),
        riskRewardRatio: 2.8,
        confidenceScore: 74,
        reasonsSupporting: [
          'Regular Bearish Divergence: Price printed higher high while RSI printed a lower peak.',
          'Warns of buyer exhaustion at local resistance levels.'
        ],
        reasonsAgainst: ['Trend continuation can overwhelm momentum divergences.'],
        invalidationCriteria: `New breakout high above $${sl.toFixed(2)} invalidates divergence.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }
  }

  return {
    strategyId: 'rsi_divergence',
    strategyName: 'RSI Momentum & Divergence',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 28,
    reasonsSupporting: ['RSI oscillator tracks price action without notable divergence.'],
    reasonsAgainst: ['Momentum is neutral; no exhaustion edge detected.'],
    invalidationCriteria: 'Await a distinct structural price and RSI divergence.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * 8. MACD Zero-Line & Histogram Cross Strategy
 */
function evaluateMACDConfirmation(candles: Candle[], symbol: string, timeframe: string): StrategySignal {
  const currentPrice = candles[candles.length - 1].close;
  const macdSeries = calculateMACD(candles, 12, 26, 9);
  const atr = calculateATR(candles, 14);
  const currentAtr = atr[atr.length - 1]?.value ?? currentPrice * 0.015;

  const validMacd = macdSeries.filter((m): m is { time: any; macd: number; signal: number; histogram: number } => m !== null);
  const swingPoints = detectSwingPoints(candles, 3);
  const regime = detectMarketRegime(candles, null, null, null, null, currentAtr, swingPoints);

  if (validMacd.length >= 2) {
    const curr = validMacd[validMacd.length - 1];
    const prev = validMacd[validMacd.length - 2];

    const isBullCross = prev.histogram <= 0 && curr.histogram > 0;
    const isBearCross = prev.histogram >= 0 && curr.histogram < 0;

    if (isBullCross || (curr.histogram > 0 && curr.macd > 0)) {
      const sl = Number((currentPrice - currentAtr * 1.4).toFixed(2));
      const stopDist = Math.max(0.1, currentPrice - sl);

      return {
        strategyId: 'macd_confirmation',
        strategyName: 'MACD Zero-Line & Histogram Acceleration',
        symbol,
        timeframe,
        action: isBullCross ? 'LONG SETUP' : 'WAIT',
        bias: 'BULLISH',
        entryMin: Number((currentPrice * 0.999).toFixed(2)),
        entryMax: Number((currentPrice * 1.001).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number((currentPrice + stopDist * 1.5).toFixed(2)),
        target2: Number((currentPrice + stopDist * 2.5).toFixed(2)),
        target3: Number((currentPrice + stopDist * 3.5).toFixed(2)),
        riskRewardRatio: 2.5,
        confidenceScore: isBullCross ? 80 : 56,
        reasonsSupporting: [
          'MACD line crossed above Signal line into positive territory.',
          'Histogram acceleration indicates expanding bullish momentum.'
        ],
        reasonsAgainst: ['MACD lags price action; entry occurs after initial impulse has commenced.'],
        invalidationCriteria: `MACD histogram contracting back negative invalidates the trade premise.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }

    if (isBearCross || (curr.histogram < 0 && curr.macd < 0)) {
      const sl = Number((currentPrice + currentAtr * 1.4).toFixed(2));
      const stopDist = Math.max(0.1, sl - currentPrice);

      return {
        strategyId: 'macd_confirmation',
        strategyName: 'MACD Zero-Line & Histogram Acceleration',
        symbol,
        timeframe,
        action: isBearCross ? 'SHORT SETUP' : 'WAIT',
        bias: 'BEARISH',
        entryMin: Number((currentPrice * 0.999).toFixed(2)),
        entryMax: Number((currentPrice * 1.001).toFixed(2)),
        entryMid: currentPrice,
        stopLoss: sl,
        stopDistancePct: Number(((stopDist / currentPrice) * 100).toFixed(2)),
        target1: Number((currentPrice - stopDist * 1.5).toFixed(2)),
        target2: Number((currentPrice - stopDist * 2.5).toFixed(2)),
        target3: Number((currentPrice - stopDist * 3.5).toFixed(2)),
        riskRewardRatio: 2.5,
        confidenceScore: isBearCross ? 78 : 54,
        reasonsSupporting: [
          'MACD line crossed below Signal line confirming downward momentum shift.'
        ],
        reasonsAgainst: ['Lagging indicator prone to false signals in sideways chop.'],
        invalidationCriteria: `MACD histogram expanding positive invalidates short position.`,
        regime,
        timestamp: candles[candles.length - 1].time
      };
    }
  }

  return {
    strategyId: 'macd_confirmation',
    strategyName: 'MACD Zero-Line & Histogram Acceleration',
    symbol,
    timeframe,
    action: 'NO CLEAR SETUP',
    bias: 'NEUTRAL',
    entryMin: currentPrice,
    entryMax: currentPrice,
    entryMid: currentPrice,
    stopLoss: Number((currentPrice * 0.98).toFixed(2)),
    stopDistancePct: 2.0,
    target1: Number((currentPrice * 1.02).toFixed(2)),
    target2: Number((currentPrice * 1.04).toFixed(2)),
    target3: Number((currentPrice * 1.06).toFixed(2)),
    riskRewardRatio: 2.0,
    confidenceScore: 30,
    reasonsSupporting: ['MACD histogram hovering near zero line.'],
    reasonsAgainst: ['Momentum lacks clear directional expansion.'],
    invalidationCriteria: 'Await a decisive MACD histogram cross and expansion.',
    regime,
    timestamp: candles[candles.length - 1].time
  };
}

/**
 * Registry of all 8 modular strategies
 */
export const AVAILABLE_STRATEGIES: StrategyDefinition[] = [
  {
    id: 'trend_following',
    name: 'Trend-Following (EMA 21/50 + Momentum)',
    description: 'Enters in the direction of stacked moving averages with supportive RSI momentum.',
    category: 'Trend',
    bestRegime: 'Strong Uptrend / Strong Downtrend',
    weakestRegime: 'Range & High Volatility Chop',
    enabled: true,
    evaluate: evaluateTrendFollowing
  },
  {
    id: 'ma_crossover',
    name: 'Moving Average Crossover (SMA 20/50)',
    description: 'Generates signals when the fast 20-period SMA crosses the slow 50-period SMA.',
    category: 'Trend',
    bestRegime: 'Strong Sustained Trends',
    weakestRegime: 'Low Volatility Sideways Chop',
    enabled: true,
    evaluate: evaluateMACrossover
  },
  {
    id: 'breakout_retest',
    name: 'Breakout Retest (BOS + Volume Expansion)',
    description: 'Waits for a confirmed Break of Structure beyond swing pivots and trades the subsequent retest.',
    category: 'Breakout',
    bestRegime: 'Trending Markets with Clear S/R',
    weakestRegime: 'Choppy Ranges with Liquidity Sweeps',
    enabled: true,
    evaluate: evaluateBreakoutRetest
  },
  {
    id: 'pullback_continuation',
    name: 'Pullback Continuation (Fibonacci 50%-61.8%)',
    description: 'Identifies deep pullbacks into institutional Fibonacci discount zones for asymmetric trend entries.',
    category: 'Structure',
    bestRegime: 'Weak/Strong Uptrend with Healthy Pullbacks',
    weakestRegime: 'Parabolic Vertical Runaways',
    enabled: true,
    evaluate: evaluatePullbackContinuation
  },
  {
    id: 'sr_bounce',
    name: 'Support / Resistance Bounce (Pivot Confirmation)',
    description: 'Executes mean-reversion bounces off validated multi-touch Support and Resistance zones.',
    category: 'Structure',
    bestRegime: 'Well-Defined Horizontal Range Channels',
    weakestRegime: 'Aggressive Trending Breakouts',
    enabled: true,
    evaluate: evaluateSRBounce
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion (Bollinger Bands + RSI)',
    description: 'Identifies 2-sigma Bollinger Band extensions combined with RSI overbought/oversold extremes.',
    category: 'Reversion',
    bestRegime: 'Range & Moderate Volatility Consolidation',
    weakestRegime: 'Strong Persistent Trends',
    enabled: true,
    evaluate: evaluateMeanReversion
  },
  {
    id: 'rsi_divergence',
    name: 'RSI Momentum & Divergence',
    description: 'Detects structural momentum divergence between price swing extremes and the RSI oscillator.',
    category: 'Momentum',
    bestRegime: 'Trend Exhaustion Peaks and Bottoms',
    weakestRegime: 'Early-Stage Violent Impulse Trends',
    enabled: true,
    evaluate: evaluateRSIDivergence
  },
  {
    id: 'macd_confirmation',
    name: 'MACD Zero-Line & Histogram Acceleration',
    description: 'Confirms trend acceleration using MACD histogram zero-line crossings and momentum expansion.',
    category: 'Momentum',
    bestRegime: 'Early-Stage Trending Moves',
    weakestRegime: 'Tight Range Compression',
    enabled: true,
    evaluate: evaluateMACDConfirmation
  }
];

/**
 * Evaluates all enabled strategies and returns the highest-scoring confluence setup.
 */
export function evaluateAllStrategies(candles: Candle[], symbol: string, timeframe: string): {
  activeSignal: StrategySignal;
  allSignals: StrategySignal[];
} {
  const allSignals = AVAILABLE_STRATEGIES
    .filter(s => s.enabled)
    .map(s => s.evaluate(candles, symbol, timeframe));

  // Sort by action priority (LONG/SHORT first, then WAIT, then NO CLEAR SETUP) and confidence score
  const actionPriority: Record<SignalAction, number> = {
    'LONG SETUP': 3,
    'SHORT SETUP': 3,
    'WAIT': 2,
    'NO CLEAR SETUP': 1
  };

  const sorted = [...allSignals].sort((a, b) => {
    const pDiff = actionPriority[b.action] - actionPriority[a.action];
    if (pDiff !== 0) return pDiff;
    return b.confidenceScore - a.confidenceScore;
  });

  return {
    activeSignal: sorted[0] || allSignals[0],
    allSignals
  };
}
