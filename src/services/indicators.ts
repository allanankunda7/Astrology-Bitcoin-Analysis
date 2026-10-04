/**
 * indicators.ts
 * Modular Technical Analysis Engine
 * 
 * Provides verified mathematical calculations for:
 * - SMA (Simple Moving Average)
 * - EMA (Exponential Moving Average)
 * - RSI (Relative Strength Index) with divergence detection
 * - MACD (Moving Average Convergence Divergence) with signal and histogram
 * - ATR (Average True Range)
 * - Bollinger Bands with %B and Bandwidth
 * - Volume Analysis (Volume SMA, Volume Spikes, RVOL)
 * 
 * All functions operate strictly on confirmed candlestick data without future lookahead.
 */

export interface Candle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorExplanation {
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume' | 'Structure';
  purpose: string;
  interpretation: string;
  limitations: string;
}

export const INDICATOR_EXPLANATIONS: Record<string, IndicatorExplanation> = {
  ema: {
    name: 'Exponential Moving Average (EMA)',
    category: 'Trend',
    purpose: 'Smooths price action while giving higher mathematical weighting to recent price bars.',
    interpretation: 'Price above EMA indicates bullish momentum; price below indicates bearish control. EMA 21/50 alignment gauges trend velocity; EMA 200 serves as institutional macro benchmark.',
    limitations: 'Lags during violent market turning points and generates choppy whipsaws during consolidation ranges.'
  },
  sma: {
    name: 'Simple Moving Average (SMA)',
    category: 'Trend',
    purpose: 'Calculates the unweighted arithmetic mean of closing prices over N periods.',
    interpretation: 'Provides neutral baseline support/resistance. The 50 SMA and 200 SMA are tracked universally by institutional funds for macro golden/death cross setups.',
    limitations: 'Equal weighting treats old price bars with equal significance as immediate price changes.'
  },
  rsi: {
    name: 'Relative Strength Index (RSI)',
    category: 'Momentum',
    purpose: 'Measures the speed and change of price movements on an oscillator scale from 0 to 100.',
    interpretation: 'RSI > 70 indicates overbought conditions; RSI < 30 indicates oversold conditions. Divergence between price swing highs/lows and RSI peaks often precedes trend exhaustion.',
    limitations: 'Strong sustained trends can keep RSI pinned in overbought (>70) or oversold (<30) territory for extended durations.'
  },
  macd: {
    name: 'Moving Average Convergence Divergence (MACD)',
    category: 'Momentum',
    purpose: 'Reveals shifts in the strength, direction, momentum, and duration of a trend.',
    interpretation: 'MACD line crossing above Signal line indicates accelerating upward momentum; histogram expansion confirms impulsive price legs.',
    limitations: 'Inherits moving average lag and can generate frequent false crossovers in range-bound markets.'
  },
  atr: {
    name: 'Average True Range (ATR)',
    category: 'Volatility',
    purpose: 'Quantifies market volatility by decomposing the entire range of an asset price over period N.',
    interpretation: 'Higher ATR signifies heightened volatility and wider price expansions. Essential for dynamic volatility-based stop-loss buffers and position sizing.',
    limitations: 'Does not provide directional bias—only the magnitude of expected price volatility.'
  },
  bollinger: {
    name: 'Bollinger Bands (BB)',
    category: 'Volatility',
    purpose: 'Encloses price action within a statistical envelope (typically 20 SMA ± 2 standard deviations).',
    interpretation: 'Band squeezes precede violent volatility expansion breakouts. Wicks touching outer bands test statistical mean-reversion extremes.',
    limitations: 'Walking the bands occurs during strong trends where price hugs outer bands continuously without reverting.'
  },
  volume: {
    name: 'Volume & Relative Volume (RVOL)',
    category: 'Volume',
    purpose: 'Measures market participation, liquidity depth, and conviction behind price movements.',
    interpretation: 'Breakouts accompanied by volume > 1.5x of the 20 Volume SMA indicate genuine institutional participation rather than retail liquidity traps.',
    limitations: 'Volume data can vary across decentralized crypto exchanges and OTC dark pools.'
  }
};

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): Array<{ time: number | string; value: number } | null> {
  const result: Array<{ time: number | string; value: number } | null> = [];
  if (!candles || candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push({ time: candles[i].time, value: sum / period });
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): Array<{ time: number | string; value: number } | null> {
  const result: Array<{ time: number | string; value: number } | null> = [];
  if (!candles || candles.length < period) return result;

  const k = 2 / (period + 1);
  let ema: number | null = null;

  // First EMA value is SMA of first 'period' elements
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += candles[i].close;
    result.push(null);
  }
  ema = initialSum / period;
  result[period - 1] = { time: candles[period - 1].time, value: ema };

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema! * (1 - k);
    result.push({ time: candles[i].time, value: ema });
  }

  return result;
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's smoothing technique
 */
