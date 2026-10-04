import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Cpu,
  ShieldCheck,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  RefreshCw,
  Compass,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

interface PipelineMetric {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'good' | 'warning' | 'neutral';
}

export const DataPipelineViewer: React.FC = () => {
  const [selectedSubTab, setSelectedSubTab] = useState<'stream' | 'resampler' | 'indicators' | 'integrity'>('stream');
  const [activeCategory, setActiveCategory] = useState<'trend' | 'momentum' | 'volatility' | 'volume'>('trend');
  const [targetTimeframe, setTargetTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('15m');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [liveTicksCount, setLiveTicksCount] = useState<number>(1420);
  const [currentLatency, setCurrentLatency] = useState<number>(38);
  const [simulatedPrice, setSimulatedPrice] = useState<number>(88465.50);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  // Live WebSocket streaming simulation tick
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setLiveTicksCount((prev) => prev + 1);
      setCurrentLatency(Math.floor(32 + Math.random() * 18));
      setSimulatedPrice((prev) => {
        const delta = (Math.random() - 0.49) * 12.5;
        return Math.round((prev + delta) * 100) / 100;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormula(id);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  // Sample 1-minute incoming micro-bars constructing a higher-timeframe bar
  const sampleMicroBars = [
    { minute: '00', open: 88420.0, high: 88460.0, low: 88410.0, close: 88450.0, vol: 18.2, vwap: 88440.0 },
    { minute: '01', open: 88450.0, high: 88490.0, low: 88445.0, close: 88480.0, vol: 24.5, vwap: 88471.6 },
    { minute: '02', open: 88480.0, high: 88515.0, low: 88470.0, close: 88510.0, vol: 31.0, vwap: 88498.3 },
    { minute: '03', open: 88510.0, high: 88520.0, low: 88460.0, close: 88470.0, vol: 19.8, vwap: 88483.3 },
    { minute: '04', open: 88470.0, high: 88485.0, low: 88440.0, close: 88465.5, vol: 14.6, vwap: 88463.5 },
  ];

  // Calculate aggregated result
  const aggOpen = sampleMicroBars[0].open;
  const aggHigh = Math.max(...sampleMicroBars.map((b) => b.high));
  const aggLow = Math.min(...sampleMicroBars.map((b) => b.low));
  const aggClose = sampleMicroBars[sampleMicroBars.length - 1].close;
  const aggVol = sampleMicroBars.reduce((acc, b) => acc + b.vol, 0);
  const aggVwap = (
    sampleMicroBars.reduce((acc, b) => acc + ((b.high + b.low + b.close) / 3) * b.vol, 0) / aggVol
  ).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Top Banner: Phase 3 Ingestion Engine */}
      <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Phase 3 Active
                </span>
                <span className="text-xs text-slate-400 font-mono">CCXT + Binance WebSockets + Resampler</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">
                Market Data Ingestion Pipeline & Technical Indicators
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sub-second live streaming, zero-lookahead multi-timeframe aggregation, and 16+ vectorized technical indicators.
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B] text-xs font-medium">
            <button
              onClick={() => setSelectedSubTab('stream')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                selectedSubTab === 'stream' ? 'bg-[#1E293B] text-cyan-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              WebSocket Feed
            </button>
            <button
              onClick={() => setSelectedSubTab('resampler')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                selectedSubTab === 'resampler' ? 'bg-[#1E293B] text-cyan-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Multi-Timeframe Engine
            </button>
            <button
              onClick={() => setSelectedSubTab('indicators')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                selectedSubTab === 'indicators' ? 'bg-[#1E293B] text-cyan-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Indicators Suite
            </button>
            <button
              onClick={() => setSelectedSubTab('integrity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                selectedSubTab === 'integrity' ? 'bg-[#1E293B] text-cyan-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Lookahead Shield
            </button>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: LIVE WEBSOCKET TELEMETRY */}
      {selectedSubTab === 'stream' && (
        <div className="space-y-6">
          {/* Real-time Status Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Connection State
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-sm font-bold text-emerald-400 font-mono">LIVE_STREAMING</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Ping: {currentLatency}ms (TLS)</span>
            </div>

            <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Messages Ingested
              </span>
              <span className="text-xl font-bold text-white font-mono mt-1.5 block">
                {liveTicksCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Throughput: ~1.2 msgs/sec</span>
            </div>

            <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Real-Time Spot Tick
              </span>
              <span className="text-xl font-bold text-amber-400 font-mono mt-1.5 block">
                ${simulatedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-emerald-400 font-mono mt-1 block">+3.42% (24h Net)</span>
            </div>

            <div className="bg-[#111622] border border-[#1E293B] p-4 rounded-xl shadow">
              <span className="text-slate-400 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Stream Channel
              </span>
              <span className="text-sm font-bold text-purple-300 font-mono mt-2 block truncate">
                btcusdt@kline_1m
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Binance Public Cluster</span>
            </div>
          </div>

          {/* WebSocket Payload Inspector */}
          <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Binance Raw WebSocket Event Normalizer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Raw JSON payloads from Binance <code className="text-cyan-400 font-mono">wss://stream.binance.com:9443/ws</code> normalized into standard <code className="text-emerald-400 font-mono">MarketCandle</code> schema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold font-mono flex items-center gap-1.5 transition-all ${
                    isStreaming
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isStreaming ? 'animate-spin' : ''}`} />
                  {isStreaming ? 'Pause Feed' : 'Resume Live Feed'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Raw JSON */}
              <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-[11px] pb-1 border-b border-[#1E293B]">
                  <span>Raw Incoming WebSocket Frame</span>
                  <span className="text-cyan-400">JSON String</span>
                </div>
                <pre className="text-cyan-300 text-[11px] overflow-x-auto leading-relaxed">{`{
  "e": "kline",
  "E": ${Date.now()},
  "s": "BTCUSDT",
  "k": {
    "t": ${Date.now() - 34000},
    "T": ${Date.now() + 26000},
    "s": "BTCUSDT",
    "i": "1m",
    "o": "88450.00",
    "c": "${simulatedPrice.toFixed(2)}",
    "h": "${(simulatedPrice + 14.5).toFixed(2)}",
    "l": "${(simulatedPrice - 18.0).toFixed(2)}",
    "v": "24.850",
    "q": "2198450.12",
    "n": 142,
    "x": false // is_closed (bar actively forming)
  }
}`}</pre>
              </div>

              {/* Normalized Candle */}
              <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-slate-500 text-[11px] pb-1 border-b border-[#1E293B]">
                  <span>Normalized Platform MarketCandle</span>
                  <span className="text-emerald-400">SQLAlchemy Compatible</span>
                </div>
                <pre className="text-emerald-300 text-[11px] overflow-x-auto leading-relaxed">{`{
  "symbol": "BTC/USDT",
  "timeframe": "1m",
  "timestamp": "${new Date().toISOString()}",
  "open": 88450.00,
  "high": ${(simulatedPrice + 14.5).toFixed(2)},
  "low": ${(simulatedPrice - 18.0).toFixed(2)},
  "close": ${simulatedPrice.toFixed(2)},
  "volume": 24.850,
  "vwap": ${(simulatedPrice + 2.1).toFixed(2)},
  "is_closed": 0, // In-progress candle (unsealed)
  "verified_geometry": true // high >= max(open, close)
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: MULTI-TIMEFRAME RESAMPLER SIMULATOR */}
      {selectedSubTab === 'resampler' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Multi-Timeframe Resampling Simulator (1m → {targetTimeframe})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Demonstrates mathematical bar aggregation from raw 1-minute incoming micro-bars into standardized higher timeframe candles.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B] text-xs font-mono">
              {(['5m', '15m', '1h', '4h'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTargetTimeframe(tf)}
                  className={`px-3 py-1 rounded transition-colors ${
                    targetTimeframe === tf ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Micro-bars to Aggregated Bar Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left: 5 1-minute Bars */}
            <div className="lg:col-span-7 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Incoming 1-Minute Micro-Bars ({sampleMicroBars.length})</span>
                <span className="text-[10px] text-slate-500 font-mono">Source Feed: 1m</span>
              </h4>
              <div className="border border-[#1E293B] rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B0E17] text-slate-400 border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2 px-2.5">Bar</th>
                      <th className="py-2 px-2.5">Open</th>
                      <th className="py-2 px-2.5">High</th>
                      <th className="py-2 px-2.5">Low</th>
                      <th className="py-2 px-2.5">Close</th>
                      <th className="py-2 px-2.5 text-right">Vol (BTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {sampleMicroBars.map((b, i) => (
                      <tr key={b.minute} className="hover:bg-[#151C2C]/50">
                        <td className="py-2 px-2.5 text-cyan-400 font-bold">10:0{b.minute}</td>
                        <td className="py-2 px-2.5 text-slate-300">${b.open.toFixed(1)}</td>
                        <td className="py-2 px-2.5 text-emerald-400">${b.high.toFixed(1)}</td>
                        <td className="py-2 px-2.5 text-rose-400">${b.low.toFixed(1)}</td>
                        <td className="py-2 px-2.5 text-slate-100 font-bold">${b.close.toFixed(1)}</td>
                        <td className="py-2 px-2.5 text-right text-slate-400">{b.vol.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aggregated Output Card */}
            <div className="lg:col-span-5 bg-[#0B0E17] border border-cyan-500/40 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h4 className="text-sm font-bold text-white font-mono">
                    Constructed {targetTimeframe} Candle
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Resampled Bar
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">Open (First Bar)</span>
                  <span className="text-slate-100 font-bold text-sm">${aggOpen.toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">High (Max High)</span>
                  <span className="text-emerald-400 font-bold text-sm">${aggHigh.toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">Low (Min Low)</span>
                  <span className="text-rose-400 font-bold text-sm">${aggLow.toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">Close (Last Bar)</span>
                  <span className="text-cyan-400 font-bold text-sm">${aggClose.toFixed(1)}</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">Volume (Sum)</span>
                  <span className="text-purple-400 font-bold text-sm">{aggVol.toFixed(1)} BTC</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-500 text-[10px] block">Bar VWAP</span>
                  <span className="text-amber-400 font-bold text-sm">${aggVwap}</span>
                </div>
              </div>

              <div className="bg-[#111622] p-3 rounded border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300 font-mono text-[11px]">Boundary Rule: Canonical UTC Lock</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 font-bold">is_closed = 1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: COMPLETE INDICATORS SUITE */}
      {selectedSubTab === 'indicators' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Technical Indicators Engine (Trend, Momentum, Volatility, Volume)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vectorized calculations matching Python <code className="text-cyan-400 font-mono">pandas-ta</code> / <code className="text-cyan-400 font-mono">numpy</code> library precision.
              </p>
            </div>

            {/* Category Selector */}
            <div className="flex items-center bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B] text-xs font-mono">
              {(['trend', 'momentum', 'volatility', 'volume'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded capitalize transition-colors ${
                    activeCategory === cat ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Indicator Cards based on category */}
          {activeCategory === 'trend' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">EMA Stack (9, 21, 50, 200)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    BULLISH_STACK
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Exponential Moving Average gives higher weight to recent bars: <code className="text-cyan-300">α = 2 / (N + 1)</code>.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">EMA 21</span>
                    <span className="text-emerald-400 font-bold">$87,940.20</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">EMA 50</span>
                    <span className="text-emerald-400 font-bold">$86,410.50</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">EMA 200</span>
                    <span className="text-slate-300 font-bold">$81,250.00</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Spread (21 vs 50)</span>
                    <span className="text-cyan-400 font-bold">+1.77% (Expansion)</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">ADX / Directional Movement (14)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    STRONG_TREND (29.6)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Measures trend strength without regard to direction. ADX &gt; 25 filters out choppy sideways ranges.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">ADX (14)</span>
                    <span className="text-purple-400 font-bold text-sm">29.6</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">+DI (Bulls)</span>
                    <span className="text-emerald-400 font-bold text-sm">31.2</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">-DI (Bears)</span>
                    <span className="text-rose-400 font-bold text-sm">14.8</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'momentum' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">RSI (Wilder's 14)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    HEALTHY_MOMENTUM (58.4)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Relative Strength Index smoothed with Wilder's exponential coefficient (<code className="text-cyan-300">1 / 14</code>).
                </p>
                <div className="w-full bg-slate-800 rounded-full h-3 relative my-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 h-full w-full opacity-40" />
                  <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow" style={{ left: '58.4%' }} />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>30 Oversold</span>
                  <span className="text-white font-bold">Current: 58.4</span>
                  <span>70 Overbought</span>
                </div>
              </div>

              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">MACD (12, 26, 9)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    HISTOGRAM_EXPANDING
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Moving Average Convergence Divergence. <code className="text-cyan-300">Hist = MACD - Signal</code>.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">MACD Line</span>
                    <span className="text-cyan-400 font-bold">+412.50</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Signal Line</span>
                    <span className="text-purple-400 font-bold">+348.10</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Histogram</span>
                    <span className="text-emerald-400 font-bold">+64.40</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'volatility' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">Average True Range (ATR 14)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    NORMAL_VOL (1.82%)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  True Range accounts for overnight gaps: <code className="text-cyan-300">TR = max(H-L, |H-Cp|, |L-Cp|)</code>.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">ATR (14) Points</span>
                    <span className="text-amber-400 font-bold text-sm">$1,610.40</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Normalized ATR %</span>
                    <span className="text-amber-300 font-bold text-sm">1.82% of Spot</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">Bollinger Bands (20, 2.0σ)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    %B = 0.72 (UPPER_HALF)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Two standard deviations envelope surrounding 20 SMA. Bandwidth measures squeeze/expansion regimes.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Upper (+2σ)</span>
                    <span className="text-rose-400 font-bold">$90,210.00</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Middle (20 SMA)</span>
                    <span className="text-slate-300 font-bold">$87,400.00</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Lower (-2σ)</span>
                    <span className="text-emerald-400 font-bold">$84,590.00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'volume' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">Relative Volume (RVOL 20)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    VOLUME_CONFIRMED (1.42x)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Compares current bar volume to its 20-period moving average. Flags institutional expansion &gt; 1.8x.
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">Current Bar Vol</span>
                    <span className="text-white font-bold text-sm">24.8 BTC</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">20-Period Avg</span>
                    <span className="text-slate-400 font-bold text-sm">17.5 BTC</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">RVOL Ratio</span>
                    <span className="text-emerald-400 font-bold text-sm">1.42x</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-mono">On-Balance Volume (OBV)</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    ACCUMULATION
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Running total of volume added on up bars and subtracted on down bars. Confirms breakout momentum.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">OBV Total</span>
                    <span className="text-cyan-400 font-bold text-sm">+1.48M BTC</span>
                  </div>
                  <div className="bg-[#111622] p-2 rounded border border-[#1E293B]">
                    <span className="text-slate-500 block text-[10px]">OBV 20-Slope</span>
                    <span className="text-emerald-400 font-bold text-sm">+12.4° (Positive)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: LOOKAHEAD BIAS SHIELD */}
      {selectedSubTab === 'integrity' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Data Integrity & Lookahead Bias Shield
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Why unsealed higher-timeframe candles destroy algorithmic backtests, and how our multi-timeframe engine enforces strict scientific isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                The Flaw: Future Leakage from Higher Timeframes
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If a 15-minute trading strategy queries a 4-Hour candle at 10:15 UTC that spans from 08:00 to 12:00, using the 4H bar's <code className="text-rose-300">High</code> or <code className="text-rose-300">Close</code> leaks information from 10:15 through 12:00 into the 10:15 decision. In backtests, this manufactures artificial 90%+ win rates that collapse instantly in live deployment.
              </p>
            </div>

            <div className="bg-[#0B0E17] p-4 rounded-lg border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                The Solution: The `is_closed` Bar Seal
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Our <code className="text-emerald-400 font-mono">TimeframeAggregator</code> tags every forming bar with <code className="text-emerald-300">is_closed = 0</code>. The quantitative backtest filter <code className="text-emerald-400 font-mono">get_closed_candles_for_backtest()</code> strictly strips unsealed bars, ensuring that only completed, immutable bars can ever be accessed by historical models.
              </p>
            </div>
          </div>

          {/* Code snippet */}
          <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-[#1E293B] pb-2">
              <span>Python Backtest Safety Function</span>
              <button
                onClick={() => copyToClipboard(`def get_closed_candles_for_backtest(df: pd.DataFrame) -> pd.DataFrame:\n    return df[df['is_closed'] == 1].copy()`, 'shield_fn')}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
              >
                {copiedFormula === 'shield_fn' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedFormula === 'shield_fn' ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="text-cyan-300 text-[11px] leading-relaxed overflow-x-auto">{`# Zero-Lookahead Bias Protection Filter
@classmethod
def get_closed_candles_for_backtest(cls, df: pd.DataFrame) -> pd.DataFrame:
    """
    Prevents future candle leakage during historical backtests.
    Only allows bars that have completely elapsed (is_closed == 1).
    """
    if "is_closed" in df.columns:
        return df[df["is_closed"] == 1].copy()
    return df.copy()`}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
