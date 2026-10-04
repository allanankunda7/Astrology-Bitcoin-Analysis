/**
 * src/broker/BrokerFactory.ts
 * Extensible Broker Adapter Factory & Registry
 * 
 * Provides a unified access point for the active broker adapter.
 * Allows seamless registration of new adapters (e.g. AlpacaSandbox, BinanceTestnet)
 * without modifying the core trading engine or frontend components.
 */

import { IBrokerAdapter } from './IBrokerAdapter';
import { PaperBroker } from './PaperBroker';

class BrokerRegistry {
  private activeBroker: IBrokerAdapter;
  private adapters: Map<string, IBrokerAdapter> = new Map();

  constructor() {
    // Default to the high-fidelity PaperBroker simulator
    const defaultPaperBroker = new PaperBroker(100000);
    this.activeBroker = defaultPaperBroker;
    this.adapters.set(defaultPaperBroker.name, defaultPaperBroker);
  }

  /**
   * Get the currently active broker adapter.
   */
  public getActiveBroker(): IBrokerAdapter {
    return this.activeBroker;
  }

  /**
   * Register a new broker adapter implementation.
   */
  public registerAdapter(adapter: IBrokerAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Switch the active broker adapter by registered name.
   */
  public setActiveBroker(name: string): void {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Broker adapter '${name}' is not registered. Available: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    this.activeBroker = adapter;
  }

  /**
   * List all registered broker adapters.
   */
  public listAdapters(): Array<{ name: string; isPaper: boolean; environment: string }> {
    return Array.from(this.adapters.values()).map((a) => ({
      name: a.name,
      isPaper: a.isPaper,
      environment: a.environment
    }));
  }
}

// Global Singleton Instance
export const brokerManager = new BrokerRegistry();
export const getBroker = (): IBrokerAdapter => brokerManager.getActiveBroker();
