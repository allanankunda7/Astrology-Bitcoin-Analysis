/**
 * src/services/researchWorkspace.ts
 * Quantitative Research Workspace & Strategy Governance Engine
 * 
 * Provides:
 * 1. Research Experiments:
 *    - Hypothesis formulation (e.g. "BTC breakout strategies yield higher Sharpe during high volatility regimes")
 *    - Dataset specification (Asset, timeframe, historical date range, hash)
 *    - Strategy selection & parameter assumptions
 *    - In-Sample, Out-of-Sample, Walk-Forward, and Monte Carlo validation results
 *    - Empirical findings and conclusions
 * 2. Strategy Governance Lifecycle:
 *    IDEA -> EXPERIMENTAL -> BACKTESTED -> OUT-OF-SAMPLE TESTED -> WALK-FORWARD TESTED
 *    -> MONTE CARLO TESTED -> PAPER TESTED -> PRODUCTION CANDIDATE -> RETIRED
 *    Prevents unvalidated promotion; enforces mandatory empirical criteria.
 * 3. Persistence and JSON/CSV Export/Import.
 */

export type GovernanceStatus =
  | 'IDEA'
  | 'EXPERIMENTAL'
  | 'BACKTESTED'
  | 'OUT-OF-SAMPLE TESTED'
  | 'WALK-FORWARD TESTED'
  | 'MONTE CARLO TESTED'
  | 'PAPER TESTED'
  | 'PRODUCTION CANDIDATE'
  | 'RETIRED';

