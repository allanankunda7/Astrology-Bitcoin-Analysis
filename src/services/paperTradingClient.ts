/**
 * src/services/paperTradingClient.ts
 * Frontend HTTP Client for Broker & Paper Trading API
 * 
 * Communicates with backend endpoints:
 * - GET  /api/account
 * - GET  /api/market-data
 * - GET  /api/positions
 * - GET  /api/orders
 * - POST /api/paper/orders
 * - POST /api/paper/orders/:id/cancel
 * - POST /api/paper/positions/:id/close
 * - POST /api/paper/account/reset
 * - GET  /api/trades
 * - POST /api/backtest
 * 
 * Ensures the browser never contains private credentials or direct broker keys.
 */

import {
  AccountSummary,
  Order,
  Position,
  TradeRecord,
  MarketDataQuote,
  PlaceOrderParams
} from '../broker/types';

export class PaperTradingClient {
  private static baseUrl = '';

  /**
   * Fetch full paper account status
   */
  public static async getAccount(): Promise<AccountSummary> {
    const res = await fetch(`${this.baseUrl}/api/account`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch account status (${res.status})`);
    }
    const data = await res.json();
    return data.account;
  }

  /**
   * Fetch all market quotes
   */
  public static async getMarketData(): Promise<Record<string, MarketDataQuote>> {
    const res = await fetch(`${this.baseUrl}/api/market-data`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch market data (${res.status})`);
    }
    const data = await res.json();
    return data.quotes;
  }

  /**
   * Fetch current open positions
   */
  public static async getPositions(): Promise<Position[]> {
    const res = await fetch(`${this.baseUrl}/api/positions`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch open positions (${res.status})`);
    }
    const data = await res.json();
    return data.positions;
  }

  /**
   * Fetch open pending orders
   */
  public static async getOrders(): Promise<Order[]> {
    const res = await fetch(`${this.baseUrl}/api/orders`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch orders (${res.status})`);
    }
    const data = await res.json();
    return data.orders;
  }

  /**
   * Submit a new paper order
   */
  public static async placePaperOrder(params: PlaceOrderParams): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/api/paper/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to place paper order (${res.status})`);
    }

    const data = await res.json();
    return data.order;
  }

  /**
   * Cancel an open paper order
   */
  public static async cancelPaperOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/api/paper/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to cancel order (${res.status})`);
    }

    const data = await res.json();
    return data.order;
  }

  /**
   * Close an open paper position
   */
  public static async closePaperPosition(positionId: string, reason: string = 'MANUAL_CLOSE'): Promise<Position> {
    const res = await fetch(`${this.baseUrl}/api/paper/positions/${positionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to close position (${res.status})`);
    }

    const data = await res.json();
    return data.position;
  }

  /**
   * Reset the paper account
   */
  public static async resetAccount(startingBalance?: number): Promise<AccountSummary> {
    const res = await fetch(`${this.baseUrl}/api/paper/account/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startingBalance })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to reset paper account (${res.status})`);
    }

    const data = await res.json();
    return data.account;
  }

  /**
   * Fetch completed trade records (Trade Journal)
   */
  public static async getTrades(): Promise<TradeRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/trades`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch trade history (${res.status})`);
    }
    const data = await res.json();
    return data.trades;
  }

  /**
   * Update a price tick in the paper broker
   */
  public static async syncMarketPrice(symbol: string, price: number): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/market-data/tick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, price })
      });
    } catch {
      // Best-effort tick sync
    }
  }
}
