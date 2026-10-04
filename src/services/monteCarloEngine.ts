/**
 * src/services/monteCarloEngine.ts
 * Monte Carlo Trade Resampling & Drawdown Probability Simulator
 * 
 * Takes historical trade results from backtests or paper trading,
 * generates 500-1000 randomized permutations through bootstrap resampling with replacement,
 * and derives statistical confidence boundaries:
 * - 5th Percentile (Worst-Case equity trajectory)
 * - 25th Percentile (Conservative)
 * - 50th Percentile (Median expected trajectory)
 * - 75th Percentile (Optimistic)
 * - 95th Percentile (Best-Case trajectory)
 * - Maximum Drawdown Probability Distribution
 * - Ruin Probability & Return Distribution
 */

import { BacktestTrade } from './backtestingEngine';

export interface MonteCarloSimulationConfig {
  iterations: number;       // e.g. 500
  sampleSize: number;       // number of trades per simulation run (e.g. 50)
  startingCapital: number;  // e.g. 100,000
}

export interface MonteCarloTrajectoryPoint {
  tradeIndex: number;
  p5: number;   // 5th percentile (worst-case)
  p25: number;
  p50: number;  // median
  p75: number;
  p95: number;  // 95th percentile (best-case)
}

export interface DrawdownBucket {
  range: string;
  count: number;
  probabilityPct: number;
}

export interface MonteCarloReport {
  iterations: number;
  tradePoolCount: number;
  startingCapital: number;
  trajectories: MonteCarloTrajectoryPoint[];
  maxDrawdownDistribution: DrawdownBucket[];
  statistics: {
    medianFinalEquity: number;
    worstCaseFinalEquity: number;   // 5th percentile
    bestCaseFinalEquity: number;    // 95th percentile
    medianMaxDrawdownPercent: number;
    p95MaxDrawdownPercent: number;  // 95% confidence max DD ceiling
    probabilityOfProfitPercent: number;
    probabilityOfRuinPercent: number; // probability of equity dropping > 50%
  };
  disclaimer: string;
}

export function runMonteCarloSimulation(
  trades: Array<{ pnl: number; pnlPercent?: number }>,
  config: MonteCarloSimulationConfig = {
    iterations: 500,
    sampleSize: 50,
    startingCapital: 100000
  }
): MonteCarloReport {
  if (!trades || trades.length === 0) {
    throw new Error('Monte Carlo simulation requires at least 1 historical trade result.');
  }

  const pnlList = trades.map((t) => t.pnl);
  const { iterations, sampleSize, startingCapital } = config;

  // Matrix of equity curves: [iteration][tradeIndex]
  const allEquityCurves: number[][] = [];
  const allMaxDrawdowns: number[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    const curve: number[] = [startingCapital];
    let currentCapital = startingCapital;
    let peakCapital = startingCapital;
    let maxDdPct = 0;

    for (let t = 0; t < sampleSize; t++) {
      // Bootstrap resample with replacement
      const randomIndex = Math.floor(Math.random() * pnlList.length);
      const tradePnl = pnlList[randomIndex];

      currentCapital += tradePnl;
      if (currentCapital < 0) currentCapital = 0; // cannot fall below zero

      if (currentCapital > peakCapital) {
        peakCapital = currentCapital;
      }
      if (peakCapital > 0) {
        const dd = ((peakCapital - currentCapital) / peakCapital) * 100;
        if (dd > maxDdPct) maxDdPct = dd;
      }

      curve.push(Number(currentCapital.toFixed(2)));
    }

    allEquityCurves.push(curve);
    allMaxDrawdowns.push(Number(maxDdPct.toFixed(2)));
  }

  // Calculate percentiles at each trade step (0 to sampleSize)
  const trajectories: MonteCarloTrajectoryPoint[] = [];

  for (let step = 0; step <= sampleSize; step++) {
    const valuesAtStep = allEquityCurves.map((curve) => curve[step]).sort((a, b) => a - b);

    const p5Index = Math.floor(valuesAtStep.length * 0.05);
    const p25Index = Math.floor(valuesAtStep.length * 0.25);
    const p50Index = Math.floor(valuesAtStep.length * 0.50);
    const p75Index = Math.floor(valuesAtStep.length * 0.75);
    const p95Index = Math.floor(valuesAtStep.length * 0.95);

    trajectories.push({
      tradeIndex: step,
      p5: valuesAtStep[p5Index],
      p25: valuesAtStep[p25Index],
      p50: valuesAtStep[p50Index],
      p75: valuesAtStep[p75Index],
      p95: valuesAtStep[p95Index]
    });
  }

  // Drawdown distribution buckets
  allMaxDrawdowns.sort((a, b) => a - b);
  const buckets: Array<{ min: number; max: number; label: string }> = [
    { min: 0, max: 5, label: '0% - 5%' },
    { min: 5, max: 10, label: '5% - 10%' },
    { min: 10, max: 15, label: '10% - 15%' },
    { min: 15, max: 20, label: '15% - 20%' },
    { min: 20, max: 30, label: '20% - 30%' },
    { min: 30, max: 100, label: '> 30%' }
  ];

  const drawdownDistribution: DrawdownBucket[] = buckets.map((b) => {
    const count = allMaxDrawdowns.filter((dd) => dd >= b.min && (b.max === 100 ? dd <= b.max : dd < b.max)).length;
    return {
      range: b.label,
      count,
      probabilityPct: Number(((count / iterations) * 100).toFixed(1))
    };
  });

  const finalEquities = allEquityCurves.map((c) => c[sampleSize]).sort((a, b) => a - b);
  const profitableRuns = finalEquities.filter((e) => e > startingCapital).length;
  const ruinedRuns = allMaxDrawdowns.filter((dd) => dd >= 50).length;

  const medianFinal = finalEquities[Math.floor(finalEquities.length * 0.50)];
  const worstCase = finalEquities[Math.floor(finalEquities.length * 0.05)];
  const bestCase = finalEquities[Math.floor(finalEquities.length * 0.95)];
  const medianDd = allMaxDrawdowns[Math.floor(allMaxDrawdowns.length * 0.50)];
  const p95Dd = allMaxDrawdowns[Math.floor(allMaxDrawdowns.length * 0.95)];

  return {
    iterations,
    tradePoolCount: trades.length,
    startingCapital,
    trajectories,
    maxDrawdownDistribution: drawdownDistribution,
    statistics: {
      medianFinalEquity: Number(medianFinal.toFixed(2)),
      worstCaseFinalEquity: Number(worstCase.toFixed(2)),
      bestCaseFinalEquity: Number(bestCase.toFixed(2)),
      medianMaxDrawdownPercent: Number(medianDd.toFixed(2)),
      p95MaxDrawdownPercent: Number(p95Dd.toFixed(2)),
      probabilityOfProfitPercent: Number(((profitableRuns / iterations) * 100).toFixed(1)),
      probabilityOfRuinPercent: Number(((ruinedRuns / iterations) * 100).toFixed(1))
    },
    disclaimer: 'Monte Carlo analysis simulates randomized trade sequencing risk through bootstrap sampling. It does NOT predict future market price movements or guarantee investment returns.'
  };
}
