/**
 * src/broker/types.ts
 * Broker Abstraction Layer Type Definitions
 * 
 * Standardized data contracts for broker adapters, order simulators,
 * account states, position tracking, and trade execution.
 * 
 * Strictly separated from broker-specific proprietary SDKs.
 * Frontend components interact exclusively with these contracts.
 */

export type OrderSide = 'BUY' | 'SELL';
export type PositionSide = 'LONG' | 'SHORT';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
export type OrderTimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  positionSide: PositionSide;
  type: OrderType;
  status: OrderStatus;
  price?: number;            // Limit or execution price
  stopPrice?: number;        // Stop trigger price
  quantity: number;          // Size in base units (e.g. BTC, ETH)
  filledQuantity: number;
  averageFillPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  fee: number;               // Brokerage fee charged ($)
  slippage: number;          // Simulated slippage ($)
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
  strategy?: string;
  timeframe?: string;
  entryReason?: string;
  notes?: string;
  isPaper: true;             // Always labeled as simulated paper order
  environment: 'PAPER_SIMULATION';
}

export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  usedMargin: number;
  leverage: number;
  entryTime: string;
  strategy?: string;
  timeframe?: string;
  entryReason?: string;
  isPaper: true;
  environment: 'PAPER_SIMULATION';
}

export interface TradeRecord {
  id: string;
  orderId: string;
  positionId: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  slippage: number;
  entryTime: string;
  exitTime: string;
  strategy: string;
  timeframe: string;
  entryReason: string;
  exitReason: string;
  isPaper: true;
}

export interface AccountSummary {
  accountId: string;
  currency: string;
  startingBalance: number;
  balance: number;           // Settled cash balance
  equity: number;            // Balance + Unrealized PnL
  availableBalance: number;  // Balance - Used Margin
  usedMargin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalFeesPaid: number;
  openPositionsCount: number;
  openOrdersCount: number;
  totalTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  winRate: number;           // Win rate percentage (0 - 100)
  profitFactor: number;      // Gross wins / Gross losses
  maxDrawdownPercent: number;
  peakEquity?: number;
  currentDrawdownPercent?: number;
  environment: 'PAPER_SIMULATION';
  isPaper: true;
  lastUpdated: string;
}

export interface ResetAccountOptions {
  startingBalance?: number;
  currency?: string;
  preserveJournal?: boolean;     // Keep trade history for journal analysis
  clearOpenPositions?: boolean;  // Default true
  clearOpenOrders?: boolean;     // Default true
}

export interface AccountSettings {
  startingBalance: number;
  currentBalance: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalFees: number;
  equity: number;
  peakEquity: number;
  currentDrawdown: number;
  maximumDrawdown: number;
  currency: string;
}

export interface MarketDataQuote {
  symbol: string;
  bid: number;
  ask: number;
  lastPrice: number;
  high24h: number;
  low24h: number;
  volume24h: string | number;
  change24h: number;
  timestamp: number;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT';
  type: OrderType;
  quantity: number;
  price?: number;
  currentPrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy?: string;
  timeframe?: string;
  reason?: string;
  notes?: string;
}

export interface BrokerConfig {
  defaultTakerFeePercent: number; // e.g. 0.05%
  defaultMakerFeePercent: number; // e.g. 0.02%
  defaultSlippagePercent: number; // e.g. 0.03%
  maxLeverage: number;            // e.g. 1 (spot) or 5
  startingCapital: number;        // e.g. 100000
}
