/**
 * src/components/PaperTradingDashboard.tsx
 * Complete Paper Trading & Broker Terminal Dashboard
 * 
 * Provides:
 * 1. Live Account HUD: Balance, Equity, Available Balance, Used Margin, Today/Total PnL, Win Rate, Max Drawdown, Profit Factor
 * 2. Broker Architecture Visualizer: Frontend -> Backend API -> IBrokerAdapter -> PaperBroker
 * 3. Active Positions Table with live mark-to-market prices & instant "Close & Log"
 * 4. Open Pending Orders Table (Limit & Stop) with "Cancel Order"
 * 5. Manual Order Entry Ticket with real-time slippage & fee estimation
 * 6. Automated Trade Journal Ledger with performance analytics & CSV export
 * 7. Reset Paper Account dialog with configurable starting capital
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Layers,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
  BarChart2,
  PieChart,
  Sliders,
  Send,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import {
  AccountSummary,
  Order,
  Position,
  TradeRecord,
  MarketDataQuote,
  PlaceOrderParams
} from '../broker/types';
import { PaperTradingClient } from '../services/paperTradingClient';
import { PaperOrderConfirmationModal, ProposedPaperTrade } from './PaperOrderConfirmationModal';

interface PaperTradingDashboardProps {
  currentSymbol?: string;
  currentPrice?: number;
  onSelectSymbol?: (symbol: string) => void;
}

export const PaperTradingDashboard: React.FC<PaperTradingDashboardProps> = ({
  currentSymbol = 'BTC/USDT',
  currentPrice = 88450.25,
  onSelectSymbol
}) => {
  // Account State
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [marketQuotes, setMarketQuotes] = useState<Record<string, MarketDataQuote>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Order Form State
  const [ticketSymbol, setTicketSymbol] = useState<string>(currentSymbol);
  const [ticketSide, setTicketSide] = useState<'BUY' | 'SELL'>('BUY');
  const [ticketType, setTicketType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
  const [ticketQuantity, setTicketQuantity] = useState<number>(0.2);
  const [ticketPrice, setTicketPrice] = useState<number>(currentPrice);
  const [ticketStopPrice, setTicketStopPrice] = useState<number>(currentPrice * 1.02);
  const [ticketStopLoss, setTicketStopLoss] = useState<number>(Number((currentPrice * 0.97).toFixed(2)));
  const [ticketTakeProfit, setTicketTakeProfit] = useState<number>(Number((currentPrice * 1.06).toFixed(2)));
  const [ticketStrategy, setTicketStrategy] = useState<string>('Trend Following');

  // Confirmation Modal State
  const [pendingProposal, setPendingProposal] = useState<ProposedPaperTrade | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset Account Dialog
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [resetStartingCapital, setResetStartingCapital] = useState<number>(100000);

  // Filters for Trade Journal
  const [journalSymbolFilter, setJournalSymbolFilter] = useState<string>('ALL');
  const [journalStrategyFilter, setJournalStrategyFilter] = useState<string>('ALL');

  // Update form price if currentPrice changes and symbol matches
  useEffect(() => {
    if (ticketSymbol === currentSymbol && currentPrice > 0) {
      setTicketPrice(currentPrice);
      if (ticketSide === 'BUY') {
        setTicketStopLoss(Number((currentPrice * 0.97).toFixed(2)));
        setTicketTakeProfit(Number((currentPrice * 1.06).toFixed(2)));
      } else {
        setTicketStopLoss(Number((currentPrice * 1.03).toFixed(2)));
        setTicketTakeProfit(Number((currentPrice * 0.94).toFixed(2)));
      }
    }
  }, [currentPrice, currentSymbol, ticketSymbol, ticketSide]);

  // Load initial data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [accData, posData, ordData, trdData, mktData] = await Promise.all([
        PaperTradingClient.getAccount(),
        PaperTradingClient.getPositions(),
        PaperTradingClient.getOrders(),
        PaperTradingClient.getTrades(),
        PaperTradingClient.getMarketData()
      ]);

      setAccount(accData);
      setPositions(posData);
      setOrders(ordData);
      setTrades(trdData);
      setMarketQuotes(mktData);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load paper trading status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Poll every 3 seconds for live tick updates
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Handle Order Form Submission -> Opens Confirmation Modal (Step 11 requirement)
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    const livePrice = marketQuotes[ticketSymbol]?.lastPrice || currentPrice;
    const entry = ticketType === 'MARKET' ? livePrice : ticketPrice;

    // Calculate proposal details
    const proposal: ProposedPaperTrade = {
      symbol: ticketSymbol,
      side: ticketSide,
      type: ticketType,
      currentPrice: livePrice,
      entryPrice: entry,
      stopLoss: ticketStopLoss > 0 ? ticketStopLoss : undefined,
      takeProfit: ticketTakeProfit > 0 ? ticketTakeProfit : undefined,
      quantity: ticketQuantity,
      strategy: ticketStrategy,
      timeframe: '1h',
      reason: `Manual paper ${ticketSide} order on ${ticketSymbol} following ${ticketStrategy} hypothesis.`,
      invalidation: ticketStopLoss > 0 ? `Price cross beyond $${ticketStopLoss.toLocaleString()}` : undefined,
      accountBalance: account?.availableBalance || 100000,
      estimatedFee: entry * ticketQuantity * 0.0005,
      estimatedSlippage: entry * ticketQuantity * 0.0003
    };

    setPendingProposal(proposal);
    setIsConfirmationOpen(true);
  };

  // Execute paper order after explicit confirmation
  const handleConfirmOrder = async (params: PlaceOrderParams) => {
    try {
      setIsSubmitting(true);
      await PaperTradingClient.placePaperOrder(params);
      setIsConfirmationOpen(false);
      setPendingProposal(null);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Order Execution Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close active position
  const handleClosePosition = async (positionId: string) => {
    try {
      await PaperTradingClient.closePaperPosition(positionId, 'MANUAL_DASHBOARD_CLOSE');
      await loadDashboardData();
    } catch (err: any) {
      alert(`Failed to close position: ${err.message}`);
    }
  };

  // Cancel pending order
  const handleCancelOrder = async (orderId: string) => {
    try {
      await PaperTradingClient.cancelPaperOrder(orderId);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Failed to cancel order: ${err.message}`);
    }
  };

  // Reset account
  const handleResetAccount = async () => {
    try {
      await PaperTradingClient.resetAccount(resetStartingCapital);
      setIsResetConfirmOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      alert(`Failed to reset paper account: ${err.message}`);
    }
  };

  // Filtered trades for journal
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchSymbol = journalSymbolFilter === 'ALL' || t.symbol === journalSymbolFilter;
      const matchStrategy = journalStrategyFilter === 'ALL' || t.strategy === journalStrategyFilter;
      return matchSymbol && matchStrategy;
    });
  }, [trades, journalSymbolFilter, journalStrategyFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (trades.length === 0) {
      alert('No simulated trades to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Symbol', 'Side', 'Entry', 'Exit', 'Size', 'PnL ($)', 'PnL (%)', 'Fees', 'Strategy', 'Timeframe', 'Exit Reason'];
    const rows = trades.map((t) => [
      t.id,
      t.exitTime,
      t.symbol,
      t.side,
      t.entryPrice,
      t.exitPrice,
      t.quantity,
      t.pnl,
      t.pnlPercent,
      t.fees,
      `"${t.strategy}"`,
      t.timeframe,
      `"${t.exitReason}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_paper_trade_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && !account) {
    return (
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-12 text-center space-y-3">
        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
        <span className="text-xs font-mono text-slate-400 block">Connecting to PaperBroker Simulation Engine...</span>
      </div>
    );
  }

  const liveBalance = account?.balance ?? 100000;
  const liveEquity = account?.equity ?? 100000;
  const liveAvailable = account?.availableBalance ?? 100000;
  const liveMargin = account?.usedMargin ?? 0;
  const liveUnrealized = account?.unrealizedPnL ?? 0;
  const liveRealized = account?.realizedPnL ?? 0;
  const totalPnL = liveUnrealized + liveRealized;
  const totalPnLPct = ((totalPnL) / (account?.startingBalance || 100000)) * 100;

  return (
    <div className="space-y-6">

      {/* 1. Architecture & Security Banner */}
      <div className="bg-[#090C14] border border-slate-800 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PAPER SIMULATION ENVIRONMENT
              </span>
              <span className="text-slate-500 text-xs font-mono">
                Decoupled Broker Abstraction Layer Active
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>Paper Trading Terminal & Broker Adapter Hub</span>
            </h2>
          </div>
        </div>

        {/* Multi-Tier Architecture Pipeline */}
        <div className="flex items-center gap-2 text-[11px] font-mono overflow-x-auto py-1">
          <span className="px-2 py-1 rounded bg-[#101522] border border-slate-800 text-slate-300">
            Frontend UI
          </span>
          <span className="text-slate-600">➔</span>
          <span className="px-2 py-1 rounded bg-[#101522] border border-slate-800 text-cyan-400">
            Backend API (/api/paper/*)
          </span>
          <span className="text-slate-600">➔</span>
          <span className="px-2 py-1 rounded bg-[#101522] border border-slate-800 text-purple-400">
            IBrokerAdapter
          </span>
          <span className="text-slate-600">➔</span>
          <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
            PaperBroker Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Account</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* 2. Top Account HUD Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Cash Balance</span>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            ${liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Settled capital</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Total Equity</span>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            ${liveEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Balance + Unrealized</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Available Margin</span>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            ${liveAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Used: ${liveMargin.toFixed(0)}</span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Total P&L</span>
          <div className={`text-lg font-bold font-mono mt-0.5 ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
          <span className={`text-[10px] font-mono ${totalPnLPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}% on starting
          </span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Win Rate %</span>
          <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
            {account?.winRate ?? 0}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {account?.winningTradesCount ?? 0}W / {account?.losingTradesCount ?? 0}L
          </span>
        </div>

        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-3">
          <span className="text-slate-500 text-[10px] font-mono block uppercase">Profit Factor</span>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            {account?.profitFactor ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Max DD: {account?.maxDrawdownPercent ?? 0}%
          </span>
        </div>
      </div>

      {/* 3. Main Trading Workspace: Active Positions + Order Entry Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Active Simulated Positions & Open Orders */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Positions */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Active Simulated Positions</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                    {positions.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time unrealized P&L tracked against live tick streaming.
                </p>
              </div>
            </div>

            {positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left">
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3 text-right">Entry</th>
                      <th className="py-2.5 px-3 text-right">Mark Price</th>
                      <th className="py-2.5 px-3 text-right">Size</th>
                      <th className="py-2.5 px-3 text-right">Stop Loss</th>
                      <th className="py-2.5 px-3 text-right">Take Profit</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {positions.map((pos) => {
                      const quote = marketQuotes[pos.symbol];
                      const markPrice = quote ? quote.lastPrice : pos.currentPrice;
                      const unrealized = pos.side === 'LONG'
                        ? (markPrice - pos.entryPrice) * pos.quantity
                        : (pos.entryPrice - markPrice) * pos.quantity;
                      const unrealizedPct = pos.side === 'LONG'
                        ? ((markPrice - pos.entryPrice) / pos.entryPrice) * 100
                        : ((pos.entryPrice - markPrice) / pos.entryPrice) * 100;

                      return (
                        <tr key={pos.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-bold text-white">
                            <button
                              onClick={() => onSelectSymbol && onSelectSymbol(pos.symbol)}
                              className="hover:text-amber-400 flex items-center gap-1"
                            >
                              <span>{pos.symbol}</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              pos.side === 'LONG'
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-950/70 text-rose-400 border border-rose-500/30'
                            }`}>
                              {pos.side}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right text-white font-bold">${markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right">{pos.quantity} units</td>
                          <td className="py-2.5 px-3 text-right text-rose-400">
                            {pos.stopLoss ? `$${pos.stopLoss.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            {pos.takeProfit ? `$${pos.takeProfit.toLocaleString()}` : '-'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${unrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)} ({unrealized >= 0 ? '+' : ''}{unrealizedPct.toFixed(2)}%)
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No active paper positions. Submit an order from the ticket on the right or from the Trading Terminal.
              </div>
            )}
          </div>

          {/* Open Pending Orders Table */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Open Paper Orders (Limit / Stop)</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                    {orders.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders queued in memory, automatically executed when market price crosses limit or stop triggers.
                </p>
              </div>
            </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left">
                      <th className="py-2 px-3">Order ID</th>
                      <th className="py-2 px-3">Symbol</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Side</th>
                      <th className="py-2 px-3 text-right">Target Price</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Status</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-slate-500">{ord.id.slice(0, 14)}...</td>
                        <td className="py-2 px-3 font-bold text-white">{ord.symbol}</td>
                        <td className="py-2 px-3 text-amber-300">{ord.type}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.side === 'BUY' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}>
                            {ord.side}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-white">
                          ${(ord.price || ord.stopPrice || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right">{ord.quantity} units</td>
                        <td className="py-2 px-3 text-right text-amber-400 font-semibold">{ord.status}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                No pending limit or stop orders currently active.
              </div>
            )}
          </div>

        </div>

        {/* Right Col: Manual Paper Order Ticket */}
        <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Paper Order Entry</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                PAPER
              </span>
            </div>

            <form onSubmit={handleOpenConfirmation} className="space-y-3.5 text-xs font-mono">
              {/* Asset Selector */}
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Asset Symbol</label>
                <select
                  value={ticketSymbol}
                  onChange={(e) => {
                    setTicketSymbol(e.target.value);
                    const p = marketQuotes[e.target.value]?.lastPrice || currentPrice;
                    setTicketPrice(p);
                  }}
                  className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                >
                  <option value="BTC/USDT">BTC/USDT (Bitcoin)</option>
                  <option value="ETH/USDT">ETH/USDT (Ethereum)</option>
                  <option value="SOL/USDT">SOL/USDT (Solana)</option>
                  <option value="XAU/USD">XAU/USD (Gold Spot)</option>
                  <option value="EUR/USD">EUR/USD (Forex)</option>
                  <option value="SPX">SPX (S&P 500)</option>
                </select>
              </div>

              {/* Side: Long vs Short */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTicketSide('BUY')}
                  className={`py-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    ticketSide === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-[#141A26] border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LONG (BUY)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTicketSide('SELL')}
                  className={`py-2 rounded font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                    ticketSide === 'SELL'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                      : 'bg-[#141A26] border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>SHORT (SELL)</span>
                </button>
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-3 gap-1.5">
                {(['MARKET', 'LIMIT', 'STOP'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTicketType(type)}
                    className={`py-1.5 rounded text-[11px] font-bold transition-colors ${
                      ticketType === type
                        ? 'bg-slate-700 text-amber-300 border border-amber-500/40'
                        : 'bg-[#141A26] border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Quantity (units)</span>
                  <span className="text-slate-500">
                    ≈ ${(ticketQuantity * (ticketType === 'MARKET' ? (marketQuotes[ticketSymbol]?.lastPrice || currentPrice) : ticketPrice)).toFixed(2)}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                />
              </div>

              {/* Price (for Limit or Stop) */}
              {ticketType !== 'MARKET' && (
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1">
                    {ticketType === 'LIMIT' ? 'Limit Price ($)' : 'Stop Trigger Price ($)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={ticketType === 'LIMIT' ? ticketPrice : ticketStopPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (ticketType === 'LIMIT') setTicketPrice(val);
                      else setTicketStopPrice(val);
                    }}
                    className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
              )}

              {/* Stop Loss & Take Profit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-rose-400 text-[11px] block mb-1">Stop Loss ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={ticketStopLoss}
                    onChange={(e) => setTicketStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-emerald-400 text-[11px] block mb-1">Take Profit ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={ticketTakeProfit}
                    onChange={(e) => setTicketTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                  />
                </div>
              </div>

              {/* Strategy Tag */}
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Strategy Attribution</label>
                <select
                  value={ticketStrategy}
                  onChange={(e) => setTicketStrategy(e.target.value)}
                  className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white text-xs"
                >
                  <option value="Trend Following">Trend Following</option>
                  <option value="Breakout Retest">Breakout Retest</option>
                  <option value="Mean Reversion">Mean Reversion</option>
                  <option value="Support/Resistance Bounce">Support/Resistance Bounce</option>
                  <option value="RSI Exhaustion">RSI Exhaustion</option>
                  <option value="MACD Momentum">MACD Momentum</option>
                  <option value="Manual Discretion">Manual Discretion</option>
                </select>
              </div>

              {/* Execution Summary Preview */}
              <div className="p-2.5 rounded bg-[#090C14] border border-slate-800 text-[11px] space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Est. Slippage (0.03%):</span>
                  <span className="text-slate-200">
                    ~${((ticketQuantity * (marketQuotes[ticketSymbol]?.lastPrice || currentPrice)) * 0.0003).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Fee (0.05%):</span>
                  <span className="text-slate-200">
                    ~${((ticketQuantity * (marketQuotes[ticketSymbol]?.lastPrice || currentPrice)) * 0.0005).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                  <span>Required Capital:</span>
                  <span>
                    ${(ticketQuantity * (marketQuotes[ticketSymbol]?.lastPrice || currentPrice)).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* Review & Confirm Button (Triggers Step 11 Explicit Confirmation) */}
              <button
                type="submit"
                className={`w-full py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  ticketSide === 'BUY'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Review & Confirm Paper Order</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
            Zero real-money risk. Strictly simulated paper execution.
          </div>
        </div>

      </div>

      {/* 4. Automated Trade Journal Ledger */}
      <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Automated Paper Trade Journal & Post-Trade Ledger</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                {filteredTrades.length} trades
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automatically logs every closed paper trade with entry/exit timestamps, fees, slippage, and rationale.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by symbol */}
            <select
              value={journalSymbolFilter}
              onChange={(e) => setJournalSymbolFilter(e.target.value)}
              className="bg-[#141A26] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 font-mono"
            >
              <option value="ALL">All Symbols</option>
              <option value="BTC/USDT">BTC/USDT</option>
              <option value="ETH/USDT">ETH/USDT</option>
              <option value="SOL/USDT">SOL/USDT</option>
              <option value="XAU/USD">XAU/USD</option>
              <option value="EUR/USD">EUR/USD</option>
              <option value="SPX">SPX</option>
            </select>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {filteredTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-2.5 px-3">Exit Time</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3 text-right">Entry</th>
                  <th className="py-2.5 px-3 text-right">Exit</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 px-3 text-right">P&L ($)</th>
                  <th className="py-2.5 px-3 text-right">P&L (%)</th>
                  <th className="py-2.5 px-3 text-right">Fees</th>
                  <th className="py-2.5 px-3">Strategy</th>
                  <th className="py-2.5 px-3">Exit Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(t.exitTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{t.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.side === 'LONG' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">${t.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-3 text-right text-white font-bold">${t.exitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-3 text-right">{t.quantity}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right ${t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">${t.fees.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-amber-300 text-[11px] truncate max-w-[120px]">{t.strategy}</td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        t.exitReason.includes('TAKE_PROFIT')
                          ? 'bg-emerald-950/60 text-emerald-300'
                          : t.exitReason.includes('STOP_LOSS')
                          ? 'bg-rose-950/60 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {t.exitReason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No completed paper trades recorded in the ledger yet. Closed positions will appear here automatically.
          </div>
        )}
      </div>

      {/* Confirmation Modal Component (Explicit User Confirmation - Step 11) */}
      <PaperOrderConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        proposal={pendingProposal}
        onConfirm={handleConfirmOrder}
        isSubmitting={isSubmitting}
      />

      {/* Reset Account Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D111A] border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <RotateCcw className="w-4 h-4" />
              <span>Reset Paper Account</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear all active simulated positions, pending paper orders, and trade history. Your account cash will be restored to the starting balance.
            </p>
            <div>
              <label className="text-slate-400 text-xs font-mono block mb-1">Starting Balance (USDT)</label>
              <input
                type="number"
                value={resetStartingCapital}
                onChange={(e) => setResetStartingCapital(parseFloat(e.target.value) || 100000)}
                className="w-full bg-[#141A26] border border-slate-700 rounded p-2 text-white font-mono text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAccount}
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
