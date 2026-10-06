# Database Architecture & Persistence

## Overview

The application features a production-grade relational database engine implemented in `src/db/relationalStore.ts`. It provides persistent storage, primary key constraints, foreign key validation, secondary indexing, ACID transaction simulation with state snapshot and rollback, and point-in-time backup and restore.

---

## 1. Schema Entities

| Entity Table | Primary Key | Description |
|---|---|---|
| `users` | `id` | User accounts, hashed credentials, roles (RESEARCHER, ADMIN, ANALYST) |
| `accounts` | `id` | Simulated paper accounts, balances, equity, used margin |
| `strategies` | `id` | Algorithmic trading strategies with ownership attribution |
| `strategy_versions`| `id` | Immutable version records (`v1.0.0`, `v1.1.0`) with parameter snapshots |
| `orders` | `id` | Paper orders with side, type, quantity, SL/TP, and status |
| `trades` | `id` | Closed trade journal entries with realized PnL, duration, and exit reasons |
| `candles` | `id` (`symbol_tf_ts`) | Historical market candlestick bars with deduplication |
| `backtests` | `id` | Recorded backtest runs with configurations and institutional metrics |
| `risk_limits` | `userId` | User-specific risk parameters, drawdown thresholds, circuit breaker state |
| `audit_logs` | `id` | Security audit trail of logins, backups, order executions, and resets |
| `password_resets` | `token` | Single-use expiring password reset authorization tokens |

---

## 2. High-Performance Secondary Indexes

To ensure sub-millisecond query performance:
- `indexCandlesBySymbol`: Maps `symbol_timeframe` to chronological candle record keys.
- `indexVersionsByStrategy`: Maps `strategyId` to version IDs for instant version history retrieval.
- `indexOrdersByAccount`: Maps `accountId` to order IDs for fast order ledger lookups.
- `indexStrategiesByUser`: Maps `userId` to strategy IDs for multi-tenant isolation.

---

## 3. Data Integrity & Validation Rules

1. **Duplicate Candle Prevention**: Composite key `${symbol}_${timeframe}_${timestamp}` ensures identical bars are skipped automatically.
2. **OHLC Sanitization**: Discards negative, zero, or corrupt prices (`high < low`).
3. **Immutable Strategy Versioning**: Prevents overwriting past versions. Attempting to insert an existing version tag throws an integrity error.
4. **Transaction Rollback**: State is snapshotted before multi-table operations. If an unhandled exception occurs, previous state is restored immediately.

---

## 4. Atomic File Persistence

The database persists state to `data/trading_database.json`:
- Writes new state to a temporary file (`.tmp_${timestamp}`).
- Flushes data to disk.
- Atomically renames the temporary file over the target database file using atomic OS filesystem semantics (`fs.renameSync`).
- This guarantees zero database corruption even during abrupt power loss or container SIGKILL.

---

## 5. Backup & Disaster Recovery API

- **Create Backup**: `POST /api/admin/backup` (Admin only) returns a full JSON snapshot of all tables with timestamps and record counts.
- **Restore Backup**: `POST /api/admin/restore` (Admin only) accepts a validated backup JSON payload, flushes active memory, validates integrity, and repopulates all tables and indexes.
