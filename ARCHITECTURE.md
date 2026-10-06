# System Architecture

## Overview

The Astrology-Bitcoin-Analysis system is an institutional-grade quantitative research, backtesting, market analysis, and paper-trading platform. It strictly decouples client visualization, server-authoritative risk controls, algorithmic strategy testing, and simulated exchange order routing.

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (TradingView Charts, Strategy Lab, Replay, Tape)     │
└──────────────────────────┬─────────────────────────────┘
                           │ Authenticated HTTP / Bearer Token
                           ▼
┌────────────────────────────────────────────────────────┐
│             Backend API Gateway (Express)              │
│  - Security Headers, CORS, Rate Limiters, Request IDs  │
│  - Structured JSON Logging & Observability             │
└──────┬───────────────────┬───────────────────┬─────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐   ┌───────────────┐   ┌────────────────┐
│  Auth & RBAC │   │ Risk Engine   │   │ Gemini AI API  │
│  - PBKDF2    │   │ - Max 3% Risk │   │ - Server Proxy │
│  - Tokens    │   │ - 15% Circuit │   │ - Structured   │
│  - Roles     │   │ - Stale Data  │   │   Explanations │
└──────┬───────┘   └───────┬───────┘   └────────────────┘
       │                   │
       ▼                   ▼
┌────────────────────────────────────────────────────────┐
│              Broker Abstraction Layer                  │
│                   (IBrokerAdapter)                     │
│         PaperBroker Simulator (In-Memory/Sync)         │
│  - Slippage, Taker Fees, Stop-Loss/Take-Profit Triggers │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Persistent Relational Database             │
│        (data/trading_database.json & Atomic Sync)      │
│  - 20+ Tables: Users, Accounts, Strategies, Orders     │
│  - Indexes, Foreign Keys, ACID Rollbacks, Backups      │
└────────────────────────────────────────────────────────┘
```

---

## Component Separation

1. **Frontend (`/src`)**
   - High-performance UI built with React 19, TypeScript, and Lightweight-Charts.
   - Zero secrets stored in local storage, session storage, or client components.
   - Communicates with backend endpoints exclusively via standard Bearer tokens.

2. **Backend Gateway (`server.ts`)**
   - Express server with strict middleware pipelines.
   - Security headers (X-Frame-Options, X-Content-Type-Options, HSTS).
   - Rate limiting partitioned across general APIs (180/min), auth (20/min), AI (30/min), and quantitative calculations (35/min).

3. **Broker Abstraction Layer (`/src/broker`)**
   - `IBrokerAdapter`: Standardized polymorphic interface (`getAccount`, `getPositions`, `getOpenOrders`, `placePaperOrder`, `cancelPaperOrder`, `closePaperPosition`).
   - `PaperBroker`: Deterministic matching engine simulating slippage, commissions, and automated stop-loss/take-profit fills.
   - Strictly marked as `PAPER_SIMULATION`. No live real-money execution capability exists.

4. **Centralized Risk Engine (`/src/services/backendRiskEngine.ts`)**
   - Authoritative backend gatekeeper through which all paper orders must pass.
   - Max 3% risk per trade based on entry to stop distance.
   - Max 15% portfolio drawdown circuit breaker.
   - Validates directional stop-loss/take-profit orientation.
   - Blocks trading if market data is stale (> 5 minutes).

5. **Strategy Lab & Versioning (`/src/services/strategyLab.ts`)**
   - Strategy lifecycle management (create, parameter optimize, clone, compare).
   - Immutable versioning (`v1.0.0`, `v1.1.0`) ensuring backtest results are always mapped to exact historical parameter snapshots.

6. **Relational Database (`/src/db/relationalStore.ts`)**
   - 20+ normalized entities: users, accounts, assets, market data, strategies, versions, orders, trades, backtests, replay sessions, audit logs.
   - ACID transaction support with state snapshot and rollback.
   - Atomic disk persistence with `.tmp` staging and atomic renaming.
