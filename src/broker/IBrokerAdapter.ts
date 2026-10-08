/**
 * src/broker/IBrokerAdapter.ts
 * Standardized Broker Adapter Interface
 * 
 * Defines the contract that every broker adapter must implement.
 * Decouples the quantitative analysis engine and user interface
 * from underlying exchange APIs or simulation backends.
 */

import {
  AccountSummary,
  Order,
  Position,
  TradeRecord,
  MarketDataQuote,
  PlaceOrderParams
} from './types';

export interface IBrokerAdapter {
  /** Identifier name of the broker adapter (e.g. 'PaperBroker', 'AlpacaSandbox', 'BinanceTestnet') */
  readonly name: string;

  /** True if this is a simulation / paper environment, false if real execution */
  readonly isPaper: boolean;

  /** Environment mode */
  readonly environment: 'PAPER' | 'SANDBOX' | 'LIVE_RESTRICTED';

  /** Retrieve the full paper account summary including equity, margins, and performance metrics */
  getAccount(): Promise<AccountSummary>;

  /** Retrieve current balance metrics */
  getBalance(): Promise<{
    balance: number;
    equity: number;
    availableBalance: number;
    usedMargin: number;
    unrealizedPnL: number;
  }>;

  /** Retrieve current market quote for an asset */
  getMarketData(symbol: string): Promise<MarketDataQuote>;

  /** Retrieve all market quotes currently tracked by the broker */
  getAllMarketData(): Promise<Record<string, MarketDataQuote>>;

  /** Retrieve active open positions */
  getPositions(): Promise<Position[]>;

  /** Retrieve active open (unfilled) orders */
  getOpenOrders(): Promise<Order[]>;

  /** Retrieve all historical orders */
  getOrderHistory(): Promise<Order[]>;

  /** Retrieve completed trades / trade journal */
  getTrades(): Promise<TradeRecord[]>;

  /** Submit a new paper order (market, limit, stop) */
  placePaperOrder(params: PlaceOrderParams): Promise<Order>;

  /** Cancel an unfilled pending paper order */
  cancelPaperOrder(orderId: string): Promise<Order>;

  /** Close an existing open position at current market price */
  closePaperPosition(positionId: string, reason?: string): Promise<Position>;

  /** Reset paper account back to starting state with granular options */
  resetAccount(options?: number | import('./types').ResetAccountOptions): Promise<AccountSummary>;

  /** Update starting balance without clearing trade records */
  setStartingBalance(balance: number): Promise<AccountSummary>;

  /** Feed a new market price tick into the broker to trigger order matching and SL/TP checks */
  updateMarketPrice(symbol: string, newPrice: number): void;
}
