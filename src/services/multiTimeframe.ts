/**
 * multiTimeframe.ts
 * Multi-Timeframe (MTF) Synthesis & Confluence Engine
 * 
 * Evaluates Higher Timeframe (Macro Context), Middle Timeframe (Structure Bias),
 * and Lower Timeframe (Trigger Execution) simultaneously.
 * Detects whether timeframes are in agreement or conflict.
 */

import { Candle, calculateEMA, calculateRSI } from './indicators';
import { detectMarketRegime, detectSwingPoints, MarketRegime } from './marketStructure';

export interface TimeframeContext {
  timeframe: string;
  role: 'Higher Timeframe (Macro Context)' | 'Middle Timeframe (Structure Bias)' | 'Lower Timeframe (Entry Trigger)';
  regime: MarketRegime;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  ema21: number | null;
  ema50: number | null;
  rsi: number | null;
  keyObservation: string;
}

export interface MTFAnalysisResult {
  htf: TimeframeContext;
  mtf: TimeframeContext;
  ltf: TimeframeContext;
  overallAlignment: 'CONFLUENT_BULLISH' | 'CONFLUENT_BEARISH' | 'CONFLICTING_MIXED';
  alignmentScore: number; // 0 - 100
  summary: string;
  actionableGuidance: string;
}

/**
 * Synthesizes multi-timeframe perspective from candle data across 3 tiers.
 */
export function analyzeMultiTimeframe(
  htfCandles: Candle[],
  mtfCandles: Candle[],
  ltfCandles: Candle[],
  htfLabel: string = '1D',
  mtfLabel: string = '4h',
  ltfLabel: string = '15m'
): MTFAnalysisResult {
  function evaluateTier(candles: Candle[], tf: string, role: TimeframeContext['role']): TimeframeContext {
    if (candles.length < 20) {
      return {
        timeframe: tf,
        role,
        regime: {
          regime: 'Unclear',
          bias: 'NEUTRAL',
          trendStrength: 20,
          adxEstimated: 15,
          description: 'Insufficient candles for tier evaluation.',
          tradeAllowed: false
        },
        trend: 'NEUTRAL',
        ema21: null,
        ema50: null,
        rsi: null,
        keyObservation: 'Awaiting sufficient candlestick history.'
      };
    }

    const ema21Series = calculateEMA(candles, 21);
    const ema50Series = calculateEMA(candles, 50);
    const rsiSeries = calculateRSI(candles, 14);

    const ema21 = ema21Series[ema21Series.length - 1]?.value ?? null;
    const ema50 = ema50Series[ema50Series.length - 1]?.value ?? null;
    const rsi = rsiSeries[rsiSeries.length - 1]?.value ?? null;
    const swingPoints = detectSwingPoints(candles, 2);

    const regime = detectMarketRegime(candles, ema21, ema50, null, rsi, null, swingPoints);
    const close = candles[candles.length - 1].close;

    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (ema21 && ema50) {
      if (close > ema21 && ema21 > ema50) trend = 'BULLISH';
      else if (close < ema21 && ema21 < ema50) trend = 'BEARISH';
    }

    let observation = '';
    if (role.startsWith('Higher')) {
      observation = trend === 'BULLISH'
        ? `Macro bull trend intact above ${tf} EMA 50. Strong institutional tailwinds.`
        : trend === 'BEARISH'
        ? `Macro bear trend dominance below ${tf} EMA 50. Overhead institutional supply.`
        : `Consolidating macro range without clear directional impulse on ${tf}.`;
    } else if (role.startsWith('Middle')) {
      observation = trend === 'BULLISH'
        ? `Intermediate higher lows confirmed on ${tf}. Buying pullbacks favors trend continuation.`
        : trend === 'BEARISH'
        ? `Intermediate lower highs confirmed on ${tf}. Selling rallies aligns with structural flow.`
        : `Sideways equilibrium channel on ${tf}.`;
    } else {
      observation = trend === 'BULLISH'
        ? `Lower timeframe trigger firing bullish expansion on ${tf}.`
        : trend === 'BEARISH'
        ? `Lower timeframe breakdown occurring on ${tf}.`
        : `Indecisive lower timeframe chop; await breakout catalyst.`;
    }

    return {
      timeframe: tf,
      role,
      regime,
      trend,
      ema21,
      ema50,
      rsi,
      keyObservation: observation
    };
  }

  const htf = evaluateTier(htfCandles, htfLabel, 'Higher Timeframe (Macro Context)');
  const mtf = evaluateTier(mtfCandles, mtfLabel, 'Middle Timeframe (Structure Bias)');
  const ltf = evaluateTier(ltfCandles, ltfLabel, 'Lower Timeframe (Entry Trigger)');

  // Determine alignment
  let overallAlignment: MTFAnalysisResult['overallAlignment'] = 'CONFLICTING_MIXED';
  let score = 50;

  if (htf.trend === 'BULLISH' && mtf.trend === 'BULLISH' && ltf.trend === 'BULLISH') {
    overallAlignment = 'CONFLUENT_BULLISH';
    score = 92;
  } else if (htf.trend === 'BEARISH' && mtf.trend === 'BEARISH' && ltf.trend === 'BEARISH') {
    overallAlignment = 'CONFLUENT_BEARISH';
    score = 92;
  } else if (htf.trend === 'BULLISH' && mtf.trend === 'BULLISH' && ltf.trend === 'NEUTRAL') {
    overallAlignment = 'CONFLUENT_BULLISH';
    score = 78;
  } else if (htf.trend === 'BEARISH' && mtf.trend === 'BEARISH' && ltf.trend === 'NEUTRAL') {
    overallAlignment = 'CONFLUENT_BEARISH';
    score = 78;
  } else {
    overallAlignment = 'CONFLICTING_MIXED';
    score = 45;
  }

  let summary = '';
  let actionableGuidance = '';

  if (overallAlignment === 'CONFLUENT_BULLISH') {
    summary = `Full Multi-Timeframe Bullish Alignment (${htfLabel} + ${mtfLabel} + ${ltfLabel}). Macro direction, intermediate structure, and short-term momentum are all pointing in the same direction.`;
    actionableGuidance = 'Ideal conditions for long continuation setups. Focus on pullbacks into lower timeframe support zones.';
  } else if (overallAlignment === 'CONFLUENT_BEARISH') {
    summary = `Full Multi-Timeframe Bearish Alignment (${htfLabel} + ${mtfLabel} + ${ltfLabel}). Downward momentum confirmed across macro, intermediate, and execution timeframes.`;
    actionableGuidance = 'Ideal conditions for short trend-continuation setups. Focus on shorting relief rallies into resistance.';
  } else {
    summary = `Timeframe Conflict Detected: Higher timeframe (${htfLabel}: ${htf.trend}) does not agree with lower timeframe (${ltfLabel}: ${ltf.trend}). Mixed crosscurrents.`;
    actionableGuidance = 'Exercise patience or reduce position sizes. Trading against the higher timeframe carries significantly lower historical win rates.';
  }

  return {
    htf,
    mtf,
    ltf,
    overallAlignment,
    alignmentScore: score,
    summary,
    actionableGuidance
  };
}
