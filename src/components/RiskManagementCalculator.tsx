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
  Calculator
} from 'lucide-react';
import { calculatePositionRisk, RiskCalculationInputs } from '../services/riskCalculator';

interface RiskManagementCalculatorProps {
  currentPrice: number;
  symbol: string;
  defaultEntry?: number;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
}

export const RiskManagementCalculator: React.FC<RiskManagementCalculatorProps> = ({
  currentPrice,
  symbol,
  defaultEntry,
  defaultStopLoss,
  defaultTakeProfit
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1%
  const [entryPrice, setEntryPrice] = useState<number>(defaultEntry || currentPrice);
  const [stopLossPrice, setStopLossPrice] = useState<number>(defaultStopLoss || Number((currentPrice * 0.97).toFixed(2)));
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(defaultTakeProfit || Number((currentPrice * 1.06).toFixed(2)));
  const [maxRiskCapPercent, setMaxRiskCapPercent] = useState<number>(2.0); // 2% max cap rule

  const inputs: RiskCalculationInputs = useMemo(() => ({
    accountBalance,
    riskPercent,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    maxRiskLimitPercent: maxRiskCapPercent
  }), [accountBalance, riskPercent, entryPrice, stopLossPrice, takeProfitPrice, maxRiskCapPercent]);

  const riskResult = useMemo(() => {
    return calculatePositionRisk(inputs);
  }, [inputs]);

  // Sync when currentPrice changes if user hasn't modified
  const setQuickRisk = (pct: number) => {
    setRiskPercent(pct);
  };

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <span>Institutional Capital Preservation & Position Sizing Calculator</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Calculates exact position sizing, dollar drawdown exposure, and risk/reward profiles. Enforces strict maximum-risk rules.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500 text-[10px]">CURRENT ASSET:</span>
          <span className="font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
            {symbol} (${currentPrice >= 100 ? currentPrice.toLocaleString() : currentPrice.toFixed(4)})
          </span>
        </div>
      </div>

      {/* Inputs & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Parameters Form */}
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
            <span>1. POSITION PARAMETERS</span>
            <span className="text-[10px] text-slate-500 font-normal">Account & Order Inputs</span>
          </div>

          <div className="space-y-3">
            {/* Account Balance */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">TOTAL ACCOUNT CAPITAL ($ USD)</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Risk Percentage with Quick Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-slate-400">RISK PER TRADE (% OF EQUITY)</label>
                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setQuickRisk(pct)}
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        riskPercent === pct ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Entry Price */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">ENTRY PRICE ($)</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-slate-800 rounded p-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Stop Loss Price */}
            <div>
              <label className="text-[10px] text-rose-400 block mb-1">HARD STOP-LOSS PRICE ($)</label>
              <input
                type="number"
                step="any"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-rose-950/80 rounded p-2 text-rose-300 font-bold text-sm focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Take Profit Price */}
            <div>
              <label className="text-[10px] text-emerald-400 block mb-1">PRIMARY TAKE-PROFIT PRICE ($)</label>
              <input
                type="number"
                step="any"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
                className="w-full bg-[#0F1420] border border-emerald-950/80 rounded p-2 text-emerald-300 font-bold text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Max Risk Cap Rule */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">MAXIMUM RISK CAP RULE:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  value={maxRiskCapPercent}
                  onChange={(e) => setMaxRiskCapPercent(Math.max(0.5, Number(e.target.value)))}
                  className="w-16 bg-[#0F1420] border border-slate-800 rounded px-1.5 py-0.5 text-center text-white"
                />
                <span className="text-slate-400">% max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Calculated Sizing & Output Matrix */}
        <div className="space-y-4">
          <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs tabular-nums">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300 font-bold">
              <span>2. CALCULATED POSITION SIZE & RISK</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                riskResult.isRiskExceeded
                  ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
              }`}>
                {riskResult.isRiskExceeded ? 'RISK RULE VIOLATION' : 'RISK COMPLIANT'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">EXACT DOLLAR RISK</span>
                <span className="text-base font-bold text-rose-400 mt-0.5 block">
                  ${riskResult.amountAtRisk.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">{riskPercent}% of equity</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POSITION SIZE (UNITS)</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {riskResult.positionSizeUnits} {symbol.split('/')[0]}
                </span>
                <span className="text-[10px] text-slate-500">Notional: ${riskResult.positionSizeNotional.toLocaleString()}</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">STOP DISTANCE</span>
                <span className="text-base font-bold text-slate-200 mt-0.5 block">
                  ${riskResult.stopDistanceDollar.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">{riskResult.stopDistancePercent.toFixed(2)}% buffer</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RISK / REWARD RATIO</span>
                <span className={`text-base font-bold mt-0.5 block ${riskResult.riskRewardRatio >= 2.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  1 : {riskResult.riskRewardRatio}
                </span>
                <span className="text-[10px] text-slate-500">Target / Risk Multiple</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">POTENTIAL PROFIT</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  +${riskResult.potentialProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500">{((riskResult.potentialProfit / accountBalance) * 100).toFixed(1)}% gain on balance</span>
              </div>

              <div className="bg-[#0F1420] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">EFFECTIVE LEVERAGE</span>
                <span className={`text-base font-bold mt-0.5 block ${riskResult.effectiveLeverage > 3.0 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {riskResult.effectiveLeverage}x
                </span>
                <span className="text-[10px] text-slate-500">Notional / Capital</span>
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
          </div>
        </div>
      </div>
    </div>
  );
};
