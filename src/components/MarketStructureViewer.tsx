import React, { useState } from 'react';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Info,
  Maximize2,
  BookmarkCheck,
  Zap,
  Target,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

interface SwingMarker {
  index: number;
  label: 'HH' | 'HL' | 'LH' | 'LL';
  price: number;
  bar: string;
  type: 'HIGH' | 'LOW';
}

interface StructuralEventItem {
  id: string;
  type: 'BOS_BULLISH' | 'BOS_BEARISH' | 'CHOCH_BULLISH' | 'CHOCH_BEARISH' | 'SWEEP_HIGH' | 'SWEEP_LOW';
  title: string;
  price: number;
  time: string;
  significance: 'HIGH' | 'MEDIUM';
  description: string;
}

interface ReactionZone {
  type: 'SUPPORT' | 'RESISTANCE';
  name: string;
  lower: number;
  upper: number;
  mid: number;
  touches: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
}

export const MarketStructureViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visual_structure' | 'events_log' | 'reaction_zones' | 'pivot_calculator' | 'curriculum'>('visual_structure');
  const [pivotWindow, setPivotWindow] = useState<number>(3);
  const [requireCandleClose, setRequireCandleClose] = useState<boolean>(true);
  const [zoneTolerancePct, setZoneTolerancePct] = useState<number>(0.45);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Mock structured swing sequence on BTC/USDT 4H
  const swings: SwingMarker[] = [
    { index: 1, label: 'LL', price: 83200.0, bar: 'Sep 22 00:00', type: 'LOW' },
    { index: 2, label: 'LH', price: 85400.0, bar: 'Sep 24 12:00', type: 'HIGH' },
    { index: 3, label: 'HL', price: 84150.0, bar: 'Sep 26 08:00', type: 'LOW' },
    { index: 4, label: 'HH', price: 87800.0, bar: 'Sep 28 16:00', type: 'HIGH' },
    { index: 5, label: 'HL', price: 86450.0, bar: 'Sep 30 04:00', type: 'LOW' },
    { index: 6, label: 'HH', price: 89920.0, bar: 'Oct 01 20:00', type: 'HIGH' },
    { index: 7, label: 'HL', price: 88100.0, bar: 'Oct 02 04:00', type: 'LOW' },
  ];

  const structuralEvents: StructuralEventItem[] = [
    {
      id: 'e-1',
      type: 'CHOCH_BULLISH',
      title: 'Bullish Change of Character (CHoCH)',
      price: 85400.0,
      time: 'Sep 27 04:00',
      significance: 'HIGH',
      description: '4H candle closed firmly above the previous Lower High ($85,400), ending the intermediate downtrend.',
    },
    {
      id: 'e-2',
      type: 'BOS_BULLISH',
      title: 'Bullish Break of Structure (BOS)',
      price: 87800.0,
      time: 'Oct 01 08:00',
      significance: 'HIGH',
      description: 'Trend continuation confirmation: 4H close above swing high ($87,800) accompanied by 1.6x RVOL expansion.',
    },
    {
      id: 'e-3',
      type: 'SWEEP_HIGH',
      title: 'Liquidity Sweep / Stop Hunt at Resistance',
      price: 89920.0,
      time: 'Oct 01 20:00',
      significance: 'MEDIUM',
      description: 'Wick pierced above $89,500 psychological liquidity pool, but closed back at $88,850 with pin-bar wick rejection.',
    },
  ];

  const reactionZones: ReactionZone[] = [
    {
      type: 'RESISTANCE',
      name: 'Macro Liquidity & Resistance Cluster',
      lower: 89600.0,
      upper: 90250.0,
      mid: 89925.0,
      touches: 3,
      strength: 'STRONG',
    },
    {
      type: 'RESISTANCE',
      name: 'Intermediate Supply Band',
      lower: 88900.0,
      upper: 89300.0,
      mid: 89100.0,
      touches: 2,
      strength: 'MODERATE',
    },
    {
      type: 'SUPPORT',
      name: 'Dynamic 4H Demand & Retest Zone',
      lower: 87800.0,
      upper: 88250.0,
      mid: 88025.0,
      touches: 4,
      strength: 'STRONG',
    },
    {
      type: 'SUPPORT',
      name: 'Structural Baseline Support (Previous BOS)',
      lower: 86150.0,
      upper: 86600.0,
      mid: 86375.0,
      touches: 3,
      strength: 'STRONG',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Phase 4 Header */}
      <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Phase 4 Active
                </span>
                <span className="text-xs text-slate-400 font-mono">Market Structure & Key Levels</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">
                Market Structure Engine, BOS / CHoCH & Reaction Zones
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fractal swing detection (HH, HL, LH, LL), structural break verification, liquidity sweep detection, and clustered S/R zones.
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B] text-xs font-medium">
            <button
              onClick={() => setActiveTab('visual_structure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'visual_structure' ? 'bg-[#1E293B] text-amber-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Structure Map
            </button>
            <button
              onClick={() => setActiveTab('events_log')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'events_log' ? 'bg-[#1E293B] text-amber-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              BOS & CHoCH Events
            </button>
            <button
              onClick={() => setActiveTab('reaction_zones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'reaction_zones' ? 'bg-[#1E293B] text-amber-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              S/R Zones
            </button>
            <button
              onClick={() => setActiveTab('pivot_calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'pivot_calculator' ? 'bg-[#1E293B] text-amber-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              Pivot Points
            </button>
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'curriculum' ? 'bg-[#1E293B] text-amber-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              SMC vs Dow Theory
            </button>
          </div>
        </div>
      </div>

      {/* TOP TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
          <span className="text-slate-400 text-xs flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            Market Regime
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold text-emerald-400 font-mono">STRONG_UPTREND</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">Bias: Bullish (HH + HL)</span>
        </div>

        <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
          <span className="text-slate-400 text-xs flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Last Confirmed BOS
          </span>
          <span className="text-lg font-bold text-white font-mono mt-1.5 block">
            $87,800.00
          </span>
          <span className="text-[11px] text-emerald-400 font-mono mt-1 block">Trend Continuation Intact</span>
        </div>

        <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
          <span className="text-slate-400 text-xs flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            Reversal Risk (CHoCH)
          </span>
          <span className="text-sm font-bold text-slate-200 font-mono mt-2 block">
            Below $86,450 (HL)
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">Invalidation Level for Bulls</span>
        </div>

        <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
          <span className="text-slate-400 text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Confirmation Gate
          </span>
          <span className="text-sm font-bold text-amber-300 font-mono mt-2 block">
            Candle Close Required
          </span>
          <span className="text-[11px] text-slate-500 font-mono mt-1 block">Prevents Wick Fakeouts</span>
        </div>
      </div>

      {/* TAB 1: VISUAL STRUCTURE MAP */}
      {activeTab === 'visual_structure' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                Structural Swings & Dynamic Zones Mapping (BTC/USDT 4H)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sequential progression of Higher Highs (HH), Higher Lows (HL), and Key Reaction Zones.
              </p>
            </div>

            {/* Config Sliders */}
            <div className="flex items-center gap-4 bg-[#0B0E17] p-2 rounded-lg border border-[#1E293B] text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Fractal Window:</span>
                <span className="text-amber-400 font-bold">{pivotWindow} bars</span>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={pivotWindow}
                  onChange={(e) => setPivotWindow(Number(e.target.value))}
                  className="w-16 accent-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Close Filter:</span>
                <button
                  onClick={() => setRequireCandleClose(!requireCandleClose)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    requireCandleClose ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {requireCandleClose ? 'STRICT CLOSE' : 'WICK TOUCH'}
                </button>
              </div>
            </div>
          </div>

          {/* Graphical Representation of Structural Points */}
          <div className="bg-[#0B0E17] border border-[#1E293B] rounded-xl p-6 relative overflow-hidden">
            <div className="text-[11px] font-mono text-slate-500 flex justify-between pb-3 border-b border-[#1E293B]">
              <span>Price Action Schematic (4H Interval)</span>
              <span className="text-emerald-400 font-bold">Trend: Bullish Structure Verified</span>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="h-64 w-full relative mt-4">
              <svg className="w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="40" x2="800" y2="40" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="800" y2="100" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="0" y1="160" x2="800" y2="160" stroke="#1E293B" strokeDasharray="3 3" />
                <line x1="0" y1="210" x2="800" y2="210" stroke="#1E293B" strokeDasharray="3 3" />

                {/* Supply Zone Band (Top) */}
                <rect x="0" y="30" width="800" height="35" fill="#EF4444" fillOpacity="0.08" />
                <text x="790" y="48" textAnchor="end" fill="#F87171" fontSize="10" fontFamily="monospace">Supply Zone: $89,600 - $90,250</text>

                {/* Demand Zone Band (Mid-Low) */}
                <rect x="0" y="115" width="800" height="35" fill="#10B981" fillOpacity="0.08" />
                <text x="790" y="132" textAnchor="end" fill="#34D399" fontSize="10" fontFamily="monospace">Demand Zone: $87,800 - $88,250</text>

                {/* Structural Trendline connecting swings */}
                {/* 1(80, 210) -> 2(180, 160) -> 3(280, 185) -> 4(420, 95) -> 5(520, 135) -> 6(660, 45) -> 7(740, 105) */}
                <polyline
                  points="80,210 180,160 280,185 420,95 520,135 660,45 740,105"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* BOS Level Line at 420,95 extended */}
                <line x1="420" y1="95" x2="660" y2="95" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 2" />
                <rect x="470" y="82" width="90" height="18" rx="3" fill="#064E3B" stroke="#10B981" strokeWidth="1" />
                <text x="515" y="94" textAnchor="middle" fill="#6EE7B7" fontSize="9" fontWeight="bold" fontFamily="monospace">BOS CONFIRMED</text>

                {/* CHoCH Level Line at 180,160 */}
                <line x1="180" y1="160" x2="420" y2="160" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 2" />
                <rect x="230" y="148" width="110" height="18" rx="3" fill="#78350F" stroke="#F59E0B" strokeWidth="1" />
                <text x="285" y="160" textAnchor="middle" fill="#FDE68A" fontSize="9" fontWeight="bold" fontFamily="monospace">BULLISH CHoCH</text>

                {/* Swing Markers */}
                {/* 1. LL */}
                <circle cx="80" cy="210" r="5" fill="#EF4444" />
                <text x="80" y="230" textAnchor="middle" fill="#F87171" fontSize="10" fontWeight="bold" fontFamily="monospace">LL ($83.2k)</text>

                {/* 2. LH */}
                <circle cx="180" cy="160" r="5" fill="#F59E0B" />
                <text x="180" y="145" textAnchor="middle" fill="#FCD34D" fontSize="10" fontWeight="bold" fontFamily="monospace">LH ($85.4k)</text>

                {/* 3. HL */}
                <circle cx="280" cy="185" r="5" fill="#10B981" />
                <text x="280" y="205" textAnchor="middle" fill="#6EE7B7" fontSize="10" fontWeight="bold" fontFamily="monospace">HL ($84.1k)</text>

                {/* 4. HH */}
                <circle cx="420" cy="95" r="5" fill="#10B981" />
                <text x="420" y="80" textAnchor="middle" fill="#6EE7B7" fontSize="10" fontWeight="bold" fontFamily="monospace">HH ($87.8k)</text>

                {/* 5. HL */}
                <circle cx="520" cy="135" r="5" fill="#10B981" />
                <text x="520" y="155" textAnchor="middle" fill="#6EE7B7" fontSize="10" fontWeight="bold" fontFamily="monospace">HL ($86.4k)</text>

                {/* 6. HH (Liquidity Sweep) */}
                <circle cx="660" cy="45" r="6" fill="#F59E0B" stroke="#EF4444" strokeWidth="2" />
                <text x="660" y="30" textAnchor="middle" fill="#FBBF24" fontSize="10" fontWeight="bold" fontFamily="monospace">HH ($89.9k) ⚡ Sweep</text>

                {/* 7. Current HL */}
                <circle cx="740" cy="105" r="5" fill="#38BDF8" className="animate-pulse" />
                <text x="740" y="125" textAnchor="middle" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace">Current ($88.4k)</text>
              </svg>
            </div>

            {/* Legend Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1E293B] text-[11px] font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  HH / HL = Bullish Market Structure
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-3 h-0.5 bg-cyan-400" />
                  BOS = Break of Structure (Trend Continuation)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-3 h-0.5 bg-amber-400" />
                  CHoCH = Change of Character (Trend Reversal)
                </span>
              </div>
              <span className="text-slate-500">Methodology: Fractal Swings + Density Clustering</span>
            </div>
          </div>

          {/* Swings Detailed Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified Structural Swing Sequence
            </h4>
            <div className="border border-[#1E293B] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0E17] text-slate-400 border-b border-[#1E293B]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Pivot Price</th>
                    <th className="py-2.5 px-3">Time Period</th>
                    <th className="py-2.5 px-3 font-sans">Structural Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {swings.map((s) => (
                    <tr key={s.index} className="hover:bg-[#151C2C]/50">
                      <td className="py-2 px-3 text-slate-500">{s.index}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          s.label === 'HH' || s.label === 'HL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-bold">{s.type}</td>
                      <td className="py-2 px-3 text-white font-bold">${s.price.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                      <td className="py-2 px-3 text-slate-400">{s.bar}</td>
                      <td className="py-2 px-3 font-sans text-slate-400 text-xs">
                        {s.label === 'HH' ? 'Formed higher peak exceeding previous high; confirmed bullish demand.' :
                         s.label === 'HL' ? 'Pullback defended above previous low; buyer absorption validated.' :
                         s.label === 'LH' ? 'Rally exhausted beneath prior peak.' : 'Lower trough formed in prior downtrend.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOS & CHOCH EVENTS LOG */}
      {activeTab === 'events_log' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Structural Event Log (BOS, CHoCH, Liquidity Sweeps)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verified price action milestones marking trend continuation, structural shifts, and institutional liquidity traps.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {structuralEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-[#0B0E17] border border-[#1E293B] hover:border-slate-700 rounded-lg p-4 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      evt.type.includes('BULLISH') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      evt.type.includes('SWEEP') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {evt.type}
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">{evt.title}</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{evt.time}</span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">{evt.description}</p>

                <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                  <span>Trigger Level: <strong className="text-white">${evt.price.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>Confirmation: <strong className="text-emerald-400">Verified (4H Bar Close)</strong></span>
                  <span>•</span>
                  <span>Significance: <strong className={evt.significance === 'HIGH' ? 'text-purple-400' : 'text-amber-400'}>{evt.significance}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC REACTION ZONES */}
      {activeTab === 'reaction_zones' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Dynamic Support & Resistance Reaction Zones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clustered price density zones where institutional orders, previous swing pivots, and volume profiles converge.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Tolerance: ±{zoneTolerancePct}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reactionZones.map((z, i) => (
              <div
                key={i}
                className={`bg-[#0B0E17] border p-4 rounded-lg space-y-2 transition-all ${
                  z.type === 'SUPPORT' ? 'border-emerald-500/30 hover:border-emerald-500/60' : 'border-rose-500/30 hover:border-rose-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${z.type === 'SUPPORT' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <h4 className="text-sm font-bold text-white font-mono">{z.name}</h4>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    z.type === 'SUPPORT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {z.type}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Zone Range</span>
                    <span className="text-slate-200 font-bold text-xs">${z.lower.toLocaleString()} – ${z.upper.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Median Anchor</span>
                    <span className="text-amber-400 font-bold text-xs">${z.mid.toLocaleString()}</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Pivots Clustered</span>
                    <span className="text-cyan-400 font-bold text-xs">{z.touches} Touches ({z.strength})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PIVOT POINTS CALCULATOR */}
      {activeTab === 'pivot_calculator' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Multi-Method Mathematical Pivot Levels
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Classical Floor, Fibonacci Retracement, and Camarilla Intraday Range Levels calculated for BTC/USDT.
              </p>
            </div>
            <span className="text-xs font-mono text-purple-300">Period: Daily Session</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Classical Floor */}
            <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>Classical Floor Pivots</span>
                <span className="text-amber-400 text-[10px]">P = (H+L+C)/3</span>
              </h4>
              <div className="space-y-1.5 font-mono text-xs pt-1">
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-400 font-bold">Resistance 3 (R3)</span>
                  <span className="text-slate-200 font-bold">$92,440.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-400">Resistance 2 (R2)</span>
                  <span className="text-slate-200 font-bold">$90,680.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-300">Resistance 1 (R1)</span>
                  <span className="text-slate-200 font-bold">$89,565.00</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-amber-500/10 border border-amber-500/30">
                  <span className="text-amber-400 font-bold">Central Pivot (P)</span>
                  <span className="text-amber-300 font-bold">$87,805.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-300">Support 1 (S1)</span>
                  <span className="text-slate-200 font-bold">$86,690.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400">Support 2 (S2)</span>
                  <span className="text-slate-200 font-bold">$84,930.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400 font-bold">Support 3 (S3)</span>
                  <span className="text-slate-200 font-bold">$83,815.00</span>
                </div>
              </div>
            </div>

            {/* Fibonacci Pivots */}
            <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>Fibonacci Pivots</span>
                <span className="text-cyan-400 text-[10px]">Ratios: 0.382, 0.618</span>
              </h4>
              <div className="space-y-1.5 font-mono text-xs pt-1">
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-400 font-bold">Fib R3 (1.000)</span>
                  <span className="text-slate-200 font-bold">$92,515.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-400">Fib R2 (0.618)</span>
                  <span className="text-slate-200 font-bold">$90,713.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-300">Fib R1 (0.382)</span>
                  <span className="text-slate-200 font-bold">$89,598.00</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-cyan-400 font-bold">Central Pivot (P)</span>
                  <span className="text-cyan-300 font-bold">$87,805.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-300">Fib S1 (0.382)</span>
                  <span className="text-slate-200 font-bold">$86,012.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400">Fib S2 (0.618)</span>
                  <span className="text-slate-200 font-bold">$84,897.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400 font-bold">Fib S3 (1.000)</span>
                  <span className="text-slate-200 font-bold">$83,095.00</span>
                </div>
              </div>
            </div>

            {/* Camarilla Pivots */}
            <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
                <span>Camarilla Equations</span>
                <span className="text-purple-400 text-[10px]">Range Reversal vs Breakout</span>
              </h4>
              <div className="space-y-1.5 font-mono text-xs pt-1">
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-rose-400 font-bold">R4 (Breakout Long)</span>
                  <span className="text-slate-200 font-bold">$90,805.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-amber-400 font-bold">R3 (Mean Revert Short)</span>
                  <span className="text-slate-200 font-bold">$89,627.50</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400">R2</span>
                  <span className="text-slate-300 font-bold">$88,842.50</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400">R1</span>
                  <span className="text-slate-300 font-bold">$88,450.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400">S1</span>
                  <span className="text-slate-300 font-bold">$88,057.50</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400 font-bold">S3 (Mean Revert Long)</span>
                  <span className="text-slate-200 font-bold">$86,880.00</span>
                </div>
                <div className="flex justify-between py-1 px-2 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-emerald-400 font-bold">S4 (Breakout Short)</span>
                  <span className="text-slate-200 font-bold">$85,702.50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CURRICULUM & SMC VS DOW THEORY */}
      {activeTab === 'curriculum' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-amber-400" />
              Phase 4 Curriculum: Market Structure, SMC & Dow Theory
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Comparing classical technical analysis with modern institutional order flow concepts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Concept 1 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">1</span>
                BOS (Break of Structure) vs CHoCH (Change of Character)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                In classical Dow Theory, an uptrend is defined by consecutive Higher Highs and Higher Lows.
                In Smart Money Concepts (SMC):
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                  <li><strong className="text-emerald-400">BOS (Continuation):</strong> A break of the previous swing high confirms existing trend continuation.</li>
                  <li><strong className="text-amber-400">CHoCH (Reversal):</strong> The first break below the last swing Higher Low (HL) signals a structural shift from bullish to bearish.</li>
                </ul>
              </p>
            </div>

            {/* Concept 2 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">2</span>
                Liquidity Sweeps & Stop Hunts (Turtle Soup)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Retail breakout traders place stop orders immediately above obvious swing highs and below swing lows.
                Institutional participants use this resting liquidity to fill large order books without moving price against themselves. A <strong className="text-cyan-300">Liquidity Sweep</strong> occurs when a candle wick triggers those stops, but candle bodies close back inside the range, creating high-probability mean-reversion setups.
              </p>
            </div>

            {/* Concept 3 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
                Reaction Zones vs. Exact Arbitrary Price Lines
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Treating support or resistance as an exact penny price (e.g. exactly $88,000.00) leads to false invalidations and premature stop outs. Real institutional resting limit orders are distributed across depth bands. Our algorithm clusters swing pivots within a configurable tolerance (e.g. ±0.45%) into <strong className="text-purple-300">Dynamic Reaction Zones</strong> with upper and lower boundary ranges.
              </p>
            </div>

            {/* Concept 4 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-xs">4</span>
                Algorithmic Approximation Disclaimer
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Market structure is a mathematical approximation of collective participant psychology, not a deterministic natural law. Structural detections must always be treated as probabilistic supporting evidence rather than guaranteed trade outcomes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
