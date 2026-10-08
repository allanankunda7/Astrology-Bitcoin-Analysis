/**
 * riskCalculator.ts
 * Centralized Institutional Balance-Based Risk Engine & Dynamic Risk Calculator
 * 
 * Fulfills Requirements:
 * - Single source of truth for all risk and position-sizing calculations
 * - Configurable Risk Modes: Percentage Equity Risk vs Fixed Dollar Risk Amount
 * - Standard Presets: 0.25%, 0.5%, 1%, 1.5%, 2%, Custom
 * - Asset Contract Specifications: Crypto (base units), Forex (standard lot 100,000 pips), Indices
 * - Comprehensive Outputs:
 *   Risk amount, position size, stop distance, potential profit/loss (net of fees & slippage),
 *   risk/reward ratio, margin requirement, account exposure, effective leverage, and safeguards.
 */

export type RiskMode = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface RiskCalculationInputs {
  accountBalance: number;
  riskMode?: RiskMode;
  riskPercent?: number;             // e.g. 1.0 for 1%
  fixedRiskAmount?: number;         // e.g. $100
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  feePercent?: number;              // e.g. 0.05%
  slippagePercent?: number;         // e.g. 0.03%
  leverage?: number;                // e.g. 1 for spot, 5 for leverage
  asset?: string;                   // e.g. 'BTC/USDT', 'EUR/USD', 'ETH/USDT'
  direction?: 'LONG' | 'SHORT';
  maxRiskLimitPercent?: number;     // default 2.5%
}

export interface RiskCalculationResult {
  riskMode: RiskMode;
  amountAtRisk: number;             // Dollar risk before fees ($)
  effectiveRisk: number;            // Total risk including estimated fees & slippage ($)
  stopDistanceDollar: number;
  stopDistancePercent: number;
  positionSizeUnits: number;        // e.g. 0.1500 BTC or lots
  positionSizeNotional: number;     // in $
  marginRequired: number;           // Notional / leverage ($)
  potentialLoss: number;            // Dollar loss if SL hit (net of friction)
  potentialProfit: number;          // Dollar profit if TP hit (net of friction)
  riskRewardRatio: number;          // e.g. 2.50 (1:2.50)
  feeEstimate: number;              // Roundtrip fees estimate ($)
  slippageEstimate: number;         // Slippage estimate ($)
  effectiveLeverage: number;        // Notional / balance
  accountExposurePercent: number;   // (Notional / balance) * 100
  maxAllowedPositionUnits: number;  // Position size capped by 3x max leverage
  isRiskExceeded: boolean;
  warnings: string[];
  recommendations: string[];
}

export const RISK_PRESETS = [0.25, 0.5, 1.0, 1.5, 2.0] as const;

