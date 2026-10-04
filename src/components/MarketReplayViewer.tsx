/**
 * src/components/MarketReplayViewer.tsx
 * Interactive Market Replay Mode with Strict Zero Look-Ahead Isolation (Req 4 & 5)
 * 
 * Features:
 * 1. Historical Stepping: +1 Bar, +5 Bars, +10 Bars, and Auto-Playback with speed controls.
 * 2. Strict Future Data Isolation: Candles beyond currentVisibleIndex are completely hidden.
 * 3. Live Paper Execution in Replay: User submits LONG, SHORT, or WAIT decisions with Stop-Loss & Take-Profit.
 * 4. Realistic Fill Simulation: As each new candle is revealed, evaluates High and Low prices
 *    to trigger automated Stop-Loss and Take-Profit fills.
 * 5. Replay Performance HUD: Real-time Equity, Balance, Unrealized PnL, Win Rate %, Profit Factor, Max Drawdown.
 * 6. "What Would Have Happened?" Post-Replay Decision Report.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  FileText
} from 'lucide-react';
import { Candle } from '../services/indicators';
import { MarketReplayEngine, ReplaySessionState, ReplayPerformanceReport } from '../services/marketReplayEngine';
import { TradingChart, CandleData } from './TradingChart';
import { UTCTimestamp } from 'lightweight-charts';

interface MarketReplayViewerProps {
  candles: Candle[];
  symbol?: string;
  timeframe?: string;
}

export const MarketReplayViewer: React.FC<MarketReplayViewerProps> = ({
  candles,
  symbol = 'BTC/USDT',
  timeframe = '4h'
}) => {
  const replayEngineRef = useRef<MarketReplayEngine | null>(null);
  const [replayState, setReplayState] = useState<ReplaySessionState | null>(null);
  const [visibleCandles, setVisibleCandles] = useState<Candle[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // 1 sec per candle

  // Replay trade decision inputs
  const [tradeSide, setTradeSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [tradeQuantity, setTradeQuantity] = useState<number>(0.25);
  const [tradeStopLoss, setTradeStopLoss] = useState<number>(0);
  const [tradeTakeProfit, setTradeTakeProfit] = useState<number>(0);
  const [tradeNote, setTradeNote] = useState<string>('');

  // Post-replay report
  const [report, setReport] = useState<ReplayPerformanceReport | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Initialize or reset engine
  const initEngine = () => {
    if (!candles || candles.length < 25) return;
    const engine = new MarketReplayEngine(candles, symbol, timeframe, 100000, 30);
    replayEngineRef.current = engine;
    const state = engine.getState();
    setReplayState(state);
    const vis = engine.getVisibleCandles();
    setVisibleCandles(vis);
    setIsPlaying(false);
    setReport(null);

    const cur = engine.getCurrentPrice();
    setTradeStopLoss(Number((cur * 0.97).toFixed(2)));
    setTradeTakeProfit(Number((cur * 1.06).toFixed(2)));
  };

  useEffect(() => {
    initEngine();
  }, [candles, symbol, timeframe]);

  // Step forward
  const handleStep = (count: number) => {
    if (!replayEngineRef.current) return;
    const newState = replayEngineRef.current.stepForward(count);
    setReplayState(newState);
    setVisibleCandles(replayEngineRef.current.getVisibleCandles());

    const cur = replayEngineRef.current.getCurrentPrice();
    if (tradeSide === 'LONG') {
      setTradeStopLoss(Number((cur * 0.97).toFixed(2)));
      setTradeTakeProfit(Number((cur * 1.06).toFixed(2)));
    } else {
      setTradeStopLoss(Number((cur * 1.03).toFixed(2)));
      setTradeTakeProfit(Number((cur * 0.94).toFixed(2)));
    }
  };

  // Playback timer loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        if (!replayEngineRef.current) return;
        const current = replayEngineRef.current.getState();
        if (current.currentVisibleIndex >= current.totalCandlesCount - 1) {
          setIsPlaying(false);
          return;
        }
        handleStep(1);
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Submit in-replay paper trade
  const handleSubmitReplayOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replayEngineRef.current) return;

    replayEngineRef.current.submitReplayOrder({
      side: tradeSide,
      quantity: tradeQuantity,
      stopLoss: tradeStopLoss,
      takeProfit: tradeTakeProfit,
      userNote: tradeNote || `Replay ${tradeSide} decision on bar #${replayState?.currentVisibleIndex}`
    });

    setReplayState(replayEngineRef.current.getState());
    setTradeNote('');
  };

  // Generate Report
  const handleGenerateReport = () => {
    if (!replayEngineRef.current) return;
    const rep = replayEngineRef.current.generateReport();
    setReport(rep);
    setIsReportOpen(true);
  };

  const currentPrice = visibleCandles[visibleCandles.length - 1]?.close ?? 0;
  const progressPercent = replayState
    ? Math.round(((replayState.currentVisibleIndex + 1) / replayState.totalCandlesCount) * 100)
    : 0;

  const chartCandles: CandleData[] = useMemo(() => {
    return visibleCandles.map((c) => ({
      time: (typeof c.time === 'number'
        ? c.time
        : Math.floor(new Date(c.time).getTime() / 1000)) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0
    }));
  }, [visibleCandles]);

  return (
    <div className="space-y-6">

      {/* 1. Header Bar with Strict Zero Look-Ahead Safeguard Badge */}
      <div className="bg-[#090C14] border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              REPLAY SIMULATOR
            </span>
            <span className="text-slate-500 text-xs font-mono">
              Zero Look-Ahead Future Candle Barrier Active
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight mt-1">
            Historical Market Replay &amp; Behavioral Practice Terminal
          </h2>
        </div>

        {/* Stepping & Playback Controls */}
        <div className="flex items-center gap-2 bg-[#0F1420] p-1.5 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-amber-400 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>

          <button
            onClick={() => handleStep(1)}
            disabled={isPlaying}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
            title="Advance +1 Candle"
          >
            <SkipForward className="w-3 h-3" />
            <span>+1 Bar</span>
          </button>

          <button
            onClick={() => handleStep(5)}
            disabled={isPlaying}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span>+5</span>
          </button>

          <button
            onClick={() => handleStep(10)}
            disabled={isPlaying}
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span>+10</span>
          </button>

          <button
            onClick={initEngine}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Restart Replay Session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleGenerateReport}
            className="px-3 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* 2. Replay HUD Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono text-xs">
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block">Current Replay Price</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">
            Bar #{replayState ? replayState.currentVisibleIndex + 1 : 0} of {replayState?.totalCandlesCount} ({progressPercent}%)
          </span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block">Replay Equity</span>
          <span className="text-base font-bold text-emerald-400 mt-0.5 block">
            ${replayState?.currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400">Balance: ${replayState?.currentBalance.toLocaleString()}</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block">Replay Trades</span>
          <span className="text-base font-bold text-white mt-0.5 block">
            {replayState?.closedTrades.length} Closed / {replayState?.openPositions.length} Open
          </span>
          <span className="text-[10px] text-slate-400">In-replay practice</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block">Max Drawdown</span>
          <span className="text-base font-bold text-rose-400 mt-0.5 block">
            {replayState?.maxDrawdownPercent}%
          </span>
          <span className="text-[10px] text-slate-400">Peak: ${replayState?.peakEquity.toLocaleString()}</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] block">Speed</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
            className="w-full bg-[#141A26] border border-slate-700 rounded p-1 text-white text-[11px] mt-1"
          >
            <option value="2000">0.5x (2s / bar)</option>
            <option value="1000">1.0x (1s / bar)</option>
            <option value="500">2.0x (0.5s / bar)</option>
            <option value="200">5.0x (0.2s / bar)</option>
          </select>
        </div>
      </div>

      {/* 3. Replay Candlestick Chart & Decision Order Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Chart View (Strictly visible candles only) */}
        <div className="lg:col-span-3 bg-[#07090E] border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2">
            <span className="font-bold text-white">{symbol} · {timeframe} Historical Replay</span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Visible Window: {visibleCandles.length} Bars</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">Future Hidden: {(replayState?.totalCandlesCount ?? 0) - visibleCandles.length} Bars</span>
            </div>
          </div>

          <TradingChart
            candles={chartCandles}
            indicators={{
              showEma21: true,
              showEma50: true,
              showEma200: true,
              showBollinger: false,
              showSRLevels: true,
              showBOS: true,
              showAstroEvents: false
            }}
            stopLoss={tradeStopLoss}
            target2={tradeTakeProfit}
          />
        </div>

        {/* Decision & Trade Ticket */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="font-bold text-white text-sm">Replay Decision</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                IN-SIMULATION
              </span>
            </div>

            <form onSubmit={handleSubmitReplayOrder} className="space-y-3.5">
              {/* Direction */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTradeSide('LONG');
                    setTradeStopLoss(Number((currentPrice * 0.97).toFixed(2)));
                    setTradeTakeProfit(Number((currentPrice * 1.06).toFixed(2)));
                  }}
                  className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    tradeSide === 'LONG'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#141A26] border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LONG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTradeSide('SHORT');
                    setTradeStopLoss(Number((currentPrice * 1.03).toFixed(2)));
                    setTradeTakeProfit(Number((currentPrice * 0.94).toFixed(2)));
                  }}
                  className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    tradeSide === 'SHORT'
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#141A26] border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SHORT</span>
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Position Size (units)</label>
                <input
                  type="number"
                  step="any"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                />
              </div>

              {/* Stop Loss & Take Profit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-rose-400 text-[10px] block mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={tradeStopLoss}
                    onChange={(e) => setTradeStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-emerald-400 text-[10px] block mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={tradeTakeProfit}
                    onChange={(e) => setTradeTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              {/* Decision Hypothesis */}
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Decision Rationale / Note</label>
                <input
                  type="text"
                  placeholder="e.g. S/R bounce with bullish engulfing..."
                  value={tradeNote}
                  onChange={(e) => setTradeNote(e.target.value)}
                  className="w-full bg-[#141A26] border border-slate-700 rounded p-1.5 text-white text-[11px]"
                />
              </div>

              {/* Submit Decision */}
              <button
                type="submit"
                className={`w-full py-2.5 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  tradeSide === 'LONG'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <span>Execute Replay {tradeSide}</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
            Advance candles using the toolbar to see how the market unfolds.
          </div>
        </div>

      </div>

      {/* 4. Active Replay Positions & Closed Trades Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        
        {/* Open Replay Positions */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-white text-xs block border-b border-slate-800 pb-2">
            ACTIVE REPLAY POSITIONS ({replayState?.openPositions.length ?? 0})
          </span>

          {(replayState?.openPositions.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {replayState?.openPositions.map((pos) => {
                const unPnl = pos.side === 'LONG'
                  ? (currentPrice - pos.entryPrice) * pos.quantity
                  : (pos.entryPrice - currentPrice) * pos.quantity;

                return (
                  <div key={pos.id} className="p-2.5 rounded bg-[#090C14] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pos.side === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {pos.side}
                      </span>
                      <span className="text-white ml-2 font-bold">${pos.entryPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${unPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {unPnl >= 0 ? '+' : ''}${unPnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">SL: ${pos.stopLoss} | TP: ${pos.takeProfit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-[11px] text-slate-500">
              No active replay positions. Enter a trade using the ticket above.
            </div>
          )}
        </div>

        {/* Closed Replay Trades */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-white text-xs block border-b border-slate-800 pb-2">
            COMPLETED REPLAY TRADES ({replayState?.closedTrades.length ?? 0})
          </span>

          {(replayState?.closedTrades.length ?? 0) > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {replayState?.closedTrades.map((t) => (
                <div key={t.id} className="p-2.5 rounded bg-[#090C14] border border-slate-800 flex items-center justify-between text-[11px]">
                  <div>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      t.side === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {t.side}
                    </span>
                    <span className="text-slate-400 ml-2">Entry: ${t.entryPrice.toLocaleString()} ➔ Exit: ${t.exitPrice?.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 block">{t.exitReason}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${ (t.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400' }`}>
                      {(t.pnl ?? 0) >= 0 ? '+' : ''}${t.pnl} ({(t.rMultiple ?? 0) >= 0 ? '+' : ''}{t.rMultiple}R)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-[11px] text-slate-500">
              No closed replay trades yet. Advance bars to trigger Stop-Loss or Take-Profit.
            </div>
          )}
        </div>

      </div>

      {/* 5. "What Would Have Happened?" Post-Replay Modal */}
      {isReportOpen && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0D111A] border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <span>WHAT WOULD HAVE HAPPENED? (Replay Post-Mortem Report)</span>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Performance Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded bg-[#101522] border border-slate-800">
                <span className="text-slate-500 block">Net P&L:</span>
                <span className={`text-sm font-bold ${report.netProfitDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {report.netProfitDollar >= 0 ? '+' : ''}${report.netProfitDollar} ({report.netReturnPercent}%)
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#101522] border border-slate-800">
                <span className="text-slate-500 block">Win Rate:</span>
                <span className="text-sm font-bold text-white">{report.winRate}%</span>
              </div>
              <div className="p-2.5 rounded bg-[#101522] border border-slate-800">
                <span className="text-slate-500 block">Profit Factor:</span>
                <span className="text-sm font-bold text-white">{report.profitFactor}</span>
              </div>
              <div className="p-2.5 rounded bg-[#101522] border border-slate-800">
                <span className="text-slate-500 block">Avg R Multiple:</span>
                <span className="text-sm font-bold text-amber-300">{report.averageRMultiple}R</span>
              </div>
            </div>

            {/* Decision Review Ledger */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 block text-[11px]">DECISION ANALYSIS</span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {report.decisionsReview.map((d, i) => (
                  <div key={d.tradeId} className="p-3 rounded bg-[#090C14] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">Decision #{i + 1} ({d.side})</span>
                      <span className={`font-bold ${d.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {d.pnl >= 0 ? '+' : ''}${d.pnl} ({d.rMultiple >= 0 ? '+' : ''}{d.rMultiple}R)
                      </span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{d.whatHappenedSummary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsReportOpen(false)}
                className="px-4 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
