import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  StrategySignal,
  AVAILABLE_STRATEGIES,
  StrategyDefinition
} from '../services/strategies';
import { INDICATOR_EXPLANATIONS } from '../services/indicators';

interface StrategyEngineViewerProps {
  activeSignal: StrategySignal;
  allSignals: StrategySignal[];
  symbol: string;
  timeframe: string;
  onExecuteSimulatedTrade?: (action: 'LONG' | 'SHORT', entry: number, sl: number, tp: number) => void;
}

export const StrategyEngineViewer: React.FC<StrategyEngineViewerProps> = ({
  activeSignal,
  allSignals,
  symbol,
  timeframe,
  onExecuteSimulatedTrade
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(activeSignal.strategyId);
  const [showExplanationMode, setShowExplanationMode] = useState<boolean>(true);
  const [enabledStrategies, setEnabledStrategies] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    AVAILABLE_STRATEGIES.forEach(s => { init[s.id] = s.enabled; });
    return init;
  });

  const toggleStrategy = (id: string) => {
    setEnabledStrategies(prev => ({ ...prev, [id]: !prev[id] }));
    const s = AVAILABLE_STRATEGIES.find(x => x.id === id);
    if (s) s.enabled = !s.enabled;
  };

  const displayedSignal = allSignals.find(s => s.strategyId === selectedStrategyId) || activeSignal;
  const isLong = displayedSignal.action === 'LONG SETUP';
  const isShort = displayedSignal.action === 'SHORT SETUP';

  return (
    <div className="space-y-6">
      {/* 1. Header & Strategy Switcher */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                Rule-Based Quantitative Strategy Engine
              </span>
              <span className="text-slate-500 text-xs font-mono">
                {symbol} · {timeframe} · 8 Modular Strategies
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Multi-Strategy Signal Generator & Confluence Evaluator</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Transparent, deterministic algorithmic evaluations. Signals reflect strict quantitative rule alignment,
              not subjective opinions or guaranteed market certainty. Every signal includes clear invalidation criteria and counter-evidence.
            </p>
          </div>

          {/* Quick Toggle for Explanation Mode */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplanationMode(!showExplanationMode)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border transition-all flex items-center gap-1.5 ${
                showExplanationMode
                  ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Explanation Mode: {showExplanationMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* 2. Modular Strategy Switcher Ribbon */}
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>SELECT STRATEGY VIEW & TOGGLE MODULAR ENGINES:</span>
            <span className="text-slate-500">Enable/disable strategies independently</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVAILABLE_STRATEGIES.map(strat => {
              const sig = allSignals.find(s => s.strategyId === strat.id);
              const isSelected = selectedStrategyId === strat.id;
              const isEnabled = enabledStrategies[strat.id] ?? true;

              return (
                <div
                  key={strat.id}
                  onClick={() => setSelectedStrategyId(strat.id)}
                  className={`p-2.5 rounded border text-xs font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                      : 'bg-[#07090E] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  } ${!isEnabled ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate max-w-[140px]">{strat.name.split('(')[0]}</span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleStrategy(strat.id);
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      title={isEnabled ? 'Disable this strategy' : 'Enable this strategy'}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-slate-800/50">
                    <span className={`font-bold ${
                      sig?.action === 'LONG SETUP' ? 'text-emerald-400' :
                      sig?.action === 'SHORT SETUP' ? 'text-rose-400' :
                      sig?.action === 'WAIT' ? 'text-amber-400' : 'text-slate-500'
                    }`}>
                      {sig?.action || 'NO SETUP'}
                    </span>
                    <span className="text-slate-500">{sig?.confidenceScore || 0}% score</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Active Selected Signal Detail Card */}
      <div className={`bg-[#0F1420] border rounded-lg p-5 space-y-5 transition-all ${
        isLong
          ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
          : isShort
          ? 'border-rose-500/40 ring-1 ring-rose-500/20'
          : 'border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 ${
                isLong
                  ? 'bg-emerald-500 text-slate-950'
                  : isShort
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : isShort ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                <span>{displayedSignal.action}</span>
              </span>
              <span className="text-xs font-mono text-slate-400">
                via {displayedSignal.strategyName}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1">
              Market Regime: <strong className="text-white">{displayedSignal.regime.regime}</strong> ({displayedSignal.regime.trendStrength}% Trend Strength)
            </div>
          </div>

          {/* Confidence Score Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 block">RULE CONFLUENCE SCORE</span>
              <span className="text-base font-bold text-white">{displayedSignal.confidenceScore} / 100</span>
            </div>
            {onExecuteSimulatedTrade && (isLong || isShort) && (
              <button
                onClick={() => onExecuteSimulatedTrade(
                  isLong ? 'LONG' : 'SHORT',
                  displayedSignal.entryMid,
                  displayedSignal.stopLoss,
                  displayedSignal.target2
                )}
                className={`px-4 py-2 rounded text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-md ${
                  isLong
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Simulate {isLong ? 'Long' : 'Short'} Execution</span>
              </button>
            )}
          </div>
        </div>

        {/* Exact Parameters Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono tabular-nums">
          <div className="bg-[#07090E] p-3 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">RECOMMENDED ENTRY</div>
            <div className="text-sm font-bold text-white mt-0.5">
              ${displayedSignal.entryMin.toLocaleString()} – ${displayedSignal.entryMax.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#07090E] p-3 rounded border border-rose-950/40 border-l-2 border-l-rose-500">
            <div className="text-[10px] text-rose-400 font-semibold">HARD STOP-LOSS</div>
            <div className="text-sm font-bold text-rose-300 mt-0.5">
              ${displayedSignal.stopLoss.toLocaleString()} ({displayedSignal.stopDistancePct}%)
            </div>
          </div>

          <div className="bg-[#07090E] p-3 rounded border border-emerald-950/40 border-l-2 border-l-emerald-500">
            <div className="text-[10px] text-emerald-400 font-semibold">TARGET 1 (CONSERVATIVE)</div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5">
              ${displayedSignal.target1.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#07090E] p-3 rounded border border-emerald-950/40 border-l-2 border-l-emerald-500">
            <div className="text-[10px] text-emerald-400 font-semibold">TARGET 2 (STANDARD)</div>
            <div className="text-sm font-bold text-emerald-300 mt-0.5">
              ${displayedSignal.target2.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#07090E] p-3 rounded border border-cyan-950/40 border-l-2 border-l-cyan-500">
            <div className="text-[10px] text-cyan-400 font-semibold">RISK / REWARD RATIO</div>
            <div className="text-sm font-bold text-cyan-300 mt-0.5">
              1 : {displayedSignal.riskRewardRatio}
            </div>
          </div>
        </div>

        {/* Reasons Supporting vs Reasons Against */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Supporting Evidence */}
          <div className="bg-[#07090E] p-3.5 rounded border border-emerald-950/50 space-y-2">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>REASONS SUPPORTING SETUP ({displayedSignal.reasonsSupporting.length})</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              {displayedSignal.reasonsSupporting.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contrary Evidence & Risks */}
          <div className="bg-[#07090E] p-3.5 rounded border border-amber-950/50 space-y-2">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>REASONS AGAINST SETUP & RISK FACTORS ({displayedSignal.reasonsAgainst.length})</span>
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              {displayedSignal.reasonsAgainst.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">!</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Invalidation Rules */}
        <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded text-xs font-mono">
          <div className="flex items-center gap-1.5 text-rose-300 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>EXACT INVALIDATION CRITERIA:</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {displayedSignal.invalidationCriteria}
          </p>
        </div>
      </div>

      {/* 4. "WHY THIS SETUP WAS DETECTED" Explanation Mode */}
      {showExplanationMode && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm">
                EXPLANATION MODE: Why This Setup Was Detected
              </h3>
            </div>
            <span className="text-[10px] text-slate-500">Deconstructing Algorithmic Confluence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#07090E] p-3 rounded border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">1. Trend Confirmation</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Evaluates EMA 21 and EMA 50 alignment against closing price action.
                {isLong ? ' Fast EMA 21 above EMA 50 confirms upward velocity.' :
                 isShort ? ' Fast EMA 21 below EMA 50 confirms downward drift.' : ' Trend filters are currently neutral.'}
              </p>
            </div>

            <div className="bg-[#07090E] p-3 rounded border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">2. Structure Confirmation</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Requires confirmed candle close above prior swing high (BOS) or shift in higher lows (CHoCH).
                Avoids wick-only liquidity sweeps.
              </p>
            </div>

            <div className="bg-[#07090E] p-3 rounded border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase">3. Momentum & Volume</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Validates RSI trajectory and checks for relative volume expansion (RVOL &gt; 1.0)
                to confirm institutional market participation.
              </p>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="p-3 rounded bg-[#07090E] border border-slate-800 text-[10px] text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Educational Trading Disclaimer:</strong> The confidence score is a rule-counting alignment metric,
              NOT a statistical win rate or probability of future profit. Financial markets are subject to macroeconomic regime shifts,
              liquidity shocks, and volatility expansions. Always use strict stop losses and risk &le; 1-2% per trade.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
