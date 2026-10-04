/**
 * marketStructure.ts
 * Market Structure, Dynamic Support/Resistance & Regime Detection Engine
 * 
 * Provides:
 * - Algorithmic fractal swing high/low identification
 * - HH, HL, LH, LL classification
 * - Break of Structure (BOS) requiring confirmed candle close
 * - Change of Character (CHoCH) trend reversal shift
 * - Support and Resistance cluster zones with touch counts
 * - Market Regime classification (8 regimes)
 */

import { Candle } from './indicators';

export type PivotType = 'HIGH' | 'LOW';
export type PivotClassification = 'HH' | 'HL' | 'LH' | 'LL' | 'UNCONFIRMED';

export interface SwingPoint {
  index: number;
  time: number | string;
  price: number;
  type: PivotType;
  classification: PivotClassification;
}

export type StructuralEventType = 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH';

export interface StructuralEvent {
  type: StructuralEventType;
  time: number | string;
  brokenLevel: number;
  triggerPrice: number;
  barIndex: number;
  direction: 'BULLISH' | 'BEARISH';
  description: string;
}

export interface SRZone {
  type: 'SUPPORT' | 'RESISTANCE';
  lower: number;
  upper: number;
  mid: number;
  touchCount: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
}

export type MarketRegimeType = 
  | 'Strong Uptrend'
  | 'Weak Uptrend'
  | 'Strong Downtrend'
  | 'Weak Downtrend'
  | 'Range'
  | 'High Volatility'
  | 'Low Volatility'
  | 'Unclear';

export interface MarketRegime {
  regime: MarketRegimeType;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: number; // 0 - 100
  adxEstimated: number;
  description: string;
  tradeAllowed: boolean;
  warningNote?: string;
}

/**
 * Detects swing highs and swing lows using a symmetric window (N bars left & right)
 */
export function detectSwingPoints(candles: Candle[], window: number = 3): SwingPoint[] {
  const points: SwingPoint[] = [];
  if (candles.length < window * 2 + 1) return points;

  for (let i = window; i < candles.length - window; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    // Check if candle is local high
    let isSwingHigh = true;
    for (let j = 1; j <= window; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      points.push({
        index: i,
        time: candles[i].time,
        price: currentHigh,
        type: 'HIGH',
        classification: 'UNCONFIRMED'
      });
    }

    // Check if candle is local low
    let isSwingLow = true;
    for (let j = 1; j <= window; j++) {
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      points.push({
        index: i,
        time: candles[i].time,
        price: currentLow,
        type: 'LOW',
        classification: 'UNCONFIRMED'
      });
    }
  }

  // Sort by bar index
  points.sort((a, b) => a.index - b.index);

  // Classify points: HH, HL, LH, LL
  let prevHigh: SwingPoint | null = null;
  let prevLow: SwingPoint | null = null;

  for (const pt of points) {
    if (pt.type === 'HIGH') {
      if (prevHigh) {
        pt.classification = pt.price > prevHigh.price ? 'HH' : 'LH';
      } else {
        pt.classification = 'HH';
      }
      prevHigh = pt;
    } else {
      if (prevLow) {
        pt.classification = pt.price > prevLow.price ? 'HL' : 'LL';
      } else {
        pt.classification = 'LL';
      }
      prevLow = pt;
    }
  }

  return points;
}

/**
 * Detects Break of Structure (BOS) and Change of Character (CHoCH)
 * STRICT REQUIREMENT: Candle must close beyond the swing point (no wicks alone).
 */
export function detectStructuralBreaks(candles: Candle[], swingPoints: SwingPoint[]): StructuralEvent[] {
  const events: StructuralEvent[] = [];
  if (candles.length < 10 || swingPoints.length < 2) return events;

  const highs = swingPoints.filter(p => p.type === 'HIGH');
  const lows = swingPoints.filter(p => p.type === 'LOW');

  let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  // Initial trend estimation based on first classified points
  const recentHighs = highs.slice(-4);
  const recentLows = lows.slice(-4);

  if (recentHighs.length >= 2 && recentLows.length >= 2) {
    const isBull = recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price &&
                   recentLows[recentLows.length - 1].price > recentLows[recentLows.length - 2].price;
    const isBear = recentHighs[recentHighs.length - 1].price < recentHighs[recentHighs.length - 2].price &&
                   recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price;
    currentTrend = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL';
  }

  // Iterate forward looking for confirmed closes
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    
    // Find most recent prior confirmed swing high before bar i
    const priorHigh = highs.filter(h => h.index < i - 1).slice(-1)[0];
    const priorLow = lows.filter(l => l.index < i - 1).slice(-1)[0];

    // Bullish break: Candle closes strictly above prior swing high
    if (priorHigh && c.close > priorHigh.price && candles[i - 1].close <= priorHigh.price) {
      const isChoch = currentTrend === 'BEARISH';
      const eventType: StructuralEventType = isChoch ? 'CHOCH_BULLISH' : 'BOS_BULLISH';
      currentTrend = 'BULLISH';

      events.push({
        type: eventType,
        time: c.time,
        brokenLevel: priorHigh.price,
        triggerPrice: c.close,
        barIndex: i,
        direction: 'BULLISH',
        description: isChoch
          ? `Change of Character (Bullish): Confirmed candle close above previous Lower High at $${priorHigh.price.toLocaleString()} signifies structural trend reversal.`
          : `Break of Structure (Bullish): Confirmed candle close above prior swing high at $${priorHigh.price.toLocaleString()} confirms upward trend continuation.`
      });
    }

    // Bearish break: Candle closes strictly below prior swing low
    if (priorLow && c.close < priorLow.price && candles[i - 1].close >= priorLow.price) {
      const isChoch = currentTrend === 'BULLISH';
      const eventType: StructuralEventType = isChoch ? 'CHOCH_BEARISH' : 'BOS_BEARISH';
      currentTrend = 'BEARISH';

      events.push({
        type: eventType,
        time: c.time,
        brokenLevel: priorLow.price,
        triggerPrice: c.close,
        barIndex: i,
        direction: 'BEARISH',
        description: isChoch
          ? `Change of Character (Bearish): Confirmed candle close below previous Higher Low at $${priorLow.price.toLocaleString()} signifies structural trend reversal.`
          : `Break of Structure (Bearish): Confirmed candle close below prior swing low at $${priorLow.price.toLocaleString()} confirms downward trend continuation.`
      });
    }
  }

  return events;
}

