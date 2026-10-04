/**
 * src/broker/PaperBroker.ts
 * High-Fidelity Paper Trading Broker Simulator
 * 
 * Implements IBrokerAdapter.
 * Simulates an institutional-grade paper exchange environment:
 * - Deterministic order execution (Market, Limit, Stop)
 * - Configurable slippage and fee deduction
 * - Full margin and cash balance accounting
 * - Automated Stop-Loss and Take-Profit triggering on price updates
 * - Comprehensive performance metric tracking (Win rate, profit factor, max drawdown)
 * - Automated trade journal ledger
 * 
 * STRICT SECURITY: Operates entirely as a sandbox simulator.
 * No external API credentials or broker keys are needed or accepted.
 */

import { IBrokerAdapter } from './IBrokerAdapter';
import {
  AccountSummary,
  Order,
  Position,
  TradeRecord,
  MarketDataQuote,
  PlaceOrderParams,
  BrokerConfig,
  PositionSide,
  OrderSide
} from './types';

export class PaperBroker implements IBrokerAdapter {
  public readonly name: string = 'PaperBroker';
  public readonly isPaper: boolean = true;
  public readonly environment: 'PAPER' = 'PAPER';

  private startingBalance: number;
  private balance: number;
  private usedMargin: number = 0;
  private totalFeesPaid: number = 0;
  private realizedPnL: number = 0;
  private peakEquity: number;
  private maxDrawdownPercent: number = 0;

  private positions: Map<string, Position> = new Map();
  private openOrders: Map<string, Order> = new Map();
  private orderHistory: Order[] = [];
  private trades: TradeRecord[] = [];

  // Market quotes map for mark-to-market valuations
  private marketQuotes: Map<string, MarketDataQuote> = new Map();

  private config: BrokerConfig;

  constructor(initialCapital: number = 100000, config?: Partial<BrokerConfig>) {
    this.startingBalance = initialCapital;
    this.balance = initialCapital;
    this.peakEquity = initialCapital;

    this.config = {
      defaultTakerFeePercent: config?.defaultTakerFeePercent ?? 0.05, // 0.05%
      defaultMakerFeePercent: config?.defaultMakerFeePercent ?? 0.02, // 0.02%
      defaultSlippagePercent: config?.defaultSlippagePercent ?? 0.03, // 0.03%
      maxLeverage: config?.maxLeverage ?? 1,                          // 1x (spot cash)
      startingCapital: initialCapital
    };

    // Initialize default benchmark assets
    this.initDefaultQuotes();
  }

  private initDefaultQuotes(): void {
    const defaults: Array<{ symbol: string; price: number; change24h: number }> = [
      { symbol: 'BTC/USDT', price: 88450.25, change24h: 3.42 },
      { symbol: 'ETH/USDT', price: 3340.50, change24h: 2.15 },
      { symbol: 'SOL/USDT', price: 184.20, change24h: 5.80 },
      { symbol: 'XAU/USD', price: 2685.40, change24h: 0.45 },
      { symbol: 'EUR/USD', price: 1.0845, change24h: -0.18 },
      { symbol: 'SPX', price: 5780.20, change24h: 0.62 }
    ];

    const now = Date.now();
    for (const d of defaults) {
      this.marketQuotes.set(d.symbol, {
        symbol: d.symbol,
        lastPrice: d.price,
        bid: d.price * 0.9999,
        ask: d.price * 1.0001,
        high24h: d.price * 1.025,
        low24h: d.price * 0.975,
        volume24h: '$1.2B',
        change24h: d.change24h,
        timestamp: now
      });
    }
  }

