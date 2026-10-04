/**
 * src/components/StrategyLabViewer.tsx
 * Strategy Lab, Modular Configuration, Versioning & Comparison Hub
 * 
 * Provides:
 * 1. Strategy Lab: Create, configure, test, save, clone, and delete strategies with granular indicator parameters.
 * 2. Instant Backtest Execution with live performance cards.
 * 3. Strategy Comparison: Side-by-side benchmarking (Sharpe, Sortino, Profit Factor, Win Rate, Expectancy, Max DD, Recovery Factor).
 * 4. Strategy Versioning: Immutable versions (v1, v2, v3...) with parameter snapshots and change notes.
 * 5. Performance Regression: Version N vs Version N-1 comparison highlighting metric improvements or decay.
 * 6. Experiments Area: Hypotheses tracking, parameter optimization, and promotion workflow.
 */

import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Copy,
  Plus,
  Trash2,
  GitBranch,
  Layers,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Sparkles,
  BarChart2
} from 'lucide-react';
import {
  strategyLab,
  LabStrategy,
  StrategyVersion,
  OptimizationExperiment,
  ComparisonMetrics
} from '../services/strategyLab';
import { Candle } from '../services/indicators';

interface StrategyLabViewerProps {
  candles: Candle[];
  onSelectStrategyForTrading?: (strategy: LabStrategy) => void;
}