/**
 * Finds Support and Resistance zones by clustering historical swing points
 */
export function findSupportResistanceZones(candles: Candle[], swingPoints: SwingPoint[]): { support: SRZone[]; resistance: SRZone[] } {
  if (candles.length === 0) return { support: [], resistance: [] };
  const currentPrice = candles[candles.length - 1].close;

  const highs = swingPoints.filter(p => p.type === 'HIGH').map(p => p.price);
  const lows = swingPoints.filter(p => p.type === 'LOW').map(p => p.price);

  function clusterLevels(prices: number[], isSupport: boolean): SRZone[] {
    if (prices.length === 0) return [];
    const sorted = [...prices].sort((a, b) => a - b);
    const zones: SRZone[] = [];
    const tolerance = currentPrice * 0.006; // 0.6% clustering tolerance

    let currentCluster: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - currentCluster[currentCluster.length - 1] <= tolerance) {
        currentCluster.push(sorted[i]);
      } else {
        const mid = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
        const count = currentCluster.length;
        zones.push({
          type: isSupport ? 'SUPPORT' : 'RESISTANCE',
          lower: Math.min(...currentCluster) * 0.998,
          upper: Math.max(...currentCluster) * 1.002,
          mid,
          touchCount: count,
          strength: count >= 3 ? 'STRONG' : count === 2 ? 'MODERATE' : 'WEAK'
        });
        currentCluster = [sorted[i]];
      }
    }

    if (currentCluster.length > 0) {
      const mid = currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length;
      const count = currentCluster.length;
      zones.push({
        type: isSupport ? 'SUPPORT' : 'RESISTANCE',
        lower: Math.min(...currentCluster) * 0.998,
        upper: Math.max(...currentCluster) * 1.002,
        mid,
        touchCount: count,
        strength: count >= 3 ? 'STRONG' : count === 2 ? 'MODERATE' : 'WEAK'
      });
    }

    return zones;
  }

  const allSupport = clusterLevels(lows.filter(p => p <= currentPrice * 1.01), true);
  const allResistance = clusterLevels(highs.filter(p => p >= currentPrice * 0.99), false);

  // Sort support descending (closest to current price first)
  const support = allSupport.sort((a, b) => b.mid - a.mid).slice(0, 3);
  // Sort resistance ascending (closest to current price first)
  const resistance = allResistance.sort((a, b) => a.mid - b.mid).slice(0, 3);

  // Fallback if no swing points yet
  if (support.length === 0) {
    support.push({
      type: 'SUPPORT',
      lower: currentPrice * 0.97,
      upper: currentPrice * 0.975,
      mid: currentPrice * 0.9725,
      touchCount: 2,
      strength: 'MODERATE'
    });
  }
  if (resistance.length === 0) {
    resistance.push({
      type: 'RESISTANCE',
      lower: currentPrice * 1.025,
      upper: currentPrice * 1.03,
      mid: currentPrice * 1.0275,
      touchCount: 2,
      strength: 'MODERATE'
    });
  }

  return { support, resistance };
}

/**
 * Detects Market Regime according to the 8 required categories
 */