  /**
   * Update the latest price for a symbol.
   * Re-evaluates mark-to-market unrealized P&L, checks limit orders,
   * and triggers automated Stop-Loss / Take-Profit executions.
   */
  public updateMarketPrice(symbol: string, newPrice: number): void {
    if (!newPrice || isNaN(newPrice) || newPrice <= 0) return;

    const existing = this.marketQuotes.get(symbol);
    const now = Date.now();
    this.marketQuotes.set(symbol, {
      symbol,
      lastPrice: newPrice,
      bid: newPrice * 0.9999,
      ask: newPrice * 1.0001,
      high24h: existing ? Math.max(existing.high24h, newPrice) : newPrice,
      low24h: existing ? Math.min(existing.low24h, newPrice) : newPrice,
      volume24h: existing?.volume24h || '$1.0B',
      change24h: existing?.change24h || 0,
      timestamp: now
    });

    // 1. Update mark-to-market prices and unrealized PnL for active positions
    for (const pos of this.positions.values()) {
      if (pos.symbol === symbol) {
        pos.currentPrice = newPrice;
        if (pos.side === 'LONG') {
          pos.unrealizedPnL = (newPrice - pos.entryPrice) * pos.quantity;
          pos.unrealizedPnLPercent = ((newPrice - pos.entryPrice) / pos.entryPrice) * 100;
        } else {
          pos.unrealizedPnL = (pos.entryPrice - newPrice) * pos.quantity;
          pos.unrealizedPnLPercent = ((pos.entryPrice - newPrice) / pos.entryPrice) * 100;
        }

        // 2. Check automated Stop-Loss and Take-Profit triggers
        this.checkPositionSLTP(pos, newPrice);
      }
    }

    // 3. Check pending Limit and Stop orders
    this.checkPendingOrders(symbol, newPrice);

    // 4. Update drawdown tracking
    this.updateDrawdown();
  }

  private checkPositionSLTP(pos: Position, currentPrice: number): void {
    if (pos.side === 'LONG') {
      if (pos.stopLoss && currentPrice <= pos.stopLoss) {
        this.closePaperPosition(pos.id, 'AUTOMATED_STOP_LOSS_TRIGGERED');
      } else if (pos.takeProfit && currentPrice >= pos.takeProfit) {
        this.closePaperPosition(pos.id, 'AUTOMATED_TAKE_PROFIT_TRIGGERED');
      }
    } else { // SHORT
      if (pos.stopLoss && currentPrice >= pos.stopLoss) {
        this.closePaperPosition(pos.id, 'AUTOMATED_STOP_LOSS_TRIGGERED');
      } else if (pos.takeProfit && currentPrice <= pos.takeProfit) {
        this.closePaperPosition(pos.id, 'AUTOMATED_TAKE_PROFIT_TRIGGERED');
      }
    }
  }

  private checkPendingOrders(symbol: string, currentPrice: number): void {
    for (const [orderId, order] of this.openOrders.entries()) {
      if (order.symbol !== symbol || order.status !== 'PENDING') continue;

      let shouldFill = false;
      let fillPrice = currentPrice;

      if (order.type === 'LIMIT') {
        if (order.side === 'BUY' && order.price && currentPrice <= order.price) {
          shouldFill = true;
          fillPrice = order.price;
        } else if (order.side === 'SELL' && order.price && currentPrice >= order.price) {
          shouldFill = true;
          fillPrice = order.price;
        }
      } else if (order.type === 'STOP') {
        if (order.side === 'BUY' && order.stopPrice && currentPrice >= order.stopPrice) {
          shouldFill = true;
          fillPrice = currentPrice * (1 + this.config.defaultSlippagePercent / 100);
        } else if (order.side === 'SELL' && order.stopPrice && currentPrice <= order.stopPrice) {
          shouldFill = true;
          fillPrice = currentPrice * (1 - this.config.defaultSlippagePercent / 100);
        }
      }

      if (shouldFill) {
        this.executeFill(order, fillPrice);
      }
    }
  }

  private executeFill(order: Order, executionPrice: number): void {
    const feeRate = (order.type === 'MARKET' ? this.config.defaultTakerFeePercent : this.config.defaultMakerFeePercent) / 100;
    const orderCost = executionPrice * order.quantity;
    const fee = orderCost * feeRate;

    // Check balance
    const available = this.balance - this.usedMargin;
    if (orderCost + fee > available) {
      order.status = 'REJECTED';
      order.notes = 'Order rejected: insufficient available margin at fill execution.';
      this.openOrders.delete(order.id);
      this.orderHistory.push(order);
      return;
    }

    order.status = 'FILLED';
    order.filledQuantity = order.quantity;
    order.averageFillPrice = executionPrice;
    order.fee = fee;
    order.updatedAt = new Date().toISOString();

    this.balance -= fee;
    this.totalFeesPaid += fee;
    this.usedMargin += orderCost / this.config.maxLeverage;

    // Create open position
    const positionId = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const position: Position = {
      id: positionId,
      symbol: order.symbol,
      side: order.positionSide,
      quantity: order.quantity,
      entryPrice: executionPrice,
      currentPrice: executionPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      usedMargin: orderCost / this.config.maxLeverage,
      leverage: this.config.maxLeverage,
      entryTime: new Date().toISOString(),
      strategy: order.strategy,
      timeframe: order.timeframe,
      entryReason: order.entryReason,
      isPaper: true,
      environment: 'PAPER_SIMULATION'
    };

    this.positions.set(positionId, position);
    this.openOrders.delete(order.id);
    this.orderHistory.push(order);
  }

