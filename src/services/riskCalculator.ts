/**
 * riskCalculator.ts
 * Institutional Capital Preservation & Position Sizing Calculator
 * 
 * Provides:
 * - Exact dollar risk calculations based on equity %
 * - Volatility-adjusted position sizing
 * - Risk/Reward ratio and expected value
 * - Configurable maximum-risk safeguards (e.g. 1% - 2% cap)
 */

export interface RiskCalculationInputs {
  accountBalance: number;
  riskPercent: number; // e.g. 1.0 for 1%
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  maxRiskLimitPercent?: number; // default 2.0%
}

export interface RiskCalculationResult {
  amountAtRisk: number; // in $
  stopDistanceDollar: number;
  stopDistancePercent: number;
  positionSizeUnits: number; // e.g. 0.15 BTC
  positionSizeNotional: number; // in $
  potentialLoss: number; // in $
  potentialProfit: number; // in $
  riskRewardRatio: number; // e.g. 2.5 (1:2.5)
  effectiveLeverage: number; // notional / balance
  isRiskExceeded: boolean;
  warnings: string[];
  recommendations: string[];
}

export function calculatePositionRisk(inputs: RiskCalculationInputs): RiskCalculationResult {
  const {
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    maxRiskLimitPercent = 2.0
  } = inputs;

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Validate inputs
  if (accountBalance <= 0 || entryPrice <= 0 || stopLossPrice <= 0 || takeProfitPrice <= 0) {
    return {
      amountAtRisk: 0,
      stopDistanceDollar: 0,
      stopDistancePercent: 0,
      positionSizeUnits: 0,
      positionSizeNotional: 0,
      potentialLoss: 0,
      potentialProfit: 0,
      riskRewardRatio: 0,
      effectiveLeverage: 0,
      isRiskExceeded: false,
      warnings: ['Input values must be greater than zero.'],
      recommendations: ['Provide valid account balance and price parameters.']
    };
  }

  const isLong = entryPrice > stopLossPrice;
  const isShort = entryPrice < stopLossPrice;

  if (entryPrice === stopLossPrice) {
    warnings.push('Entry price cannot be identical to stop-loss price.');
  }

  if (isLong && takeProfitPrice <= entryPrice) {
    warnings.push('For a Long position, Take Profit must be above Entry Price.');
  }
  if (isShort && takeProfitPrice >= entryPrice) {
    warnings.push('For a Short position, Take Profit must be below Entry Price.');
  }

  // 1. Amount at risk ($)
  const amountAtRisk = (accountBalance * (riskPercent / 100));

  // 2. Stop distance
  const stopDistanceDollar = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePercent = (stopDistanceDollar / entryPrice) * 100;

  // 3. Position Size in Units
  const positionSizeUnits = stopDistanceDollar > 0 ? (amountAtRisk / stopDistanceDollar) : 0;
  const positionSizeNotional = positionSizeUnits * entryPrice;

  // 4. Potential PnL
  const profitDistance = Math.abs(takeProfitPrice - entryPrice);
  const potentialProfit = positionSizeUnits * profitDistance;
  const potentialLoss = amountAtRisk;

  // 5. Risk / Reward
  const riskRewardRatio = stopDistanceDollar > 0 ? Number((profitDistance / stopDistanceDollar).toFixed(2)) : 0;

  // 6. Effective Leverage
  const effectiveLeverage = accountBalance > 0 ? Number((positionSizeNotional / accountBalance).toFixed(2)) : 0;

  // 7. Max risk rule check
  const isRiskExceeded = riskPercent > maxRiskLimitPercent;
  if (isRiskExceeded) {
    warnings.push(`Risk of ${riskPercent}% exceeds recommended maximum cap of ${maxRiskLimitPercent}%.`);
    recommendations.push(`Scale down risk percentage to ${maxRiskLimitPercent}% or lower to protect against drawdown ruin.`);
  }

  if (effectiveLeverage > 3.0) {
    warnings.push(`Effective leverage of ${effectiveLeverage}x requires significant margin and magnifies tail risk.`);
  }

  if (riskRewardRatio < 1.5) {
    warnings.push(`Risk/Reward ratio of 1:${riskRewardRatio} is sub-optimal. Institutional setups prioritize 1:2.0 or higher.`);
  } else {
    recommendations.push(`Favorable R:R profile (1:${riskRewardRatio}). Requires only ${(100 / (1 + riskRewardRatio)).toFixed(1)}% win rate to break even.`);
  }

  return {
    amountAtRisk: Number(amountAtRisk.toFixed(2)),
    stopDistanceDollar: Number(stopDistanceDollar.toFixed(2)),
    stopDistancePercent: Number(stopDistancePercent.toFixed(2)),
    positionSizeUnits: Number(positionSizeUnits.toFixed(4)),
    positionSizeNotional: Number(positionSizeNotional.toFixed(2)),
    potentialLoss: Number(potentialLoss.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2)),
    riskRewardRatio,
    effectiveLeverage,
    isRiskExceeded,
    warnings,
    recommendations
  };
}
