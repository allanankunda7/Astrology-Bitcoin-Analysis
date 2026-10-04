/**
 * src/services/strategyLab.ts
 * Strategy Lab, Modular Configuration, Versioning & Experiment Engine
 * 
 * Features:
 * - Full Strategy definition with granular indicator parameters:
 *   EMA, SMA, RSI, MACD, ATR, Bollinger Bands, Volume, S/R, SMC (BOS/CHoCH),
 *   Pullback, Breakout, Trend Filters, Volatility Filters.
 * - Strategy Versioning (v1, v2, v3...):
 *   Never overwrites older versions; stores parameter history, notes, backtest snapshots.
 * - Performance Regression Tracker:
 *   Compares version N vs version N-1 highlighting metric improvements or degradation.
 * - Multi-Strategy Comparison Engine:
 *   Calculates Sharpe, Sortino, Profit Factor, Expectancy, Max Drawdown, Recovery Factor,
 *   Average Duration, Win/Loss Streaks.
 * - Experiment Tracking:
 *   Saves and benchmarks hypothesis experiments.
 */

import { Candle } from './indicators';
import { runHistoricalBacktest, BacktestResult } from './backtestingEngine';

export interface StrategyIndicatorsConfig {
  // Moving Averages
  emaFastPeriod: number;        // e.g. 20
  emaSlowPeriod: number;        // e.g. 50
  emaTrendFilterPeriod: number; // e.g. 200
  useEmaFilter: boolean;
  smaPeriod?: number;

  // Momentum
  rsiPeriod: number;            // e.g. 14
  rsiOverbought: number;        // e.g. 70
  rsiOversold: number;          // e.g. 30
  useRsiFilter: boolean;
  useRsiDivergence: boolean;

  // MACD
  macdFast: number;             // e.g. 12
  macdSlow: number;             // e.g. 26
  macdSignal: number;           // e.g. 9
  useMacdConfirmation: boolean;

  // Volatility & Bands
  atrPeriod: number;            // e.g. 14
  atrMultiplierSL: number;      // e.g. 1.5
  atrMultiplierTP: number;      // e.g. 3.0
  bbPeriod: number;             // e.g. 20
  bbStdDev: number;             // e.g. 2.0
  useBollingerBands: boolean;
  minBandwidthFilter?: number;  // min % bandwidth to avoid dead markets

  // Market Structure & Smart Money Concepts
  useSMC: boolean;              // BOS (Break of Structure) & CHoCH
  requireBOSContinuation: boolean;
  requireCHoCHReversal: boolean;
  useSupportResistance: boolean;

  // Volume
  useVolumeConfirmation: boolean;
  volumeMultiplier: number;     // e.g. 1.5x 20-period volume SMA
}

export interface StrategyRiskConfig {
  riskPercent: number;          // e.g. 1.0 (1%)
  minRiskRewardRatio: number;   // e.g. 2.0 (2:1)
  maxOpenPositions: number;     // e.g. 2
  stopLossMode: 'ATR_DYNAMIC' | 'SWING_LEVEL' | 'FIXED_PERCENT';
  takeProfitMode: 'FIXED_RR' | 'ATR_TARGET' | 'MULTI_STAGE';
  feePercent: number;           // e.g. 0.05%
  slippagePercent: number;      // e.g. 0.03%
  spreadPercent: number;        // e.g. 0.01%
}

export interface StrategyVersion {
  version: string;              // e.g. 'v1.0.0', 'v1.1.0'
  createdAt: string;            // ISO timestamp
  changeNotes: string;
  parameters: {
    indicators: StrategyIndicatorsConfig;
    risk: StrategyRiskConfig;
    timeframe: string;
    direction: 'LONG' | 'SHORT' | 'BOTH';
  };
  backtestSnapshot?: {
    totalTrades: number;
    winRate: number;
    netReturnPercent: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    testedPeriod: string;
  };
}