  public async getAccount(): Promise<AccountSummary> {
    let totalUnrealized = 0;
    for (const pos of this.positions.values()) {
      totalUnrealized += pos.unrealizedPnL;
    }

    const equity = this.balance + totalUnrealized;
    const availableBalance = Math.max(0, this.balance - this.usedMargin);

    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter((t) => t.pnl > 0).length;
    const losingTrades = this.trades.filter((t) => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const grossProfit = this.trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(this.trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;

    this.updateDrawdown(equity);

    return {
      accountId: 'PAPER-ACC-QUANT-001',
      currency: 'USDT',
      startingBalance: this.startingBalance,
      balance: Number(this.balance.toFixed(2)),
      equity: Number(equity.toFixed(2)),
      availableBalance: Number(availableBalance.toFixed(2)),
      usedMargin: Number(this.usedMargin.toFixed(2)),
      unrealizedPnL: Number(totalUnrealized.toFixed(2)),
      realizedPnL: Number(this.realizedPnL.toFixed(2)),
      totalFeesPaid: Number(this.totalFeesPaid.toFixed(2)),
      openPositionsCount: this.positions.size,
      openOrdersCount: this.openOrders.size,
      totalTradesCount: totalTrades,
      winningTradesCount: winningTrades,
      losingTradesCount: losingTrades,
      winRate: Number(winRate.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      maxDrawdownPercent: Number(this.maxDrawdownPercent.toFixed(2)),
      environment: 'PAPER_SIMULATION',
      isPaper: true,
      lastUpdated: new Date().toISOString()
    };
  }

  public async getBalance(): Promise<{
    balance: number;
    equity: number;
    availableBalance: number;
    usedMargin: number;
    unrealizedPnL: number;
  }> {
    let totalUnrealized = 0;
    for (const pos of this.positions.values()) {
      totalUnrealized += pos.unrealizedPnL;
    }
    const equity = this.balance + totalUnrealized;
    return {
      balance: Number(this.balance.toFixed(2)),
      equity: Number(equity.toFixed(2)),
      availableBalance: Number(Math.max(0, this.balance - this.usedMargin).toFixed(2)),
      usedMargin: Number(this.usedMargin.toFixed(2)),
      unrealizedPnL: Number(totalUnrealized.toFixed(2))
    };
  }

  public async getMarketData(symbol: string): Promise<MarketDataQuote> {
    const quote = this.marketQuotes.get(symbol);
    if (!quote) {
      throw new Error(`Market data unavailable for symbol '${symbol}'. Supported symbols include: ${Array.from(this.marketQuotes.keys()).join(', ')}`);
    }
    return quote;
  }

  public async getAllMarketData(): Promise<Record<string, MarketDataQuote>> {
    const res: Record<string, MarketDataQuote> = {};
    for (const [k, v] of this.marketQuotes.entries()) {
      res[k] = v;
    }
    return res;
  }

  public async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  public async getOpenOrders(): Promise<Order[]> {
    return Array.from(this.openOrders.values());
  }

  public async getOrderHistory(): Promise<Order[]> {
    return [...this.orderHistory];
  }

  public async getTrades(): Promise<TradeRecord[]> {
    return [...this.trades].sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime());
  }

  /**
   * Places a paper order with comprehensive validation.
   * Supports MARKET, LIMIT, STOP for both LONG and SHORT.
   */
  public async placePaperOrder(params: PlaceOrderParams): Promise<Order> {
    // 1. Validation
    if (!params.symbol || typeof params.symbol !== 'string') {
      throw new Error('Order rejected: Invalid or missing symbol.');
    }
    const quote = this.marketQuotes.get(params.symbol);
    if (!quote) {
      throw new Error(`Order rejected: Symbol '${params.symbol}' is not actively tracked.`);
    }

    if (!params.quantity || isNaN(params.quantity) || params.quantity <= 0) {
      throw new Error('Order rejected: Order quantity must be a strictly positive number.');
    }

    const sideNorm: OrderSide = (params.side === 'BUY' || params.side === 'LONG') ? 'BUY' : 'SELL';
    const positionSide: PositionSide = sideNorm === 'BUY' ? 'LONG' : 'SHORT';

    const orderId = `ord-paper-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const order: Order = {
      id: orderId,
      symbol: params.symbol,
      side: sideNorm,
      positionSide,
      type: params.type || 'MARKET',
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price,
      stopPrice: params.stopPrice,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      fee: 0,
      slippage: 0,
      strategy: params.strategy || 'Manual Paper Discretion',
      timeframe: params.timeframe || '1h',
      entryReason: params.reason || 'Paper order submitted via Terminal',
      createdAt: nowIso,
      updatedAt: nowIso,
      isPaper: true,
      environment: 'PAPER_SIMULATION'
    };

    // 2. Validate Stop Loss & Take Profit logic
    if (params.stopLoss) {
      if (positionSide === 'LONG' && params.stopLoss >= quote.lastPrice) {
        throw new Error(`Order rejected: For a LONG position, Stop Loss ($${params.stopLoss}) must be strictly below current market price ($${quote.lastPrice}).`);
      }
      if (positionSide === 'SHORT' && params.stopLoss <= quote.lastPrice) {
        throw new Error(`Order rejected: For a SHORT position, Stop Loss ($${params.stopLoss}) must be strictly above current market price ($${quote.lastPrice}).`);
      }
    }

    if (params.takeProfit) {
      if (positionSide === 'LONG' && params.takeProfit <= quote.lastPrice) {
        throw new Error(`Order rejected: For a LONG position, Take Profit ($${params.takeProfit}) must be strictly above current market price ($${quote.lastPrice}).`);
      }
      if (positionSide === 'SHORT' && params.takeProfit >= quote.lastPrice) {
        throw new Error(`Order rejected: For a SHORT position, Take Profit ($${params.takeProfit}) must be strictly below current market price ($${quote.lastPrice}).`);
      }
    }

    // 3. Execution logic by Order Type
    if (order.type === 'MARKET') {
      const slippageRate = (this.config.defaultSlippagePercent / 100);
      const slippageAmount = quote.lastPrice * slippageRate;
      
      // Buy executes at ask + slippage, Sell executes at bid - slippage
      const executionPrice = sideNorm === 'BUY'
        ? quote.lastPrice + slippageAmount
        : quote.lastPrice - slippageAmount;

      const orderCost = executionPrice * order.quantity;
      const fee = orderCost * (this.config.defaultTakerFeePercent / 100);
      const available = this.balance - this.usedMargin;

      if (orderCost + fee > available) {
        throw new Error(`Order rejected: Insufficient simulated available margin. Required: $${(orderCost + fee).toFixed(2)}, Available: $${available.toFixed(2)}.`);
      }

      order.status = 'FILLED';
      order.filledQuantity = order.quantity;
      order.averageFillPrice = Number(executionPrice.toFixed(4));
      order.fee = Number(fee.toFixed(2));
      order.slippage = Number((slippageAmount * order.quantity).toFixed(2));
      order.updatedAt = new Date().toISOString();

      this.balance -= fee;
      this.totalFeesPaid += fee;
      this.usedMargin += orderCost / this.config.maxLeverage;

      const positionId = `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const position: Position = {
        id: positionId,
        symbol: order.symbol,
        side: positionSide,
        quantity: order.quantity,
        entryPrice: order.averageFillPrice,
        currentPrice: quote.lastPrice,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
        usedMargin: Number((orderCost / this.config.maxLeverage).toFixed(2)),
        leverage: this.config.maxLeverage,
        entryTime: new Date().toISOString(),
        strategy: order.strategy,
        timeframe: order.timeframe,
        entryReason: order.entryReason,
        isPaper: true,
        environment: 'PAPER_SIMULATION'
      };

      this.positions.set(positionId, position);
      this.orderHistory.push(order);
      return order;
    } else {
      // LIMIT or STOP order -> stored in pending orders
      const orderPrice = order.price || order.stopPrice || quote.lastPrice;
      const estimatedCost = orderPrice * order.quantity;
      const available = this.balance - this.usedMargin;

      if (estimatedCost > available) {
        throw new Error(`Order rejected: Insufficient simulated margin for pending order. Estimated: $${estimatedCost.toFixed(2)}, Available: $${available.toFixed(2)}.`);
      }

      this.openOrders.set(order.id, order);
      return order;
    }
  }

  public async cancelPaperOrder(orderId: string): Promise<Order> {
    const order = this.openOrders.get(orderId);
    if (!order) {
      throw new Error(`Order cancellation failed: Order with ID '${orderId}' not found or already filled.`);
    }

    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    this.openOrders.delete(orderId);
    this.orderHistory.push(order);
    return order;
  }

  public async closePaperPosition(positionId: string, reason: string = 'MANUAL_CLOSE'): Promise<Position> {
    const pos = this.positions.get(positionId);
    if (!pos) {
      throw new Error(`Position close failed: Position with ID '${positionId}' not found or already closed.`);
    }

    const quote = this.marketQuotes.get(pos.symbol);
    const exitBasePrice = quote ? quote.lastPrice : pos.currentPrice;
    
    // Simulate exit slippage
    const slippageRate = (this.config.defaultSlippagePercent / 100);
    const slippageAmount = exitBasePrice * slippageRate;
    const finalExitPrice = pos.side === 'LONG'
      ? exitBasePrice - slippageAmount
      : exitBasePrice + slippageAmount;

    // Calculate gross PnL
    const grossPnL = pos.side === 'LONG'
      ? (finalExitPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - finalExitPrice) * pos.quantity;

    // Exit fee
    const exitCost = finalExitPrice * pos.quantity;
    const exitFee = exitCost * (this.config.defaultTakerFeePercent / 100);
    const netPnL = grossPnL - exitFee;

    // Return margin to cash balance and add net P&L
    this.balance += (pos.usedMargin + netPnL);
    this.usedMargin = Math.max(0, this.usedMargin - pos.usedMargin);
    this.realizedPnL += netPnL;
    this.totalFeesPaid += exitFee;

    pos.realizedPnL = Number(netPnL.toFixed(2));
    pos.unrealizedPnL = 0;
    pos.unrealizedPnLPercent = 0;

    // Record trade in journal
    const tradeRecord: TradeRecord = {
      id: `trd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: `ord-exit-${positionId}`,
      positionId: pos.id,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: Number(pos.entryPrice.toFixed(4)),
      exitPrice: Number(finalExitPrice.toFixed(4)),
      quantity: pos.quantity,
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      pnl: Number(netPnL.toFixed(2)),
      pnlPercent: Number(((netPnL / (pos.entryPrice * pos.quantity)) * 100).toFixed(2)),
      fees: Number(exitFee.toFixed(2)),
      slippage: Number((slippageAmount * pos.quantity).toFixed(2)),
      entryTime: pos.entryTime,
      exitTime: new Date().toISOString(),
      strategy: pos.strategy || 'Discretionary Paper Setup',
      timeframe: pos.timeframe || '1h',
      entryReason: pos.entryReason || 'Technical confirmation',
      exitReason: reason,
      isPaper: true
    };

    this.trades.push(tradeRecord);
    this.positions.delete(positionId);

    return pos;
  }

  public async resetAccount(startingBalance?: number): Promise<AccountSummary> {
    const capital = startingBalance && startingBalance > 0 ? startingBalance : this.startingBalance;
    this.startingBalance = capital;
    this.balance = capital;
    this.usedMargin = 0;
    this.realizedPnL = 0;
    this.totalFeesPaid = 0;
    this.peakEquity = capital;
    this.maxDrawdownPercent = 0;

    this.positions.clear();
    this.openOrders.clear();
    this.orderHistory = [];
    this.trades = [];

    this.initDefaultQuotes();
    return this.getAccount();
  }

  private updateDrawdown(currentEquity?: number): void {
    const eq = currentEquity ?? (this.balance + Array.from(this.positions.values()).reduce((s, p) => s + p.unrealizedPnL, 0));
    if (eq > this.peakEquity) {
      this.peakEquity = eq;
    }
    if (this.peakEquity > 0) {
      const dd = ((this.peakEquity - eq) / this.peakEquity) * 100;
      if (dd > this.maxDrawdownPercent) {
        this.maxDrawdownPercent = dd;
      }
    }
  }
}
