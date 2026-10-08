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
  ChevronDown,
  Percent,
  BarChart2
} from 'lucide-react';
import { Candle } from '../services/indicators';
import {
  runHistoricalBacktest,
  runStrategyComparison,
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  PositionSizingMode,
  EquityPoint
} from '../services/backtestingEngine';
import { AVAILABLE_STRATEGIES } from '../services/strategies';

interface BacktestPerformanceDashboardProps {
  candles: Candle[];
  symbol: string;
  timeframe: string;
  onSelectTradeMarker?: (trade: BacktestTrade) => void;
  externalCapital?: number;
  onCapitalChange?: (capital: number) => void;
}

export const BacktestPerformanceDashboard: React.FC<BacktestPerformanceDashboardProps> = ({
  candles,
  symbol,
  timeframe,
  onSelectTradeMarker,
  externalCapital,
  onCapitalChange
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('trend_following');
  const [initialCapital, setInitialCapital] = useState<number>(externalCapital || 10000);
  const [positionSizingMode, setPositionSizingMode] = useState<PositionSizingMode>('PERCENTAGE_EQUITY');
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1%
  const [fixedDollarRisk, setFixedDollarRisk] = useState<number>(100); // $100
  const [fixedPositionUnits, setFixedPositionUnits] = useState<number>(0.1); // 0.1 BTC / lot
  const [feePercent, setFeePercent] = useState<number>(0.05); // 0.05%
  const [slippagePercent, setSlippagePercent] = useState<number>(0.03); // 0.03%
  const [leverage, setLeverage] = useState<number>(1.0); // 1x spot or leverage

  // Navigation & Curve view modes
  const [activeTab, setActiveTab] = useState<'metrics' | 'trades' | 'comparison' | 'regimes' | 'audit'>('metrics');
  const [curveViewMode, setCurveViewMode] = useState<'equity' | 'balance' | 'drawdown' | 'returns'>('equity');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');

  // Update initialCapital when externalCapital changes
  React.useEffect(() => {
    if (externalCapital !== undefined && externalCapital > 0) {
      setInitialCapital(externalCapital);
    }
  }, [externalCapital]);

  const handleCapitalUpdate = (val: number) => {
    const valid = Math.max(1, val);
    setInitialCapital(valid);
    if (onCapitalChange) onCapitalChange(valid);
  };

  const config: BacktestConfig = useMemo(() => ({
    initialCapital,
    positionSizingMode,
    riskPercent,
    fixedDollarRisk,
    fixedPositionUnits,
    feePercent,
    slippagePercent,
    leverage
  }), [
    initialCapital,
    positionSizingMode,
    riskPercent,
    fixedDollarRisk,
    fixedPositionUnits,
    feePercent,
    slippagePercent,
    leverage
  ]);

  // Execute backtest for currently selected strategy
  const backtestResult: BacktestResult = useMemo(() => {
    return runHistoricalBacktest(candles, selectedStrategyId, symbol, timeframe, config);
  }, [candles, selectedStrategyId, symbol, timeframe, config]);

  // Execute comparison across all 8 strategies
  const comparisonResults = useMemo(() => {
    return runStrategyComparison(candles, symbol, timeframe, config);
  }, [candles, symbol, timeframe, config]);

  const { metrics, trades, equityCurve, regimeBreakdown, audit, dataVersioning } = backtestResult;

  // Filtered trades
  const filteredTrades = useMemo(() => {
    if (tradeFilter === 'WINS') return trades.filter((t) => t.pnlDollar > 0);
    if (tradeFilter === 'LOSSES') return trades.filter((t) => t.pnlDollar <= 0);
    return trades;
  }, [trades, tradeFilter]);

  // Multi-Mode Curve Calculation (Balance / Equity / Drawdown / Returns)
  const curvePoints = useMemo(() => {
    if (equityCurve.length < 2) return '';
    const width = 600;
    const height = 140;

    let values: number[] = [];
    if (curveViewMode === 'equity') {
      values = equityCurve.map((pt) => pt.equity);
    } else if (curveViewMode === 'balance') {
      values = equityCurve.map((pt) => pt.balance);
    } else if (curveViewMode === 'drawdown') {
      values = equityCurve.map((pt) => pt.drawdownPct);
    } else {
      values = equityCurve.map((pt) => pt.returnsPct);
    }

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    return equityCurve.map((_, i) => {
      const x = (i / (equityCurve.length - 1)) * width;
      // Invert y: high values near top (low y coordinate)
      let y = height - ((values[i] - minVal) / range) * (height - 15) - 8;
      if (curveViewMode === 'drawdown') {
        // Drawdown: 0% is top, high DD is bottom
        y = ((values[i] - minVal) / range) * (height - 15) + 8;
      }
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [equityCurve, curveViewMode]);

  const presetCapitals = [1000, 10000, 50000, 100000, 1000000];

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Header & Parameter Controls */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                Balance-Aware Backtesting Engine
              </span>
              <span className="text-slate-500 text-xs font-mono">
                Realistic Compounding · Multi-Mode Curves · Empirical Regime Testing
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>Quantitative Strategy Performance & Validation System</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Historical simulations enforce event-driven realism: closed-candle generation (bar <code>i</code> close),
              fill at candle <code>i+1</code> open, with genuine capital tracking and zero lookahead bias.
            </p>
          </div>

          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#07090E] p-1 rounded-lg border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'metrics' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Summary & Curves
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
              Compare Strategies
            </button>
            <button
              onClick={() => setActiveTab('regimes')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'regimes' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Market Regimes</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data & Versioning</span>
            </button>
          </div>
        </div>

        {/* Backtest Parameters Toolbar with Configurable Capital & Compounding Mode */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">STRATEGY</label>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {AVAILABLE_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>{s.name.split('(')[0]}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-500">INITIAL CAPITAL ($)</label>
              <div className="flex items-center gap-0.5">
                {[1000, 10000, 100000].map((b) => (
                  <button
                    key={b}
                    onClick={() => handleCapitalUpdate(b)}
                    className={`px-1 py-0.2 rounded text-[9px] ${
                      initialCapital === b ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    ${b >= 1000 ? `${b / 1000}k` : b}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="1"
              step="500"
              value={initialCapital}
              onChange={(e) => handleCapitalUpdate(Number(e.target.value))}
              className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">SIZING / RISK MODE</label>
            <select
              value={positionSizingMode}
              onChange={(e) => setPositionSizingMode(e.target.value as PositionSizingMode)}
              className="w-full bg-[#07090E] border border-slate-800 text-amber-300 font-bold rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="PERCENTAGE_EQUITY">% Equity Risk (Compounding)</option>
              <option value="FIXED_DOLLAR_RISK">Fixed Dollar Risk ($/Trade)</option>
              <option value="FIXED_POSITION_SIZE">Fixed Position Size (Units)</option>
            </select>
          </div>

          {positionSizingMode === 'PERCENTAGE_EQUITY' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">RISK PER TRADE (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {positionSizingMode === 'FIXED_DOLLAR_RISK' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">FIXED RISK AMOUNT ($)</label>
              <input
                type="number"
                step="10"
                min="1"
                value={fixedDollarRisk}
                onChange={(e) => setFixedDollarRisk(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          {positionSizingMode === 'FIXED_POSITION_SIZE' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">FIXED UNITS (CONTRACTS)</label>
              <input
                type="number"
                step="0.05"
                min="0.001"
                value={fixedPositionUnits}
                onChange={(e) => setFixedPositionUnits(Math.max(0.001, Number(e.target.value)))}
                className="w-full bg-[#07090E] border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-500 block mb-1">FEE PER FILL (%)</label>
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

      {/* 2. TAB 1: METRICS & MULTI-MODE CURVES */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Key KPI Cards Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs tabular-nums">
            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">TOTAL RETURN</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.netReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.netReturnPercent >= 0 ? '+' : ''}{metrics.netReturnPercent}%
              </span>
              <span className="text-[10px] text-slate-500">${metrics.netReturnDollar.toLocaleString()} P/L</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">WIN / LOSS RATE</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {metrics.winRate}% / {metrics.lossRate}%
              </span>
              <span className="text-[10px] text-slate-500">{metrics.winningTrades}W · {metrics.losingTrades}L</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">PROFIT FACTOR</span>
              <span className={`text-base font-bold mt-0.5 block ${
                metrics.profitFactor >= 1.5 ? 'text-emerald-400' : metrics.profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {metrics.profitFactor}
              </span>
              <span className="text-[10px] text-slate-500">Gross wins/losses</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">MAX / AVG DRAWDOWN</span>
              <span className="text-base font-bold text-rose-400 mt-0.5 block">
                -{metrics.maxDrawdownPercent.toFixed(1)}% / -{metrics.averageDrawdownPercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500">Peak: -${metrics.maxDrawdownDollar.toLocaleString()}</span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">SHARPE / SORTINO</span>
              <span className="text-base font-bold text-cyan-400 mt-0.5 block">
                {metrics.hasSufficientData ? `${metrics.sharpeRatioEstimate} / ${metrics.sortinoRatioEstimate}` : 'Insufficient data'}
              </span>
              <span className="text-[10px] text-slate-500">
                Calmar: {metrics.hasSufficientData ? metrics.calmarRatioEstimate : 'N/A'}
              </span>
            </div>

            <div className="bg-[#0F1420] border border-slate-800 rounded p-3">
              <span className="text-[10px] text-slate-500 block">EXPECTANCY & AVG R</span>
              <span className={`text-base font-bold mt-0.5 block ${metrics.expectancyDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${metrics.expectancyDollar} / trade
              </span>
              <span className="text-[10px] text-slate-500">Avg R: {metrics.averageR}R</span>
            </div>
          </div>

          {/* Secondary Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 font-mono text-xs tabular-nums bg-[#0F1420] border border-slate-800 p-3.5 rounded-lg">
            <div>
              <span className="text-slate-500 text-[10px] block">AVG WIN / LOSS</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                <span className="text-emerald-400">+${metrics.averageWinDollar.toLocaleString()}</span> / <span className="text-rose-400">-${metrics.averageLossDollar.toLocaleString()}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">LARGEST WIN / LOSS</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                <span className="text-emerald-400">+${metrics.largestWinDollar.toLocaleString()}</span> / <span className="text-rose-400">-${metrics.largestLossDollar.toLocaleString()}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">MAX STREAKS (WIN / LOSS)</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {metrics.maxConsecutiveWins}W / {metrics.maxConsecutiveLosses}L
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">RECOVERY FACTOR & ULCER</span>
              <span className="text-slate-200 font-semibold mt-0.5 block">
                {metrics.recoveryFactor} / {metrics.ulcerIndex}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">COMMISSIONS PAID</span>
              <span className="text-amber-300 font-semibold mt-0.5 block">
                ${metrics.totalFeesPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Interactive Multi-Mode Curve Chart (Balance / Equity / Drawdown / Returns) */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-3 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>
                    Simulated Historical {curveViewMode.toUpperCase()} Curve (${initialCapital.toLocaleString()} &rarr; ${metrics.endingCapital.toLocaleString()})
                  </span>
                </span>
                <span className="text-slate-500 text-[11px]">({trades.length} Closed Trades)</span>
              </div>

              {/* Curve Mode Toggle Buttons */}
              <div className="flex items-center gap-1 bg-[#07090E] p-0.5 rounded border border-slate-800 text-[11px]">
                <button
                  onClick={() => setCurveViewMode('equity')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveViewMode === 'equity' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Equity
                </button>
                <button
                  onClick={() => setCurveViewMode('balance')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveViewMode === 'balance' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Balance
                </button>
                <button
                  onClick={() => setCurveViewMode('drawdown')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveViewMode === 'drawdown' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Drawdown
                </button>
                <button
                  onClick={() => setCurveViewMode('returns')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    curveViewMode === 'returns' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Returns %
                </button>
              </div>
            </div>

            <div className="h-44 w-full bg-[#07090E] border border-slate-800/80 rounded p-2 flex flex-col justify-between relative overflow-hidden">
              {equityCurve.length >= 2 ? (
                <svg viewBox="0 0 600 140" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={curveViewMode === 'drawdown' ? '#f43f5e' : curveViewMode === 'returns' ? '#06b6d4' : '#10b981'}
                        stopOpacity="0.3"
                      />
                      <stop
                        offset="100%"
                        stopColor={curveViewMode === 'drawdown' ? '#f43f5e' : curveViewMode === 'returns' ? '#06b6d4' : '#10b981'}
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="35" x2="600" y2="35" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="0" y1="70" x2="600" y2="70" stroke="#1e293b" strokeDasharray="3,3" />
                  <line x1="0" y1="105" x2="600" y2="105" stroke="#1e293b" strokeDasharray="3,3" />
                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke={curveViewMode === 'drawdown' ? '#f43f5e' : curveViewMode === 'returns' ? '#06b6d4' : '#10b981'}
                    strokeWidth="2"
                    points={curvePoints}
                  />
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Awaiting trade executions to plot curve...
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>Starting Capital: ${initialCapital.toLocaleString()}</span>
              <span>Peak Equity: ${(initialCapital + metrics.netReturnDollar + metrics.maxDrawdownDollar).toLocaleString()}</span>
              <span>Max DD: -{metrics.maxDrawdownPercent.toFixed(1)}%</span>
              <span className={metrics.netReturnDollar >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                Final Equity: ${metrics.endingCapital.toLocaleString()} ({metrics.netReturnPercent >= 0 ? '+' : ''}{metrics.netReturnPercent}%)
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
                  <th className="py-2 px-2 text-right">R-MULTIPLE</th>
                  <th className="py-2 px-2 text-right">REGIME</th>
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
                    <td className="py-2 px-2 text-right text-slate-300">
                      {t.rMultiple >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`}
                    </td>
                    <td className="py-2 px-2 text-right text-[10px] text-slate-400">
                      {t.marketRegime || 'Normal'}
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

      {/* 4. TAB 3: STRATEGY COMPARISON TABLE */}
      {activeTab === 'comparison' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">SIDE-BY-SIDE STRATEGY BENCHMARK COMPARISON</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluates quantitative algorithms across identical closed historical bars on {symbol} ({timeframe}) with initial capital ${initialCapital.toLocaleString()}.
              </p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Zero Look-Ahead Standard</span>
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
                {comparisonResults.map((res) => {
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

      {/* 5. TAB 4: MARKET REGIME EMPIRICAL PERFORMANCE */}
      {activeTab === 'regimes' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">MARKET REGIME PERFORMANCE BREAKDOWN</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Empirical backtest results broken down by market condition regimes (Bull, Bear, Range, High/Low Volatility).
              </p>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">Empirical Verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {regimeBreakdown.map((r, i) => (
              <div key={i} className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{r.regime}</span>
                  <span className="text-[10px] text-slate-500">{r.totalTrades} trades</span>
                </div>
                <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Win Rate:</span>
                    <strong className={r.winRate >= 50 ? 'text-emerald-400' : 'text-slate-300'}>{r.winRate}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Net Return:</span>
                    <strong className={r.netReturnDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {r.netReturnDollar >= 0 ? '+' : ''}${r.netReturnDollar.toLocaleString()} ({r.netReturnPercent}%)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profit Factor:</span>
                    <strong className="text-white">{r.profitFactor}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Trade:</span>
                    <strong className="text-slate-300">${r.averageTradeDollar}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TAB 5: DATA AUDIT & VERSIONING METADATA */}
      {activeTab === 'audit' && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-white text-sm">BACKTEST SAFEGUARDS & DATA VERSIONING METADATA</h3>
                <p className="text-[11px] text-slate-400">Immutable dataset reproducibility and look-ahead bias audit records.</p>
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
              <span className="font-bold text-white block text-[11px]">DATASET VERSIONING SPECIFICATION (REQ 17)</span>
              <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dataset ID:</span>
                  <span className="text-amber-300 font-bold">{dataVersioning.datasetId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Version:</span>
                  <span className="text-white">{dataVersioning.datasetVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Source:</span>
                  <span className="text-cyan-400">{dataVersioning.dataSource}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timezone / Timeframe:</span>
                  <span className="text-white">{dataVersioning.timezone} · {dataVersioning.timeframe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Candle Count:</span>
                  <span className="text-white">{dataVersioning.candleCount} Closed Bars</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Integrity Hash:</span>
                  <span className="text-slate-400 text-[10px]">{dataVersioning.dataHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Engine Version:</span>
                  <span className="text-white">{dataVersioning.engineVersion}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
              <span className="font-bold text-white block text-[11px]">SAFEGUARDS & EXECUTION REALISM AUDIT</span>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Zero Look-Ahead Bias: Signals strictly evaluated on bar <code>i</code> close</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unclosed Candle Filtering: Active open bar excluded via <code>get_closed_candles_for_backtest()</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Execution Realism: {config.feePercent}% trading fee + {config.slippagePercent}% slippage applied</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Position Sizing: Mode set to <strong>{config.positionSizingMode}</strong></span>
                </div>
              </div>
            </div>
          </div>
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