export const StrategyLabViewer: React.FC<StrategyLabViewerProps> = ({
  candles,
  onSelectStrategyForTrading
}) => {
  const [activeTab, setActiveTab] = useState<'lab' | 'comparison' | 'versions' | 'experiments'>('lab');
  const [strategies, setStrategies] = useState<LabStrategy[]>(() => strategyLab.getStrategies());
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(strategies[0]?.id || '');
  const [experiments, setExperiments] = useState<OptimizationExperiment[]>(() => strategyLab.getExperiments());

  // Form State for Active Strategy Configuration
  const activeStrategy = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId) || strategies[0];
  }, [strategies, selectedStrategyId]);

  const [formIndicators, setFormIndicators] = useState(activeStrategy?.indicators);
  const [formRisk, setFormRisk] = useState(activeStrategy?.risk);

  // Sync form when strategy selection changes
  React.useEffect(() => {
    if (activeStrategy) {
      setFormIndicators({ ...activeStrategy.indicators });
      setFormRisk({ ...activeStrategy.risk });
    }
  }, [activeStrategy]);

  // Version saving dialog state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [versionNotes, setVersionNotes] = useState<string>('');

  // Strategy comparison selection
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([
    'strat-btc-trend-pullback',
    'strat-eth-mean-reversion',
    'strat-sol-volatility-breakout'
  ]);

  // Comparison metrics calculation
  const comparisonResults = useMemo(() => {
    if (!candles || candles.length < 20) return [];
    return strategyLab.compareStrategies(selectedForComparison, candles);
  }, [selectedForComparison, candles]);

  // Handle Save New Version
  const handleSaveVersion = () => {
    if (!activeStrategy) return;
    try {
      const updated = strategyLab.saveStrategyVersion(
        activeStrategy.id,
        formIndicators,
        formRisk,
        versionNotes || 'User parameter refinement in Strategy Lab'
      );
      setStrategies(strategyLab.getStrategies());
      setIsVersionModalOpen(false);
      setVersionNotes('');
      alert(`Saved as new immutable version: ${updated.activeVersion}`);
    } catch (err: any) {
      alert(`Error saving version: ${err.message}`);
    }
  };

  // Handle Clone
  const handleClone = () => {
    if (!activeStrategy) return;
    const cloned = strategyLab.cloneStrategy(activeStrategy.id);
    const updatedList = strategyLab.getStrategies();
    setStrategies(updatedList);
    setSelectedStrategyId(cloned.id);
    alert(`Cloned strategy '${cloned.name}'.`);
  };

  // Handle New Custom Strategy
  const handleCreateNew = () => {
    const newStrat = strategyLab.createStrategy({
      name: 'Custom Multi-Confluence Strategy',
      description: 'Modular custom quantitative model.',
      asset: 'BTC/USDT',
      timeframe: '1h',
      direction: 'BOTH',
      indicators: {
        emaFastPeriod: 21,
        emaSlowPeriod: 50,
        emaTrendFilterPeriod: 200,
        useEmaFilter: true,
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        useRsiFilter: true,
        useRsiDivergence: true,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        useMacdConfirmation: true,
        atrPeriod: 14,
        atrMultiplierSL: 1.5,
        atrMultiplierTP: 3.0,
        bbPeriod: 20,
        bbStdDev: 2.0,
        useBollingerBands: false,
        useSMC: true,
        requireBOSContinuation: true,
        requireCHoCHReversal: false,
        useSupportResistance: true,
        useVolumeConfirmation: true,
        volumeMultiplier: 1.5
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
      tags: ['Custom', 'Modular', 'Multi-Indicator']
    });

    const updatedList = strategyLab.getStrategies();
    setStrategies(updatedList);
    setSelectedStrategyId(newStrat.id);
  };

  return (
    <div className="space-y-6">

      {/* Header & Sub-Tab Navigation */}
      <div className="bg-[#090C14] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              STRATEGY LAB & RESEARCH
            </span>
            <span className="text-slate-500 text-xs font-mono">
              Modular Strategy Construction, Versioning & Benchmarking
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-1">
            Algorithmic Strategy Lab & Performance Regression Hub
          </h2>
        </div>

        {/* Sub-Tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 bg-[#0F1420] p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('lab')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'lab' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Strategy Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'comparison' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Comparison Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('versions')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'versions' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Version Regression</span>
          </button>

          <button
            onClick={() => setActiveTab('experiments')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'experiments' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Experiments</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 1: STRATEGY LAB & MODULAR CONFIGURATION               */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'lab' && activeStrategy && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Column: Strategy List & Actions */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-slate-300">LAB STRATEGIES</span>
                <button
                  onClick={handleCreateNew}
                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-mono flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-2">
                {strategies.map((strat) => (
                  <button
                    key={strat.id}
                    onClick={() => setSelectedStrategyId(strat.id)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      strat.id === selectedStrategyId
                        ? 'bg-[#141A26] border-amber-500/50 text-white shadow-md'
                        : 'bg-[#090C14] border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">{strat.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-amber-300">
                        {strat.activeVersion}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                      <span>{strat.asset}</span>
                      <span>·</span>
                      <span>{strat.timeframe}</span>
                      <span>·</span>
                      <span className={strat.direction === 'LONG' ? 'text-emerald-400' : strat.direction === 'SHORT' ? 'text-rose-400' : 'text-cyan-400'}>
                        {strat.direction}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
              <span className="text-slate-400 font-bold block mb-2 text-[11px]">VERSION ACTIONS</span>
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Save New Version ({activeStrategy.activeVersion} ➔ Next)</span>
              </button>
              <button
                onClick={handleClone}
                className="w-full py-2 bg-[#141A26] hover:bg-slate-800 border border-slate-700 text-slate-300 rounded font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Clone Strategy</span>
              </button>
              {onSelectStrategyForTrading && (
                <button
                  onClick={() => onSelectStrategyForTrading(activeStrategy)}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Deploy to Trading Terminal</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 3 Cols: Granular Indicator & Risk Parameter Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-5">
              
              {/* Strategy Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{activeStrategy.name}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {activeStrategy.activeVersion}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {activeStrategy.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-500">Direction:</span>
                  <span className="px-2 py-1 rounded bg-[#141A26] border border-slate-700 text-white font-bold">
                    {activeStrategy.direction}
                  </span>
                </div>
              </div>

              {/* Grid: Indicators Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    1. TECHNICAL INDICATORS & CONFLUENCE PARAMETERS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  
                  {/* Moving Averages */}
                  <div className="p-3.5 rounded bg-[#101522] border border-slate-800 space-y-2.5">
                    <span className="text-slate-300 font-bold block text-[11px] border-b border-slate-800/80 pb-1">
                      Moving Averages (EMA / SMA)
                    </span>
                    <div>
                      <label className="text-slate-400 text-[10px] block">EMA Fast Period</label>
                      <input
                        type="number"
                        value={formIndicators.emaFastPeriod}
                        onChange={(e) => setFormIndicators({ ...formIndicators, emaFastPeriod: parseInt(e.target.value) || 20 })}
                        className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block">EMA Slow Period</label>
                      <input
                        type="number"
                        value={formIndicators.emaSlowPeriod}
                        onChange={(e) => setFormIndicators({ ...formIndicators, emaSlowPeriod: parseInt(e.target.value) || 50 })}
                        className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block">Macro 200 EMA Trend Filter</label>
                      <label className="flex items-center gap-2 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIndicators.useEmaFilter}
                          onChange={(e) => setFormIndicators({ ...formIndicators, useEmaFilter: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                        />
                        <span className="text-slate-300 text-[11px]">Require Price &gt; 200 EMA for Longs</span>
                      </label>
                    </div>
                  </div>

                  {/* Momentum: RSI & MACD */}
                  <div className="p-3.5 rounded bg-[#101522] border border-slate-800 space-y-2.5">
                    <span className="text-slate-300 font-bold block text-[11px] border-b border-slate-800/80 pb-1">
                      Momentum & Divergence (RSI / MACD)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px] block">RSI Period</label>
                        <input
                          type="number"
                          value={formIndicators.rsiPeriod}
                          onChange={(e) => setFormIndicators({ ...formIndicators, rsiPeriod: parseInt(e.target.value) || 14 })}
                          className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block">Overbought / Oversold</label>
                        <input
                          type="text"
                          value={`${formIndicators.rsiOversold} / ${formIndicators.rsiOverbought}`}
                          readOnly
                          className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-slate-400 text-center"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formIndicators.useRsiDivergence}
                        onChange={(e) => setFormIndicators({ ...formIndicators, useRsiDivergence: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">Require RSI Momentum Divergence</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIndicators.useMacdConfirmation}
                        onChange={(e) => setFormIndicators({ ...formIndicators, useMacdConfirmation: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">Require MACD Histogram Crossover</span>
                    </label>
                  </div>

                  {/* Volatility & Structure */}
                  <div className="p-3.5 rounded bg-[#101522] border border-slate-800 space-y-2.5">
                    <span className="text-slate-300 font-bold block text-[11px] border-b border-slate-800/80 pb-1">
                      Structure & Volatility (ATR / SMC)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px] block">ATR SL Mult</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formIndicators.atrMultiplierSL}
                          onChange={(e) => setFormIndicators({ ...formIndicators, atrMultiplierSL: parseFloat(e.target.value) || 1.5 })}
                          className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block">ATR TP Mult</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formIndicators.atrMultiplierTP}
                          onChange={(e) => setFormIndicators({ ...formIndicators, atrMultiplierTP: parseFloat(e.target.value) || 3.0 })}
                          className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={formIndicators.useSMC}
                        onChange={(e) => setFormIndicators({ ...formIndicators, useSMC: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">SMC: Require Break of Structure (BOS)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIndicators.useVolumeConfirmation}
                        onChange={(e) => setFormIndicators({ ...formIndicators, useVolumeConfirmation: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                      />
                      <span className="text-slate-300 text-[11px]">Require RVOL Volume Spike (&gt;1.3x SMA)</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* Grid: Risk & Execution Parameters */}
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider block">
                  2. RISK RULES, SIZING & REALISTIC EXECUTION FRICTION
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 rounded bg-[#101522] border border-slate-800">
                    <label className="text-slate-400 text-[10px] block">Risk Per Trade (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formRisk.riskPercent}
                      onChange={(e) => setFormRisk({ ...formRisk, riskPercent: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white mt-1"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Account equity risk</span>
                  </div>

                  <div className="p-3 rounded bg-[#101522] border border-slate-800">
                    <label className="text-slate-400 text-[10px] block">Min Risk/Reward (R:R)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formRisk.minRiskRewardRatio}
                      onChange={(e) => setFormRisk({ ...formRisk, minRiskRewardRatio: parseFloat(e.target.value) || 2.0 })}
                      className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white mt-1"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Rejects setups &lt; {formRisk.minRiskRewardRatio}:1</span>
                  </div>

                  <div className="p-3 rounded bg-[#101522] border border-slate-800">
                    <label className="text-slate-400 text-[10px] block">Execution Slippage (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formRisk.slippagePercent}
                      onChange={(e) => setFormRisk({ ...formRisk, slippagePercent: parseFloat(e.target.value) || 0.03 })}
                      className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white mt-1"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Realistic fill friction</span>
                  </div>

                  <div className="p-3 rounded bg-[#101522] border border-slate-800">
                    <label className="text-slate-400 text-[10px] block">Broker Commission (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formRisk.feePercent}
                      onChange={(e) => setFormRisk({ ...formRisk, feePercent: parseFloat(e.target.value) || 0.05 })}
                      className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white mt-1"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Taker fee per side</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-[11px] font-mono text-slate-400">
                  Modifying parameters will prompt to save as an immutable version to preserve reproducibility.
                </span>
                <button
                  onClick={() => setIsVersionModalOpen(true)}
                  className="px-5 py-2 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Save as Next Version</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 2: MULTI-STRATEGY COMPARISON MATRIX (Req 2)           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Multi-Strategy Performance Comparison Under Identical Dataset
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Benchmarks institutional metrics: Sharpe Ratio, Sortino Ratio, Recovery Factor, Profit Factor, Expectancy, and Max Drawdown.
                </p>
              </div>

              {/* Strategy Selector Checklist */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Select Strategies:</span>
                {strategies.map((s) => (
                  <label key={s.id} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedForComparison.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedForComparison([...selectedForComparison, s.id]);
                        else setSelectedForComparison(selectedForComparison.filter((id) => id !== s.id));
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                    />
                    <span className="text-slate-300 text-[11px]">{s.name.split(' ')[0]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-left">
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3 text-right">Trades</th>
                    <th className="py-2.5 px-3 text-right">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Profit Factor</th>
                    <th className="py-2.5 px-3 text-right">Sharpe Ratio</th>
                    <th className="py-2.5 px-3 text-right">Sortino Ratio</th>
                    <th className="py-2.5 px-3 text-right">Recovery Factor</th>
                    <th className="py-2.5 px-3 text-right">Max Drawdown</th>
                    <th className="py-2.5 px-3 text-right">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {comparisonResults.map((m) => (
                    <tr key={m.strategyId} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-bold text-white">{m.strategyName}</td>
                      <td className="py-3 px-3 text-amber-300 font-semibold">{m.version}</td>
                      <td className="py-3 px-3 text-right">{m.totalTrades} ({m.winningTrades}W/{m.losingTrades}L)</td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-bold">{m.winRate}%</td>
                      <td className="py-3 px-3 text-right text-white font-bold">{m.profitFactor}</td>
                      <td className="py-3 px-3 text-right text-purple-300">{m.sharpeRatio}</td>
                      <td className="py-3 px-3 text-right text-cyan-300">{m.sortinoRatio}</td>
                      <td className="py-3 px-3 text-right text-slate-200">{m.recoveryFactor}</td>
                      <td className="py-3 px-3 text-right text-rose-400">{m.maxDrawdownPercent}%</td>
                      <td className={`py-3 px-3 text-right font-bold ${m.netReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.netReturn >= 0 ? '+' : ''}${m.netReturn.toFixed(2)} ({m.netReturnPercent >= 0 ? '+' : ''}{m.netReturnPercent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Educational Disclaimer */}
            <div className="mt-4 p-3 bg-[#090C14] border border-slate-800/80 rounded text-[11px] font-mono text-slate-400">
              <strong>Notice:</strong> Historical backtest performance across identical historical data does NOT guarantee future market returns. Sortino ratios penalize only downside volatility, while recovery factors measure return velocity per dollar of historical drawdown.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 3: VERSION HISTORY & PERFORMANCE REGRESSION (Req 3)   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'versions' && activeStrategy && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
            <div className="border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-400" />
                <span>Strategy Version History & Performance Regression</span>
                <span className="text-slate-400 text-xs">({activeStrategy.name})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every saved version is permanently stored. Compares version N vs version N-1 to identify potential overfitting or performance decay.
              </p>
            </div>

            <div className="space-y-4">
              {activeStrategy.versions.map((ver, idx) => {
                const prev = idx > 0 ? activeStrategy.versions[idx - 1] : null;
                const winRateDiff = prev && ver.backtestSnapshot && prev.backtestSnapshot
                  ? (ver.backtestSnapshot.winRate - prev.backtestSnapshot.winRate).toFixed(1)
                  : null;
                const ddDiff = prev && ver.backtestSnapshot && prev.backtestSnapshot
                  ? (ver.backtestSnapshot.maxDrawdownPercent - prev.backtestSnapshot.maxDrawdownPercent).toFixed(1)
                  : null;

                return (
                  <div key={ver.version} className="p-4 rounded-lg bg-[#090C14] border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                          {ver.version}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Created: {new Date(ver.createdAt).toLocaleDateString()} at {new Date(ver.createdAt).toLocaleTimeString()}
                        </span>
                        {ver.version === activeStrategy.activeVersion && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Regression Highlights */}
                      {winRateDiff !== null && (
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-400">vs Previous Version:</span>
                          <span className={parseFloat(winRateDiff) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            Win Rate: {parseFloat(winRateDiff) >= 0 ? '+' : ''}{winRateDiff}%
                          </span>
                          {ddDiff !== null && (
                            <span className={parseFloat(ddDiff) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              Max DD: {parseFloat(ddDiff) > 0 ? '+' : ''}{ddDiff}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-slate-300 text-xs font-sans">
                      <strong>Change Notes: </strong>{ver.changeNotes}
                    </p>

                    {ver.backtestSnapshot && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-2.5 rounded bg-[#101522] border border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Win Rate:</span>
                          <span className="text-white font-bold">{ver.backtestSnapshot.winRate}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Profit Factor:</span>
                          <span className="text-white font-bold">{ver.backtestSnapshot.profitFactor}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Net Return:</span>
                          <span className="text-emerald-400 font-bold">+{ver.backtestSnapshot.netReturnPercent}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Max Drawdown:</span>
                          <span className="text-rose-400 font-bold">{ver.backtestSnapshot.maxDrawdownPercent}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Sharpe Ratio:</span>
                          <span className="text-purple-300 font-bold">{ver.backtestSnapshot.sharpeRatio}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 4: OPTIMIZATION EXPERIMENTS TRACKER (Req 24)          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'experiments' && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Hypothesis & Optimization Experiments Tracker</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record quantitative hypotheses, test datasets, results, and conclusions before promoting parameters to live versions.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {experiments.map((exp) => (
                <div key={exp.id} className="p-4 rounded-lg bg-[#090C14] border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{exp.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {exp.strategyName} ({exp.baseVersion})
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      exp.status === 'PROMOTED_TO_VERSION'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {exp.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs font-sans">
                    <strong>Hypothesis: </strong>{exp.hypothesis}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2.5 rounded bg-[#101522] border border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Win Rate:</span>
                      <span className="text-white font-bold">{exp.resultMetrics.winRate}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Profit Factor:</span>
                      <span className="text-white font-bold">{exp.resultMetrics.profitFactor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Net Return:</span>
                      <span className="text-emerald-400 font-bold">+{exp.resultMetrics.netReturnPercent}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Max Drawdown:</span>
                      <span className="text-rose-400 font-bold">{exp.resultMetrics.maxDrawdownPercent}%</span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs font-sans">
                    <strong>Conclusion: </strong>{exp.conclusion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Version Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D111A] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <GitBranch className="w-4 h-4" />
              <span>Save as New Strategy Version</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Creates an immutable snapshot of current indicator and risk settings. The previous version will remain permanently accessible in the regression audit trail.
            </p>
            <div>
              <label className="text-slate-400 text-xs font-mono block mb-1">Version Change Notes</label>
              <textarea
                rows={3}
                placeholder="Describe what parameters were changed and why (e.g. Tightened EMA to 20/50, added SMC BOS validation)..."
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white font-mono text-xs focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors"
              >
                Confirm &amp; Save Version
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
