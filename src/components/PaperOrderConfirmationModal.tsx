/**
 * src/components/PaperOrderConfirmationModal.tsx
 * Explicit User Confirmation Dialog for Simulated Paper Orders
 * 
 * Satisfies Step 11 of the Trading Engine flow:
 * "Require explicit user confirmation before creating a paper order."
 * 
 * Clearly displays:
 * - Symbol, Side, Type (MARKET / LIMIT / STOP)
 * - Entry price and estimated execution slippage
 * - Stop-loss level and dollar distance
 * - Take-profit target and dollar reward
 * - Risk/Reward ratio
 * - Position size in units and USD equivalent
 * - Estimated trading fee
 * - Maximum risk limit audit
 * - Strategy attribution and technical rationale
 * - Strict [PAPER SIMULATION] sandbox labeling
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Percent,
  X,
  Send,
  Sliders
} from 'lucide-react';
import { PlaceOrderParams } from '../broker/types';

export interface ProposedPaperTrade {
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  currentPrice: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  strategy: string;
  timeframe: string;
  reason: string;
  invalidation?: string;
  accountBalance: number;
  riskPercent?: number;
  estimatedFee?: number;
  estimatedSlippage?: number;
}

interface PaperOrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ProposedPaperTrade | null;
  onConfirm: (params: PlaceOrderParams) => Promise<void>;
  isSubmitting?: boolean;
}

export const PaperOrderConfirmationModal: React.FC<PaperOrderConfirmationModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onConfirm,
  isSubmitting = false
}) => {
  const [userAcknowledged, setUserAcknowledged] = useState(true);

  if (!isOpen || !proposal) return null;

  const isLong = proposal.side === 'BUY' || proposal.side === 'LONG';
  const notionalValue = proposal.entryPrice * proposal.quantity;
  const stopDistance = proposal.stopLoss
    ? Math.abs(proposal.entryPrice - proposal.stopLoss)
    : 0;
  const rewardDistance = proposal.takeProfit
    ? Math.abs(proposal.takeProfit - proposal.entryPrice)
    : 0;
  const riskAmount = stopDistance * proposal.quantity;
  const rewardAmount = rewardDistance * proposal.quantity;
  const riskRewardRatio = stopDistance > 0 ? (rewardDistance / stopDistance).toFixed(2) : 'N/A';
  const riskOfBalancePct = proposal.accountBalance > 0 ? (riskAmount / proposal.accountBalance) * 100 : 0;
  const isHighRisk = riskOfBalancePct > 2.0;

  const estimatedFee = proposal.estimatedFee ?? (notionalValue * 0.0005); // 0.05%
  const estimatedSlippage = proposal.estimatedSlippage ?? (notionalValue * 0.0003); // 0.03%

  const handleConfirm = async () => {
    await onConfirm({
      symbol: proposal.symbol,
      side: isLong ? 'BUY' : 'SELL',
      type: proposal.type,
      quantity: proposal.quantity,
      price: proposal.type === 'LIMIT' ? proposal.entryPrice : undefined,
      stopLoss: proposal.stopLoss,
      takeProfit: proposal.takeProfit,
      strategy: proposal.strategy,
      timeframe: proposal.timeframe,
      reason: proposal.reason
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0D111A] border border-slate-700/80 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090C14]">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              PAPER SIMULATION
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Order Confirmation Required
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Asset & Direction Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#141A26] border border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded flex items-center justify-center font-bold text-sm ${
                isLong
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">{proposal.symbol}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isLong ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                  }`}>
                    {isLong ? 'PAPER LONG' : 'PAPER SHORT'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    [{proposal.type} ORDER]
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Strategy: <span className="text-amber-300 font-semibold">{proposal.strategy}</span> ({proposal.timeframe})
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">Proposed Entry</div>
              <div className="text-base font-bold text-white font-mono">
                ${proposal.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
            </div>
          </div>

          {/* Pricing, Sizing & Risk Matrix */}
          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-[#101522] border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Position Size</span>
              <span className="text-white font-bold text-sm">
                {proposal.quantity} units
              </span>
              <span className="text-slate-500 block text-[10px] mt-0.5">
                ≈ ${notionalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} notional
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#101522] border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Risk / Reward</span>
              <span className={`font-bold text-sm ${parseFloat(riskRewardRatio) >= 2 ? 'text-emerald-400' : 'text-amber-400'}`}>
                1 : {riskRewardRatio}
              </span>
              <span className="text-slate-500 block text-[10px] mt-0.5">
                Target / Stop distance
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#101522] border border-slate-800/80">
              <span className="text-rose-400 block text-[10px]">Stop Loss</span>
              <span className="text-white font-bold">
                {proposal.stopLoss ? `$${proposal.stopLoss.toLocaleString()}` : 'None'}
              </span>
              <span className="text-rose-400 block text-[10px] mt-0.5">
                -${riskAmount.toFixed(2)} ({riskOfBalancePct.toFixed(2)}% of capital)
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#101522] border border-slate-800/80">
              <span className="text-emerald-400 block text-[10px]">Take Profit</span>
              <span className="text-white font-bold">
                {proposal.takeProfit ? `$${proposal.takeProfit.toLocaleString()}` : 'None'}
              </span>
              <span className="text-emerald-400 block text-[10px] mt-0.5">
                +${rewardAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Slippage & Fee Breakdown */}
          <div className="p-3 rounded bg-[#090C14] border border-slate-800/80 text-[11px] font-mono space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span>Estimated Execution Slippage (0.03%):</span>
              <span className="text-slate-300">~${estimatedSlippage.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Simulated Exchange Fee (0.05%):</span>
              <span className="text-slate-300">${estimatedFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Current Available Cash:</span>
              <span className="text-white font-bold">${proposal.accountBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
            </div>
          </div>

          {/* Technical Rationale & Invalidation */}
          <div className="p-3 rounded bg-[#141A26] border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block tracking-wider">
              Setup Rationale & Invalidation Level
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {proposal.reason}
            </p>
            {proposal.invalidation && (
              <p className="text-rose-300 text-[11px] pt-1 border-t border-slate-800/60">
                <strong>Invalidation: </strong>{proposal.invalidation}
              </p>
            )}
          </div>

          {/* Risk Warning Alert */}
          {isHighRisk && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 flex items-start gap-2 text-xs text-amber-300 font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Warning:</strong> Risk per trade ({riskOfBalancePct.toFixed(2)}%) exceeds standard 2.0% institutional risk limits.
              </span>
            </div>
          )}

          {/* Acknowledgment */}
          <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={userAcknowledged}
              onChange={(e) => setUserAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-[11px] leading-normal text-slate-400">
              I confirm this is an educational <strong>PAPER SIMULATION</strong> order. No real funds, real API keys, or live exchange orders are involved.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-slate-800 bg-[#090C14]">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!userAcknowledged || isSubmitting}
            className={`px-5 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 transition-all ${
              isLong
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
                : 'bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Simulating Execution...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Transmit Paper Order</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
