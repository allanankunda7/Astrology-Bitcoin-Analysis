/**
 * src/components/PortfolioRiskViewer.tsx
 * Comprehensive Portfolio Risk Management, Correlation Matrix & Centralized Sizing Hub (Req 10-14)
 * 
 * Provides:
 * 1. Cross-Asset Exposure Dashboard: Total Portfolio Value, Gross/Net Exposure, Long vs Short notional.
 * 2. Pearson Correlation Matrix across 6 benchmark assets with concentration warning (>0.70).
 * 3. Centralized Position Sizing Calculator (unified across all strategies).
 * 4. Configurable Portfolio Risk Limits: Max Risk per Trade %, Max Total Risk %, Daily Loss %, Open Positions cap.
 * 5. Daily Loss Circuit Breaker status & reset controls.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Sliders,
  RotateCcw,
  CheckCircle2,
  Layers,
  PieChart,
  BarChart2,
  Lock
} from 'lucide-react';
import {
  portfolioRiskEngine,
  PortfolioRiskLimits,
  PortfolioExposureMetrics,
  CorrelationMatrix,
  PositionSizeResult
} from '../services/portfolioRiskEngine';
import { Position, AccountSummary } from '../broker/types';
import { PaperTradingClient } from '../services/paperTradingClient';

export const PortfolioRiskViewer: React.FC = () => {
  const [limits, setLimits] = useState<PortfolioRiskLimits>(() => portfolioRiskEngine.getLimits());
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [correlationData, setCorrelationData] = useState<CorrelationMatrix>(() => portfolioRiskEngine.getCorrelationMatrix());

  // Centralized Position Sizing Interactive Form
  const [calcEquity, setCalcEquity] = useState<number>(100000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(1.0);
  const [calcEntry, setCalcEntry] = useState<number>(88450);
  const [calcStop, setCalcStop] = useState<number>(85650);
  const [calcTarget, setCalcTarget] = useState<number>(94800);

  // Position Sizing Result
  const sizeResult: PositionSizeResult = useMemo(() => {
    return portfolioRiskEngine.calculatePositionSize({
      equity: calcEquity,
      riskPercent: calcRiskPct,
      entryPrice: calcEntry,
      stopLossPrice: calcStop,
      takeProfitPrice: calcTarget
    });
  }, [calcEquity, calcRiskPct, calcEntry, calcStop, calcTarget]);

  // Load account & positions
  useEffect(() => {
    const load = async () => {
      try {
        const [acc, pos] = await Promise.all([
          PaperTradingClient.getAccount(),
          PaperTradingClient.getPositions()
        ]);
        setAccount(acc);
        setPositions(pos);
        if (acc) setCalcEquity(acc.equity);
      } catch (err) {
        console.warn('Failed to load portfolio risk account:', err);
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const exposure: PortfolioExposureMetrics = useMemo(() => {
    const dummyAcc: AccountSummary = account || {
      accountId: 'DUMMY',
      currency: 'USDT',
      startingBalance: 100000,
      balance: 100000,
      equity: 100000,
      availableBalance: 100000,
      usedMargin: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalFeesPaid: 0,
      openPositionsCount: 0,
      openOrdersCount: 0,
      totalTradesCount: 0,
      winningTradesCount: 0,
      losingTradesCount: 0,
      winRate: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      environment: 'PAPER_SIMULATION',
      isPaper: true,
      lastUpdated: new Date().toISOString()
    };
    return portfolioRiskEngine.evaluatePortfolioExposure(positions, dummyAcc);
  }, [positions, account]);

  const handleUpdateLimits = (field: keyof PortfolioRiskLimits, val: number) => {
    const updated = portfolioRiskEngine.updateLimits({ [field]: val });
    setLimits(updated);
  };

  const handleResetCircuitBreaker = () => {
    portfolioRiskEngine.resetCircuitBreaker();
    alert('Daily loss circuit breaker manually reset.');
  };

  return (
    <div className="space-y-6 font-mono text-xs">

      {/* 1. Header Bar */}
      <div className="bg-[#090C14] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              PORTFOLIO RISK &amp; SIZING
            </span>
            <span className="text-slate-500 text-xs">
              Cross-Asset Exposure, Correlation Risk &amp; Limits Enforcement
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-1">
            Institutional Portfolio Risk Management &amp; Sizing Engine
          </h2>
        </div>

        {exposure.isDailyLossLimitBreached && (
          <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500/50 p-2 rounded text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>DAILY LOSS CIRCUIT BREAKER ACTIVE</span>
            <button
              onClick={handleResetCircuitBreaker}
              className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] ml-2"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 2. Portfolio Exposure Metrics HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Total Portfolio Value</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            ${exposure.totalPortfolioValue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Cash: ${exposure.availableCash.toLocaleString()}</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Total Exposure</span>
          <span className="text-base font-bold text-amber-300 mt-0.5 block">
            ${exposure.totalNotionalExposure.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">{exposure.grossExposurePercent}% of equity</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Long vs Short Notional</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            <span className="text-emerald-400">${exposure.longNotionalExposure.toFixed(0)}</span> / <span className="text-rose-400">${exposure.shortNotionalExposure.toFixed(0)}</span>
          </span>
          <span className="text-[10px] text-slate-400">Net: ${exposure.netExposure.toFixed(0)}</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Total Portfolio Risk</span>
          <span className={`text-base font-bold mt-0.5 block ${exposure.totalPortfolioRiskPercent > limits.maxTotalPortfolioRiskPercent ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${exposure.totalPortfolioRiskDollar.toLocaleString()} ({exposure.totalPortfolioRiskPercent}%)
          </span>
          <span className="text-[10px] text-slate-400">Cap: {limits.maxTotalPortfolioRiskPercent}%</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Open Positions</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {exposure.positionCount} / {limits.maxOpenPositions}
          </span>
          <span className="text-[10px] text-slate-400">Capacity used</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block uppercase">Margin Utilization</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {exposure.marginUtilizationPercent}%
          </span>
          <span className="text-[10px] text-slate-400">Used: ${exposure.usedMargin.toLocaleString()}</span>
        </div>
      </div>

      {/* Correlation Warnings */}
      {exposure.correlatedWarnings.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg space-y-1 text-amber-300">
          {exposure.correlatedWarnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. Centralized Position Sizing & Configurable Risk Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Centralized Position Sizing Engine */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Centralized Position Sizing Engine (Req 13)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified mathematical sizing formula used across all strategies and manual tickets.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Account Equity (USDT)</label>
              <input
                type="number"
                value={calcEquity}
                onChange={(e) => setCalcEquity(parseFloat(e.target.value) || 100000)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Risk Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                value={calcRiskPct}
                onChange={(e) => setCalcRiskPct(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Entry Price ($)</label>
              <input
                type="number"
                value={calcEntry}
                onChange={(e) => setCalcEntry(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Stop Loss Price ($)</label>
              <input
                type="number"
                value={calcStop}
                onChange={(e) => setCalcStop(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
          </div>

          {/* Sizing Output Card */}
          <div className="p-3.5 rounded bg-[#090C14] border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Position Size Units:</span>
              <strong className="text-base text-amber-300 font-bold">{sizeResult.positionSizeUnits} units</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Notional Position Value:</span>
              <strong className="text-white">${sizeResult.notionalValueDollar.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Target Amount at Risk:</span>
              <strong className="text-rose-400">${sizeResult.amountAtRiskDollar}</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Risk / Reward Ratio:</span>
              <strong className="text-emerald-400">1 : {sizeResult.riskRewardRatio}</strong>
            </div>
          </div>
        </div>

        {/* Configurable Portfolio Risk Limits & Rejection Rules */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Configurable Portfolio Risk Limits (Req 12 &amp; 14)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The PaperBroker strictly rejects simulated orders that violate these configured risk thresholds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={limits.maxRiskPerTradePercent}
                onChange={(e) => handleUpdateLimits('maxRiskPerTradePercent', parseFloat(e.target.value) || 2.0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Max Total Portfolio Risk (%)</label>
              <input
                type="number"
                step="0.1"
                value={limits.maxTotalPortfolioRiskPercent}
                onChange={(e) => handleUpdateLimits('maxTotalPortfolioRiskPercent', parseFloat(e.target.value) || 6.0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Daily Loss Circuit Breaker (%)</label>
              <input
                type="number"
                step="0.1"
                value={limits.maxDailyLossPercent}
                onChange={(e) => handleUpdateLimits('maxDailyLossPercent', parseFloat(e.target.value) || 3.0)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Max Open Positions Cap</label>
              <input
                type="number"
                value={limits.maxOpenPositions}
                onChange={(e) => handleUpdateLimits('maxOpenPositions', parseInt(e.target.value) || 5)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded bg-[#090C14] border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="text-emerald-400 font-bold block">Enforced Protection Rules:</span>
            <div>• Orders exceeding {limits.maxRiskPerTradePercent}% risk are automatically rejected.</div>
            <div>• If daily drawdown reaches {limits.maxDailyLossPercent}%, new paper trading is disabled.</div>
            <div>• Single asset exposure is capped at {limits.maxSingleAssetExposurePercent}%.</div>
          </div>
        </div>

      </div>

      {/* 4. Pearson Correlation Matrix (Req 11) */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Cross-Asset Pearson Correlation Matrix (Req 11)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Rolling 90-day returns correlation matrix. Highlights concentration risk when multiple held assets have correlation &gt; 0.70.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums text-center">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3 text-left">Asset</th>
                {correlationData.symbols.map((sym) => (
                  <th key={sym} className="py-2 px-3">{sym}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {correlationData.symbols.map((symA, idxA) => (
                <tr key={symA} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-white text-left">{symA}</td>
                  {correlationData.symbols.map((symB, idxB) => {
                    const r = correlationData.matrix[idxA][idxB];
                    const isSelf = idxA === idxB;
                    const isHighPositive = !isSelf && r >= 0.70;
                    const isNegative = r < 0;

                    return (
                      <td key={symB} className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isSelf
                            ? 'bg-slate-800 text-slate-400'
                            : isHighPositive
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            : isNegative
                            ? 'bg-cyan-950/80 text-cyan-300'
                            : 'bg-slate-800/40 text-slate-200'
                        }`}>
                          {r.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
          {correlationData.disclaimer}
        </div>
      </div>

    </div>
  );
};
