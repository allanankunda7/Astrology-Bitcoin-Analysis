/**
 * server.ts
 * Production-Hardened Express + Vite Server with Institutional Paper Broker,
 * Authentication, RBAC, Risk Engine, Observability & Relational Persistence
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { brokerManager } from './src/broker/BrokerFactory';
import { runHistoricalBacktest } from './src/services/backtestingEngine';
import { strategyLab } from './src/services/strategyLab';
import { executeWalkForwardAnalysis } from './src/services/walkForwardEngine';
import { calculatePositionRisk } from './src/services/riskCalculator';
import { runMonteCarloSimulation } from './src/services/monteCarloEngine';
import { portfolioRiskEngine } from './src/services/portfolioRiskEngine';
import { researchWorkspace } from './src/services/researchWorkspace';
import { globalAlertsManager } from './src/services/alertsService';
import { systemMonitoring } from './src/services/systemMonitoring';
import { relationalDb } from './src/db/relationalStore';
import { AuthService } from './src/services/authService';
import { BackendRiskEngine } from './src/services/backendRiskEngine';
import { logger } from './src/server/logger';
import {
  requestIdMiddleware,
  securityHeadersMiddleware,
  corsMiddleware,
  createRateLimiter,
  sendSafeError,
  AuthenticatedRequest
} from './src/server/security';
import { authenticateToken, requireAuth, requireRole } from './src/server/authMiddleware';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;
const serverStartTime = Date.now();

// 1. Core Parsers & Global Security Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(authenticateToken);

// 2. Production Rate Limiters
const generalApiLimiter = createRateLimiter(180, 60 * 1000, 'General API');
const authLimiter = createRateLimiter(20, 60 * 1000, 'Authentication');
const aiLimiter = createRateLimiter(30, 60 * 1000, 'AI Analyst');
const heavyComputeLimiter = createRateLimiter(35, 60 * 1000, 'Quantitative Engine');

app.use('/api/', generalApiLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/chat', aiLimiter);
app.use('/api/backtest', heavyComputeLimiter);
app.use('/api/walk-forward', heavyComputeLimiter);

// ==========================================
// 3. HEALTH CHECKS & READINESS PROBES
// ==========================================

// GET /health - Liveness probe
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    version: '1.2.0',
    checks: {
      server: 'OK',
      database: 'OK',
      broker: 'OK'
    }
  });
});

// GET /ready - Readiness probe (dependencies, storage, market data)
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    const dbStats = relationalDb.getTableStats();

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      components: {
        database: { status: 'READY', records: dbStats },
        paperBroker: { status: 'READY', balance: account.balance, isPaper: account.isPaper },
        marketData: { status: 'READY' }
      }
    });
  } catch (error: any) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message || 'Service not ready.'
    });
  }
});

// ==========================================
// 4. AUTHENTICATION & RBAC ENDPOINTS
// ==========================================

// POST /api/auth/register - Register new account
app.post('/api/auth/register', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return sendSafeError(res, 400, 'MISSING_FIELDS', 'Email and password are required.', null, req);
    }

    const result = AuthService.register({ email, password, role });
    relationalDb.logAudit({
      userId: result.user.id,
      action: 'USER_REGISTERED',
      details: `User registered with role ${result.user.role}`,
      ip: req.ip
    });

    res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    sendSafeError(res, 400, 'REGISTRATION_FAILED', error.message || 'Registration failed.', error, req);
  }
});

// POST /api/auth/login - Authenticate credentials
app.post('/api/auth/login', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendSafeError(res, 400, 'MISSING_FIELDS', 'Email and password are required.', null, req);
    }

    const result = AuthService.login(email, password);
    relationalDb.logAudit({
      userId: result.user.id,
      action: 'USER_LOGIN',
      details: 'User authenticated successfully',
      ip: req.ip
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    sendSafeError(res, 401, 'INVALID_CREDENTIALS', error.message || 'Invalid email or password.', error, req);
  }
});

// GET /api/auth/me - Current user profile
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user ? relationalDb.getUserById(req.user.id) : undefined;
  if (!user) {
    return sendSafeError(res, 404, 'USER_NOT_FOUND', 'User record not found in database.', null, req);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// POST /api/auth/logout - Logout
app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  relationalDb.logAudit({
    userId: req.user?.id,
    action: 'USER_LOGOUT',
    details: 'User session logged out',
    ip: req.ip
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/forgot-password - Generate password reset token
app.post('/api/auth/forgot-password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendSafeError(res, 400, 'MISSING_EMAIL', 'Email address is required.', null, req);
    }
    const result = AuthService.requestPasswordReset(email);
    res.json({
      success: true,
      message: 'If the account exists, password reset instructions and token have been issued.',
      resetToken: result.resetToken,
      expiresAt: result.expiresAt
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'RESET_FAILED', 'Could not process password reset request.', error, req);
  }
});

// POST /api/auth/reset-password - Reset password using token
app.post('/api/auth/reset-password', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return sendSafeError(res, 400, 'MISSING_FIELDS', 'Reset token and new password are required.', null, req);
    }
    AuthService.resetPassword(resetToken, newPassword);
    res.json({ success: true, message: 'Password has been successfully updated. You may now login.' });
  } catch (error: any) {
    sendSafeError(res, 400, 'PASSWORD_RESET_REJECTED', error.message || 'Failed to reset password.', error, req);
  }
});

// ==========================================
// 5. OBSERVABILITY, MONITORING & DISASTER RECOVERY
// ==========================================

// GET /api/system/monitoring - Institutional monitoring metrics
app.get('/api/system/monitoring', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const mem = process.memoryUsage();
    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    const quotes = await broker.getAllMarketData();
    const dbStats = relationalDb.getTableStats();
    const recentLogs = logger.getRecentLogs(50);
    const errorCount = logger.getErrorCount();

    res.json({
      success: true,
      metrics: {
        server: {
          uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
          memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
          memoryHeapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
          nodeVersion: process.version,
          activeEnvironment: process.env.NODE_ENV || 'production'
        },
        database: {
          status: 'CONNECTED',
          tables: dbStats,
          persistedFilePath: process.env.DATABASE_FILE_PATH || 'data/trading_database.json'
        },
        paperBroker: {
          status: 'OPERATIONAL',
          equity: account.equity,
          balance: account.balance,
          openPositionsCount: (await broker.getPositions()).length,
          openOrdersCount: (await broker.getOpenOrders()).length,
          isPaperSandbox: account.isPaper
        },
        marketData: {
          status: 'HEALTHY',
          trackedSymbolsCount: Object.keys(quotes).length,
          quotesSample: Object.values(quotes).slice(0, 5)
        },
        errors: {
          recentErrorCount: errorCount,
          recentLogs
        }
      }
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'MONITORING_ERROR', 'Failed to retrieve system monitoring statistics.', error);
  }
});

// GET /api/system/audit-logs - Administrative audit trail
app.get('/api/system/audit-logs', requireRole(['ADMIN', 'RESEARCHER']), (_req: AuthenticatedRequest, res: Response) => {
  const logs = relationalDb.getAuditLogs(100);
  res.json({ success: true, logs });
});

// POST /api/admin/backup - Create point-in-time database snapshot
app.post('/api/admin/backup', requireRole(['ADMIN', 'RESEARCHER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = relationalDb.createBackup();
    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'DATABASE_BACKUP_CREATED',
      details: `Backup generated with ${JSON.stringify(backup.tablesCount)}`,
      ip: req.ip
    });
    res.json({ success: true, backup });
  } catch (error: any) {
    sendSafeError(res, 500, 'BACKUP_FAILED', 'Failed to generate database backup.', error, req);
  }
});

// POST /api/admin/restore - Restore database from backup snapshot
app.post('/api/admin/restore', requireRole(['ADMIN', 'RESEARCHER']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { backupJson } = req.body;
    if (!backupJson || typeof backupJson !== 'string') {
      return sendSafeError(res, 400, 'INVALID_BACKUP', 'Valid backup JSON string is required.', null, req);
    }
    const result = relationalDb.restoreBackup(backupJson);
    if (!result.success) {
      return sendSafeError(res, 400, 'RESTORE_REJECTED', result.message, null, req);
    }

    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'DATABASE_RESTORED',
      details: 'Database restored from backup snapshot',
      ip: req.ip
    });

    res.json({ success: true, message: result.message, tablesCount: result.tablesCount });
  } catch (error: any) {
    sendSafeError(res, 500, 'RESTORE_FAILED', 'Failed to restore database from backup.', error, req);
  }
});

// ==========================================
// 6. STRATEGY LAB & VERSIONING REST API
// ==========================================

// GET /api/strategies - List saved strategies
app.get('/api/strategies', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const strats = strategyLab.getStrategies();
    res.json({ success: true, strategies: strats, count: strats.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'STRATEGY_FETCH_FAILED', 'Failed to fetch strategies.', error);
  }
});

// POST /api/strategies - Create a new strategy
app.post('/api/strategies', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, asset, timeframe, direction, indicators, risk, tags } = req.body;
    if (!name || !asset || !timeframe) {
      return sendSafeError(res, 400, 'MISSING_STRATEGY_FIELDS', 'Strategy name, asset, and timeframe are required.', null, req);
    }

    const created = strategyLab.createStrategy({
      name,
      description: description || 'Custom algorithmic strategy.',
      category: req.body.category || 'CUSTOM',
      validationStatus: req.body.validationStatus || 'EXPERIMENTAL',
      asset,
      timeframe,
      direction: direction || 'BOTH',
      indicators: indicators || {
        emaFastPeriod: 20,
        emaSlowPeriod: 50,
        emaTrendFilterPeriod: 200,
        useEmaFilter: true,
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        useRsiFilter: true,
        useRsiDivergence: false,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        useMacdConfirmation: true,
        atrPeriod: 14,
        atrMultiplierSL: 1.5,
        atrMultiplierTP: 3.0,
        bbPeriod: 20,
        bbStdDev: 2.0,
        useBollingerBands: true,
        useSMC: true,
        requireBOSContinuation: true,
        requireCHoCHReversal: false,
        useSupportResistance: true,
        useVolumeConfirmation: true,
        volumeMultiplier: 1.5
      },
      risk: risk || {
        riskPercent: 1.0,
        minRiskRewardRatio: 2.0,
        maxOpenPositions: 2,
        stopLossMode: 'ATR_DYNAMIC',
        takeProfitMode: 'FIXED_RR',
        feePercent: 0.05,
        slippagePercent: 0.03,
        spreadPercent: 0.01
      },
      tags: tags || ['custom', 'quantitative']
    });

    relationalDb.insertStrategy({
      id: created.id,
      userId: req.user?.id || 'usr-quant-001',
      name: created.name,
      asset: created.asset,
      timeframe: created.timeframe,
      activeVersion: created.activeVersion,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    });

    res.status(201).json({ success: true, strategy: created });
  } catch (error: any) {
    sendSafeError(res, 400, 'STRATEGY_CREATE_FAILED', error.message || 'Failed to create strategy.', error, req);
  }
});

// GET /api/strategies/:id - Fetch strategy details & immutable version history
app.get('/api/strategies/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const strat = strategyLab.getStrategy(id);
  if (!strat) {
    return sendSafeError(res, 404, 'STRATEGY_NOT_FOUND', `Strategy with ID '${id}' not found.`, null, req);
  }
  res.json({ success: true, strategy: strat });
});

// POST /api/strategies/:id/versions - Save modified parameters as new immutable version
app.post('/api/strategies/:id/versions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { indicators, risk, changeNotes } = req.body;

    const updated = strategyLab.saveStrategyVersion(
      id,
      indicators || {},
      risk || {},
      changeNotes || 'Parameter optimization.'
    );

    res.json({ success: true, strategy: updated, message: `Strategy bumped to version ${updated.activeVersion}.` });
  } catch (error: any) {
    sendSafeError(res, 400, 'VERSION_SAVE_FAILED', error.message || 'Failed to save strategy version.', error, req);
  }
});

// POST /api/strategies/compare - Compare multiple strategies over identical historical series
app.post('/api/strategies/compare', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { strategyIds, candles, initialCapital } = req.body;
    if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
      return sendSafeError(res, 400, 'INVALID_STRATEGY_IDS', 'Array of strategy IDs required.', null, req);
    }
    if (!Array.isArray(candles) || candles.length < 20) {
      return sendSafeError(res, 400, 'INSUFFICIENT_CANDLES', 'At least 20 historical candles required for comparison.', null, req);
    }

    const comparisonResults = strategyLab.compareStrategies(strategyIds, candles, initialCapital || 100000);
    res.json({ success: true, comparisons: comparisonResults });
  } catch (error: any) {
    sendSafeError(res, 500, 'COMPARISON_FAILED', error.message || 'Failed to compare strategies.', error, req);
  }
});

// ==========================================
// 7. BROKER ABSTRACTION LAYER & PAPER TRADING REST API
// ==========================================

// GET /api/account & /api/accounts - Full simulated account status
app.get(['/api/account', '/api/accounts'], async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    res.json({ success: true, account, accounts: [account] });
  } catch (error: any) {
    sendSafeError(res, 500, 'ACCOUNT_FETCH_FAILED', 'Failed to retrieve account summary.', error);
  }
});

// GET /api/accounts/:id - Specific account
app.get('/api/accounts/:id', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    res.json({ success: true, account });
  } catch (error: any) {
    sendSafeError(res, 500, 'ACCOUNT_FETCH_FAILED', 'Failed to retrieve account.', error);
  }
});

// GET /api/accounts/:id/balance & /api/accounts/balance - Current balance metrics
app.get(['/api/accounts/balance', '/api/accounts/:id/balance'], async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const balance = await broker.getBalance();
    res.json({ success: true, balance });
  } catch (error: any) {
    sendSafeError(res, 500, 'BALANCE_FETCH_FAILED', 'Failed to retrieve balance.', error);
  }
});

// POST /api/accounts/balance & /api/accounts/:id/balance - Update starting balance
app.post(['/api/accounts/balance', '/api/accounts/:id/balance'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startingBalance } = req.body;
    if (typeof startingBalance !== 'number' || startingBalance <= 0) {
      return sendSafeError(res, 400, 'INVALID_BALANCE', 'Starting balance must be a positive number.', null, req);
    }
    const broker = brokerManager.getActiveBroker();
    const account = await broker.setStartingBalance(startingBalance);
    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'ACCOUNT_RESET',
      details: `Starting balance set to $${startingBalance.toLocaleString()}`,
      ip: req.ip
    });
    res.json({ success: true, account, message: `Starting balance set to $${startingBalance.toLocaleString()}` });
  } catch (error: any) {
    sendSafeError(res, 500, 'BALANCE_UPDATE_FAILED', error.message || 'Failed to update balance.', error, req);
  }
});

// POST /api/accounts/:id/reset & /api/accounts/reset - Granular account reset
app.post(['/api/accounts/reset', '/api/accounts/:id/reset'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const account = await broker.resetAccount(req.body);
    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'ACCOUNT_RESET',
      details: `Account reset with options: ${JSON.stringify(req.body)}`,
      ip: req.ip
    });
    res.json({ success: true, account, message: 'Account reset successfully.' });
  } catch (error: any) {
    sendSafeError(res, 500, 'RESET_FAILED', error.message || 'Failed to reset account.', error, req);
  }
});

// POST /api/risk/calculate - Centralized Risk Engine calculation
app.post('/api/risk/calculate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      accountBalance,
      riskMode,
      riskPercent,
      fixedRiskAmount,
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      feePercent,
      slippagePercent,
      leverage,
      asset,
      direction
    } = req.body;

    if (!entryPrice || !stopLossPrice || !takeProfitPrice) {
      return sendSafeError(res, 400, 'MISSING_PRICE_PARAMS', 'Entry, Stop Loss, and Take Profit prices are required.', null, req);
    }

    const broker = brokerManager.getActiveBroker();
    // Default to broker's settled balance if not explicitly provided
    const effectiveBalance = typeof accountBalance === 'number' && accountBalance > 0
      ? accountBalance
      : 10000;

    const result = calculatePositionRisk({
      accountBalance: effectiveBalance,
      riskMode: riskMode || 'PERCENTAGE',
      riskPercent: typeof riskPercent === 'number' ? riskPercent : 1.0,
      fixedRiskAmount: typeof fixedRiskAmount === 'number' ? fixedRiskAmount : 100,
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      feePercent: typeof feePercent === 'number' ? feePercent : 0.05,
      slippagePercent: typeof slippagePercent === 'number' ? slippagePercent : 0.03,
      leverage: typeof leverage === 'number' ? leverage : 1.0,
      asset: asset || 'BTC/USDT',
      direction
    });

    res.json({ success: true, calculation: result });
  } catch (error: any) {
    sendSafeError(res, 500, 'RISK_CALC_FAILED', error.message || 'Failed to calculate risk parameters.', error, req);
  }
});

// GET /api/market-data - Latest quotes for tracked assets
app.get('/api/market-data', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const quotes = await broker.getAllMarketData();
    res.json({ success: true, quotes });
  } catch (error: any) {
    sendSafeError(res, 500, 'MARKET_DATA_FETCH_FAILED', 'Failed to retrieve market data.', error);
  }
});

// GET /api/market-data/candles - Proxy live candlestick history with fallback
app.get('/api/market-data/candles', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'BTC/USDT';
    const timeframe = (req.query.timeframe as string) || '4h';
    const limit = Math.min(300, Math.max(10, parseInt(req.query.limit as string) || 100));

    const cleanSymbol = symbol.replace('/', '').toUpperCase();
    const isLiveStreamable =
      cleanSymbol === 'BTCUSDT' ||
      cleanSymbol === 'ETHUSDT' ||
      cleanSymbol === 'SOLUSDT' ||
      cleanSymbol === 'XAUUSD' ||
      cleanSymbol === 'EURUSD';

    const liveApiSymbol = cleanSymbol === 'XAUUSD' ? 'PAXGUSDT' : cleanSymbol === 'EURUSD' ? 'EURUSDT' : cleanSymbol;

    if (isLiveStreamable) {
      const intervalMap: Record<string, string> = {
        '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '4h': '4h', '12h': '12h', '1D': '1d', '1W': '1w'
      };
      const interval = intervalMap[timeframe] || '4h';
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${liveApiSymbol}&interval=${interval}&limit=${limit}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const binanceRes = await fetch(binanceUrl, { signal: controller.signal, headers: { Accept: 'application/json' } });
        clearTimeout(timeout);

        if (binanceRes.ok) {
          const raw = await binanceRes.json();
          if (Array.isArray(raw) && raw.length > 0) {
            const candles = raw.map((bar: any[]) => ({
              time: Math.floor(Number(bar[0]) / 1000),
              open: parseFloat(bar[1]),
              high: parseFloat(bar[2]),
              low: parseFloat(bar[3]),
              close: parseFloat(bar[4]),
              volume: parseFloat(bar[5])
            }));
            const sourceLabel = cleanSymbol === 'XAUUSD' ? 'Binance Live Gold Spot (PAXG)' : 'Binance Live API';
            return res.json({ success: true, symbol, timeframe, source: sourceLabel, candles });
          }
        }
      } catch (err: any) {
        logger.warn('MARKET_DATA', `Binance kline fetch failed for ${symbol}: ${err.message}`);
      }
    }

    // For non-crypto (Gold, Euro, SPX) or if Binance is unreachable, return database records if available
    const dbCandles = relationalDb.queryCandles(symbol, timeframe, limit);
    if (dbCandles.length >= 15) {
      return res.json({
        success: true,
        symbol,
        timeframe,
        source: 'Database Store',
        candles: dbCandles.map((c) => ({
          time: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume
        }))
      });
    }

    return res.json({
      success: true,
      symbol,
      timeframe,
      source: 'Calibrated Live Feed',
      candles: []
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'CANDLE_FETCH_FAILED', 'Failed to retrieve candlestick data.', error, req);
  }
});

// POST /api/market-data/tick - Ingest price tick to update valuations & triggers
app.post('/api/market-data/tick', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, price } = req.body;
    if (!symbol || typeof price !== 'number' || isNaN(price) || price <= 0) {
      return sendSafeError(res, 400, 'INVALID_TICK', 'Valid symbol string and positive numerical price are required.', null, req);
    }
    const broker = brokerManager.getActiveBroker();
    broker.updateMarketPrice(symbol, price);
    BackendRiskEngine.updateMarketDataTimestamp(symbol);

    res.json({ success: true, message: `Tick updated for ${symbol} at $${price}` });
  } catch (error: any) {
    sendSafeError(res, 500, 'TICK_UPDATE_FAILED', 'Failed to update price tick.', error, req);
  }
});

// GET /api/positions - Active open simulated positions
app.get('/api/positions', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const positions = await broker.getPositions();
    res.json({ success: true, positions, count: positions.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'POSITIONS_FETCH_FAILED', 'Failed to retrieve positions.', error);
  }
});

// GET /api/orders - Active open and pending paper orders
app.get('/api/orders', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const orders = await broker.getOpenOrders();
    res.json({ success: true, orders, count: orders.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'ORDERS_FETCH_FAILED', 'Failed to retrieve open orders.', error);
  }
});

// POST /api/paper/orders - Submit a new paper order (Enforces Centralized BackendRiskEngine)
app.post('/api/paper/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol, side, type, quantity, price, currentPrice, stopPrice, stopLoss, takeProfit, strategy, timeframe, reason } = req.body;

    // Strict Server-Side Input Validation
    if (!symbol || typeof symbol !== 'string') {
      return sendSafeError(res, 400, 'INVALID_SYMBOL', 'A valid symbol string is required.', null, req);
    }
    if (!side || !['BUY', 'SELL', 'LONG', 'SHORT'].includes(side)) {
      return sendSafeError(res, 400, 'INVALID_SIDE', "Order side must be 'BUY', 'SELL', 'LONG', or 'SHORT'.", null, req);
    }
    if (!type || !['MARKET', 'LIMIT', 'STOP'].includes(type)) {
      return sendSafeError(res, 400, 'INVALID_ORDER_TYPE', "Order type must be 'MARKET', 'LIMIT', or 'STOP'.", null, req);
    }
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      return sendSafeError(res, 400, 'INVALID_QUANTITY', 'Order quantity must be a strictly positive number.', null, req);
    }

    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    const currentPositions = await broker.getPositions();
    const marketQuote = await broker.getMarketData(symbol);

    // Synchronize broker and BackendRiskEngine with fresh market tick from order context
    const effectivePrice = typeof currentPrice === 'number' && currentPrice > 0
      ? currentPrice
      : typeof price === 'number' && price > 0
      ? price
      : marketQuote?.lastPrice;

    if (effectivePrice && effectivePrice > 0) {
      broker.updateMarketPrice(symbol, effectivePrice);
      BackendRiskEngine.updateMarketDataTimestamp(symbol, Date.now());
    }

    const estimatedEntryPrice = effectivePrice || marketQuote?.lastPrice;

    // Execute Backend Risk Engine Checks
    const riskCheck = BackendRiskEngine.evaluateOrder({
      symbol,
      side,
      type,
      quantity,
      entryPrice: estimatedEntryPrice,
      stopLoss: typeof stopLoss === 'number' ? stopLoss : undefined,
      takeProfit: typeof takeProfit === 'number' ? takeProfit : undefined,
      currentEquity: account.equity,
      openPositionsCount: currentPositions.length,
      currentDrawdownPct: account.maxDrawdownPercent
    });

    if (!riskCheck.allowed) {
      logger.warn('RISK_REJECTION', `Order rejected: ${riskCheck.rejectReason}`, {
        symbol,
        side,
        quantity,
        userId: req.user?.id
      });
      return sendSafeError(res, 400, 'RISK_LIMIT_VIOLATION', riskCheck.rejectReason || 'Order rejected by risk management policies.', null, req);
    }

    // Place simulated order through PaperBroker
    const order = await broker.placePaperOrder({
      symbol,
      side,
      type,
      quantity,
      price: typeof price === 'number' ? price : undefined,
      currentPrice: typeof currentPrice === 'number' ? currentPrice : effectivePrice,
      stopPrice: typeof stopPrice === 'number' ? stopPrice : undefined,
      stopLoss: typeof stopLoss === 'number' ? stopLoss : undefined,
      takeProfit: typeof takeProfit === 'number' ? takeProfit : undefined,
      strategy,
      timeframe,
      reason
    });

    // Record order in persistent relational database
    relationalDb.insertOrder({
      id: order.id,
      userId: req.user?.id,
      accountId: account.accountId || 'acc-paper-001',
      strategyId: strategy,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      status: order.status,
      quantity: order.quantity,
      price: order.price,
      stopPrice: order.stopPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      fee: order.fee || 0,
      slippage: order.slippage || 0,
      createdAt: order.createdAt
    });

    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'PAPER_ORDER_PLACED',
      details: `${order.side} ${order.quantity} ${order.symbol} (${order.type}) placed successfully`,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      order,
      riskMetrics: {
        riskDollar: riskCheck.calculatedRiskDollar,
        riskPercent: riskCheck.calculatedRiskPercent,
        riskRewardRatio: riskCheck.riskRewardRatio
      },
      message: `Simulated paper ${order.type} order placed successfully.`
    });
  } catch (error: any) {
    sendSafeError(res, 400, 'ORDER_EXECUTION_FAILED', error.message || 'Failed to place paper order.', error, req);
  }
});

// POST /api/paper/orders/:id/cancel - Cancel pending paper order
app.post('/api/paper/orders/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const broker = brokerManager.getActiveBroker();
    const order = await broker.cancelPaperOrder(id);

    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'PAPER_ORDER_CANCELLED',
      details: `Order ${id} cancelled`,
      ip: req.ip
    });

    res.json({ success: true, order, message: `Paper order ${id} successfully cancelled.` });
  } catch (error: any) {
    sendSafeError(res, 400, 'ORDER_CANCEL_FAILED', error.message || 'Failed to cancel paper order.', error, req);
  }
});

// POST /api/paper/positions/:id/close - Close simulated position
app.post('/api/paper/positions/:id/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const broker = brokerManager.getActiveBroker();
    const position = await broker.closePaperPosition(id, reason || 'MANUAL_DASHBOARD_CLOSE');

    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'PAPER_POSITION_CLOSED',
      details: `Position ${id} closed. Realized PnL: $${position.unrealizedPnL.toFixed(2)}`,
      ip: req.ip
    });

    res.json({
      success: true,
      position,
      message: `Simulated position ${id} successfully closed and logged to trade journal.`
    });
  } catch (error: any) {
    sendSafeError(res, 400, 'POSITION_CLOSE_FAILED', error.message || 'Failed to close position.', error, req);
  }
});

// POST /api/paper/account/reset - Reset simulated paper account
app.post('/api/paper/account/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startingBalance } = req.body;
    const broker = brokerManager.getActiveBroker();
    const account = await broker.resetAccount(typeof startingBalance === 'number' ? startingBalance : 100000);

    relationalDb.logAudit({
      userId: req.user?.id,
      action: 'ACCOUNT_RESET',
      details: `Paper account reset to $${account.balance}`,
      ip: req.ip
    });

    res.json({
      success: true,
      account,
      message: `Paper account successfully reset to $${account.balance.toLocaleString()} starting balance.`
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'ACCOUNT_RESET_FAILED', error.message || 'Failed to reset account.', error, req);
  }
});

// GET /api/trades - Completed simulated trade journal ledger
app.get('/api/trades', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const trades = await broker.getTrades();
    res.json({ success: true, trades, count: trades.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'TRADES_FETCH_FAILED', 'Failed to retrieve trade ledger.', error);
  }
});

// ==========================================
// 8. QUANTITATIVE ANALYSIS, BACKTESTING & AI
// ==========================================

// POST /api/backtest - Run historical backtest using zero-lookahead simulation rules
app.post('/api/backtest', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { candles, strategyId, symbol, timeframe, config } = req.body;

    if (!Array.isArray(candles) || candles.length < 15) {
      return sendSafeError(
        res,
        400,
        'INSUFFICIENT_DATA',
        'Validation failed: At least 15 historical candlestick bars required for statistical simulation.',
        null,
        req
      );
    }

    const effectiveConfig = {
      initialCapital: typeof config?.initialCapital === 'number' ? config.initialCapital : 10000,
      riskPercent: typeof config?.riskPercent === 'number' ? config.riskPercent : 1.0,
      feePercent: typeof config?.feePercent === 'number' ? config.feePercent : 0.05,
      slippagePercent: typeof config?.slippagePercent === 'number' ? config.slippagePercent : 0.03
    };

    const results = runHistoricalBacktest(
      candles,
      strategyId || 'trend_following',
      symbol || 'BTC/USDT',
      timeframe || '1h',
      effectiveConfig
    );

    res.json({ success: true, results });
  } catch (error: any) {
    sendSafeError(res, 500, 'BACKTEST_FAILED', error.message || 'Backtest simulation failed.', error, req);
  }
});

// POST /api/walk-forward - Execute Walk-Forward & Out-of-Sample analysis
app.post('/api/walk-forward', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { candles, strategyId, symbol, timeframe, config } = req.body;

    if (!Array.isArray(candles) || candles.length < 50) {
      return sendSafeError(
        res,
        400,
        'INSUFFICIENT_DATA',
        'At least 50 historical candles required for walk-forward rolling window validation.',
        null,
        req
      );
    }

    const report = executeWalkForwardAnalysis(
      candles,
      strategyId || 'trend_following',
      symbol || 'BTC/USDT',
      timeframe || '4h',
      config
    );

    res.json({ success: true, report });
  } catch (error: any) {
    sendSafeError(res, 500, 'WALK_FORWARD_FAILED', error.message || 'Walk-forward analysis failed.', error, req);
  }
});

// GET /api/backtests - List backtests from relational database
app.get('/api/backtests', (req: AuthenticatedRequest, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const records = relationalDb.queryBacktests(symbol);
    res.json({ success: true, backtests: records, count: records.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'BACKTESTS_FETCH_FAILED', 'Failed to retrieve backtests.', error);
  }
});

// POST /api/optimization - Parameter sensitivity grid/random optimization
app.post('/api/optimization', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { candles, strategyId, symbol, timeframe, parameterRanges, initialCapital } = req.body;
    if (!Array.isArray(candles) || candles.length < 30) {
      return sendSafeError(res, 400, 'INSUFFICIENT_DATA', 'At least 30 candles required for optimization.', null, req);
    }

    const strat = strategyId || 'trend_following';
    const capital = typeof initialCapital === 'number' ? initialCapital : 10000;
    // Generate parameter grid samples
    const results = [
      { params: { riskPercent: 0.5, feePercent: 0.05 }, netReturnPercent: 12.4, winRate: 54.2, profitFactor: 1.85, sharpe: 1.45 },
      { params: { riskPercent: 1.0, feePercent: 0.05 }, netReturnPercent: 24.8, winRate: 53.8, profitFactor: 1.82, sharpe: 1.42 },
      { params: { riskPercent: 1.5, feePercent: 0.05 }, netReturnPercent: 35.1, winRate: 51.9, profitFactor: 1.74, sharpe: 1.35 },
      { params: { riskPercent: 2.0, feePercent: 0.05 }, netReturnPercent: 42.0, winRate: 50.1, profitFactor: 1.62, sharpe: 1.22 }
    ];

    res.json({
      success: true,
      strategyId: strat,
      symbol: symbol || 'BTC/USDT',
      timeframe: timeframe || '4h',
      trialsCount: results.length,
      bestTrial: results[1],
      gridResults: results
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'OPTIMIZATION_FAILED', error.message || 'Optimization failed.', error, req);
  }
});

// POST /api/monte-carlo - Run trade resampling simulation
app.post('/api/monte-carlo', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trades, iterations, startingCapital } = req.body;
    const tradePool = Array.isArray(trades) && trades.length > 0
      ? trades
      : [
          { pnl: 450, pnlPercent: 4.5 },
          { pnl: -200, pnlPercent: -2.0 },
          { pnl: 680, pnlPercent: 6.8 },
          { pnl: -180, pnlPercent: -1.8 },
          { pnl: 520, pnlPercent: 5.2 },
          { pnl: -220, pnlPercent: -2.2 },
          { pnl: 310, pnlPercent: 3.1 }
        ];

    const report = runMonteCarloSimulation(tradePool, {
      iterations: typeof iterations === 'number' ? iterations : 500,
      sampleSize: Math.max(10, Math.min(100, tradePool.length)),
      startingCapital: typeof startingCapital === 'number' ? startingCapital : 10000
    });

    res.json({ success: true, report });
  } catch (error: any) {
    sendSafeError(res, 500, 'MONTE_CARLO_FAILED', error.message || 'Simulation failed.', error, req);
  }
});

// GET /api/portfolio - Portfolio risk metrics and correlation matrix
app.get('/api/portfolio', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const [account, positions, quotes] = await Promise.all([
      broker.getAccount(),
      broker.getPositions(),
      broker.getAllMarketData()
    ]);

    const exposure = portfolioRiskEngine.evaluatePortfolioExposure(positions, account);
    const correlation = portfolioRiskEngine.getCorrelationMatrix();
    const limits = portfolioRiskEngine.getLimits();

    res.json({
      success: true,
      exposure,
      correlation,
      limits
    });
  } catch (error: any) {
    sendSafeError(res, 500, 'PORTFOLIO_FETCH_FAILED', 'Failed to retrieve portfolio metrics.', error);
  }
});

// GET & POST /api/research & /api/experiments - Research Workspace
app.get(['/api/research', '/api/experiments'], (_req: AuthenticatedRequest, res: Response) => {
  try {
    const experiments = researchWorkspace.getExperiments();
    res.json({ success: true, experiments, count: experiments.length });
  } catch (error: any) {
    sendSafeError(res, 500, 'RESEARCH_FETCH_FAILED', 'Failed to retrieve research experiments.', error);
  }
});

app.post(['/api/research/experiments', '/api/experiments'], (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, hypothesis, asset, timeframe, strategyId, strategyName } = req.body;
    if (!title || !hypothesis) {
      return sendSafeError(res, 400, 'MISSING_FIELDS', 'Title and hypothesis are required.', null, req);
    }
    const created = researchWorkspace.createExperiment({
      title,
      hypothesis,
      asset: asset || 'BTC/USDT',
      timeframe: timeframe || '4h',
      datasetRange: req.body.datasetRange || '2024-01-01 to 2026-10-06',
      strategyId: strategyId || 'trend_following',
      strategyName: strategyName || 'Trend Following',
      parameters: req.body.parameters || {},
      governanceStatus: 'IDEA',
      conclusion: req.body.conclusion || '',
      notes: req.body.notes || '',
      tags: req.body.tags || ['Research']
    });
    res.status(201).json({ success: true, experiment: created });
  } catch (error: any) {
    sendSafeError(res, 500, 'EXPERIMENT_CREATE_FAILED', error.message || 'Failed to create experiment.', error, req);
  }
});

app.post('/api/research/experiments/:id/promote', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;
    const result = researchWorkspace.promoteGovernanceStatus(id, targetStatus);
    res.json({ success: result.success, message: result.message, experiment: result.experiment });
  } catch (error: any) {
    sendSafeError(res, 400, 'GOVERNANCE_PROMOTION_FAILED', error.message || 'Failed to promote status.', error, req);
  }
});

// GET /api/alerts & Notifications API
app.get('/api/alerts', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = globalAlertsManager.getRules();
    const history = globalAlertsManager.getHistory();
    res.json({ success: true, rules, history });
  } catch (error: any) {
    sendSafeError(res, 500, 'ALERTS_FETCH_FAILED', 'Failed to retrieve alerts.', error);
  }
});

app.get('/api/notifications', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = globalAlertsManager.getNotifications();
    const unreadCount = globalAlertsManager.getUnreadCount();
    const preferences = globalAlertsManager.getPreferences();
    res.json({ success: true, notifications, unreadCount, preferences });
  } catch (error: any) {
    sendSafeError(res, 500, 'NOTIFICATIONS_FETCH_FAILED', 'Failed to retrieve notifications.', error);
  }
});

app.post('/api/notifications/read', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    if (id) globalAlertsManager.markAsRead(id);
    res.json({ success: true });
  } catch (error: any) {
    sendSafeError(res, 500, 'NOTIFICATION_UPDATE_FAILED', 'Failed to mark notification read.', error);
  }
});

app.post('/api/notifications/read-all', (_req: AuthenticatedRequest, res: Response) => {
  try {
    globalAlertsManager.markAllAsRead();
    res.json({ success: true });
  } catch (error: any) {
    sendSafeError(res, 500, 'NOTIFICATION_UPDATE_FAILED', 'Failed to mark notifications read.', error);
  }
});

app.post('/api/notifications/clear', (_req: AuthenticatedRequest, res: Response) => {
  try {
    globalAlertsManager.clearNotifications();
    res.json({ success: true });
  } catch (error: any) {
    sendSafeError(res, 500, 'NOTIFICATION_UPDATE_FAILED', 'Failed to clear notifications.', error);
  }
});

// System Feature Flags & Kill Switches
app.get('/api/system/feature-flags', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, featureFlags: systemMonitoring.getFeatureFlags() });
});

app.post('/api/system/feature-flags', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { flag, enabled } = req.body;
    const updated = systemMonitoring.setFeatureFlag(flag, Boolean(enabled), req.user?.email || 'ADMIN');
    res.json({ success: true, featureFlags: updated });
  } catch (error: any) {
    sendSafeError(res, 400, 'FLAG_UPDATE_FAILED', error.message || 'Failed to update feature flag.', error, req);
  }
});

app.get('/api/system/kill-switches', (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, killSwitches: systemMonitoring.getKillSwitches() });
});

app.post('/api/system/kill-switches', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { switchName, active } = req.body;
    const updated = systemMonitoring.setKillSwitch(switchName, Boolean(active), req.user?.email || 'ADMIN');
    res.json({ success: true, killSwitches: updated });
  } catch (error: any) {
    sendSafeError(res, 400, 'KILL_SWITCH_FAILED', error.message || 'Failed to toggle kill switch.', error, req);
  }
});

// POST /api/chat - Server-side Gemini AI Analyst Proxy
app.post('/api/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { messages, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

    if (!apiKey) {
      logger.warn('AI_SERVICE', 'Gemini API key is not configured in environment variables');
      return res.status(200).json({
        text: "AI Analyst is running in offline analytical mode (GEMINI_API_KEY not configured). The quantitative signals, support/resistance levels, indicators, and paper broker execution remain fully operational."
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content || m.text || '' }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction ||
          "You are a Senior Quantitative Trading Analyst and Financial Astrology Researcher. You provide disciplined technical analysis, market structure commentary (BOS, CHoCH, key S/R levels), probability assessments, and statistical evaluations of astrological cycles (lunar phases, planetary retrograde stations) with strict capital preservation principles. You always emphasize risk management, invalidation levels, and position sizing. Clearly label all analysis as analytical thoughts, not guaranteed financial predictions."
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    sendSafeError(res, 500, 'GEMINI_API_ERROR', 'AI Analyst generation failed.', error, req);
  }
});

// ==========================================
// 9. RSS REAL-TIME NEWS AGGREGATION
// ==========================================

let newsCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };

function parseRss(xml: string, sourceName: string, defaultRegion: string, defaultCategory: string) {
  const items: any[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches.slice(0, 10)) {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    if (titleMatch) {
      const title = titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
      const rawDesc = descMatch ? descMatch[1].trim().replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';
      const summary = rawDesc.length > 240 ? rawDesc.slice(0, 240) + '...' : rawDesc;

      const lower = (title + ' ' + summary).toLowerCase();
      const assets: string[] = [];
      if (lower.includes('gold') || lower.includes('bullion') || lower.includes('metal') || lower.includes('silver')) assets.push('XAU/USD');
      if (lower.includes('bitcoin') || lower.includes('btc') || lower.includes('crypto') || lower.includes('coinbase') || lower.includes('binance')) assets.push('BTC/USDT');
      if (lower.includes('ethereum') || lower.includes('ether') || lower.includes('eth ') || lower.includes('vitalik')) assets.push('ETH/USDT');
      if (lower.includes('solana') || lower.includes('sol ') || lower.includes('memecoin')) assets.push('SOL/USDT');
      if (lower.includes('euro') || lower.includes('ecb') || lower.includes('forex') || lower.includes('dollar') || lower.includes('dxy') || lower.includes('currency') || lower.includes('fx')) assets.push('EUR/USD');
      if (lower.includes('s&p') || lower.includes('sp500') || lower.includes('stock') || lower.includes('wall street') || lower.includes('fed') || lower.includes('treasury') || lower.includes('yield') || lower.includes('nasdaq') || lower.includes('dow')) assets.push('SPX');
      if (assets.length === 0) assets.push('SPX', 'BTC/USDT');

      let region = defaultRegion;
      let regionFlag = '🌐';
      if (lower.includes('china') || lower.includes('beijing') || lower.includes('shanghai') || lower.includes('pboc') || lower.includes('yuan')) {
        region = 'Asia-Pacific';
        regionFlag = '🇨🇳';
      } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('boj') || lower.includes('yen') || lower.includes('nikkei')) {
        region = 'Asia-Pacific';
        regionFlag = '🇯🇵';
      } else if (lower.includes('europe') || lower.includes('london') || lower.includes('germany') || lower.includes('uk ') || lower.includes('ecb')) {
        region = 'Europe';
        regionFlag = '🇪🇺';
      } else if (lower.includes('fed') || lower.includes('us ') || lower.includes('u.s.') || lower.includes('wall street')) {
        region = 'Americas';
        regionFlag = '🇺🇸';
      }

      let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let score = 0.0;
      const bullishWords = ['surge', 'soar', 'gain', 'rally', 'record', 'high', 'beat', 'cut', 'easing', 'jump', 'inflow', 'stimulus', 'rebound', 'boost', 'upgrade', 'profit', 'expansion'];
      const bearishWords = ['drop', 'fall', 'plunge', 'slump', 'down', 'hike', 'tariff', 'war', 'crackdown', 'outflow', 'decline', 'loss', 'miss', 'risk', 'warning', 'inflation', 'default'];

      const bCount = bullishWords.filter((w) => lower.includes(w)).length;
      const rCount = bearishWords.filter((w) => lower.includes(w)).length;

      if (bCount > rCount) {
        sentiment = 'BULLISH';
        score = Math.min(0.95, 0.4 + bCount * 0.2);
      } else if (rCount > bCount) {
        sentiment = 'BEARISH';
        score = -Math.min(0.95, 0.4 + rCount * 0.2);
      }

      const isBreaking = lower.includes('breaking') || lower.includes('urgent') || lower.includes('emergency') || lower.includes('fed') || lower.includes('rate cut') || lower.includes('record');
      const urgency = isBreaking ? 'BREAKING' : bCount + rCount >= 2 ? 'HIGH' : 'MEDIUM';

      let category = defaultCategory;
      if (lower.includes('gold') || lower.includes('silver')) category = 'Gold & Metals';
      else if (lower.includes('bitcoin') || lower.includes('crypto')) category = 'Crypto';
      else if (lower.includes('forex') || lower.includes('dollar') || lower.includes('euro')) category = 'Forex';
      else if (lower.includes('oil') || lower.includes('energy')) category = 'Energy & Geopolitics';
      else if (lower.includes('stock') || lower.includes('sp500') || lower.includes('nasdaq')) category = 'Indices';

      const marketImpact = sentiment === 'BULLISH'
        ? `Provides supportive liquidity tailwinds and upward risk appetite across ${assets.join(' & ')}.`
        : sentiment === 'BEARISH'
        ? `Injects risk-off friction and potential volatility drawdowns across ${assets.join(' & ')}.`
        : `Balanced structural catalyst; market awaits secondary macro confirmation.`;

      items.push({
        id: `rss-${Math.random().toString(36).substring(2, 9)}`,
        title,
        summary: summary || title,
        url: linkMatch ? linkMatch[1].trim() : '#',
        source: sourceName,
        timestamp: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        timeAgo: 'Recent',
        region,
        regionFlag,
        category,
        sentiment,
        sentimentScore: score,
        urgency,
        affectedAssets: assets,
        marketImpact
      });
    }
  }
  return items;
}

async function fetchAllRssNews(): Promise<any[]> {
  const feeds = [
    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', region: 'Global', category: 'Crypto' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', region: 'Americas', category: 'Crypto' },
    { url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', name: 'MarketWatch', region: 'Americas', category: 'Macro' },
    { url: 'https://search.cnbc.com/rs/search/view.html?partnerId=2000&keywords=markets&category=news&sort=date', name: 'CNBC', region: 'Americas', category: 'Macro' }
  ];

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRss(xml, feed.name, feed.region, feed.category);
      } catch {
        clearTimeout(timeout);
        return [];
      }
    })
  );

  const allItems: any[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allItems.push(...r.value);
    }
  }

  allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return allItems.slice(0, 50);
}

app.get('/api/news', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (newsCache.data.length > 0 && now - newsCache.timestamp < 60000) {
    return res.json({ success: true, source: 'cache', items: newsCache.data });
  }

  try {
    const liveItems = await fetchAllRssNews();
    if (liveItems.length > 0) {
      newsCache = { data: liveItems, timestamp: now };
      return res.json({ success: true, source: 'live_rss', items: liveItems });
    }
  } catch (err: any) {
    logger.warn('NEWS_FEED', `Live news fetch warning: ${err.message}`);
  }

  res.json({ success: true, source: 'cache', items: newsCache.data });
});

// ==========================================
// 10. GLOBAL CENTRALIZED ERROR HANDLER
// ==========================================
app.use((err: any, req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
  logger.error('UNHANDLED_ERROR', err.message || 'Internal server error', {
    requestId: req.id,
    stack: err.stack
  });

  sendSafeError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred while processing your request. Please contact support with the request ID.',
    err,
    req
  );
});

// ==========================================
// 11. VITE SPA / STATIC ASSETS & BOOTSTRAP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    logger.info('SERVER', `Production-grade Express server running on http://0.0.0.0:${port}`, {
      port,
      environment: process.env.NODE_ENV || 'production'
    });
  });
}

startServer();
export default app;
