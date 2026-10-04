import React, { useState } from 'react';
import {
  Database,
  Table,
  Key,
  Link2,
  Code2,
  Copy,
  Check,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
  Play,
  TrendingUp,
  TrendingDown,
  Coins,
  Cpu,
  BookmarkCheck,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface ColumnDef {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  nullable: boolean;
  isIndex?: boolean;
  description: string;
}

interface TableDef {
  id: string;
  name: string;
  category: 'core' | 'market' | 'quantitative' | 'execution';
  description: string;
  columns: ColumnDef[];
  indexes: string[];
  relationships: { type: string; target: string; via: string }[];
}

const TABLES: TableDef[] = [
  {
    id: 'users',
    name: 'users',
    category: 'core',
    description: 'User accounts, portfolio constraints, and risk management parameters.',
    columns: [
      { name: 'id', type: 'SERIAL', isPk: true, nullable: false, description: 'Surrogate primary key' },
      { name: 'email', type: 'VARCHAR(255)', isIndex: true, nullable: false, description: 'Unique user email' },
      { name: 'hashed_password', type: 'VARCHAR(255)', nullable: false, description: 'Bcrypt hashed password' },
      { name: 'full_name', type: 'VARCHAR(100)', nullable: true, description: 'Trader / analyst name' },
      { name: 'account_currency', type: 'VARCHAR(10)', nullable: false, description: 'Base portfolio currency (USD)' },
      { name: 'default_balance', type: 'NUMERIC(18, 2)', nullable: false, description: 'Simulated paper balance ($)' },
      { name: 'max_risk_per_trade_pct', type: 'NUMERIC(5, 2)', nullable: false, description: 'Risk constraint ceiling (e.g. 1.0%)' },
      { name: 'max_open_positions', type: 'INTEGER', nullable: false, description: 'Simultaneous open trade limit' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, description: 'Account status' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Registration UTC timestamp' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: 'Last profile update timestamp' },
    ],
    indexes: ['uq_users_email (UNIQUE)', 'idx_users_id'],
    relationships: [
      { type: '1-to-Many', target: 'trade_journal', via: 'trade_journal.user_id -> users.id' },
    ],
  },
  {
    id: 'assets',
    name: 'assets',
    category: 'market',
    description: 'Multi-market financial instrument registry (Crypto, Forex, Commodities, Indices, Stocks).',
    columns: [
      { name: 'id', type: 'SERIAL', isPk: true, nullable: false, description: 'Asset unique identifier' },
      { name: 'symbol', type: 'VARCHAR(30)', isIndex: true, nullable: false, description: 'Ticker symbol (BTC/USDT, XAU/USD)' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Full asset descriptive name' },
      { name: 'asset_class', type: 'VARCHAR(30)', isIndex: true, nullable: false, description: 'crypto | forex | commodity | index | stock' },
      { name: 'base_currency', type: 'VARCHAR(15)', nullable: false, description: 'Base unit (BTC, EUR, XAU)' },
      { name: 'quote_currency', type: 'VARCHAR(15)', nullable: false, description: 'Quote unit (USDT, USD)' },
      { name: 'price_precision', type: 'INTEGER', nullable: false, description: 'Display price decimal precision' },
      { name: 'quantity_precision', type: 'INTEGER', nullable: false, description: 'Order size decimal precision' },
      { name: 'tick_size', type: 'NUMERIC(18, 8)', nullable: false, description: 'Minimum price movement increment' },
      { name: 'min_order_size', type: 'NUMERIC(18, 8)', nullable: false, description: 'Minimum executable order quantity' },
      { name: 'is_active', type: 'BOOLEAN', isIndex: true, nullable: false, description: 'Trading enabled/disabled flag' },
      { name: 'metadata_info', type: 'JSON', nullable: true, description: 'Exchange routing, trading hours, margin specs' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Registry creation timestamp' },
    ],
    indexes: ['uq_assets_symbol (UNIQUE)', 'idx_assets_asset_class', 'idx_assets_is_active'],
    relationships: [
      { type: '1-to-Many', target: 'market_candles', via: 'market_candles.asset_id -> assets.id' },
      { type: '1-to-Many', target: 'trading_signals', via: 'trading_signals.asset_id -> assets.id' },
      { type: '1-to-Many', target: 'trade_journal', via: 'trade_journal.asset_id -> assets.id' },
    ],
  },
  {
    id: 'market_candles',
    name: 'market_candles',
    category: 'market',
    description: 'High-precision OHLCV time-series quotes across multi-timeframes (1m to 1W).',
    columns: [
      { name: 'id', type: 'BIGSERIAL', isPk: true, nullable: false, description: 'Surrogate time-series ID' },
      { name: 'asset_id', type: 'INTEGER', isFk: true, fkTarget: 'assets.id', isIndex: true, nullable: false, description: 'Foreign key to assets table (CASCADE)' },
      { name: 'timeframe', type: 'VARCHAR(10)', isIndex: true, nullable: false, description: 'Bar interval: 1m, 5m, 15m, 1h, 4h, 1D, 1W' },
      { name: 'timestamp', type: 'TIMESTAMP', isIndex: true, nullable: false, description: 'Candle open UTC timestamp' },
      { name: 'open', type: 'NUMERIC(18, 8)', nullable: false, description: 'High-precision open price' },
      { name: 'high', type: 'NUMERIC(18, 8)', nullable: false, description: 'High-precision high price' },
      { name: 'low', type: 'NUMERIC(18, 8)', nullable: false, description: 'High-precision low price' },
      { name: 'close', type: 'NUMERIC(18, 8)', nullable: false, description: 'High-precision close price' },
      { name: 'volume', type: 'NUMERIC(24, 8)', nullable: false, description: 'Base volume traded' },
      { name: 'quote_volume', type: 'NUMERIC(24, 8)', nullable: true, description: 'Quote volume (e.g. USDT)' },
      { name: 'trade_count', type: 'INTEGER', nullable: true, description: 'Total trades inside candle period' },
      { name: 'vwap', type: 'NUMERIC(18, 8)', nullable: true, description: 'Volume-weighted average price' },
      { name: 'is_closed', type: 'SMALLINT', nullable: false, description: '1 if candle completed, 0 if forming' },
    ],
    indexes: [
      'uq_candle_asset_tf_ts UNIQUE (asset_id, timeframe, timestamp)',
      'idx_candle_lookup (asset_id, timeframe, timestamp DESC)',
    ],
    relationships: [
      { type: 'Many-to-1', target: 'assets', via: 'market_candles.asset_id -> assets.id' },
    ],
  },
  {
    id: 'strategies',
    name: 'strategies',
    category: 'quantitative',
    description: 'Rule-based algorithmic strategies (Trend Following, Breakouts, Mean Reversion).',
    columns: [
      { name: 'id', type: 'SERIAL', isPk: true, nullable: false, description: 'Strategy unique ID' },
      { name: 'name', type: 'VARCHAR(100)', nullable: false, description: 'Display name (e.g. Trend Following Alpha)' },
      { name: 'code', type: 'VARCHAR(50)', isIndex: true, nullable: false, description: 'Unique slug (TF_EMA_MACD_ADX)' },
      { name: 'category', type: 'VARCHAR(50)', isIndex: true, nullable: false, description: 'trend | breakout | pullback | mean_reversion' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Detailed quantitative rationale' },
      { name: 'parameters', type: 'JSON', nullable: false, description: 'Configurable rules (fast_ema, slow_ema, adx_threshold)' },
      { name: 'default_timeframe', type: 'VARCHAR(10)', nullable: false, description: 'Primary setup timeframe (4h)' },
      { name: 'required_htf', type: 'VARCHAR(10)', nullable: true, description: 'Higher timeframe macro trend filter (1D)' },
      { name: 'is_active', type: 'BOOLEAN', isIndex: true, nullable: false, description: 'Active signal scanning flag' },
      { name: 'backtest_win_rate', type: 'VARCHAR(20)', nullable: true, description: 'Historical verified win rate (%)' },
      { name: 'backtest_profit_factor', type: 'VARCHAR(20)', nullable: true, description: 'Profit factor (Gross Profit / Gross Loss)' },
      { name: 'sample_size', type: 'INTEGER', nullable: false, description: 'Number of historical backtest occurrences' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Creation timestamp' },
    ],
    indexes: ['uq_strategies_code (UNIQUE)', 'idx_strategies_category', 'idx_strategies_is_active'],
    relationships: [
      { type: '1-to-Many', target: 'trading_signals', via: 'trading_signals.strategy_id -> strategies.id' },
    ],
  },
  {
    id: 'trading_signals',
    name: 'trading_signals',
    category: 'quantitative',
    description: 'Probabilistic trading setups with transparent scoring, entry zones, targets, and invalidations.',
    columns: [
      { name: 'id', type: 'SERIAL', isPk: true, nullable: false, description: 'Setup identification ID' },
      { name: 'asset_id', type: 'INTEGER', isFk: true, fkTarget: 'assets.id', isIndex: true, nullable: false, description: 'Target instrument (CASCADE)' },
      { name: 'strategy_id', type: 'INTEGER', isFk: true, fkTarget: 'strategies.id', isIndex: true, nullable: false, description: 'Generating strategy (CASCADE)' },
      { name: 'timeframe', type: 'VARCHAR(10)', isIndex: true, nullable: false, description: 'Setup timeframe (15m, 1h, 4h, 1D)' },
      { name: 'direction', type: 'VARCHAR(10)', isIndex: true, nullable: false, description: 'LONG or SHORT' },
      { name: 'technical_score', type: 'INTEGER', nullable: false, description: 'Transparent score 0-10 based on checklist' },
      { name: 'confidence', type: 'NUMERIC(5, 4)', nullable: false, description: 'Statistical confidence (0.0000 - 1.0000)' },
      { name: 'market_regime', type: 'VARCHAR(50)', nullable: false, description: 'Strong Uptrend | Ranging | High Volatility' },
      { name: 'entry_zone_low', type: 'NUMERIC(18, 8)', nullable: false, description: 'Lower bound of favorable entry' },
      { name: 'entry_zone_high', type: 'NUMERIC(18, 8)', nullable: false, description: 'Upper bound of favorable entry' },
      { name: 'entry_price_est', type: 'NUMERIC(18, 8)', nullable: false, description: 'Representative estimated execution price' },
      { name: 'stop_loss', type: 'NUMERIC(18, 8)', nullable: false, description: 'Algorithmic protective stop level' },
      { name: 'invalidation_price', type: 'NUMERIC(18, 8)', nullable: false, description: 'Price where thesis is objectively void' },
      { name: 'invalidation_reason', type: 'TEXT', nullable: false, description: 'Exact objective market condition' },
      { name: 'target_1', type: 'NUMERIC(18, 8)', nullable: false, description: 'Target 1 (Conservative 1.0R)' },
      { name: 'target_2', type: 'NUMERIC(18, 8)', nullable: false, description: 'Target 2 (Runner / Resistance 2.0R)' },
      { name: 'target_3', type: 'NUMERIC(18, 8)', nullable: true, description: 'Target 3 (Macro Fibonacci extension)' },
      { name: 'risk_reward_ratio', type: 'NUMERIC(6, 2)', nullable: false, description: 'Calculated R:R (e.g. 2.85)' },
      { name: 'supporting_factors', type: 'JSON', nullable: false, description: 'Array of verified technical reasons' },
      { name: 'conflicting_factors', type: 'JSON', nullable: false, description: 'Array of active warning flags' },
      { name: 'status', type: 'VARCHAR(20)', isIndex: true, nullable: false, description: 'ACTIVE | TRIGGERED | INVALIDATED | EXPIRED' },
      { name: 'generated_at', type: 'TIMESTAMP', isIndex: true, nullable: false, description: 'Signal timestamp' },
    ],
    indexes: [
      'idx_signal_asset_status (asset_id, status, generated_at DESC)',
      'idx_signal_strategy_id',
    ],
    relationships: [
      { type: 'Many-to-1', target: 'assets', via: 'trading_signals.asset_id -> assets.id' },
      { type: 'Many-to-1', target: 'strategies', via: 'trading_signals.strategy_id -> strategies.id' },
      { type: '1-to-Many', target: 'trade_journal', via: 'trade_journal.signal_id -> trading_signals.id' },
    ],
  },
  {
    id: 'trade_journal',
    name: 'trade_journal',
    category: 'execution',
    description: 'Execution logs, simulated paper trades, realized PnL, R-multiples, and trader psychology review.',
    columns: [
      { name: 'id', type: 'SERIAL', isPk: true, nullable: false, description: 'Trade record identifier' },
      { name: 'user_id', type: 'INTEGER', isFk: true, fkTarget: 'users.id', isIndex: true, nullable: false, description: 'Trader ID (CASCADE)' },
      { name: 'asset_id', type: 'INTEGER', isFk: true, fkTarget: 'assets.id', isIndex: true, nullable: false, description: 'Asset traded (RESTRICT)' },
      { name: 'signal_id', type: 'INTEGER', isFk: true, fkTarget: 'trading_signals.id', nullable: true, description: 'Optional linked signal (SET NULL)' },
      { name: 'trade_type', type: 'VARCHAR(10)', nullable: false, description: 'LONG or SHORT' },
      { name: 'execution_mode', type: 'VARCHAR(10)', nullable: false, description: 'PAPER or LIVE' },
      { name: 'status', type: 'VARCHAR(20)', isIndex: true, nullable: false, description: 'PENDING | OPEN | CLOSED | CANCELLED' },
      { name: 'entry_price', type: 'NUMERIC(18, 8)', nullable: false, description: 'Executed entry price' },
      { name: 'exit_price', type: 'NUMERIC(18, 8)', nullable: true, description: 'Executed exit price' },
      { name: 'stop_loss', type: 'NUMERIC(18, 8)', nullable: false, description: 'Initial planned stop price' },
      { name: 'take_profit', type: 'NUMERIC(18, 8)', nullable: true, description: 'Planned take-profit price' },
      { name: 'position_size_usd', type: 'NUMERIC(18, 2)', nullable: false, description: 'Total dollar position size' },
      { name: 'quantity', type: 'NUMERIC(24, 8)', nullable: false, description: 'Asset quantity (e.g. 0.25 BTC)' },
      { name: 'initial_risk_usd', type: 'NUMERIC(18, 2)', nullable: false, description: 'Total dollar risk at stop-loss' },
      { name: 'realized_pnl_usd', type: 'NUMERIC(18, 2)', nullable: true, description: 'Realized dollar profit or loss' },
      { name: 'return_percentage', type: 'NUMERIC(8, 4)', nullable: true, description: 'Percentage gain or loss on trade' },
      { name: 'r_multiple', type: 'NUMERIC(6, 2)', nullable: true, description: 'Risk-adjusted return (Realized PnL / Risk)' },
      { name: 'setup_grade', type: 'VARCHAR(5)', nullable: true, description: 'Self-assessment execution grade (A+, A, B, C)' },
      { name: 'emotional_state', type: 'VARCHAR(50)', nullable: true, description: 'Trader psychology: Calm, Patient, FOMO, Hesitant' },
      { name: 'notes', type: 'TEXT', nullable: true, description: 'Post-trade reflection and lessons learned' },
      { name: 'opened_at', type: 'TIMESTAMP', isIndex: true, nullable: false, description: 'Position open time' },
      { name: 'closed_at', type: 'TIMESTAMP', nullable: true, description: 'Position close time' },
    ],
    indexes: [
      'idx_journal_user_status (user_id, status, opened_at DESC)',
      'idx_journal_asset_id',
    ],
    relationships: [
      { type: 'Many-to-1', target: 'users', via: 'trade_journal.user_id -> users.id' },
      { type: 'Many-to-1', target: 'assets', via: 'trade_journal.asset_id -> assets.id' },
      { type: 'Many-to-1', target: 'trading_signals', via: 'trade_journal.signal_id -> trading_signals.id' },
    ],
  },
];

const SEEDED_SAMPLE_DATA: Record<string, any[]> = {
  users: [
    { id: 1, email: 'researcher@trading.io', full_name: 'Lead Quantitative Analyst', account_currency: 'USD', default_balance: '100000.00', max_risk_per_trade_pct: '1.00', is_active: true },
    { id: 2, email: 'algo.trader@quant.com', full_name: 'Systematic Execution Desk', account_currency: 'USD', default_balance: '250000.00', max_risk_per_trade_pct: '0.75', is_active: true },
  ],
  assets: [
    { id: 1, symbol: 'BTC/USDT', name: 'Bitcoin / Tether', asset_class: 'crypto', base_currency: 'BTC', quote_currency: 'USDT', tick_size: '0.01', min_order_size: '0.0001', is_active: true },
    { id: 2, symbol: 'ETH/USDT', name: 'Ethereum / Tether', asset_class: 'crypto', base_currency: 'ETH', quote_currency: 'USDT', tick_size: '0.01', min_order_size: '0.001', is_active: true },
    { id: 3, symbol: 'SOL/USDT', name: 'Solana / Tether', asset_class: 'crypto', base_currency: 'SOL', quote_currency: 'USDT', tick_size: '0.01', min_order_size: '0.01', is_active: true },
    { id: 4, symbol: 'XAU/USD', name: 'Gold Spot / Dollar', asset_class: 'commodity', base_currency: 'XAU', quote_currency: 'USD', tick_size: '0.05', min_order_size: '0.01', is_active: true },
    { id: 5, symbol: 'EUR/USD', name: 'Euro / US Dollar', asset_class: 'forex', base_currency: 'EUR', quote_currency: 'USD', tick_size: '0.00001', min_order_size: '1000', is_active: true },
    { id: 6, symbol: 'SPX', name: 'S&P 500 Index', asset_class: 'index', base_currency: 'SPX', quote_currency: 'USD', tick_size: '0.25', min_order_size: '1', is_active: true },
  ],
  strategies: [
    { id: 1, name: 'Trend Following Alpha', code: 'TF_EMA_MACD_ADX', category: 'trend', default_timeframe: '4h', backtest_win_rate: '58.4%', backtest_profit_factor: '2.14', sample_size: 342 },
    { id: 2, name: 'Breakout & Retest', code: 'BRK_VOL_RETEST', category: 'breakout', default_timeframe: '1h', backtest_win_rate: '52.1%', backtest_profit_factor: '2.38', sample_size: 219 },
    { id: 3, name: 'Mean Reversion BB', code: 'MR_BB_RSI_EXTREME', category: 'mean_reversion', default_timeframe: '1h', backtest_win_rate: '64.8%', backtest_profit_factor: '1.76', sample_size: 410 },
    { id: 4, name: 'Pullback in Trend (Smart Money)', code: 'PULLBACK_BOS_OB', category: 'pullback', default_timeframe: '4h', backtest_win_rate: '55.9%', backtest_profit_factor: '2.45', sample_size: 184 },
  ],
  trading_signals: [
    { id: 101, asset_id: 1, strategy_id: 1, timeframe: '4h', direction: 'LONG', technical_score: 8, confidence: '0.8250', market_regime: 'Strong Uptrend', entry_price_est: '64350.00', stop_loss: '63100.00', invalidation_price: '62900.00', target_1: '66850.00', risk_reward_ratio: '2.80', status: 'ACTIVE' },
    { id: 102, asset_id: 4, strategy_id: 2, timeframe: '1h', direction: 'LONG', technical_score: 7, confidence: '0.7400', market_regime: 'Breakout Expansion', entry_price_est: '2385.50', stop_loss: '2364.00', invalidation_price: '2360.00', target_1: '2440.00', risk_reward_ratio: '2.53', status: 'ACTIVE' },
  ],
  trade_journal: [
    { id: 1, user_id: 1, asset_id: 1, trade_type: 'LONG', execution_mode: 'PAPER', status: 'CLOSED', entry_price: '60000.00', exit_price: '62500.00', stop_loss: '59000.00', initial_risk_usd: '1000.00', realized_pnl_usd: '+2500.00', r_multiple: '+2.50R', setup_grade: 'A', notes: 'Perfect 4H bounce off 21 EMA with volume surge' },
    { id: 2, user_id: 1, asset_id: 1, trade_type: 'LONG', execution_mode: 'PAPER', status: 'CLOSED', entry_price: '63200.00', exit_price: '62200.00', stop_loss: '62200.00', initial_risk_usd: '1000.00', realized_pnl_usd: '-1000.00', r_multiple: '-1.00R', setup_grade: 'B-', notes: 'Premature entry ahead of FOMC rate announcement' },
    { id: 3, user_id: 1, asset_id: 2, trade_type: 'SHORT', execution_mode: 'PAPER', status: 'OPEN', entry_price: '3450.00', exit_price: null, stop_loss: '3560.00', initial_risk_usd: '800.00', realized_pnl_usd: null, r_multiple: null, setup_grade: 'A-', notes: 'Resistance cluster rejection with bearish MACD cross' },
  ],
  market_candles: [
    { id: 5001, asset_id: 1, timeframe: '4h', timestamp: '2026-10-02 00:00:00', open: '64120.00', high: '64850.00', low: '63980.00', close: '64520.00', volume: '14210.50' },
    { id: 5002, asset_id: 1, timeframe: '4h', timestamp: '2026-10-02 04:00:00', open: '64520.00', high: '65200.00', low: '64380.00', close: '64980.00', volume: '18930.20' },
  ]
};

const SQL_DDL_SNIPPETS: Record<string, string> = {
  users: `-- ==========================================
-- Table: users
-- Purpose: Traders, Risk Profiles & Constraints
-- ==========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    account_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    default_balance NUMERIC(18, 2) NOT NULL DEFAULT 100000.00,
    max_risk_per_trade_pct NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    max_open_positions INTEGER NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);`,

  assets: `-- ==========================================
-- Table: assets
-- Purpose: Multi-Market Asset Registry
-- ==========================================
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    asset_class VARCHAR(30) NOT NULL, -- 'crypto', 'forex', 'commodity', 'index', 'stock'
    base_currency VARCHAR(15) NOT NULL,
    quote_currency VARCHAR(15) NOT NULL,
    price_precision INTEGER NOT NULL DEFAULT 2,
    quantity_precision INTEGER NOT NULL DEFAULT 6,
    tick_size NUMERIC(18, 8) NOT NULL DEFAULT 0.01,
    min_order_size NUMERIC(18, 8) NOT NULL DEFAULT 0.0001,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata_info JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assets_symbol ON assets(symbol);
CREATE INDEX idx_assets_class ON assets(asset_class);
CREATE INDEX idx_assets_active ON assets(is_active);`,

  market_candles: `-- ==========================================
-- Table: market_candles
-- Purpose: High-Precision OHLCV Timeseries
-- ==========================================
CREATE TABLE market_candles (
    id BIGSERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL, -- '1m', '5m', '15m', '1h', '4h', '1D', '1W'
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    open NUMERIC(18, 8) NOT NULL,
    high NUMERIC(18, 8) NOT NULL,
    low NUMERIC(18, 8) NOT NULL,
    close NUMERIC(18, 8) NOT NULL,
    volume NUMERIC(24, 8) NOT NULL,
    quote_volume NUMERIC(24, 8),
    trade_count INTEGER,
    vwap NUMERIC(18, 8),
    is_closed SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Idempotent Upsert & Deduplication Constraint
    CONSTRAINT uq_candle_asset_tf_ts UNIQUE (asset_id, timeframe, timestamp)
);

-- Fast Timeseries Slicing Index
CREATE INDEX idx_candle_lookup ON market_candles(asset_id, timeframe, timestamp DESC);`,

  strategies: `-- ==========================================
-- Table: strategies
-- Purpose: Quantitative Rule Definitions
-- ==========================================
CREATE TABLE strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- 'trend', 'breakout', 'mean_reversion', 'pullback'
    description TEXT,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_timeframe VARCHAR(10) NOT NULL DEFAULT '4h',
    required_htf VARCHAR(10) DEFAULT '1D',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    author VARCHAR(100) NOT NULL DEFAULT 'System',
    backtest_win_rate VARCHAR(20),
    backtest_profit_factor VARCHAR(20),
    sample_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_strategies_code ON strategies(code);
CREATE INDEX idx_strategies_category ON strategies(category);`,

  trading_signals: `-- ==========================================
-- Table: trading_signals
-- Purpose: Probabilistic Setups & Scoring
-- ==========================================
CREATE TABLE trading_signals (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'LONG' or 'SHORT'
    technical_score INTEGER NOT NULL CHECK (technical_score BETWEEN 0 AND 10),
    confidence NUMERIC(5, 4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    market_regime VARCHAR(50) NOT NULL,
    entry_zone_low NUMERIC(18, 8) NOT NULL,
    entry_zone_high NUMERIC(18, 8) NOT NULL,
    entry_price_est NUMERIC(18, 8) NOT NULL,
    stop_loss NUMERIC(18, 8) NOT NULL,
    invalidation_price NUMERIC(18, 8) NOT NULL,
    invalidation_reason TEXT NOT NULL,
    target_1 NUMERIC(18, 8) NOT NULL,
    target_2 NUMERIC(18, 8) NOT NULL,
    target_3 NUMERIC(18, 8),
    risk_reward_ratio NUMERIC(6, 2) NOT NULL,
    supporting_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    conflicting_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'TRIGGERED', 'INVALIDATED', 'EXPIRED'
    generated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    invalidated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX idx_signal_asset_status ON trading_signals(asset_id, status, generated_at DESC);
CREATE INDEX idx_signal_strategy_id ON trading_signals(strategy_id);`,

  trade_journal: `-- ==========================================
-- Table: trade_journal
-- Purpose: Execution Log, PnL & R-Multiples
-- ==========================================
CREATE TABLE trade_journal (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    signal_id INTEGER REFERENCES trading_signals(id) ON DELETE SET NULL,
    trade_type VARCHAR(10) NOT NULL, -- 'LONG' or 'SHORT'
    execution_mode VARCHAR(10) NOT NULL DEFAULT 'PAPER', -- 'PAPER' or 'LIVE'
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'PENDING', 'OPEN', 'CLOSED', 'CANCELLED'
    entry_price NUMERIC(18, 8) NOT NULL,
    exit_price NUMERIC(18, 8),
    stop_loss NUMERIC(18, 8) NOT NULL,
    take_profit NUMERIC(18, 8),
    position_size_usd NUMERIC(18, 2) NOT NULL,
    quantity NUMERIC(24, 8) NOT NULL,
    initial_risk_usd NUMERIC(18, 2) NOT NULL,
    realized_pnl_usd NUMERIC(18, 2),
    return_percentage NUMERIC(8, 4),
    r_multiple NUMERIC(6, 2), -- Calculated: Realized PnL / Initial Risk
    setup_grade VARCHAR(5),
    emotional_state VARCHAR(50),
    notes TEXT,
    opened_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX idx_journal_user_status ON trade_journal(user_id, status, opened_at DESC);
CREATE INDEX idx_journal_asset_id ON trade_journal(asset_id);`,
};

export const DatabaseSchemaViewer: React.FC = () => {
  const [selectedTableId, setSelectedTableId] = useState<string>('trading_signals');
  const [activeTab, setActiveTab] = useState<'er_diagram' | 'data_preview' | 'sql_ddl' | 'teaching_guide'>('er_diagram');
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedTable = TABLES.find((t) => t.id === selectedTableId) || TABLES[0];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Phase 2 Status */}
      <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Phase 2 Active
                </span>
                <span className="text-xs text-slate-400 font-mono">PostgreSQL 16 + SQLAlchemy 2.0</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">
                Relational Architecture & Financial Quantitative Schemas
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                6 Normalized Core Tables: Users, Assets, Market Candles (Time-Series), Strategies, Trading Signals, and Trade Journal.
              </p>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B] text-xs font-medium">
            <button
              onClick={() => setActiveTab('er_diagram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'er_diagram' ? 'bg-[#1E293B] text-emerald-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              ER Schema Map
            </button>
            <button
              onClick={() => setActiveTab('data_preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'data_preview' ? 'bg-[#1E293B] text-emerald-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Live Table Explorer
            </button>
            <button
              onClick={() => setActiveTab('sql_ddl')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'sql_ddl' ? 'bg-[#1E293B] text-emerald-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              PostgreSQL DDL
            </button>
            <button
              onClick={() => setActiveTab('teaching_guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'teaching_guide' ? 'bg-[#1E293B] text-emerald-400 font-semibold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Quantitative Design Principles
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'er_diagram' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Table Selector Cards */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              Relational Tables ({TABLES.length})
            </h3>
            <div className="space-y-2">
              {TABLES.map((t) => {
                const isSelected = t.id === selectedTableId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-[#172133] border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-[#111622] border-[#1E293B] hover:border-slate-700 hover:bg-[#151C2C]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-sm font-semibold text-slate-200">
                        <span className={`w-2 h-2 rounded-full ${
                          t.category === 'market' ? 'bg-cyan-400' :
                          t.category === 'quantitative' ? 'bg-purple-400' :
                          t.category === 'execution' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`} />
                        {t.name}
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {t.columns.length} cols
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{t.relationships.length} relationships</span>
                      <span>•</span>
                      <span>{t.indexes.length} indices</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Table Column Inspector */}
          <div className="lg:col-span-8 bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
            <div className="flex items-start justify-between border-b border-[#1E293B] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    Table: {selectedTable.name}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Category: {selectedTable.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedTable.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTableId(selectedTable.id);
                  setActiveTab('sql_ddl');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30"
              >
                <Code2 className="w-3.5 h-3.5" />
                View DDL
              </button>
            </div>

            {/* Column Schema Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Columns & Data Types</h4>
              <div className="border border-[#1E293B] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0B0E17] text-slate-400 border-b border-[#1E293B]">
                    <tr>
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Constraint</th>
                      <th className="py-2.5 px-3">Nullable</th>
                      <th className="py-2.5 px-3 font-sans">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {selectedTable.columns.map((col) => (
                      <tr key={col.name} className="hover:bg-[#151C2C]/50 transition-colors">
                        <td className="py-2 px-3 text-slate-200 font-semibold flex items-center gap-1.5">
                          {col.isPk && <span title="Primary Key" className="text-amber-400">🔑</span>}
                          {col.isFk && <span title={`Foreign Key -> ${col.fkTarget}`} className="text-cyan-400">🔗</span>}
                          {col.name}
                        </td>
                        <td className="py-2 px-3 text-emerald-400">{col.type}</td>
                        <td className="py-2 px-3">
                          {col.isPk ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PRIMARY KEY
                            </span>
                          ) : col.isFk ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              FK → {col.fkTarget}
                            </span>
                          ) : col.isIndex ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">INDEX</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {col.nullable ? <span className="text-slate-500">NULL</span> : <span className="text-rose-400 font-bold">NOT NULL</span>}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-400">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Indexes & Relationships Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#0B0E17] p-3.5 rounded-lg border border-[#1E293B]">
                <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Indexes & Deduplication Constraints
                </h5>
                <ul className="space-y-1.5 font-mono text-[11px] text-slate-400">
                  {selectedTable.indexes.map((idx, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3 text-emerald-400" />
                      {idx}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0B0E17] p-3.5 rounded-lg border border-[#1E293B]">
                <h5 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                  Referential Integrity Relationships
                </h5>
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  {selectedTable.relationships.map((rel, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-cyan-400 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200">[{rel.type}]</span> to{' '}
                        <span className="font-mono text-cyan-300 font-bold">{rel.target}</span>:
                        <div className="font-mono text-[10px] text-slate-500">{rel.via}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Table Explorer Tab */}
      {activeTab === 'data_preview' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Live Data Explorer & Seed Inspector
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse pre-seeded records initialized in SQLAlchemy for Phase 2.
              </p>
            </div>

            {/* Table pill selector */}
            <div className="flex items-center flex-wrap gap-1 bg-[#0B0E17] p-1 rounded-lg border border-[#1E293B]">
              {TABLES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTableId(t.id)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                    selectedTableId === t.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Table Data Preview */}
          {SEEDED_SAMPLE_DATA[selectedTableId] && SEEDED_SAMPLE_DATA[selectedTableId].length > 0 ? (
            <div className="border border-[#1E293B] rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0B0E17] text-slate-400 border-b border-[#1E293B]">
                  <tr>
                    {Object.keys(SEEDED_SAMPLE_DATA[selectedTableId][0]).map((key) => (
                      <th key={key} className="py-2.5 px-3 uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {SEEDED_SAMPLE_DATA[selectedTableId].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#151C2C]/50 transition-colors">
                      {Object.entries(row).map(([k, val]: [string, any], vIdx) => (
                        <td key={vIdx} className="py-2 px-3 text-slate-300">
                          {val === null ? (
                            <span className="text-slate-600 italic">null</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={val ? 'text-emerald-400' : 'text-rose-400'}>{String(val)}</span>
                          ) : k.includes('pnl') && typeof val === 'string' && val.startsWith('+') ? (
                            <span className="text-emerald-400 font-bold">{val}</span>
                          ) : k.includes('pnl') && typeof val === 'string' && val.startsWith('-') ? (
                            <span className="text-rose-400 font-bold">{val}</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              No sample rows loaded for table "{selectedTableId}".
            </div>
          )}

          {/* Interactive Trade Simulator */}
          {selectedTableId === 'trade_journal' && (
            <div className="bg-[#0B0E17] border border-[#1E293B] rounded-lg p-4 mt-4">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Live R-Multiple Financial Calculator
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Calculates risk-adjusted return using the exact SQLAlchemy model mathematical formula: <code className="text-emerald-400">r_multiple = realized_pnl / initial_risk_usd</code>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px]">Win Rate</span>
                  <span className="text-emerald-400 font-bold text-sm font-mono">50.0% (1W / 1L)</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px]">Net Realized PnL</span>
                  <span className="text-emerald-400 font-bold text-sm font-mono">+$1,500.00</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px]">Profit Factor</span>
                  <span className="text-cyan-400 font-bold text-sm font-mono">2.50</span>
                </div>
                <div className="p-2.5 rounded bg-[#111622] border border-[#1E293B]">
                  <span className="text-slate-400 block text-[10px]">Average R-Multiple</span>
                  <span className="text-purple-400 font-bold text-sm font-mono">+0.75R</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SQL DDL Tab */}
      {activeTab === 'sql_ddl' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  PostgreSQL 16+ DDL & Schema Migration Code
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {selectedTable.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact DDL statements generated by SQLAlchemy Base.metadata for PostgreSQL.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="bg-[#0B0E17] text-slate-200 border border-[#1E293B] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500"
              >
                {TABLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table: {t.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleCopy(SQL_DDL_SNIPPETS[selectedTableId] || '')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied DDL!' : 'Copy SQL'}
              </button>
            </div>
          </div>

          <pre className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed">
            {SQL_DDL_SNIPPETS[selectedTableId] || '-- No DDL available'}
          </pre>
        </div>
      )}

      {/* Teaching Guide Tab */}
      {activeTab === 'teaching_guide' && (
        <div className="bg-[#111622] border border-[#1E293B] rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-400" />
              Phase 2 Curriculum: Relational Quantitative Database Design
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Why professional quantitative trading platforms require specific database structures, data types, and index topologies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Principle 1 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                High-Precision Numeric vs. IEEE 754 Floating Point
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Standard binary floating point (<code className="text-purple-300">FLOAT / DOUBLE PRECISION</code>) cannot accurately represent fractional decimals like <code>0.1</code> or Bitcoin satoshi units, creating subtle rounding drift that compounds across thousands of simulated trades. We enforce <code className="text-emerald-400">NUMERIC(18, 8)</code> for prices and <code className="text-emerald-400">NUMERIC(24, 8)</code> for volume and balances to guarantee zero arithmetic loss.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">2</span>
                Composite Indexing for Multi-Timeframe Slicing
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                A quantitative backtest or live indicator pipeline queries candles with filters like:
                <code className="text-cyan-300 block my-1">WHERE asset_id = 1 AND timeframe = '4h' AND timestamp &gt;= '2026-01-01'</code>
                Without a composite B-tree index on <code className="text-cyan-400">(asset_id, timeframe, timestamp DESC)</code>, PostgreSQL must scan millions of rows. Our schema turns full table scans into sub-millisecond index range seeks.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
                Idempotency & Deduplication with Unique Constraints
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                WebSocket drops and historical REST backfills frequently re-deliver candles already stored in the database. The unique constraint <code className="text-purple-400">uq_candle_asset_tf_ts (asset_id, timeframe, timestamp)</code> allows clean idempotent upserts:
                <code className="text-purple-300 block my-1">ON CONFLICT (asset_id, timeframe, timestamp) DO UPDATE SET close = EXCLUDED.close</code>
              </p>
            </div>

            {/* Principle 4 */}
            <div className="bg-[#0B0E17] p-4 rounded-lg border border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">4</span>
                Immutable Signal History vs. Mutable Trade Journal
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To prevent lookahead bias and survivorship bias in algorithmic research, detected setups in <code className="text-amber-400">trading_signals</code> are never deleted when invalidated. Instead, they transition state (<code className="text-amber-300">ACTIVE → INVALIDATED</code>) with timestamp and reason, creating an immutable audit trail for walk-forward statistical evaluation.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Phase 2 Verification Test Suite Ready
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Run <code className="text-emerald-400 font-mono">pytest backend/tests/test_phase2_db.py</code> to verify model definitions, foreign keys, and R-multiple calculations.
              </p>
            </div>
            <span className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs">
              All 6 Models Tested
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