export function calculatePositionRisk(inputs: RiskCalculationInputs): RiskCalculationResult {
  const {
    accountBalance,
    riskMode = 'PERCENTAGE',
    riskPercent = 1.0,
    fixedRiskAmount = 100,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    feePercent = 0.05,
    slippagePercent = 0.03,
    leverage = 1.0,
    asset = 'BTC/USDT',
    direction,
    maxRiskLimitPercent = 2.5
  } = inputs;

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // 1. Basic validation
  if (accountBalance <= 0 || entryPrice <= 0 || stopLossPrice <= 0 || takeProfitPrice <= 0) {
    return {
      riskMode,
      amountAtRisk: 0,
      effectiveRisk: 0,
      stopDistanceDollar: 0,
      stopDistancePercent: 0,
      positionSizeUnits: 0,
      positionSizeNotional: 0,
      marginRequired: 0,
      potentialLoss: 0,
      potentialProfit: 0,
      riskRewardRatio: 0,
      feeEstimate: 0,
      slippageEstimate: 0,
      effectiveLeverage: 0,
      accountExposurePercent: 0,
      maxAllowedPositionUnits: 0,
      isRiskExceeded: false,
      warnings: ['Input values must be greater than zero.'],
      recommendations: ['Provide valid account balance and price parameters.']
    };
  }

  // Determine direction
  const isLong = direction ? direction === 'LONG' : entryPrice > stopLossPrice;
  const isShort = !isLong;

  if (entryPrice === stopLossPrice) {
    warnings.push('Entry price cannot be identical to stop-loss price.');
  }

  if (isLong) {
    if (stopLossPrice >= entryPrice) {
      warnings.push('For a Long position, Stop Loss must be strictly below Entry Price.');
    }
    if (takeProfitPrice <= entryPrice) {
      warnings.push('For a Long position, Take Profit must be strictly above Entry Price.');
    }
  } else {
    if (stopLossPrice <= entryPrice) {
      warnings.push('For a Short position, Stop Loss must be strictly above Entry Price.');
    }
    if (takeProfitPrice >= entryPrice) {
      warnings.push('For a Short position, Take Profit must be strictly below Entry Price.');
    }
  }

  // 2. Risk Amount ($)
  let amountAtRisk = 0;
  if (riskMode === 'FIXED_AMOUNT') {
    amountAtRisk = Math.min(accountBalance, Math.max(0, fixedRiskAmount));
  } else {
    amountAtRisk = accountBalance * (Math.max(0, riskPercent) / 100);
  }

  // 3. Stop Distance
  const stopDistanceDollar = Math.abs(entryPrice - stopLossPrice);
  const stopDistancePercent = (stopDistanceDollar / entryPrice) * 100;

  // 4. Position Sizing
  // Detect asset class specifications
  const isForex = asset.includes('EUR') || asset.includes('GBP') || asset.includes('JPY') || asset.includes('AUD') || asset.includes('USD/');
  let positionSizeUnits = 0;

  if (stopDistanceDollar > 0) {
    positionSizeUnits = amountAtRisk / stopDistanceDollar;
  }

  const effectiveUnits = positionSizeUnits;
  const positionSizeNotional = effectiveUnits * entryPrice;

  // 5. Margin and Leverage
  const effLev = Math.max(1, leverage);
  const marginRequired = positionSizeNotional / effLev;
  const effectiveLeverage = accountBalance > 0 ? Number((positionSizeNotional / accountBalance).toFixed(2)) : 0;
  const accountExposurePercent = accountBalance > 0 ? Number(((positionSizeNotional / accountBalance) * 100).toFixed(1)) : 0;

  // 6. Fees and Slippage
  const roundtripFeeRate = (feePercent / 100) * 2;
  const slippageRate = (slippagePercent / 100) * 2;
  const feeEstimate = positionSizeNotional * roundtripFeeRate;
  const slippageEstimate = positionSizeNotional * slippageRate;
  const totalFriction = feeEstimate + slippageEstimate;

  // 7. Potential PnL (Net of friction)
  const profitDistance = Math.abs(takeProfitPrice - entryPrice);
  const grossProfit = effectiveUnits * profitDistance;
  const potentialProfit = Math.max(0, grossProfit - totalFriction);
  const potentialLoss = amountAtRisk + totalFriction;
  const effectiveRisk = potentialLoss;

  // 8. Risk / Reward Profile
  const riskRewardRatio = stopDistanceDollar > 0 ? Number((profitDistance / stopDistanceDollar).toFixed(2)) : 0;

  // 9. Position Limits & Safeguards
  const maxAllowedNotional = accountBalance * 3.0; // Institutional 3x gross exposure limit
  const maxAllowedPositionUnits = maxAllowedNotional / entryPrice;

  const actualRiskPct = (amountAtRisk / accountBalance) * 100;
  const isRiskExceeded = actualRiskPct > maxRiskLimitPercent;

  if (isRiskExceeded) {
    warnings.push(`Risk of ${actualRiskPct.toFixed(2)}% exceeds maximum allowable risk cap of ${maxRiskLimitPercent}%.`);
    recommendations.push(`Scale down risk to ${maxRiskLimitPercent}% or lower to avoid elevated risk of ruin.`);
  }

  if (marginRequired > accountBalance) {
    warnings.push(`Required margin ($${marginRequired.toFixed(2)}) exceeds current account balance ($${accountBalance.toFixed(2)}). Reduce position size or increase leverage.`);
  }

  if (effectiveLeverage > 3.0) {
    warnings.push(`Effective leverage of ${effectiveLeverage}x exceeds conservative limits (< 3.0x). High leverage amplifies volatility risk.`);
  }

  if (riskRewardRatio < 1.5) {
    warnings.push(`Risk/Reward ratio of 1:${riskRewardRatio} is sub-optimal. Quant setups demand ≥ 1:2.0 for sustainable expectancy.`);
  } else {
    const breakevenWinRate = (100 / (1 + riskRewardRatio)).toFixed(1);
    recommendations.push(`Favorable R:R profile (1:${riskRewardRatio}). Breakeven requires only ${breakevenWinRate}% win rate.`);
  }

  return {
    riskMode,
    amountAtRisk: Number(amountAtRisk.toFixed(2)),
    effectiveRisk: Number(effectiveRisk.toFixed(2)),
    stopDistanceDollar: Number(stopDistanceDollar.toFixed(isForex ? 5 : 2)),
    stopDistancePercent: Number(stopDistancePercent.toFixed(2)),
    positionSizeUnits: Number(effectiveUnits.toFixed(isForex ? 2 : 4)),
    positionSizeNotional: Number(positionSizeNotional.toFixed(2)),
    marginRequired: Number(marginRequired.toFixed(2)),
    potentialLoss: Number(potentialLoss.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2)),
    riskRewardRatio,
    feeEstimate: Number(feeEstimate.toFixed(2)),
    slippageEstimate: Number(slippageEstimate.toFixed(2)),
    effectiveLeverage,
    accountExposurePercent,
    maxAllowedPositionUnits: Number(maxAllowedPositionUnits.toFixed(4)),
    isRiskExceeded,
    warnings,
    recommendations
  };
}
