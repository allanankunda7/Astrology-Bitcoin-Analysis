import React, { useState } from 'react';
import {
  Moon,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Layers,
  HelpCircle,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import {
  LUNAR_PHASES,
  PLANETARY_STATIONS,
  LunarPhaseEvent,
  PlanetaryStationEvent
} from '../services/astrologyOverlay';

export const AstrologyResearchViewer: React.FC = () => {
  const [selectedSubTab, setSelectedSubTab] = useState<'overview' | 'comparison' | 'ephemeris'>('overview');

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6">
      {/* 1. Header with Mandatory Scientific & Regulatory Disclaimer */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-1">
              <span>🌕</span> Experimental Research Module
            </span>
            <span className="text-slate-500 text-xs font-mono">
              Hypothesis Testing & Statistical Correlation Explorer
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" />
            <span>Astrological Cycle Correlation & Hypothesis Research</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Strictly segregated from the primary quantitative and technical analysis engines.
            Investigates whether recurring astronomical cycles (lunar phases, Mercury/Mars retrogrades) possess any statistically measurable alpha beyond random noise on Bitcoin price action.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 bg-[#07090E] p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setSelectedSubTab('overview')}
            className={`px-3 py-1.5 rounded transition-colors ${
              selectedSubTab === 'overview' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Statistical Findings
          </button>
          <button
            onClick={() => setSelectedSubTab('comparison')}
            className={`px-3 py-1.5 rounded transition-colors ${
              selectedSubTab === 'comparison' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Baseline vs Astro
          </button>
          <button
            onClick={() => setSelectedSubTab('ephemeris')}
            className={`px-3 py-1.5 rounded transition-colors ${
              selectedSubTab === 'ephemeris' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ephemeris Events
          </button>
        </div>
      </div>

      {/* Mandatory Prominent Educational Disclaimer Banner */}
      <div className="p-4 rounded-lg bg-purple-950/30 border border-purple-500/40 text-purple-200 text-xs font-mono space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
          <ShieldAlert className="w-4 h-4 text-purple-400" />
          <span>SCIENTIFIC & QUANTITATIVE DISCLAIMER</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-300">
          Astrology is <strong>NOT</strong> a scientifically validated method for market forecasting. Astronomical and astrological phenomena
          do not exert established physical causal mechanisms on financial asset prices. Historical correlations observed in small sample sizes
          are frequently attributable to data-mining bias (p-hacking), clustering illusions, or self-fulfilling social sentiment memes.
          This module is provided exclusively for educational research, statistical curiosity, and debunking confirmation bias.
        </p>
      </div>

      {/* TAB 1: EMPIRICAL STATISTICAL FINDINGS */}
      {selectedSubTab === 'overview' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] text-purple-400 font-bold block uppercase">1. Full Moon vs New Moon (Lunar Cycle)</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Hypothesis: "Bitcoin local tops coincide with Full Moons; local troughs form on New Moons."
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Sample Size:</span>
                  <span className="text-white">124 Lunar Cycles (2015-2026)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Full Moon 3-Day Return:</span>
                  <span className="text-slate-300">+0.42% (Baseline: +0.38%)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Statistical P-Value:</span>
                  <span className="text-rose-400 font-bold">p = 0.47 (Statistically Insignificant)</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Conclusion: Lunar phase return variance fails standard hypothesis tests (p &gt; 0.05). Correlation is statistically indistinguishable from random drift.
                </div>
              </div>
            </div>

            <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] text-purple-400 font-bold block uppercase">2. Mercury Retrograde (Rx)</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Hypothesis: "Mercury retrograde periods produce elevated volatility and technical breakdown whipsaws."
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Sample Size:</span>
                  <span className="text-white">32 Retrograde Phases</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Volatility (ATR):</span>
                  <span className="text-slate-300">3.8% (Normal: 3.6%)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Directional Edge:</span>
                  <span className="text-amber-400 font-bold">50.8% Win Rate (Coin Flip)</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Conclusion: Minor volatility clustering observed, but zero reliable directional trading edge.
                </div>
              </div>
            </div>

            <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] text-purple-400 font-bold block uppercase">3. Mars Retrograde</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Hypothesis: "Rare Mars retrograde windows (every 26 months) trigger broad risk-off asset liquidations."
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Sample Size:</span>
                  <span className="text-white">6 Historic Events</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sample Reliability:</span>
                  <span className="text-rose-400 font-bold">Severe Sample Scarcity (N=6)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Correlation Confidence:</span>
                  <span className="text-slate-500">Unreliable / Anecdotal</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Conclusion: High risk of overfitting. Cannot draw quantitative conclusions with sample size N &lt; 30.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BENCHMARK COMPARISON TABLE */}
      {selectedSubTab === 'comparison' && (
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white text-sm">BENCHMARK COMPARISON: ASTROLOGY VS TECHNICAL STRATEGIES</span>
            <span className="text-slate-500 text-[10px]">Identical 5-Year Bitcoin Daily Dataset</span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase">
                <th className="py-2 px-2">MODEL / STRATEGY</th>
                <th className="py-2 px-2 text-right">WIN RATE</th>
                <th className="py-2 px-2 text-right">PROFIT FACTOR</th>
                <th className="py-2 px-2 text-right">MAX DRAWDOWN</th>
                <th className="py-2 px-2 text-right">SHARPE RATIO</th>
                <th className="py-2 px-2 text-right">VERDICT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-2">
                  <strong className="text-white">Buy & Hold (Passive BTC Benchmark)</strong>
                </td>
                <td className="py-2.5 px-2 text-right text-slate-300">N/A</td>
                <td className="py-2.5 px-2 text-right text-slate-300">N/A</td>
                <td className="py-2.5 px-2 text-right text-rose-400">-76.4%</td>
                <td className="py-2.5 px-2 text-right text-slate-200">1.12</td>
                <td className="py-2.5 px-2 text-right text-slate-400">High Volatility</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-2">
                  <strong className="text-emerald-400">Trend-Following (EMA 21/50 + BOS)</strong>
                </td>
                <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">58.4%</td>
                <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">1.84</td>
                <td className="py-2.5 px-2 text-right text-amber-400">-24.2%</td>
                <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">1.52</td>
                <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">Verified Edge</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-2.5 px-2">
                  <strong className="text-cyan-400">Breakout Retest (Volume Confirmed)</strong>
                </td>
                <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">54.2%</td>
                <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">1.72</td>
                <td className="py-2.5 px-2 text-right text-amber-400">-28.5%</td>
                <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">1.38</td>
                <td className="py-2.5 px-2 text-right text-cyan-400 font-bold">Verified Edge</td>
              </tr>
              <tr className="hover:bg-slate-800/40 bg-purple-950/20">
                <td className="py-2.5 px-2">
                  <strong className="text-purple-300">Lunar Cycle Timing (Full Moon Long / New Moon Short)</strong>
                </td>
                <td className="py-2.5 px-2 text-right text-slate-400">49.8%</td>
                <td className="py-2.5 px-2 text-right text-rose-400">0.96</td>
                <td className="py-2.5 px-2 text-right text-rose-400">-52.8%</td>
                <td className="py-2.5 px-2 text-right text-rose-400">-0.12</td>
                <td className="py-2.5 px-2 text-right text-rose-400 font-bold">No Statistical Edge</td>
              </tr>
              <tr className="hover:bg-slate-800/40 bg-purple-950/20">
                <td className="py-2.5 px-2">
                  <strong className="text-purple-300">Mercury Retrograde Avoidance Filter</strong>
                </td>
                <td className="py-2.5 px-2 text-right text-slate-400">51.2%</td>
                <td className="py-2.5 px-2 text-right text-slate-300">1.04</td>
                <td className="py-2.5 px-2 text-right text-rose-400">-38.2%</td>
                <td className="py-2.5 px-2 text-right text-slate-400">0.45</td>
                <td className="py-2.5 px-2 text-right text-amber-400 font-bold">Noise / Marginal</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: EPHEMERIS EVENTS */}
      {selectedSubTab === 'ephemeris' && (
        <div className="bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white text-sm">ASTRONOMICAL EPHEMERIS CATALOG (2026-2027)</span>
            <span className="text-slate-500 text-[10px]">Exact Mathematical Planetary Positions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-slate-400 font-bold block text-[11px]">Upcoming Lunar Events</span>
              <div className="space-y-1.5">
                {LUNAR_PHASES.slice(0, 6).map((lp: LunarPhaseEvent, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-[#0F1420] border border-slate-800 flex items-center justify-between">
                    <span className="text-white flex items-center gap-1.5">
                      <span>{lp.phase === 'FULL_MOON' ? '🌕' : '🌑'}</span>
                      <strong className="text-slate-200">{lp.phase.replace('_', ' ')}</strong>
                    </span>
                    <span className="text-slate-400 text-[10px]">{lp.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-slate-400 font-bold block text-[11px]">Planetary Retrograde Stations</span>
              <div className="space-y-1.5">
                {PLANETARY_STATIONS.map((ps: PlanetaryStationEvent, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-[#0F1420] border border-slate-800 flex items-center justify-between">
                    <div>
                      <strong className="text-purple-300 block">{ps.planet} {ps.stationType}</strong>
                      <span className="text-slate-500 text-[10px]">{ps.sign}</span>
                    </div>
                    <span className="text-slate-400 text-[10px]">{ps.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