export function calculateRSI(candles: Candle[], period: number = 14): Array<{ time: number | string; value: number } | null> {
  const result: Array<{ time: number | string; value: number } | null> = [];
  if (!candles || candles.length <= period) return result;

  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  result.push(null); // bar 0

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const ch = changes[i];
    if (ch >= 0) avgGain += ch;
    else avgLoss += Math.abs(ch);
    result.push(null);
  }

  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  result[period] = { time: candles[period].time, value: rsi };

  for (let i = period; i < changes.length; i++) {
    const ch = changes[i];
    const gain = ch >= 0 ? ch : 0;
    const loss = ch < 0 ? Math.abs(ch) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    result.push({ time: candles[i + 1].time, value: rsi });
  }

  return result;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export interface MACDResult {
  time: number | string;
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Array<MACDResult | null> {
  const result: Array<MACDResult | null> = [];
  if (!candles || candles.length < slowPeriod + signalPeriod) return result;

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  const macdLine: Array<{ time: number | string; value: number } | null> = [];
  for (let i = 0; i < candles.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      macdLine.push({ time: candles[i].time, value: f.value - s.value });
    } else {
      macdLine.push(null);
    }
  }

  // Calculate signal line (EMA of MACD line)
  const validMacdValues: Candle[] = [];
  const offsetIndexMap: number[] = [];

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      validMacdValues.push({ time: macdLine[i]!.time, close: macdLine[i]!.value, high: macdLine[i]!.value, low: macdLine[i]!.value, open: macdLine[i]!.value });
      offsetIndexMap.push(i);
    }
  }

  const signalEMA = calculateEMA(validMacdValues, signalPeriod);

  for (let i = 0; i < candles.length; i++) {
    result.push(null);
  }

  for (let j = 0; j < validMacdValues.length; j++) {
    const origIdx = offsetIndexMap[j];
    const sig = signalEMA[j];
    const m = validMacdValues[j].close;
    if (sig !== null) {
      result[origIdx] = {
        time: candles[origIdx].time,
        macd: m,
        signal: sig.value,
        histogram: m - sig.value
      };
    }
  }

  return result;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): Array<{ time: number | string; value: number } | null> {
  const result: Array<{ time: number | string; value: number } | null> = [];
  if (!candles || candles.length <= period) return result;

  const trs: number[] = [];
  trs.push(candles[0].high - candles[0].low);
  result.push(null);

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i - 1].close);
    const lpc = Math.abs(candles[i].low - candles[i - 1].close);
    trs.push(Math.max(hl, hpc, lpc));
  }

  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trs[i];
    if (i < period - 1) result.push(null);
  }
  atr /= period;
  result.push({ time: candles[period].time, value: atr });

  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push({ time: candles[i].time, value: atr });
  }

  return result;
}

/**
 * Calculates Bollinger Bands (Upper, Middle, Lower, %B, Bandwidth)
 */
export interface BollingerBandsResult {
  time: number | string;
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2.0
): Array<BollingerBandsResult | null> {
  const result: Array<BollingerBandsResult | null> = [];
  if (!candles || candles.length < period) return result;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const middle = sum / period;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - middle, 2);
    }
    const standardDeviation = Math.sqrt(varianceSum / period);

    const upper = middle + standardDeviation * stdDevMultiplier;
    const lower = middle - standardDeviation * stdDevMultiplier;
    const bandwidth = middle === 0 ? 0 : ((upper - lower) / middle) * 100;
    const percentB = upper === lower ? 0.5 : (candles[i].close - lower) / (upper - lower);

    result.push({
      time: candles[i].time,
      middle,
      upper,
      lower,
      bandwidth,
      percentB
    });
  }

  return result;
}

/**
 * Calculates Volume Analysis (Volume SMA, Volume Spike detection, RVOL)
 */
export interface VolumeAnalysisResult {
  volume: number;
  volumeSma: number;
  rvol: number; // Relative Volume
  isSpike: boolean;
}

export function calculateVolumeAnalysis(candles: Candle[], period: number = 20): VolumeAnalysisResult {
  if (!candles || candles.length === 0) {
    return { volume: 0, volumeSma: 0, rvol: 1.0, isSpike: false };
  }

  const lastCandle = candles[candles.length - 1];
  const lastVol = lastCandle.volume ?? 0;

  const lookback = Math.min(period, candles.length);
  let sum = 0;
  for (let i = candles.length - lookback; i < candles.length; i++) {
    sum += candles[i].volume ?? 0;
  }
  const avgVol = sum / lookback;
  const rvol = avgVol > 0 ? lastVol / avgVol : 1.0;

  return {
    volume: lastVol,
    volumeSma: avgVol,
    rvol: Number(rvol.toFixed(2)),
    isSpike: rvol >= 1.5
  };
}

/**
 * Detects Bullish or Bearish RSI Divergences between price swings and RSI swings
 */
export interface RSIDivergence {
  type: 'REGULAR_BULLISH' | 'REGULAR_BEARISH' | 'NONE';
  description: string;
}

export function detectRSIDivergence(candles: Candle[], rsiValues: Array<{ time: any; value: number } | null>): RSIDivergence {
  if (candles.length < 30 || rsiValues.length < 30) {
    return { type: 'NONE', description: 'Insufficient bars for divergence analysis.' };
  }

  const validRsi = rsiValues.filter((r): r is { time: any; value: number } => r !== null);
  if (validRsi.length < 20) return { type: 'NONE', description: 'Insufficient RSI values.' };

  const recentCandles = candles.slice(-20);
  const recentRsi = validRsi.slice(-20);

  const price1 = recentCandles[0].close;
  const price2 = recentCandles[recentCandles.length - 1].close;
  const rsi1 = recentRsi[0].value;
  const rsi2 = recentRsi[recentRsi.length - 1].value;

  // Bullish Divergence: Lower Low in Price, Higher Low in RSI
  if (price2 < price1 * 0.985 && rsi2 > rsi1 + 3 && rsi2 < 45) {
    return {
      type: 'REGULAR_BULLISH',
      description: 'Bullish Divergence: Price printed a lower low while RSI formed a higher trough, indicating seller exhaustion.'
    };
  }

  // Bearish Divergence: Higher High in Price, Lower High in RSI
  if (price2 > price1 * 1.015 && rsi2 < rsi1 - 3 && rsi2 > 55) {
    return {
      type: 'REGULAR_BEARISH',
      description: 'Bearish Divergence: Price printed a higher high while RSI printed a lower peak, indicating momentum deceleration.'
    };
  }

  return { type: 'NONE', description: 'RSI momentum aligns with current price action.' };
}
