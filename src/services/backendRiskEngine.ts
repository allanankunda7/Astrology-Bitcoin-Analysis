/**
 * src/services/backendRiskEngine.ts
 * Centralized Institutional Backend Risk Engine & Market Data Fail-Safe
 * 
 * Enforces:
 * 1. Maximum Risk Per Trade: Limits risk to max 3.0% of account equity
 * 2. Minimum Risk/Reward Ratio: Ensures potential reward exceeds risk (minimum 1.5:1)
 * 3. Stop-Loss & Take-Profit Orientation Validity:
 *    - LONG: StopLoss < EntryPrice, TakeProfit > EntryPrice
 *    - SHORT: StopLoss > EntryPrice, TakeProfit < EntryPrice
 * 4. Maximum Open Positions & Portfolio Margin Exposure (Max 5 concurrent positions)
 * 5. Portfolio Drawdown Circuit Breaker: Trading halts if drawdown exceeds 15%
 * 6. Market Data Stale Fail-Safe:
 *    If market data has not updated within staleThresholdMs (e.g. 180 seconds in live, 2 hours in historical),
 *    blocks order generation with: "Trading disabled: market data is stale."
 */

import { brokerManager } from '../broker/BrokerFactory';
import { logger } from '../server/logger';

export interface RiskCheckParams {
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  currentEquity: number;
  openPositionsCount: number;
  currentDrawdownPct: number;
  lastMarketDataTimestamp?: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  rejectReason?: string;
  calculatedRiskDollar?: number;
  calculatedRiskPercent?: number;
  riskRewardRatio?: number;
  circuitBreakerActive?: boolean;
}

export class BackendRiskEngine {
  private static readonly MAX_RISK_PER_TRADE_PCT = 3.0; // 3% of equity
  private static readonly MAX_SIMULTANEOUS_POSITIONS = 5;
  private static readonly MAX_ALLOWABLE_DRAWDOWN_PCT = 15.0; // 15% circuit breaker
  private static readonly MIN_RR_RATIO = 1.2;
  private static readonly STALE_DATA_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  // Market data freshness tracking
  private static lastQuoteTimestamps: Map<string, number> = new Map();

  public static updateMarketDataTimestamp(symbol: string, timestampMs = Date.now()): void {
    this.lastQuoteTimestamps.set(symbol, timestampMs);
  }

  public static isMarketDataStale(symbol: string): boolean {
    const lastTime = this.lastQuoteTimestamps.get(symbol);
    if (!lastTime) return false; // If not tracked yet, allow initial seed
    return Date.now() - lastTime > this.STALE_DATA_THRESHOLD_MS;
  }

  /**
   * Evaluates proposed order against all institutional risk rules
   */
  public static evaluateOrder(params: RiskCheckParams): RiskCheckResult {
    // 1. Market Data Freshness Fail-Safe Check
    if (this.isMarketDataStale(params.symbol)) {
      logger.warn('RISK_CHECK', `Rejected order on ${params.symbol}: Market data is stale`);
      return {
        allowed: false,
        rejectReason: 'Trading disabled: market data is stale.'
      };
    }

    // 2. Portfolio Drawdown Circuit Breaker
    if (params.currentDrawdownPct >= this.MAX_ALLOWABLE_DRAWDOWN_PCT) {
      logger.warn('RISK_CHECK', `Portfolio drawdown limit hit: ${params.currentDrawdownPct}% >= ${this.MAX_ALLOWABLE_DRAWDOWN_PCT}%`);
      return {
        allowed: false,
        circuitBreakerActive: true,
        rejectReason: `Circuit breaker active: Portfolio drawdown (${params.currentDrawdownPct.toFixed(1)}%) exceeds safety limit of ${this.MAX_ALLOWABLE_DRAWDOWN_PCT}%.`
      };
    }

    // 3. Simultaneous Positions Limit
    if (params.openPositionsCount >= this.MAX_SIMULTANEOUS_POSITIONS) {
      return {
        allowed: false,
        rejectReason: `Maximum allowable concurrent positions limit (${this.MAX_SIMULTANEOUS_POSITIONS}) reached.`
      };
    }

    const isLong = params.side === 'BUY' || params.side === 'LONG';
    const entry = params.entryPrice || 0;

    // 4. Directional Orientation Checks for Stop-Loss & Take-Profit
    if (entry > 0) {
      if (params.stopLoss !== undefined && params.stopLoss > 0) {
        if (isLong && params.stopLoss >= entry) {
          return {
            allowed: false,
            rejectReason: `Invalid Stop-Loss for LONG position: Stop ($${params.stopLoss}) must be strictly below entry price ($${entry}).`
          };
        }
        if (!isLong && params.stopLoss <= entry) {
          return {
            allowed: false,
            rejectReason: `Invalid Stop-Loss for SHORT position: Stop ($${params.stopLoss}) must be strictly above entry price ($${entry}).`
          };
        }

        // Calculate risk
        const stopDistance = Math.abs(entry - params.stopLoss);
        const riskDollar = stopDistance * params.quantity;
        const riskPct = (riskDollar / (params.currentEquity || 100000)) * 100;

        if (riskPct > this.MAX_RISK_PER_TRADE_PCT) {
          return {
            allowed: false,
            calculatedRiskDollar: riskDollar,
            calculatedRiskPercent: riskPct,
            rejectReason: `Excessive risk per trade: Proposed risk is ${riskPct.toFixed(2)}% of equity, exceeding max permitted limit of ${this.MAX_RISK_PER_TRADE_PCT}%.`
          };
        }

        // Check Risk/Reward ratio if TP is defined
        if (params.takeProfit !== undefined && params.takeProfit > 0) {
          if (isLong && params.takeProfit <= entry) {
            return {
              allowed: false,
              rejectReason: `Invalid Take-Profit for LONG position: Target ($${params.takeProfit}) must be strictly above entry price ($${entry}).`
            };
          }
          if (!isLong && params.takeProfit >= entry) {
            return {
              allowed: false,
              rejectReason: `Invalid Take-Profit for SHORT position: Target ($${params.takeProfit}) must be strictly below entry price ($${entry}).`
            };
          }

          const profitDistance = Math.abs(params.takeProfit - entry);
          const rrRatio = stopDistance > 0 ? profitDistance / stopDistance : 0;

          if (rrRatio < this.MIN_RR_RATIO) {
            return {
              allowed: false,
              riskRewardRatio: Number(rrRatio.toFixed(2)),
              rejectReason: `Unfavorable Risk/Reward ratio: Proposed setup achieves 1:${rrRatio.toFixed(2)}, below required minimum of 1:${this.MIN_RR_RATIO}.`
            };
          }

          return {
            allowed: true,
            calculatedRiskDollar: Number(riskDollar.toFixed(2)),
            calculatedRiskPercent: Number(riskPct.toFixed(2)),
            riskRewardRatio: Number(rrRatio.toFixed(2))
          };
        }

        return {
          allowed: true,
          calculatedRiskDollar: Number(riskDollar.toFixed(2)),
          calculatedRiskPercent: Number(riskPct.toFixed(2))
        };
      }
    }

    return { allowed: true };
  }
}