export interface ResearchExperiment {
  id: string;
  title: string;
  hypothesis: string;
  asset: string;
  timeframe: string;
  datasetRange: string;
  strategyId: string;
  strategyName: string;
  parameters: Record<string, any>;
  governanceStatus: GovernanceStatus;
  backtestResults?: {
    initialCapital: number;
    finalEquity: number;
    netReturnPercent: number;
    winRate: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    tradesCount: number;
  };
  oosResults?: {
    splitRatio: number;
    oosNetReturnPercent: number;
    oosWinRate: number;
    oosDrawdownPercent: number;
    stabilityScore: number;
  };
  walkForwardResults?: {
    windowsCount: number;
    meanOosEfficiency: number;
    isRobust: boolean;
  };
  monteCarloResults?: {
    runs: number;
    p95DrawdownPercent: number;
    ruinProbabilityPercent: number;
  };
  conclusion: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const INITIAL_EXPERIMENTS: ResearchExperiment[] = [
  {
    id: 'exp-btc-volatility-breakout',
    title: 'BTC Volatility Expansion Breakouts',
    hypothesis: 'Bitcoin 20-period swing breakouts produce significantly higher profit factor when 14-period ATR is in the upper 80th percentile.',
    asset: 'BTC/USDT',
    timeframe: '4h',
    datasetRange: '2023-01-01 to 2026-09-30 (Closed Bars)',
    strategyId: 'breakout',
    strategyName: 'Breakout (Swing High/Low Expansion)',
    parameters: {
      lookback: 20,
      volatilityFilter: true,
      atrThresholdMultiplier: 1.5,
      riskPercent: 1.0
    },
    governanceStatus: 'WALK-FORWARD TESTED',
    backtestResults: {
      initialCapital: 10000,
      finalEquity: 18450,
      netReturnPercent: 84.5,
      winRate: 52.4,
      profitFactor: 2.15,
      maxDrawdownPercent: 11.2,
      sharpeRatio: 1.82,
      tradesCount: 142
    },
    oosResults: {
      splitRatio: 0.3,
      oosNetReturnPercent: 24.1,
      oosWinRate: 50.8,
      oosDrawdownPercent: 12.0,
      stabilityScore: 88.5
    },
    walkForwardResults: {
      windowsCount: 6,
      meanOosEfficiency: 0.78,
      isRobust: true
    },
    monteCarloResults: {
      runs: 1000,
      p95DrawdownPercent: 14.8,
      ruinProbabilityPercent: 0.1
    },
    conclusion: 'Hypothesis confirmed. Breakouts filtered with ATR volatility expansion out-performed unconditional breakouts by 38% net return while cutting max drawdown by 4.2%.',
    notes: 'Requires strictly confirmed closed bars to prevent false breakout wicks during initial bar formation.',
    tags: ['Bitcoin', 'Breakout', 'Volatility', 'Walk-Forward'],
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-10-01T14:20:00Z'
  },
  {
    id: 'exp-eth-ema-pullback',
    title: 'ETH Trend Pullback Continuation vs Mean Reversion',
    hypothesis: 'Entering Ethereum pullbacks into 50 EMA during macro 200 EMA uptrend produces lower tail risk than pure mean-reversion counter-trend buying.',
    asset: 'ETH/USDT',
    timeframe: '1h',
    datasetRange: '2024-01-01 to 2026-09-30',
    strategyId: 'trend_pullback',
    strategyName: 'Trend Pullback (Retracement to EMA 50)',
    parameters: {
      emaTrendFilter: 200,
      emaPullbackLevel: 50,
      rsiThreshold: 45,
      riskPercent: 1.0
    },
    governanceStatus: 'PRODUCTION CANDIDATE',
    backtestResults: {
      initialCapital: 10000,
      finalEquity: 16120,
      netReturnPercent: 61.2,
      winRate: 58.2,
      profitFactor: 2.34,
      maxDrawdownPercent: 9.4,
      sharpeRatio: 1.95,
      tradesCount: 98
    },
    oosResults: {
      splitRatio: 0.3,
      oosNetReturnPercent: 18.2,
      oosWinRate: 56.4,
      oosDrawdownPercent: 8.9,
      stabilityScore: 92.0
    },
    walkForwardResults: {
      windowsCount: 5,
      meanOosEfficiency: 0.84,
      isRobust: true
    },
    monteCarloResults: {
      runs: 1000,
      p95DrawdownPercent: 12.1,
      ruinProbabilityPercent: 0.0
    },
    conclusion: 'EMA 50 pullback alignment with EMA 200 regime filter yields superior risk-adjusted return compared to unanchored Bollinger mean reversion.',
    notes: 'Preserves favorable 1:2.4 average R-multiple across diverse market states.',
    tags: ['Ethereum', 'Trend', 'EMA', 'Production-Candidate'],
    createdAt: '2026-09-01T09:30:00Z',
    updatedAt: '2026-10-05T16:45:00Z'
  }
];

class ResearchWorkspaceService {
  private experiments: Map<string, ResearchExperiment> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('quant_research_experiments');
        if (stored) {
          const parsed: ResearchExperiment[] = JSON.parse(stored);
          for (const exp of parsed) {
            this.experiments.set(exp.id, exp);
          }
          return;
        }
      } catch {
        // Fallback to initial seeds
      }
    }
    for (const exp of INITIAL_EXPERIMENTS) {
      this.experiments.set(exp.id, exp);
    }
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const list = Array.from(this.experiments.values());
        localStorage.setItem('quant_research_experiments', JSON.stringify(list));
      } catch {
        // Ignore storage quotas
      }
    }
  }

  public getExperiments(): ResearchExperiment[] {
    return Array.from(this.experiments.values());
  }

  public getExperiment(id: string): ResearchExperiment | undefined {
    return this.experiments.get(id);
  }

  public createExperiment(exp: Omit<ResearchExperiment, 'id' | 'createdAt' | 'updatedAt'>): ResearchExperiment {
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const created: ResearchExperiment = {
      ...exp,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.experiments.set(id, created);
    this.saveToStorage();
    return created;
  }

  public updateExperiment(id: string, updates: Partial<ResearchExperiment>): ResearchExperiment {
    const existing = this.experiments.get(id);
    if (!existing) throw new Error(`Experiment ${id} not found.`);
    const updated: ResearchExperiment = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    this.experiments.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  public deleteExperiment(id: string): boolean {
    const res = this.experiments.delete(id);
    if (res) this.saveToStorage();
    return res;
  }

  /**
   * Promotes strategy governance status only if empirical validation requirements are satisfied
   */
  public promoteGovernanceStatus(
    experimentId: string,
    targetStatus: GovernanceStatus
  ): { success: boolean; message: string; experiment: ResearchExperiment } {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found.`);

    // Governance Validation Guardrails
    if (targetStatus === 'BACKTESTED' && (!exp.backtestResults || exp.backtestResults.tradesCount < 20)) {
      return {
        success: false,
        message: 'Cannot promote to BACKTESTED: Strategy requires at least 20 historical trades.',
        experiment: exp
      };
    }

    if (targetStatus === 'OUT-OF-SAMPLE TESTED' && (!exp.oosResults || exp.oosResults.stabilityScore < 60)) {
      return {
        success: false,
        message: 'Cannot promote to OUT-OF-SAMPLE TESTED: Requires OOS stability score ≥ 60%.',
        experiment: exp
      };
    }

    if (targetStatus === 'WALK-FORWARD TESTED' && (!exp.walkForwardResults || !exp.walkForwardResults.isRobust)) {
      return {
        success: false,
        message: 'Cannot promote to WALK-FORWARD TESTED: Walk-forward robustness criteria not met.',
        experiment: exp
      };
    }

    if (targetStatus === 'PRODUCTION CANDIDATE') {
      const hasBt = exp.backtestResults && exp.backtestResults.profitFactor >= 1.5;
      const hasOos = exp.oosResults && exp.oosResults.stabilityScore >= 70;
      const hasWf = exp.walkForwardResults && exp.walkForwardResults.isRobust;
      if (!hasBt || !hasOos || !hasWf) {
        return {
          success: false,
          message: 'Cannot promote to PRODUCTION CANDIDATE: Requires Profit Factor ≥ 1.5, OOS stability ≥ 70%, and robust walk-forward validation.',
          experiment: exp
        };
      }
    }

    exp.governanceStatus = targetStatus;
    exp.updatedAt = new Date().toISOString();
    this.experiments.set(experimentId, exp);
    this.saveToStorage();

    return {
      success: true,
      message: `Strategy governance upgraded to ${targetStatus}.`,
      experiment: exp
    };
  }

  public exportExperimentsJson(): string {
    return JSON.stringify(Array.from(this.experiments.values()), null, 2);
  }

  public importExperimentsJson(jsonStr: string): { importedCount: number } {
    const parsed: ResearchExperiment[] = JSON.parse(jsonStr);
    let count = 0;
    for (const exp of parsed) {
      if (exp.id && exp.title) {
        this.experiments.set(exp.id, exp);
        count++;
      }
    }
    this.saveToStorage();
    return { importedCount: count };
  }
}

export const researchWorkspace = new ResearchWorkspaceService();
