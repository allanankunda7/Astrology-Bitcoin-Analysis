import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Trash2,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Filter,
  CheckCircle2,
  Calendar,
  BookOpen,
  PieChart
} from 'lucide-react';

export interface JournalEntry {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
  timeframe: string;
  date: string;
  result: 'WIN' | 'LOSS' | 'OPEN' | 'BREAKEVEN';
  pnlDollar: number;
  pnlPercent: number;
  notes: string;
  lessons: string;
}

const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j-1',
    symbol: 'BTC/USDT',
    direction: 'LONG',
    entryPrice: 87950,
    stopLoss: 85650,
    takeProfit: 94800,
    strategy: 'Breakout Retest',
    timeframe: '4h',
    date: '2026-09-28',
    result: 'WIN',
    pnlDollar: 480.50,
    pnlPercent: 4.8,
    notes: 'BOS above $84,200 with volume expansion on 4H retest. High confluence with EMA 21.',
    lessons: 'Patience on retest confirmation reduced drawdown significantly compared to chasing breakout wicks.'
  },
  {
    id: 'j-2',
    symbol: 'ETH/USDT',
    direction: 'SHORT',
    entryPrice: 3410,
    stopLoss: 3465,
    takeProfit: 3260,
    strategy: 'Mean Reversion',
    timeframe: '1h',
    date: '2026-09-22',
    result: 'LOSS',
    pnlDollar: -110.00,
    pnlPercent: -1.1,
    notes: 'RSI divergence at upper Bollinger Band with macro resistance nearby.',
    lessons: 'Underlying trend was too strong; mean reversion counter-trend carries higher failure rate during ETF expansion.'
  },
  {
    id: 'j-3',
    symbol: 'XAU/USD',
    direction: 'SHORT',
    entryPrice: 2692,
    stopLoss: 2715,
    takeProfit: 2635,
    strategy: 'Support / Resistance Bounce',
    timeframe: '4h',
    date: '2026-10-01',
    result: 'WIN',
    pnlDollar: 340.00,
    pnlPercent: 3.4,
    notes: 'Tested multi-touch resistance node at $2,692 with clean upper wick rejection.',
    lessons: 'Taking partial profits at TP1 locked in gain before secondary bounce.'
  }
];

