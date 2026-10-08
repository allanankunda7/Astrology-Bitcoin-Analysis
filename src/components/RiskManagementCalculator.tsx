import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Info,
  CheckCircle2,
  TrendingUp,
  Percent,
  Calculator,
  ArrowRight,
  RefreshCw,
  Scale
} from 'lucide-react';
import { calculatePositionRisk, RiskCalculationInputs, RiskMode, RISK_PRESETS } from '../services/riskCalculator';

interface RiskManagementCalculatorProps {
  currentPrice: number;
  symbol: string;
  defaultEntry?: number;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  externalAccountBalance?: number;
  onBalanceChange?: (newBalance: number) => void;
  onSendToPaperTicket?: (tradeParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    stopLoss: number;
    takeProfit: number;
  }) => void;
}

export const RiskManagementCalculator: React.FC<RiskManagementCalculatorProps> = ({
  currentPrice,
  symbol,
  defaultEntry,
  defaultStopLoss,
  defaultTakeProfit,
  externalAccountBalance,
  onBalanceChange,
  onSendToPaperTicket
}) => {
  // Configurable balance & mode
  const [accountBalance, setAccountBalance] = useState<number>(externalAccountBalance || 10000);
  const [riskMode, setRiskMode] = useState<RiskMode>('PERCENTAGE');
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1.0%
  const [fixedRiskAmount, setFixedRiskAmount] = useState<number>(100); // $100

  // Position Parameters
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(defaultEntry || currentPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    defaultStopLoss || Number((currentPrice * 0.97).toFixed(2))
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(
    defaultTakeProfit || Number((currentPrice * 1.06).toFixed(2))
  );

  // Execution Realism Assumptions
  const [feePercent, setFeePercent] = useState<number>(0.05); // 0.05%
  const [slippagePercent, setSlippagePercent] = useState<number>(0.03); // 0.03%
  const [leverage, setLeverage] = useState<number>(1.0); // 1x spot or leverage
  const [maxRiskCapPercent, setMaxRiskCapPercent] = useState<number>(2.5); // 2.5% max risk rule

  // Update when external balance updates
  React.useEffect(() => {
    if (externalAccountBalance !== undefined && externalAccountBalance > 0) {
      setAccountBalance(externalAccountBalance);
    }
  }, [externalAccountBalance]);

  // Direction toggle adjusts default SL/TP orientation
  const handleDirectionChange = (newDir: 'LONG' | 'SHORT') => {
    setDirection(newDir);
    if (newDir === 'LONG') {
      if (stopLossPrice >= entryPrice) {
        setStopLossPrice(Number((entryPrice * 0.97).toFixed(2)));
      }
      if (takeProfitPrice <= entryPrice) {
        setTakeProfitPrice(Number((entryPrice * 1.06).toFixed(2)));
      }
    } else {
      if (stopLossPrice <= entryPrice) {
        setStopLossPrice(Number((entryPrice * 1.03).toFixed(2)));
      }
      if (takeProfitPrice >= entryPrice) {
        setTakeProfitPrice(Number((entryPrice * 0.94).toFixed(2)));
      }
    }
  };

  const handleBalanceUpdate = (val: number) => {
    const valid = Math.max(1, val);
    setAccountBalance(valid);
    if (onBalanceChange) onBalanceChange(valid);
  };

  const inputs: RiskCalculationInputs = useMemo(() => ({
    accountBalance,
    riskMode,
    riskPercent,
    fixedRiskAmount,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    feePercent,
    slippagePercent,
    leverage,
    asset: symbol,
    direction,
    maxRiskLimitPercent: maxRiskCapPercent
  }), [
    accountBalance,
    riskMode,
    riskPercent,
    fixedRiskAmount,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    feePercent,
    slippagePercent,
    leverage,
    symbol,
    direction,
    maxRiskCapPercent
  ]);

  const riskResult = useMemo(() => {
    return calculatePositionRisk(inputs);
  }, [inputs]);

  const presetBalances = [1000, 10000, 50000, 100000, 1000000];

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <span>Centralized Balance-Based Risk Engine & Dynamic Calculator</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Single source of truth for quantitative risk: mathematically adapts sizing, friction, stop distances, and exposure in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-500 text-[10px]">ACTIVE ASSET:</span>
          <span className="font-bold text-amber-300 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30">
            {symbol} (${currentPrice >= 100 ? currentPrice.toLocaleString() : currentPrice.toFixed(4)})
          </span>
        </div>
      </div>

      {/* Inputs & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Parameters Form */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. ACCOUNT & POSITION PARAMETERS</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">Dynamic Inputs</span>
          </div>

          <div className="space-y-3.5">
            {/* Account Balance with Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-400">CONFIGURABLE ACCOUNT BALANCE ($ USD)</label>
                <div className="flex items-center gap-1">
                  {presetBalances.map((b) => (
                    <button
                      key={b}
                      onClick={() => handleBalanceUpdate(b)}
                      className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                        accountBalance === b
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${b >= 1000000 ? '1M' : b >= 1000 ? `${b / 1000}k` : b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={accountBalance}
                  onChange={(e) => handleBalanceUpdate(Number(e.target.value))}
                  className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">USD</span>
              </div>
            </div>

            {/* Risk Mode Switcher: Percentage vs Fixed Dollar Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-slate-400">RISK SIZING MODE</label>
                <div className="flex items-center gap-1 bg-[#0F1420] p-0.5 rounded border border-slate-800">
                  <button
                    onClick={() => setRiskMode('PERCENTAGE')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      riskMode === 'PERCENTAGE'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => setRiskMode('FIXED_AMOUNT')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      riskMode === 'FIXED_AMOUNT'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fixed Dollar ($)
                  </button>
                </div>
              </div>

              {riskMode === 'PERCENTAGE' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Risk % Presets:</span>
                    <div className="flex items-center gap-1">
                      {RISK_PRESETS.map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setRiskPercent(pct)}
                          className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                            riskPercent === pct
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0.01, Number(e.target.value)))}
                      className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-amber-300 font-bold">
                      ${((accountBalance * riskPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500">Fixed Dollar Risk Presets:</span>
                    <div className="flex items-center gap-1">
                      {[50, 100, 250, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setFixedRiskAmount(amt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                            fixedRiskAmount === amt
                              ? 'bg-amber-400 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="10"
                      min="1"
                      value={fixedRiskAmount}
                      onChange={(e) => setFixedRiskAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-amber-300 font-bold">
                      {((fixedRiskAmount / accountBalance) * 100).toFixed(2)}% of balance
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Position Direction Toggle */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">TRADE DIRECTION</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectionChange('LONG')}
                  className={`py-1.5 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    direction === 'LONG'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-[#0F1420] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LONG (BUY)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange('SHORT')}
                  className={`py-1.5 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    direction === 'SHORT'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-[#0F1420] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                  <span>SHORT (SELL)</span>
                </button>
              </div>
            </div>

            {/* Entry, Stop Loss & Take Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">ENTRY PRICE ($)</label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-rose-400 block mb-1">HARD STOP LOSS ($)</label>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(Number(e.target.value))}
                  className="w-full bg-[#0F1420] border border-rose-950/80 rounded p-2 text-rose-300 font-bold text-xs focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] text-emerald-400 block mb-1">TAKE PROFIT ($)</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
                  className="w-full bg-[#0F1420] border border-emerald-950/80 rounded p-2 text-emerald-300 font-bold text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Realistic Execution Parameters: Fee, Slippage, Leverage */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <label className="text-slate-400 block mb-1">FEE PER FILL (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feePercent}
                  onChange={(e) => setFeePercent(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#0F1420] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">SLIPPAGE (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-[#0F1420] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">LEVERAGE (1-10x)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0F1420] border border-slate-800 rounded px-2 py-1 text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* Max Risk Cap Rule */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">MAX RISK CAP GOVERNANCE:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={maxRiskCapPercent}
                  onChange={(e) => setMaxRiskCapPercent(Math.max(0.5, Number(e.target.value)))}
                  className="w-16 bg-[#0F1420] border border-slate-800 rounded px-1.5 py-0.5 text-center text-white"
                />
                <span className="text-slate-400">% max equity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Calculated Sizing & Output Matrix */}
        <div className="space-y-4">
          <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs tabular-nums">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
              <span>2. CALCULATED POSITION SIZE & RISK METRICS</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                riskResult.isRiskExceeded
                  ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
              }`}>
                {riskResult.isRiskExceeded ? 'RISK RULE VIOLATION' : 'RISK COMPLIANT'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RISK AMOUNT</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">
                  ${riskResult.amountAtRisk.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">
                  {((riskResult.amountAtRisk / accountBalance) * 100).toFixed(2)}% of equity
                </span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POSITION SIZE</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {riskResult.positionSizeUnits} {symbol.split('/')[0]}
                </span>
                <span className="text-[10px] text-slate-500">
                  Notional: ${riskResult.positionSizeNotional.toLocaleString()}
                </span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">STOP DISTANCE</span>
                <span className="text-base font-bold text-slate-200 mt-0.5 block">
                  ${riskResult.stopDistanceDollar.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">{riskResult.stopDistancePercent.toFixed(2)}% buffer</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POTENTIAL LOSS</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">
                  -${riskResult.potentialLoss.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Net with fees & slip</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POTENTIAL PROFIT</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  +${riskResult.potentialProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">
                  {((riskResult.potentialProfit / accountBalance) * 100).toFixed(1)}% gain
                </span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RISK / REWARD</span>
                <span className={`text-base font-bold mt-0.5 block ${
                  riskResult.riskRewardRatio >= 2.0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  1 : {riskResult.riskRewardRatio}
                </span>
                <span className="text-[10px] text-slate-500">Target multiple</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">FEE ESTIMATE</span>
                <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                  ${riskResult.feeEstimate.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Roundtrip 2× fills</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">EFFECTIVE RISK</span>
                <span className="text-sm font-bold text-rose-400 mt-0.5 block">
                  ${riskResult.effectiveRisk.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">Risk + All friction</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ACCOUNT EXPOSURE</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  riskResult.accountExposurePercent > 100 ? 'text-amber-400' : 'text-white'
                }`}>
                  {riskResult.accountExposurePercent}%
                </span>
                <span className="text-[10px] text-slate-500">
                  Margin: ${riskResult.marginRequired.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Warnings or Recommendations */}
            {riskResult.warnings.length > 0 && (
              <div className="p-3 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>RISK WARNINGS:</span>
                </div>
                {riskResult.warnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </div>
            )}

            {riskResult.recommendations.length > 0 && (
              <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DISCIPLINE RECOMMENDATIONS:</span>
                </div>
                {riskResult.recommendations.map((r, i) => (
                  <div key={i}>• {r}</div>
                ))}
              </div>
            )}

            {/* Direct Send to Paper Trading Execution */}
            {onSendToPaperTicket && riskResult.positionSizeUnits > 0 && (
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onSendToPaperTicket({
                    symbol,
                    side: direction === 'LONG' ? 'BUY' : 'SELL',
                    price: entryPrice,
                    quantity: riskResult.positionSizeUnits,
                    stopLoss: stopLossPrice,
                    takeProfit: takeProfitPrice
                  })}
                  className="px-4 py-2 rounded text-xs font-bold font-mono bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Send Calculated Sizing to Paper Ticket</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
