import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MTFAnalysisResult } from '../services/multiTimeframe';

interface MultiTimeframePanelProps {
  mtfData: MTFAnalysisResult;
  symbol: string;
}

export const MultiTimeframePanel: React.FC<MultiTimeframePanelProps> = ({ mtfData, symbol }) => {
  const { htf, mtf, ltf, overallAlignment, alignmentScore, summary, actionableGuidance } = mtfData;

  const isConfluentBull = overallAlignment === 'CONFLUENT_BULLISH';
  const isConfluentBear = overallAlignment === 'CONFLUENT_BEARISH';

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Multi-Timeframe Confluence Engine</span>
              <span className="text-slate-400 font-normal font-mono text-xs">({symbol})</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluates Higher Timeframe (Macro Context), Middle Timeframe (Structure Bias), and Lower Timeframe (Entry Trigger).
            </p>
          </div>
        </div>

        {/* Overall Status Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right font-mono text-xs">
            <span className="text-[10px] text-slate-500 block">CONFLUENCE SCORE</span>
            <span className="font-bold text-white">{alignmentScore} / 100</span>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border ${
            isConfluentBull
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
              : isConfluentBear
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
          }`}>
            {isConfluentBull ? <TrendingUp className="w-3.5 h-3.5" /> : isConfluentBear ? <TrendingDown className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span>{overallAlignment.replace('_', ' ')}</span>
          </span>
        </div>
      </div>

      {/* 3-Tier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[htf, mtf, ltf].map((tier, idx) => {
          const isForex = symbol === 'EUR/USD' || (tier.ema21 !== null && tier.ema21 < 10);
          const fmtEma = (val: number | null) => {
            if (!val) return '-';
            return isForex ? val.toFixed(4) : val.toFixed(1);
          };

          return (
            <div
              key={idx}
              className="bg-[#07090E] border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                    {tier.timeframe}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    tier.trend === 'BULLISH'
                      ? 'text-emerald-400 bg-emerald-950/50'
                      : tier.trend === 'BEARISH'
                      ? 'text-rose-400 bg-rose-950/50'
                      : 'text-slate-400 bg-slate-900'
                  }`}>
                    {tier.trend}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-500 mt-1">
                  {tier.role}
                </div>

                <div className="mt-2.5 space-y-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Regime:</span>
                    <strong className="text-slate-200">{tier.regime.regime}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>EMA 21 / 50:</span>
                    <span className="text-slate-200">
                      ${fmtEma(tier.ema21)} / ${fmtEma(tier.ema50)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>RSI (14):</span>
                    <span className={`font-bold ${tier.rsi && tier.rsi > 50 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {tier.rsi ? tier.rsi.toFixed(1) : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-[#0B0E17] border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed font-mono">
                {tier.keyObservation}
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthesis & Guidance Box */}
      <div className="p-3.5 rounded-lg bg-[#07090E] border border-slate-800/80 space-y-2 font-mono text-xs">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-200">MULTIPLE TIMEFRAME SYNTHESIS</div>
            <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{summary}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-amber-400">
          <span className="font-bold">EXECUTION ADVICE:</span>
          <span className="text-slate-300">{actionableGuidance}</span>
        </div>
      </div>
    </div>
  );
};