export const TradeJournalViewer: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(INITIAL_JOURNAL_ENTRIES);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('ALL');

  // New entry form state
  const [newSymbol, setNewSymbol] = useState<string>('BTC/USDT');
  const [newDirection, setNewDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [newEntry, setNewEntry] = useState<number>(88450);
  const [newStopLoss, setNewStopLoss] = useState<number>(86200);
  const [newTakeProfit, setNewTakeProfit] = useState<number>(93800);
  const [newStrategy, setNewStrategy] = useState<string>('Trend-Following');
  const [newTimeframe, setNewTimeframe] = useState<string>('4h');
  const [newResult, setNewResult] = useState<'WIN' | 'LOSS' | 'OPEN'>('OPEN');
  const [newPnl, setNewPnl] = useState<number>(0);
  const [newNotes, setNewNotes] = useState<string>('');
  const [newLessons, setNewLessons] = useState<string>('');

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: JournalEntry = {
      id: `j-${Date.now()}`,
      symbol: newSymbol,
      direction: newDirection,
      entryPrice: newEntry,
      stopLoss: newStopLoss,
      takeProfit: newTakeProfit,
      strategy: newStrategy,
      timeframe: newTimeframe,
      date: new Date().toISOString().split('T')[0],
      result: newResult,
      pnlDollar: newPnl,
      pnlPercent: newEntry > 0 ? Number(((newPnl / newEntry) * 100).toFixed(2)) : 0,
      notes: newNotes,
      lessons: newLessons
    };
    setEntries([entry, ...entries]);
    setShowAddModal(false);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const exportJournal = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trading_journal_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Grouped statistics by Strategy and Timeframe
  const stats = useMemo(() => {
    const closed = entries.filter(e => e.result === 'WIN' || e.result === 'LOSS');
    const wins = closed.filter(e => e.result === 'WIN');
    const totalPnl = closed.reduce((acc, e) => acc + e.pnlDollar, 0);

    // By Strategy
    const byStrat: Record<string, { total: number; wins: number; pnl: number }> = {};
    closed.forEach(e => {
      if (!byStrat[e.strategy]) byStrat[e.strategy] = { total: 0, wins: 0, pnl: 0 };
      byStrat[e.strategy].total++;
      if (e.result === 'WIN') byStrat[e.strategy].wins++;
      byStrat[e.strategy].pnl += e.pnlDollar;
    });

    // By Timeframe
    const byTf: Record<string, { total: number; wins: number; pnl: number }> = {};
    closed.forEach(e => {
      if (!byTf[e.timeframe]) byTf[e.timeframe] = { total: 0, wins: 0, pnl: 0 };
      byTf[e.timeframe].total++;
      if (e.result === 'WIN') byTf[e.timeframe].wins++;
      byTf[e.timeframe].pnl += e.pnlDollar;
    });

    return {
      totalClosed: closed.length,
      winRate: closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0,
      totalPnl: Number(totalPnl.toFixed(2)),
      byStrat,
      byTf
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (filterStrategy !== 'ALL' && e.strategy !== filterStrategy) return false;
      if (filterTimeframe !== 'ALL' && e.timeframe !== filterTimeframe) return false;
      return true;
    });
  }, [entries, filterStrategy, filterTimeframe]);

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Quantitative Trading Journal & Performance Tracker</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Record every executed setup with qualitative reasoning, invalidation points, and lessons learned. Analyze edge by strategy and timeframe.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Trade</span>
          </button>
          <button
            onClick={exportJournal}
            className="px-3 py-1.5 rounded bg-[#07090E] hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1.5"
            title="Export journal to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs tabular-nums">
        <div className="bg-[#07090E] p-3 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">TOTAL LOGGED TRADES</span>
          <span className="text-base font-bold text-white mt-0.5 block">{entries.length}</span>
          <span className="text-[10px] text-slate-500">{stats.totalClosed} Closed / {entries.length - stats.totalClosed} Open</span>
        </div>

        <div className="bg-[#07090E] p-3 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">JOURNAL WIN RATE</span>
          <span className={`text-base font-bold mt-0.5 block ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {stats.winRate}%
          </span>
          <span className="text-[10px] text-slate-500">Confirmed Outcomes</span>
        </div>

        <div className="bg-[#07090E] p-3 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">NET REALIZED PnL</span>
          <span className={`text-base font-bold mt-0.5 block ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500">Cumulative Dollar Gain</span>
        </div>

        <div className="bg-[#07090E] p-3 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 block">PRIMARY STRATEGY</span>
          <span className="text-base font-bold text-amber-300 mt-0.5 block truncate">
            Breakout Retest
          </span>
          <span className="text-[10px] text-slate-500">Highest Historical Conviction</span>
        </div>
      </div>

      {/* Performance by Strategy and Timeframe Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Edge Breakdown by Strategy</span>
          <div className="space-y-1.5">
            {Object.entries(stats.byStrat).map(([strat, data]) => {
              const wr = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : '0';
              return (
                <div key={strat} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="text-slate-300">{strat}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{wr}% Win ({data.wins}/{data.total})</span>
                    <span className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.pnl >= 0 ? '+' : ''}${data.pnl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#07090E] p-3.5 rounded border border-slate-800 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold block uppercase">Edge Breakdown by Timeframe</span>
          <div className="space-y-1.5">
            {Object.entries(stats.byTf).map(([tf, data]) => {
              const wr = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : '0';
              return (
                <div key={tf} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="text-slate-300 px-1.5 py-0.2 rounded bg-slate-800 font-bold">{tf}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{wr}% Win ({data.wins}/{data.total})</span>
                    <span className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.pnl >= 0 ? '+' : ''}${data.pnl}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trade Entries List */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px]">
          <span>RECORDED TRADES ({filteredEntries.length})</span>
          <span className="text-slate-500">Sorted by most recent</span>
        </div>

        <div className="space-y-2.5">
          {filteredEntries.map(e => (
            <div
              key={e.id}
              className="bg-[#07090E] border border-slate-800 rounded-lg p-3.5 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    e.direction === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                  }`}>
                    {e.direction}
                  </span>
                  <span className="font-bold text-white text-sm">{e.symbol}</span>
                  <span className="text-slate-400 text-xs">({e.strategy})</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">{e.timeframe}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[10px]">{e.date}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    e.result === 'WIN' ? 'bg-emerald-500 text-slate-950' :
                    e.result === 'LOSS' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {e.result}
                  </span>
                  {e.result !== 'OPEN' && (
                    <span className={`font-bold ${e.pnlDollar >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {e.pnlDollar >= 0 ? '+' : ''}${e.pnlDollar.toLocaleString()} ({e.pnlPercent}%)
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteEntry(e.id)}
                    className="p-1 text-slate-600 hover:text-rose-400 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Price Parameters Grid */}
              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                <div>Entry: <strong className="text-white">${e.entryPrice.toLocaleString()}</strong></div>
                <div>Stop Loss: <strong className="text-rose-400">${e.stopLoss.toLocaleString()}</strong></div>
                <div>Take Profit: <strong className="text-emerald-400">${e.takeProfit.toLocaleString()}</strong></div>
              </div>

              {/* Notes & Lessons */}
              {e.notes && (
                <div className="text-[11px] text-slate-300 bg-[#0B0E17] p-2 rounded border border-slate-800/40">
                  <span className="text-amber-400 font-semibold">Reasoning: </span>
                  {e.notes}
                </div>
              )}
              {e.lessons && (
                <div className="text-[11px] text-slate-400 bg-[#0B0E17] p-2 rounded border border-slate-800/40">
                  <span className="text-cyan-400 font-semibold">Lessons / Post-Trade Review: </span>
                  {e.lessons}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 max-w-lg w-full space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm">LOG NEW TRADE TO JOURNAL</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">SYMBOL</label>
                  <input
                    type="text"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">DIRECTION</label>
                  <select
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value as any)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  >
                    <option value="LONG">LONG</option>
                    <option value="SHORT">SHORT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ENTRY ($)</label>
                  <input
                    type="number"
                    value={newEntry}
                    onChange={(e) => setNewEntry(Number(e.target.value))}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-rose-400 block mb-1">STOP LOSS ($)</label>
                  <input
                    type="number"
                    value={newStopLoss}
                    onChange={(e) => setNewStopLoss(Number(e.target.value))}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 block mb-1">TAKE PROFIT ($)</label>
                  <input
                    type="number"
                    value={newTakeProfit}
                    onChange={(e) => setNewTakeProfit(Number(e.target.value))}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">STRATEGY</label>
                  <input
                    type="text"
                    value={newStrategy}
                    onChange={(e) => setNewStrategy(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">TIMEFRAME</label>
                  <input
                    type="text"
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">RESULT</label>
                  <select
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value as any)}
                    className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">REALIZED PnL ($ USD)</label>
                <input
                  type="number"
                  value={newPnl}
                  onChange={(e) => setNewPnl(Number(e.target.value))}
                  className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">SETUP REASONING</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Why was this trade entered?"
                  className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white h-16"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">LESSONS & NOTES</label>
                <textarea
                  value={newLessons}
                  onChange={(e) => setNewLessons(e.target.value)}
                  placeholder="What worked? What was done poorly?"
                  className="w-full bg-[#07090E] border border-slate-800 rounded p-1.5 text-white h-16"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-400 text-slate-950 font-bold"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