export function detectMarketRegime(
  candles: Candle[],
  ema21: number | null,
  ema50: number | null,
  ema200: number | null,
  rsi: number | null,
  atr: number | null,
  swingPoints: SwingPoint[]
): MarketRegime {
  if (candles.length < 20) {
    return {
      regime: 'Unclear',
      bias: 'NEUTRAL',
      trendStrength: 20,
      adxEstimated: 15,
      description: 'Insufficient candlestick data to establish a statistically valid market regime.',
      tradeAllowed: false,
      warningNote: 'System recommends waiting until more historical bars accumulate.'
    };
  }

  const currentClose = candles[candles.length - 1].close;
  const recentHighs = swingPoints.filter(p => p.type === 'HIGH').slice(-3);
  const recentLows = swingPoints.filter(p => p.type === 'LOW').slice(-3);

  const priceOverEma21 = ema21 ? currentClose > ema21 : false;
  const priceOverEma50 = ema50 ? currentClose > ema50 : false;
  const priceOverEma200 = ema200 ? currentClose > ema200 : true;
  const emaBullishStack = ema21 && ema50 ? ema21 > ema50 : false;
  const emaBearishStack = ema21 && ema50 ? ema21 < ema50 : false;

  // Measure volatility ratio (ATR as percentage of price)
  const atrPct = (atr && currentClose > 0) ? (atr / currentClose) * 100 : 1.5;
  const isHighVol = atrPct > 3.2;
  const isLowVol = atrPct < 0.6;

  // Swing structure trend
  const hasHigherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price > recentHighs[recentHighs.length - 2].price;
  const hasHigherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1].price > recentLows[recentLows.length - 2].price;
  const hasLowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1].price < recentHighs[recentHighs.length - 2].price;
  const hasLowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1].price < recentLows[recentLows.length - 2].price;

  // 1. High Volatility State
  if (isHighVol) {
    return {
      regime: 'High Volatility',
      bias: emaBullishStack ? 'BULLISH' : emaBearishStack ? 'BEARISH' : 'NEUTRAL',
      trendStrength: 55,
      adxEstimated: 35,
      description: `Elevated volatility conditions with ATR expansion (${atrPct.toFixed(2)}% of asset price). Wide price swings increase risk of stop slippage.`,
      tradeAllowed: true,
      warningNote: 'Reduce position size and widen stop buffers to accommodate abnormal volatility.'
    };
  }

  // 2. Low Volatility State
  if (isLowVol) {
    return {
      regime: 'Low Volatility',
      bias: 'NEUTRAL',
      trendStrength: 15,
      adxEstimated: 12,
      description: `Contracting volatility (${atrPct.toFixed(2)}% ATR). Range compression often precedes an aggressive directional expansion breakout.`,
      tradeAllowed: false,
      warningNote: 'Avoid initiating trend positions inside low-volatility chop; await confirmed breakout.'
    };
  }

  // 3. Strong Uptrend
  if (priceOverEma21 && priceOverEma50 && emaBullishStack && (hasHigherHighs || hasHigherLows) && (rsi ? rsi > 52 : true)) {
    return {
      regime: 'Strong Uptrend',
      bias: 'BULLISH',
      trendStrength: 85,
      adxEstimated: 38,
      description: 'Persistent buyer dominance with stacked EMAs, clean structural higher highs, and strong momentum.',
      tradeAllowed: true
    };
  }

  // 4. Weak Uptrend
  if ((priceOverEma50 || emaBullishStack) && (rsi ? rsi > 48 : true)) {
    return {
      regime: 'Weak Uptrend',
      bias: 'BULLISH',
      trendStrength: 60,
      adxEstimated: 22,
      description: 'Moderate upward bias with minor pullbacks or structural indecision. Favors dip-buying at major confluence support.',
      tradeAllowed: true
    };
  }

  // 5. Strong Downtrend
  if (!priceOverEma21 && !priceOverEma50 && emaBearishStack && (hasLowerHighs || hasLowerLows) && (rsi ? rsi < 48 : true)) {
    return {
      regime: 'Strong Downtrend',
      bias: 'BEARISH',
      trendStrength: 85,
      adxEstimated: 38,
      description: 'Persistent seller dominance with declining EMAs, confirmed lower lows, and suppressed momentum.',
      tradeAllowed: true
    };
  }

  // 6. Weak Downtrend
  if ((!priceOverEma50 || emaBearishStack) && (rsi ? rsi < 52 : true)) {
    return {
      regime: 'Weak Downtrend',
      bias: 'BEARISH',
      trendStrength: 60,
      adxEstimated: 22,
      description: 'Moderate downward bias with intermittent counter-trend rallies. Favors selling into resistance retests.',
      tradeAllowed: true
    };
  }

  // 7. Range
  if (ema21 && ema50 && Math.abs(ema21 - ema50) / currentClose < 0.004) {
    return {
      regime: 'Range',
      bias: 'NEUTRAL',
      trendStrength: 25,
      adxEstimated: 16,
      description: 'Horizontal equilibrium between buyers and sellers. Moving averages are intertwined and flat.',
      tradeAllowed: true,
      warningNote: 'Do not use trend-following setups inside a range; employ mean-reversion with strict boundaries.'
    };
  }

  // 8. Unclear
  return {
    regime: 'Unclear',
    bias: 'NEUTRAL',
    trendStrength: 30,
    adxEstimated: 18,
    description: 'Mixed technical signals. Moving averages conflict with recent candle wicks. No statistical directional edge.',
    tradeAllowed: false,
    warningNote: 'NO FORCED TRADES: Capital preservation rule active. Await clear structural resolution.'
  };
}