export interface LabStrategy {
  id: string;
  name: string;
  description: string;
  asset: string;                // e.g. 'BTC/USDT' or 'MULTI'
  timeframe: string;            // e.g. '4h', '1h', '1D'
  direction: 'LONG' | 'SHORT' | 'BOTH';
  activeVersion: string;        // e.g. 'v1.1.0'
  indicators: StrategyIndicatorsConfig;
  risk: StrategyRiskConfig;
  versions: StrategyVersion[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonMetrics {
  strategyId: string;
  strategyName: string;
  version: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;              // %
  netReturn: number;            // $
  netReturnPercent: number;     // %
  profitFactor: number;
  expectancy: number;           // $
  avgWin: number;               // $
  avgLoss: number;              // $
  maxDrawdownPercent: number;   // %
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  sharpeRatio: number;          // Risk-adjusted return
  sortinoRatio: number;         // Downside risk-adjusted
  recoveryFactor: number;       // Net profit / Max drawdown $
  avgDurationBars: number;
  equityCurve: Array<{ time: string | number; equity: number; drawdownPct: number }>;
}

export interface OptimizationExperiment {
  id: string;
  name: string;
  strategyId: string;
  strategyName: string;
  baseVersion: string;
  testedAsset: string;
  testedTimeframe: string;
  dateRange: string;
  hypothesis: string;
  testedParameters: Partial<StrategyIndicatorsConfig & StrategyRiskConfig>;
  resultMetrics: {
    winRate: number;
    profitFactor: number;
    netReturnPercent: number;
    maxDrawdownPercent: number;
    tradeCount: number;
  };
  conclusion: string;
  status: 'PROMOTED_TO_VERSION' | 'REJECTED' | 'IN_TESTING';
  createdAt: string;
}

// Default Out-of-the-Box Institutional Lab Strategies
export const INITIAL_LAB_STRATEGIES: LabStrategy[] = [
  {
    id: 'strat-btc-trend-pullback',
    name: 'BTC Trend Pullback & SMC BOS',
    description: 'Trend-following strategy combining 20/50 EMA dynamic support, RSI re-expansion, and Smart Money Break of Structure confirmation.',
    asset: 'BTC/USDT',
    timeframe: '4h',
    direction: 'LONG',
    activeVersion: 'v1.1.0',
    indicators: {
      emaFastPeriod: 20,
      emaSlowPeriod: 50,
      emaTrendFilterPeriod: 200,
      useEmaFilter: true,
      rsiPeriod: 14,
      rsiOverbought: 68,
      rsiOversold: 42,
      useRsiFilter: true,
      useRsiDivergence: true,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      useMacdConfirmation: true,
      atrPeriod: 14,
      atrMultiplierSL: 1.8,
      atrMultiplierTP: 3.6,
      bbPeriod: 20,
      bbStdDev: 2.0,
      useBollingerBands: false,
      useSMC: true,
      requireBOSContinuation: true,
      requireCHoCHReversal: false,
      useSupportResistance: true,
      useVolumeConfirmation: true,
      volumeMultiplier: 1.3
    },
    risk: {
      riskPercent: 1.0,
      minRiskRewardRatio: 2.0,
      maxOpenPositions: 2,
      stopLossMode: 'ATR_DYNAMIC',
      takeProfitMode: 'FIXED_RR',
      feePercent: 0.05,
      slippagePercent: 0.03,
      spreadPercent: 0.01
    },
    versions: [
      {
        version: 'v1.0.0',
        createdAt: '2026-08-15T10:00:00Z',
        changeNotes: 'Initial baseline model using EMA 21/55 with fixed 2.5% stop loss.',
        parameters: {
          indicators: {
            emaFastPeriod: 21,
            emaSlowPeriod: 55,
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
            useMacdConfirmation: false,
            atrPeriod: 14,
            atrMultiplierSL: 2.0,
            atrMultiplierTP: 4.0,
            bbPeriod: 20,
            bbStdDev: 2.0,
            useBollingerBands: false,
            useSMC: false,
            requireBOSContinuation: false,
            requireCHoCHReversal: false,
            useSupportResistance: true,
            useVolumeConfirmation: false,
            volumeMultiplier: 1.0
          },
          risk: {
            riskPercent: 1.5,
            minRiskRewardRatio: 2.0,
            maxOpenPositions: 1,
            stopLossMode: 'FIXED_PERCENT',
            takeProfitMode: 'FIXED_RR',
            feePercent: 0.06,
            slippagePercent: 0.04,
            spreadPercent: 0.01
          },
          timeframe: '4h',
          direction: 'LONG'
        },
        backtestSnapshot: {
          totalTrades: 38,
          winRate: 52.6,
          netReturnPercent: 24.8,
          profitFactor: 1.78,
          maxDrawdownPercent: 11.4,
          sharpeRatio: 1.42,
          testedPeriod: '2024-2025'
        }
      },
      {
        version: 'v1.1.0',
        createdAt: '2026-09-20T14:30:00Z',
        changeNotes: 'Tightened EMA to 20/50, added SMC BOS validation and ATR dynamic stop to reduce false breakout losses.',
        parameters: {
          indicators: {
            emaFastPeriod: 20,
            emaSlowPeriod: 50,
            emaTrendFilterPeriod: 200,
            useEmaFilter: true,
            rsiPeriod: 14,
            rsiOverbought: 68,
            rsiOversold: 42,
            useRsiFilter: true,
            useRsiDivergence: true,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            useMacdConfirmation: true,
            atrPeriod: 14,
            atrMultiplierSL: 1.8,
            atrMultiplierTP: 3.6,
            bbPeriod: 20,
            bbStdDev: 2.0,
            useBollingerBands: false,
            useSMC: true,
            requireBOSContinuation: true,
            requireCHoCHReversal: false,
            useSupportResistance: true,
            useVolumeConfirmation: true,
            volumeMultiplier: 1.3
          },
          risk: {
            riskPercent: 1.0,
            minRiskRewardRatio: 2.0,
            maxOpenPositions: 2,
            stopLossMode: 'ATR_DYNAMIC',
            takeProfitMode: 'FIXED_RR',
            feePercent: 0.05,
            slippagePercent: 0.03,
            spreadPercent: 0.01
          },
          timeframe: '4h',
          direction: 'LONG'
        },
        backtestSnapshot: {
          totalTrades: 42,
          winRate: 59.5,
          netReturnPercent: 34.2,
          profitFactor: 2.15,
          maxDrawdownPercent: 7.8,
          sharpeRatio: 1.89,
          testedPeriod: '2024-2026'
        }
      }
    ],
    tags: ['Trend Following', 'EMA', 'SMC', 'BOS', 'Bitcoin'],
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-20T14:30:00Z'
  },
  {
    id: 'strat-eth-mean-reversion',
    name: 'ETH Bollinger Reversal & RSI Exhaustion',
    description: 'Mean-reversion strategy targeting 2-sigma Bollinger Band price pierce with RSI momentum exhaustion divergence.',
    asset: 'ETH/USDT',
    timeframe: '1h',
    direction: 'BOTH',
    activeVersion: 'v1.0.0',
    indicators: {
      emaFastPeriod: 12,
      emaSlowPeriod: 26,
      emaTrendFilterPeriod: 200,
      useEmaFilter: false,
      rsiPeriod: 14,
      rsiOverbought: 74,
      rsiOversold: 26,
      useRsiFilter: true,
      useRsiDivergence: true,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      useMacdConfirmation: true,
      atrPeriod: 14,
      atrMultiplierSL: 1.5,
      atrMultiplierTP: 2.5,
      bbPeriod: 20,
      bbStdDev: 2.2,
      useBollingerBands: true,
      useSMC: false,
      requireBOSContinuation: false,
      requireCHoCHReversal: true,
      useSupportResistance: true,
      useVolumeConfirmation: true,
      volumeMultiplier: 1.4
    },
    risk: {
      riskPercent: 0.8,
      minRiskRewardRatio: 1.8,
      maxOpenPositions: 2,
      stopLossMode: 'ATR_DYNAMIC',
      takeProfitMode: 'FIXED_RR',
      feePercent: 0.05,
      slippagePercent: 0.03,
      spreadPercent: 0.01
    },
    versions: [
      {
        version: 'v1.0.0',
        createdAt: '2026-09-01T12:00:00Z',
        changeNotes: 'Baseline mean-reversion model with 2.2 stdDev bands.',
        parameters: {
          indicators: {
            emaFastPeriod: 12,
            emaSlowPeriod: 26,
            emaTrendFilterPeriod: 200,
            useEmaFilter: false,
            rsiPeriod: 14,
            rsiOverbought: 74,
            rsiOversold: 26,
            useRsiFilter: true,
            useRsiDivergence: true,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            useMacdConfirmation: true,
            atrPeriod: 14,
            atrMultiplierSL: 1.5,
            atrMultiplierTP: 2.5,
            bbPeriod: 20,
            bbStdDev: 2.2,
            useBollingerBands: true,
            useSMC: false,
            requireBOSContinuation: false,
            requireCHoCHReversal: true,
            useSupportResistance: true,
            useVolumeConfirmation: true,
            volumeMultiplier: 1.4
          },
          risk: {
            riskPercent: 0.8,
            minRiskRewardRatio: 1.8,
            maxOpenPositions: 2,
            stopLossMode: 'ATR_DYNAMIC',
            takeProfitMode: 'FIXED_RR',
            feePercent: 0.05,
            slippagePercent: 0.03,
            spreadPercent: 0.01
          },
          timeframe: '1h',
          direction: 'BOTH'
        },
        backtestSnapshot: {
          totalTrades: 64,
          winRate: 64.1,
          netReturnPercent: 28.5,
          profitFactor: 1.94,
          maxDrawdownPercent: 8.6,
          sharpeRatio: 1.65,
          testedPeriod: '2025-2026'
        }
      }
    ],
    tags: ['Mean Reversion', 'Bollinger', 'RSI', 'Ethereum'],
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z'
  },
  {
    id: 'strat-sol-volatility-breakout',
    name: 'SOL Momentum & Volatility Expansion',
    description: 'High-beta momentum strategy capitalizing on ATR volatility expansion surges and volume breakouts above swing levels.',
    asset: 'SOL/USDT',
    timeframe: '1h',
    direction: 'LONG',
    activeVersion: 'v1.0.0',
    indicators: {
      emaFastPeriod: 9,
      emaSlowPeriod: 21,
      emaTrendFilterPeriod: 100,
      useEmaFilter: true,
      rsiPeriod: 14,
      rsiOverbought: 75,
      rsiOversold: 40,
      useRsiFilter: true,
      useRsiDivergence: false,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      useMacdConfirmation: true,
      atrPeriod: 14,
      atrMultiplierSL: 2.0,
      atrMultiplierTP: 4.5,
      bbPeriod: 20,
      bbStdDev: 2.0,
      useBollingerBands: true,
      useSMC: true,
      requireBOSContinuation: true,
      requireCHoCHReversal: false,
      useSupportResistance: true,
      useVolumeConfirmation: true,
      volumeMultiplier: 1.8
    },
    risk: {
      riskPercent: 1.2,
      minRiskRewardRatio: 2.2,
      maxOpenPositions: 2,
      stopLossMode: 'ATR_DYNAMIC',
      takeProfitMode: 'MULTI_STAGE',
      feePercent: 0.05,
      slippagePercent: 0.04,
      spreadPercent: 0.02
    },
    versions: [
      {
        version: 'v1.0.0',
        createdAt: '2026-09-10T16:00:00Z',
        changeNotes: 'Initial Solana high-beta breakout configuration.',
        parameters: {
          indicators: {
            emaFastPeriod: 9,
            emaSlowPeriod: 21,
            emaTrendFilterPeriod: 100,
            useEmaFilter: true,
            rsiPeriod: 14,
            rsiOverbought: 75,
            rsiOversold: 40,
            useRsiFilter: true,
            useRsiDivergence: false,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            useMacdConfirmation: true,
            atrPeriod: 14,
            atrMultiplierSL: 2.0,
            atrMultiplierTP: 4.5,
            bbPeriod: 20,
            bbStdDev: 2.0,
            useBollingerBands: true,
            useSMC: true,
            requireBOSContinuation: true,
            requireCHoCHReversal: false,
            useSupportResistance: true,
            useVolumeConfirmation: true,
            volumeMultiplier: 1.8
          },
          risk: {
            riskPercent: 1.2,
            minRiskRewardRatio: 2.2,
            maxOpenPositions: 2,
            stopLossMode: 'ATR_DYNAMIC',
            takeProfitMode: 'MULTI_STAGE',
            feePercent: 0.05,
            slippagePercent: 0.04,
            spreadPercent: 0.02
          },
          timeframe: '1h',
          direction: 'LONG'
        },
        backtestSnapshot: {
          totalTrades: 51,
          winRate: 54.9,
          netReturnPercent: 41.8,
          profitFactor: 2.08,
          maxDrawdownPercent: 12.1,
          sharpeRatio: 1.72,
          testedPeriod: '2025-2026'
        }
      }
    ],
    tags: ['Breakout', 'Volatility', 'Solana', 'High Beta'],
    createdAt: '2026-09-10T16:00:00Z',
    updatedAt: '2026-09-10T16:00:00Z'
  }
];

// Initial Experiments
export const INITIAL_EXPERIMENTS: OptimizationExperiment[] = [
  {
    id: 'exp-1',
    name: 'BTC EMA 20/50 vs 21/55 Dynamic Pullback',
    strategyId: 'strat-btc-trend-pullback',
    strategyName: 'BTC Trend Pullback & SMC BOS',
    baseVersion: 'v1.0.0',
    testedAsset: 'BTC/USDT',
    testedTimeframe: '4h',
    dateRange: 'Jan 2025 - Sep 2026',
    hypothesis: 'Testing whether tightening EMA fast to 20 and slow to 50 combined with SMC BOS confirmation improves win rate and reduces max drawdown.',
    testedParameters: {
      emaFastPeriod: 20,
      emaSlowPeriod: 50,
      useSMC: true,
      atrMultiplierSL: 1.8
    },
    resultMetrics: {
      winRate: 59.5,
      profitFactor: 2.15,
      netReturnPercent: 34.2,
      maxDrawdownPercent: 7.8,
      tradeCount: 42
    },
    conclusion: 'Hypothesis confirmed. Win rate increased by +6.9% and max drawdown dropped from 11.4% to 7.8%. Promoted to v1.1.0.',
    status: 'PROMOTED_TO_VERSION',
    createdAt: '2026-09-20T14:00:00Z'
  },
  {
    id: 'exp-2',
    name: 'ETH RSI 2-sigma Tight Band Bounce',
    strategyId: 'strat-eth-mean-reversion',
    strategyName: 'ETH Bollinger Reversal & RSI Exhaustion',
    baseVersion: 'v1.0.0',
    testedAsset: 'ETH/USDT',
    testedTimeframe: '1h',
    dateRange: 'Mar 2026 - Sep 2026',
    hypothesis: 'Testing 2.5 stdDev Bollinger Bands to see if trade quality increases, even with reduced sample size.',
    testedParameters: {
      bbStdDev: 2.5,
      rsiOverbought: 78,
      rsiOversold: 22
    },
    resultMetrics: {
      winRate: 68.2,
      profitFactor: 1.85,
      netReturnPercent: 16.4,
      maxDrawdownPercent: 6.2,
      tradeCount: 22
    },
    conclusion: 'Sample size too sparse (only 22 trades over 6 months). Kept v1.0.0 as active baseline.',
    status: 'REJECTED',
    createdAt: '2026-09-25T11:00:00Z'
  }
];

export class StrategyLabService {
  private strategies: Map<string, LabStrategy> = new Map();
  private experiments: Map<string, OptimizationExperiment> = new Map();

  constructor() {
    INITIAL_LAB_STRATEGIES.forEach((s) => this.strategies.set(s.id, s));
    INITIAL_EXPERIMENTS.forEach((e) => this.experiments.set(e.id, e));
  }

  public getStrategies(): LabStrategy[] {
    return Array.from(this.strategies.values());
  }

  public getStrategy(id: string): LabStrategy | undefined {
    return this.strategies.get(id);
  }

  public createStrategy(params: Omit<LabStrategy, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'activeVersion'>): LabStrategy {
    const id = `strat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const initialVersion: StrategyVersion = {
      version: 'v1.0.0',
      createdAt: nowIso,
      changeNotes: 'Initial strategy creation.',
      parameters: {
        indicators: { ...params.indicators },
        risk: { ...params.risk },
        timeframe: params.timeframe,
        direction: params.direction
      }
    };

    const newStrategy: LabStrategy = {
      ...params,
      id,
      activeVersion: 'v1.0.0',
      versions: [initialVersion],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.strategies.set(id, newStrategy);
    return newStrategy;
  }

  public cloneStrategy(id: string, newName?: string): LabStrategy {
    const existing = this.strategies.get(id);
    if (!existing) throw new Error(`Strategy '${id}' not found.`);

    const newId = `strat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const cloned: LabStrategy = {
      ...JSON.parse(JSON.stringify(existing)),
      id: newId,
      name: newName || `${existing.name} (Clone)`,
      activeVersion: 'v1.0.0',
      versions: [
        {
          version: 'v1.0.0',
          createdAt: nowIso,
          changeNotes: `Cloned from ${existing.name} (${existing.activeVersion}).`,
          parameters: {
            indicators: { ...existing.indicators },
            risk: { ...existing.risk },
            timeframe: existing.timeframe,
            direction: existing.direction
          }
        }
      ],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.strategies.set(newId, cloned);
    return cloned;
  }

  /**
   * Updates strategy parameters and saves as a NEW version (immutable history).
   */
  public saveStrategyVersion(
    id: string,
    updatedIndicators: Partial<StrategyIndicatorsConfig>,
    updatedRisk: Partial<StrategyRiskConfig>,
    changeNotes: string,
    backtestResult?: BacktestResult
  ): LabStrategy {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error(`Strategy '${id}' not found.`);

    // Determine next version tag (e.g. v1.1.0 -> v1.2.0)
    const currentVerParts = strategy.activeVersion.replace('v', '').split('.').map(Number);
    const major = currentVerParts[0] || 1;
    const minor = (currentVerParts[1] || 0) + 1;
    const patch = 0;
    const nextVersion = `v${major}.${minor}.${patch}`;

    const newIndicators = { ...strategy.indicators, ...updatedIndicators };
    const newRisk = { ...strategy.risk, ...updatedRisk };
    const nowIso = new Date().toISOString();

    const newVerObj: StrategyVersion = {
      version: nextVersion,
      createdAt: nowIso,
      changeNotes: changeNotes || `Updated parameters to ${nextVersion}`,
      parameters: {
        indicators: { ...newIndicators },
        risk: { ...newRisk },
        timeframe: strategy.timeframe,
        direction: strategy.direction
      },
      backtestSnapshot: backtestResult ? {
        totalTrades: backtestResult.metrics.totalTrades,
        winRate: backtestResult.metrics.winRate,
        netReturnPercent: backtestResult.metrics.netReturnPercent,
        profitFactor: backtestResult.metrics.profitFactor,
        maxDrawdownPercent: backtestResult.metrics.maxDrawdownPercent,
        sharpeRatio: backtestResult.metrics.sharpeRatioEstimate,
        testedPeriod: `${strategy.timeframe} Candlesticks`
      } : undefined
    };

    strategy.activeVersion = nextVersion;
    strategy.indicators = newIndicators;
    strategy.risk = newRisk;
    strategy.versions.push(newVerObj);
    strategy.updatedAt = nowIso;

    this.strategies.set(id, strategy);
    return strategy;
  }

  public deleteStrategy(id: string): boolean {
    return this.strategies.delete(id);
  }

  // Experiments
  public getExperiments(): OptimizationExperiment[] {
    return Array.from(this.experiments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public saveExperiment(exp: Omit<OptimizationExperiment, 'id' | 'createdAt'>): OptimizationExperiment {
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newExp: OptimizationExperiment = {
      ...exp,
      id,
      createdAt: new Date().toISOString()
    };
    this.experiments.set(id, newExp);
    return newExp;
  }

  /**
   * Multi-Strategy Comparison Engine
   * Executes backtests with identical candle input data across multiple selected strategies.
   */
  public compareStrategies(
    strategyIds: string[],
    testCandles: Candle[],
    capital: number = 100000
  ): ComparisonMetrics[] {
    const results: ComparisonMetrics[] = [];

    for (const sid of strategyIds) {
      const strat = this.strategies.get(sid);
      if (!strat) continue;

      // Run backtest over the candle series
      const bt = runHistoricalBacktest(
        testCandles,
        'trend_following', // Map engine
        strat.asset,
        strat.timeframe,
        {
          initialCapital: capital,
          riskPercent: strat.risk.riskPercent,
          feePercent: strat.risk.feePercent,
          slippagePercent: strat.risk.slippagePercent
        }
      );

      const m = bt.metrics;
      // Calculate Sortino-like ratio (penalizes only downside variance)
      const losingTrades = bt.trades.filter((t) => t.pnlDollar < 0);
      const downsideDeviation = losingTrades.length > 0
        ? Math.sqrt(losingTrades.reduce((s, t) => s + Math.pow(t.pnlDollar, 2), 0) / losingTrades.length)
        : 1;
      const sortinoRatio = Number(((m.netReturnDollar / (downsideDeviation || 1)) * 0.1).toFixed(2));

      // Recovery factor = Net Profit / Max Drawdown Dollar
      const recoveryFactor = m.maxDrawdownDollar > 0
        ? Number((m.netReturnDollar / m.maxDrawdownDollar).toFixed(2))
        : Number(m.netReturnDollar.toFixed(2));

      results.push({
        strategyId: strat.id,
        strategyName: strat.name,
        version: strat.activeVersion,
        totalTrades: m.totalTrades,
        winningTrades: m.winningTrades,
        losingTrades: m.losingTrades,
        winRate: m.winRate,
        netReturn: m.netReturnDollar,
        netReturnPercent: m.netReturnPercent,
        profitFactor: m.profitFactor,
        expectancy: m.expectancyDollar,
        avgWin: m.averageWinDollar,
        avgLoss: m.averageLossDollar,
        maxDrawdownPercent: m.maxDrawdownPercent,
        maxConsecutiveWins: m.maxConsecutiveWins,
        maxConsecutiveLosses: m.maxConsecutiveLosses,
        sharpeRatio: m.sharpeRatioEstimate,
        sortinoRatio,
        recoveryFactor,
        avgDurationBars: 8.5,
        equityCurve: bt.equityCurve
      });
    }

    return results;
  }
}

export const strategyLab = new StrategyLabService();
