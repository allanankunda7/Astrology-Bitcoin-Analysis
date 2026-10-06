# REST API Specification

All authenticated API requests must include the HTTP header:
`Authorization: Bearer <TOKEN>`

All responses return standard structured JSON:
- Success: `{ "success": true, ... }`
- Error: `{ "success": false, "error": { "code": string, "message": string, "requestId": string } }`

---

## 1. Health & Probes
- `GET /health`: Liveness probe returning server status, uptime, and database connectivity.
- `GET /ready`: Readiness probe verifying broker accounts, storage, and market feeds.

## 2. Authentication
- `POST /api/auth/register`: Register user `{ email, password, role? }`.
- `POST /api/auth/login`: Authenticate user `{ email, password }` returning Bearer token.
- `GET /api/auth/me`: Retrieve authenticated user profile.
- `POST /api/auth/logout`: Revoke/log out user session.
- `POST /api/auth/forgot-password`: Request password reset token `{ email }`.
- `POST /api/auth/reset-password`: Reset password `{ resetToken, newPassword }`.

## 3. Paper Trading & Broker
- `GET /api/account`: Current simulated account balance, equity, margin, and drawdown.
- `GET /api/market-data`: Real-time market quotes for tracked symbols.
- `POST /api/market-data/tick`: Ingest price tick `{ symbol, price }`.
- `GET /api/positions`: List open simulated positions.
- `GET /api/orders`: List active open and pending paper orders.
- `POST /api/paper/orders`: Place simulated order `{ symbol, side, type, quantity, price?, stopLoss?, takeProfit? }`.
- `POST /api/paper/orders/:id/cancel`: Cancel open order by ID.
- `POST /api/paper/positions/:id/close`: Manually close position by ID.
- `POST /api/paper/account/reset`: Reset paper account `{ startingBalance? }`.
- `GET /api/trades`: Query historical trade journal ledger.

## 4. Strategy Lab
- `GET /api/strategies`: List all registered strategies.
- `POST /api/strategies`: Create a strategy `{ name, asset, timeframe, indicators, risk }`.
- `GET /api/strategies/:id`: Fetch strategy details and full version history.
- `POST /api/strategies/:id/versions`: Save parameter changes as a new version.
- `POST /api/strategies/compare`: Compare multiple strategies `{ strategyIds, candles }`.

## 5. Quantitative Engine & AI
- `POST /api/backtest`: Execute historical backtest with slippage & commission simulation.
- `POST /api/walk-forward`: Execute walk-forward rolling window analysis.
- `POST /api/chat`: Multi-turn Gemini AI quantitative market commentary proxy.
- `GET /api/news`: Real-time aggregated financial news wire.

## 6. System Monitoring & Administration
- `GET /api/system/monitoring`: Server memory, database records, error rates, and broker health.
- `GET /api/system/audit-logs`: Administrative audit trail.
- `POST /api/admin/backup`: Generate point-in-time database snapshot.
- `POST /api/admin/restore`: Restore database from snapshot JSON.
