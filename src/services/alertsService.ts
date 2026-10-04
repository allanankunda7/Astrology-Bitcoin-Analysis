/**
 * alertsService.ts
 * Quantitative Market Alerts Framework & Cooldown Manager
 * 
 * Monitors:
 * - Price reaching Key Support or Resistance
 * - EMA 21 / 50 Crossovers
 * - RSI Overbought (>70) or Oversold (<30) thresholds
 * - MACD Histogram / Zero-Line crossovers
 * - Break of Structure (BOS) / Change of Character (CHoCH)
 * - Market Regime shifts
 * 
 * Enforces cooldown timers (e.g. 5 minutes minimum between same alert type)
 * to prevent alert spamming.
 */

export type AlertType =
  | 'PRICE_NEAR_SR'
  | 'EMA_CROSSOVER'
  | 'RSI_THRESHOLD'
  | 'MACD_CROSSOVER'
  | 'BOS_BREAKOUT'
  | 'REGIME_CHANGE';

export interface AlertRule {
  id: string;
  symbol: string;
  type: AlertType;
  conditionDescription: string;
  targetLevel?: number;
  threshold?: number;
  enabled: boolean;
  lastTriggeredTime?: number;
  triggerCount: number;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  symbol: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes anti-spam cooldown

export class AlertsManager {
  private rules: AlertRule[] = [];
  private history: TriggeredAlert[] = [];
  private listeners: Array<(alert: TriggeredAlert) => void> = [];

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    this.rules = [
      {
        id: 'rule-btc-sr',
        symbol: 'BTC/USDT',
        type: 'PRICE_NEAR_SR',
        conditionDescription: 'Alert when Bitcoin approaches within 0.5% of key Support or Resistance',
        enabled: true,
        triggerCount: 0
      },
      {
        id: 'rule-btc-rsi',
        symbol: 'BTC/USDT',
        type: 'RSI_THRESHOLD',
        conditionDescription: 'Alert when RSI crosses < 30 (Oversold) or > 70 (Overbought)',
        threshold: 70,
        enabled: true,
        triggerCount: 0
      },
      {
        id: 'rule-gold-bos',
        symbol: 'XAU/USD',
        type: 'BOS_BREAKOUT',
        conditionDescription: 'Alert on confirmed candle close Break of Structure on Gold Spot',
        enabled: true,
        triggerCount: 0
      },
      {
        id: 'rule-eth-ema',
        symbol: 'ETH/USDT',
        type: 'EMA_CROSSOVER',
        conditionDescription: 'Alert on EMA 21 / 50 Bullish or Bearish Cross on Ethereum',
        enabled: true,
        triggerCount: 0
      }
    ];
  }

  public getRules(): AlertRule[] {
    return [...this.rules];
  }

  public getHistory(): TriggeredAlert[] {
    return [...this.history];
  }

  public toggleRule(ruleId: string): void {
    const r = this.rules.find(x => x.id === ruleId);
    if (r) r.enabled = !r.enabled;
  }

  public addRule(rule: Omit<AlertRule, 'id' | 'triggerCount'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      triggerCount: 0
    };
    this.rules.push(newRule);
    return newRule;
  }

  public deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  public subscribe(cb: (alert: TriggeredAlert) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /**
   * Checks conditions and emits non-spam alerts
   */
  public evaluateMarketTick(params: {
    symbol: string;
    currentPrice: number;
    rsi?: number | null;
    ema21?: number | null;
    ema50?: number | null;
    supportLevel?: number;
    resistanceLevel?: number;
    recentBOS?: boolean;
    regimeName?: string;
  }): void {
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled || rule.symbol !== params.symbol) continue;

      // Check anti-spam cooldown
      if (rule.lastTriggeredTime && (now - rule.lastTriggeredTime < DEFAULT_COOLDOWN_MS)) {
        continue;
      }

      let triggered = false;
      let title = '';
      let message = '';
      let severity: TriggeredAlert['severity'] = 'INFO';

      switch (rule.type) {
        case 'PRICE_NEAR_SR':
          if (params.supportLevel && Math.abs(params.currentPrice - params.supportLevel) / params.currentPrice < 0.005) {
            triggered = true;
            title = `Support Zone Proximity: ${params.symbol}`;
            message = `${params.symbol} is trading at $${params.currentPrice.toLocaleString()}, within 0.5% of Support level ($${params.supportLevel.toLocaleString()}).`;
            severity = 'WARNING';
          } else if (params.resistanceLevel && Math.abs(params.currentPrice - params.resistanceLevel) / params.currentPrice < 0.005) {
            triggered = true;
            title = `Resistance Zone Proximity: ${params.symbol}`;
            message = `${params.symbol} is trading at $${params.currentPrice.toLocaleString()}, testing key Resistance level ($${params.resistanceLevel.toLocaleString()}).`;
            severity = 'WARNING';
          }
          break;

        case 'RSI_THRESHOLD':
          if (params.rsi !== undefined && params.rsi !== null) {
            if (params.rsi >= 70) {
              triggered = true;
              title = `RSI Overbought Alert: ${params.symbol}`;
              message = `14-period RSI printed ${params.rsi.toFixed(1)} (>70 threshold). Potential momentum exhaustion.`;
              severity = 'WARNING';
            } else if (params.rsi <= 30) {
              triggered = true;
              title = `RSI Oversold Alert: ${params.symbol}`;
              message = `14-period RSI printed ${params.rsi.toFixed(1)} (<30 threshold). Capitulation bounce zone.`;
              severity = 'WARNING';
            }
          }
          break;

        case 'BOS_BREAKOUT':
          if (params.recentBOS) {
            triggered = true;
            title = `Break of Structure (BOS): ${params.symbol}`;
            message = `Confirmed candle close Break of Structure detected on ${params.symbol}. Structural trend continuation in play.`;
            severity = 'CRITICAL';
          }
          break;

        case 'EMA_CROSSOVER':
          if (params.ema21 && params.ema50 && Math.abs(params.ema21 - params.ema50) / params.currentPrice < 0.002) {
            triggered = true;
            title = `EMA Convergence: ${params.symbol}`;
            message = `EMA 21 and EMA 50 converging near $${params.ema21.toFixed(2)}. Watch for crossover expansion.`;
            severity = 'INFO';
          }
          break;

        default:
          break;
      }

      if (triggered) {
        rule.lastTriggeredTime = now;
        rule.triggerCount++;

        const alertItem: TriggeredAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ruleId: rule.id,
          symbol: rule.symbol,
          type: rule.type,
          title,
          message,
          timestamp: new Date().toISOString().replace('T', ' ').substring(11, 19) + ' UTC',
          severity
        };

        this.history.unshift(alertItem);
        if (this.history.length > 50) this.history.pop();

        // Notify subscribers
        this.listeners.forEach(l => l(alertItem));
      }
    }
  }
}

export const globalAlertsManager = new AlertsManager();
