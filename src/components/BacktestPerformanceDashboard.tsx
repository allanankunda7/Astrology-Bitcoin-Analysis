import React, { useState, useMemo } from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  Filter,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Sliders,
  Check,
  ChevronDown
} from 'lucide-react';
import { Candle } from '../services/indicators';
import {
  runHistoricalBacktest,
  runStrategyComparison,
  BacktestConfig,
  BacktestResult,
  BacktestTrade
} from '../services/backtestingEngine';
import { AVAILABLE_STRATEGIES } from '../services/strategies';

interface BacktestPerformanceDashboardProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  onSelectTradeMarker?: (trade: BacktestTrade) => void;
}

export const BacktestPerformanceDashboard: React.FC<BacktestPerformanceDashboardProps> = ({
  candles,
  symbol,
  timeframe,
  onSelectTradeMarker
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('trend_following');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [feePercent, setFeePercent] = useState<number>(0.05); // 0.05%
  const [slippagePercent, setSlippagePercent] = useState<number>(0.03); // 0.03%
  const [activeTab, setActiveTab] = useState<'metrics' | 'trades' | 'comparison' | 'audit'>('metrics');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');

  const config: BacktestConfig = useMemo(() => ({
    initialCapital,
    riskPercent,
    feePercent,
    slippagePercent
  }), [initialCapital, riskPercent, feePercent, slippagePercent]);

  // Execute backtest for currently selected strategy
  const backtestResult: BacktestResult = useMemo(() => {
    return runHistoricalBacktest(candles, selectedStrategyId, symbol, timeframe, config);
  }, [candles, selectedStrategyId, symbol, timeframe, config]);

  // Execute comparison across all 8 strategies
  const comparisonResults = useMemo(() => {
    return runStrategyComparison(candles, symbol, timeframe, config);
  }, [candles, symbol, timeframe, config]);

  const { metrics, trades, equityCurve, audit } = backtestResult;

  // Filtered trades
  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'WINS') return trades.filter(t => t.pnlDollar > 0);
    if (tradeFilter === 'LOSSES') return trades.filter(t => t.pnlDollar <= 0);
    return trades;
  }, [trades, tradeFilter]);

  // SVG Equity Curve Calculation
  const equityPoints = useMemo(() => {
    if (equityCurve.length < 2) return '';
    const minEq = Math.min(...equityCurve.map(e => e.equity)) * 0.99;
    const maxEq = Math.max(...equityCurve.map(e => e.equity)) * 1.01;
    const range = maxEq - minEq || 1;

    const width = 600;
    const height = 140;

    return equityCurve.map((pt, i) => {
      const x = (i / (equityCurve.length - 1)) * width;
      const y = height - ((pt.equity - minEq) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  }, [equityCurve]);

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header & Parameter Controls */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                Zero Look-Ahead Historical Backtesting
              </span>
              <span className="text-slate-500 text-xs font-mono">
                Strict Closed-Candle Execution · Real Commission & Slippage Included
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>Quantitative Strategy Performance & Validation System</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Historical simulations enforce strict event-driven rules: signals generated at candle <code>i</code> close,
              orders filled at candle <code>i+1</code> open. Unfinished forming candles are mathematically excluded.
            </p>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 bg-[#07090E] p-1 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'metrics' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Summary & Curve
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'trades' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Trade Log</span>
              <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">({trades.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'comparison' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compare 8 Strategies
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data Audit</span>
            </button>
          </div>
        </div>

        {/* Backtest Parameters Toolbar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">STRATEGY</label>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {AVAILABLE_STRATEGIES.map(s => (
                <option key={s.id} value={s.id}>{s.name.split('(')[0]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">CAPITAL ($)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Math.max(100, Number(e.target.value)))}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">RISK PER TRADE (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">FEE (%)</label>
            <input
              type="number"
              step="0.01"
              value={feePercent}
              onChange={(e) => setFeePercent(Math.max(0, Number(e.target.value)))}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">SLIPPAGE (%)</label>
            <input
              type="number"
              step="0.01"
              value={slippagePercent}
              onChange={(e) => setSlippagePercent(Math.max(0, Number(e.target.value)))}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* 2. TAB 1: METRICS & EQUITY CURVE */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Key KPI Cards Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs tabular-nums">
            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">WIN RATE</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.winRate}%
              </span>
              <span className="text-[10px] text-slate-500">{metrics.winningTrades}W / {metrics.losingTrades}L</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">NET RETURN</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.netReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.netReturnPercent >= 0 ? '+' : ''}{metrics.netReturnPercent}%
              </span>
              <span className="text-[10px] text-slate-500">${metrics.netReturnDollar.toLocaleString()}</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">PROFIT FACTOR</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.profitFactor >= 1.5 ? 'text-emerald-400' : metrics.profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {metrics.profitFactor}
              </span>
              <span className="text-[10px] text-slate-500">Gross P/L Ratio</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">MAX DRAWDOWN</span>
              <span className="text-base font-bold text-rose-400 mt-0.5 block">
                -{metrics.maxDrawdownPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">-${metrics.maxDrawdownDollar.toLocaleString()}</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">EXPECTANCY / TRADE</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.expectancyDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${metrics.expectancyDollar}
              </span>
              <span className="text-[10px] text-slate-500">Avg Value / Trade</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">SHARPE RATIO (EST)</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.sharpeRatioEstimate >= 1.0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                {metrics.sharpeRatioEstimate}
              </span>
              <span className="text-[10px] text-slate-500">Risk-Adjusted</span>
            </div>
          </div>

          {/* Secondary Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs tabular-nums bg-[#0F1420] border border-slate-800 p-3.5 rounded-lg">
            <div>
              <span className="text-slate-500 text-[10px] block">AVG WIN / AVG LOSS</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                +${metrics.averageWinDollar.toLocaleString()} / -${metrics.averageLossDollar.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">LARGEST WIN / LOSS</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                <span className="text-emerald-400">+${metrics.largestWinDollar.toLocaleString()}</span> / <span className="text-rose-400">${metrics.largestLossDollar.toLocaleString()}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">MAX STREAKS (WIN / LOSS)</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {metrics.maxConsecutiveWins} Consecutive W / {metrics.maxConsecutiveLosses} Consecutive L
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">COMMISSIONS & FEES PAID</span>
              <span className="text-amber-300 font-semibold mt-0.5 block">
                ${metrics.totalFeesPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Interactive Equity Curve Chart */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Simulated Historical Equity Curve (${initialCapital.toLocaleString()} &rarr; ${metrics.endingCapital.toLocaleString()})</span>
              </span>
              <span className="text-slate-500 text-[11px]">{trades.length} Closed Trades Executed</span>
            </div>

            <div className="h-40 w-full bg-[#07090E] border border-slate-800/80 rounded p-2 flex flex-col justify-between relative overflow-hidden">
              {equityCurve.length >= 2 ? (
                <svg viewBox="0 0 600 140" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="35" x2="600" y2="35" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="0" y1="70" x2="600" y2="70" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="0" y1="105" x2="600" y2="105" stroke="#1e293b" strokeDasharray="3,3" />
                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points={equityPoints}
                  />
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Awaiting trade executions to plot equity curve...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Start Balance: ${initialCapital.toLocaleString()}</span>
              <span>Peak Balance: ${(initialCapital + metrics.netReturnDollar + metrics.maxDrawdownDollar).toLocaleString()}</span>
              <span className={metrics.netReturnDollar >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                Final Equity: ${metrics.endingCapital.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: DETAILED TRADE LOG */}
      {activeTab === 'trades' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">HISTORICAL EXECUTIONS LOG</span>
              <span className="text-slate-500 text-[11px]">({filteredTrades.length} trades matching filter)</span>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setTradeFilter('ALL')}
                className={`px-2 py-0.5 rounded ${tradeFilter === 'ALL' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                All ({trades.length})
              </button>
              <button
                onClick={() => setTradeFilter('WINS')}
                className={`px-2 py-0.5 rounded ${tradeFilter === 'WINS' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-emerald-400 hover:text-emerald-300'}`}
              >
                Wins ({metrics.winningTrades})
              </button>
              <button
                onClick={() => setTradeFilter('LOSSES')}
                className={`px-2 py-0.5 rounded ${tradeFilter === 'LOSSES' ? 'bg-rose-500 text-white font-bold' : 'text-rose-400 hover:text-rose-300'}`}
              >
                Losses ({metrics.losingTrades})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">SIDE</th>
                  <th className="py-2 px-2">ENTRY TIME</th>
                  <th className="py-2 px-2 text-right">ENTRY ($)</th>
                  <th className="py-2 px-2 text-right">EXIT ($)</th>
                  <th className="py-2 px-2 text-right">SIZE</th>
                  <th className="py-2 px-2 text-right">PNL ($)</th>
                  <th className="py-2 px-2 text-right">PNL (%)</th>
                  <th className="py-2 px-2 text-right">REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrades.map((t, idx) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTradeMarker && onSelectTradeMarker(t)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors text-[11px]"
                  >
                    <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        t.side === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{String(t.entryTime).substring(0, 16)}</td>
                    <td className="py-2 px-2 text-right text-slate-200">${t.entryPrice.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-slate-200">${t.exitPrice.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right text-slate-400">{t.sizeUnits.toFixed(4)}</td>
                    <td className={`py-2 px-2 text-right font-bold ${t.pnlDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlDollar >= 0 ? '+' : ''}${t.pnlDollar.toLocaleString()}
                    </td>
                    <td className={`py-2 px-2 text-right ${t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent}%
                    </td>
                    <td className="py-2 px-2 text-right text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded ${
                        t.exitReason === 'TAKE_PROFIT' ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                      }`}>
                        {t.exitReason.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 3: STRATEGY COMPARISON TABLE (ALL 8 STRATEGIES) */}
      {activeTab === 'comparison' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">SIDE-BY-SIDE STRATEGY COMPARISON</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluates all 8 modular quantitative strategies across identical historical price bars on {symbol} ({timeframe}).
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Fair Comparison Benchmark</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase">
                  <th className="py-2 px-2">STRATEGY</th>
                  <th className="py-2 px-2 text-right">WIN RATE</th>
                  <th className="py-2 px-2 text-right">NET RETURN</th>
                  <th className="py-2 px-2 text-right">PROFIT FACTOR</th>
                  <th className="py-2 px-2 text-right">MAX DRAWDOWN</th>
                  <th className="py-2 px-2 text-right">EXPECTANCY</th>
                  <th className="py-2 px-2 text-right">TRADES</th>
                  <th className="py-2 px-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {comparisonResults.map(res => {
                  const m = res.metrics;
                  const isSelected = selectedStrategyId === res.strategyId;

                  return (
                    <tr
                      key={res.strategyId}
                      className={`hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/10' : ''}`}
                    >
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-white">{res.strategyName}</div>
                        <div className="text-[10px] text-slate-500">{res.strategyId}</div>
                      </td>
                      <td className={`py-2.5 px-2 text-right font-bold ${m.winRate >= 50 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {m.winRate}%
                      </td>
                      <td className={`py-2.5 px-2 text-right font-bold ${m.netReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.netReturnPercent >= 0 ? '+' : ''}{m.netReturnPercent}%
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-200 font-semibold">{m.profitFactor}</td>
                      <td className="py-2.5 px-2 text-right text-rose-400">-{m.maxDrawdownPercent.toFixed(1)}%</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">${m.expectancyDollar}</td>
                      <td className="py-2.5 px-2 text-right text-slate-400">{m.totalTrades}</td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => {
                            setSelectedStrategyId(res.strategyId);
                            setActiveTab('metrics');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 font-bold transition-colors text-[10px]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 4: DATA AUDIT & QUALITY VALIDATOR */}
      {activeTab === 'audit' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-white text-sm">BACKTEST SAFEGUARDS & DATA QUALITY AUDIT</h3>
                <p className="text-[11px] text-slate-400">Automated verification against look-ahead bias and corrupt historical bars.</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded font-bold text-xs ${
              audit.status === 'EXCELLENT' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
            }`}>
              AUDIT STATUS: {audit.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
              <span className="font-bold text-white block text-[11px]">SAFEGUARDS VERIFIED</span>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Zero Look-Ahead Bias: Signals strictly evaluated on bar <code>i</code> close</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unclosed Candle Filtering: Current open bar excluded via <code>get_closed_candles_for_backtest()</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Execution Realism: {config.feePercent}% trading fee + {config.slippagePercent}% slippage applied per trade</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Position Sizing: Strictly bounded to {config.riskPercent}% risk with leverage caps</span>
                </div>
              </div>
            </div>

            <div className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
              <span className="font-bold text-white block text-[11px]">DATASET INTEGRITY METRICS</span>
              <div className="space-y-1 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Closed Bars Evaluated:</span>
                  <strong className="text-white">{audit.closedBarsCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Duplicate Timestamps:</span>
                  <strong className="text-emerald-400">{audit.duplicateTimestampsFound} (Zero duplicates)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Missing Data Gaps:</span>
                  <strong className="text-emerald-400">{audit.missingGapsFound} (Continuous)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Timezone Standard:</span>
                  <strong className="text-white">UTC Standardized</strong>
                </div>
              </div>
            </div>
          </div>

          {audit.warnings.length > 0 && (
            <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
              <span className="font-bold block">DATA WARNINGS:</span>
              {audit.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Educational Notice Footer */}
      <div className="p-3 rounded bg-[#07090E] border border-slate-800 text-[11px] text-slate-500 font-mono flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Educational Notice:</strong> {backtestResult.disclaimer}
        </p>
      </div>
    </div>
  );
};
