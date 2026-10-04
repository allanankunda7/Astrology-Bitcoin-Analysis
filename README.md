# Quantitative Market Analysis & Backtesting Research Platform

A professional-grade financial market analysis, algorithmic strategy testing, and multi-asset research platform built for educational and research purposes. Designed with strict statistical controls, transparent signal rules, real-time market data streaming, and zero look-ahead bias backtesting.

> **Disclaimer**: This platform is designed solely for quantitative research and educational purposes. Financial trading involves substantial risk of loss. This software does not provide financial advice, guarantee trading profits, or claim predictive certainty about financial markets.

---

## Architecture Overview

The application follows a strictly decoupled, modular architecture adhering to modern quantitative finance software principles:

```
├── server.ts                       # Express backend server with live RSS aggregation & Gemini AI proxy
├── src/
│   ├── App.tsx                     # Main dashboard layout, real-time ticker tape, navigation, and state
│   ├── components/                 # Presentation and interactive UI components
│   │   ├── TradingChart.tsx        # High-performance lightweight-charts candlestick visualizer
│   │   ├── SignalCard.tsx          # Rule-based signal generator card with breakdown
│   │   ├── StrategyBacktester.tsx  # Historical backtesting engine & performance analytics
│   │   ├── StrategyComparison.tsx  # Multi-strategy risk/reward benchmarking matrix
│   │   ├── RiskCalculatorModal.tsx # Strict capital risk & position sizing calculator
│   │   ├── TradeJournalModal.tsx   # Manual trade journal with strategy attribution
│   │   ├── AllMarketsAnalysis.tsx  # Multi-asset grid with live order tape & prediction cards
│   │   ├── GlobalNewsWire.tsx      # Real-time multi-regional economic news terminal
│   │   ├── AstrologyResearchViewer.tsx # Isolated astrological hypothesis correlation testing
│   │   └── SettingsModal.tsx       # System parameters, API configurations, and fee settings
│   ├── services/                   # Pure business logic and quantitative algorithms
│   │   ├── indicators.ts           # Modular technical indicators (SMA, EMA, RSI, MACD, ATR, BB)
│   │   ├── marketStructure.ts      # Swing points, BOS, CHoCH, and Market Regime detection
│   │   ├── multiTimeframe.ts       # Cross-timeframe alignment (HTF trend, MTF structure, LTF entry)
│   │   ├── strategies.ts           # Modular strategy definitions with entry/exit rule sets
│   │   ├── backtestingEngine.ts    # Event-driven backtester with closed candle filter & slippage
│   │   ├── riskCalculator.ts       # Position sizing formulas and max-risk safeguards
│   │   ├── alertsService.ts        # Modular market alert manager with debouncing
│   │   ├── geminiChat.ts           # Structured Gemini AI market analyst assistant
│   │   ├── realtimeMarket.ts       # Multi-asset real-time ticker stream and order book tape
│   │   ├── realtimeNews.ts         # Global news feed cache and live wire broadcaster
│   │   ├── astrologyOverlay.ts     # Ephemeris dataset and chart marker generator
│   │   └── tests/
│   │       └── tradingSystem.test.ts # Quantitative unit & integration test suite
```

---

## Core Systems & Methodologies

### 1. Market Data Integrity & Closed Candle Filtering
- **Closed-Candle Isolation**: The historical backtesting engine strictly uses confirmed/closed candles (`get_closed_candles_for_backtest`). The currently forming candle is filtered out to avoid look-ahead bias and repainting.
- **Data Health Auditing**: Every dataset is audited for duplicates, negative/zero prices, NaN values, irregular timestamp gaps, and look-ahead artifacts.
- **Data Status Modes**:
  - `LIVE`: Sub-second streaming data via WebSocket / simulated live order flow.
  - `HISTORICAL`: Verified historical candlestick sequence.
  - `DELAYED`: Exchange delayed quotes (e.g., 15-minute standard feed).
  - `DISCONNECTED` / `INSUFFICIENT DATA`: Automatic fallbacks with clear warnings.

### 2. Technical Indicators & Market Structure
- **Indicators**: Verified mathematical calculations for SMA, EMA (exponential smoothing), RSI (Wilder's smoothing with momentum divergence), MACD (12/26 EMA line + 9 EMA signal + histogram), ATR (true range volatility), and Bollinger Bands (20 SMA ± 2 standard deviations).
- **Smart Money Concepts (SMC)**:
  - **Swing Highs / Swing Lows**: Validated fractal peaks and troughs.
  - **Break of Structure (BOS)**: Decisive candle close beyond prior swing points indicating trend continuation.
  - **Change of Character (CHoCH)**: Counter-trend structural break indicating potential trend exhaustion or reversal.
- **Market Regime Detection**: Classifies the asset environment into `Strong Uptrend`, `Weak Uptrend`, `Strong Downtrend`, `Weak Downtrend`, `Range`, `High Volatility`, `Low Volatility`, or `Unclear`. When conditions are unclear, signals default to `WAIT`.

### 3. Transparent Signal Engine & Explanation Mode
Every generated trading signal produces:
- **Direction**: `LONG SETUP`, `SHORT SETUP`, `WAIT`, or `NO CLEAR SETUP`.
- **Price Levels**: Calculated Entry Zone, Stop-Loss Level, and multiple Take-Profit targets (TP1, TP2, TP3).
- **Risk/Reward Ratio**: Calculated mathematically based on structural invalidation levels.
- **Transparent Reasoning**: A complete "WHY THIS SETUP WAS DETECTED" breakdown containing trend confirmation, structure alignment, momentum confluence, volume validation, and risk/reward criteria.
- **Invalidation Conditions**: Explicit price levels or market events that void the setup thesis.

### 4. Zero Look-Ahead Bias Backtesting Engine
The backtesting simulator enforces real-world execution conditions:
- **No Future Data**: Candle $T$ can only generate a trade trigger evaluated for execution at Candle $T+1$ open.
- **Execution Cost Modeling**: Configurable exchange commission (default 0.05%) and realistic execution slippage (default 0.03%).
- **Key Metrics Produced**:
  - Net Profit & Percentage Return
  - Win Rate % & Total Trade Count
  - Profit Factor ($\frac{\sum \text{Gains}}{\sum \text{Losses}}$)
  - Maximum Equity Drawdown %
  - Average Win, Average Loss, and Win/Loss Ratio
  - Mathematical Expectancy per Trade
  - Max Consecutive Wins & Max Consecutive Losses
  - Visual Equity Curve & on-chart Entry/Exit markers

### 5. AI Market Analyst (Gemini API)
- Uses `@google/genai` with server-side proxying in `/api/gemini/analyze`.
- The AI assistant is provided with **structured quantitative data** (regime, indicators, swing levels, volatility metrics, timeframe agreements) rather than being asked to guess market values.
- Delivers objective market context, structural levels, risk factors, and explicit invalidation thresholds without making speculative price guarantees.

### 6. Broker Integration Architecture & Paper Trading Simulator
The platform implements a strictly decoupled 4-tier broker abstraction layer:
```
Frontend UI (React)
   └── Backend REST API (/api/paper/*)
          └── Broker Abstraction Layer (IBrokerAdapter)
                 └── PaperBroker Simulator (Sandbox Environment)
```

- **Pluggable Broker Interface (`IBrokerAdapter`)**: Standardized contracts for `getAccount()`, `getBalance()`, `getMarketData()`, `getPositions()`, `getOpenOrders()`, `placePaperOrder()`, `cancelPaperOrder()`, and `closePaperPosition()`. New live or testnet adapters (e.g. Binance, Alpaca, Interactive Brokers) can be registered without modifying the quantitative trading engine.
- **Realistic Order Simulator**: Supports `MARKET`, `LIMIT`, and `STOP` orders for both `LONG` and `SHORT` positions. Models realistic execution delay slippage (0.03%) and exchange commissions (0.05% taker, 0.02% maker).
- **Automated Stop-Loss / Take-Profit Triggers**: As price ticks arrive, the PaperBroker evaluates open positions and automatically triggers order execution with full slippage and fee accounting.
- **14-Step Trading Engine Flow**:
  1. Retrieve market data
  2. Confirm candle is closed
  3. Calculate indicators
  4. Detect market structure
  5. Determine market regime
  6. Run enabled strategies
  7. Generate candidate setup
  8. Calculate risk/reward ratio
  9. Run risk checks
  10. Present proposed paper trade
  11. **Require explicit user confirmation** before order transmission
  12. Send order to `PaperBroker`
  13. Record result in trade journal
  14. Update dashboard HUD
- **Strict Security**: The frontend never stores or transmits exchange credentials, private keys, or API secrets. All paper trade validation is performed server-side.

### 7. Experimental Astrology Research Module
- **Strictly Isolated**: Kept separate from core quantitative indicators.
- **Hypothesis Testing**: Evaluates whether astronomical cycles (lunar phases, Mercury retrograde stations) show any statistical correlation to Bitcoin price returns beyond random chance.
- **Scientific Controls**: Features hypothesis framing, comparative benchmark performance, and unbiased statistical metrics.

---

## Setup & Running Locally

### Prerequisites
- Node.js 18+ or 20+
- npm or bun

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional for AI analysis)
cp .env.example .env
# Edit .env and supply GEMINI_API_KEY if desired

# 3. Run the development server (runs full-stack Vite + Express on port 3000)
npm run dev

# 4. Run tests
npm test

# 5. Run TypeScript check & build
npm run lint
npm run build
```

---

## Backend REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/account` | Retrieves simulated paper account balance, equity, margin, and metrics. |
| `GET` | `/api/market-data` | Retrieves real-time benchmark quotes across crypto, forex, commodities, and indices. |
| `POST` | `/api/market-data/tick` | Ingests a new price tick to trigger limit order matching and SL/TP automated executions. |
| `GET` | `/api/positions` | Retrieves all active open paper positions with mark-to-market unrealized P/L. |
| `GET` | `/api/orders` | Retrieves all pending limit/stop paper orders. |
| `POST` | `/api/paper/orders` | Places a new paper order (market, limit, stop). Server-side validation enforced. |
| `POST` | `/api/paper/orders/:id/cancel` | Cancels a pending paper order. |
| `POST` | `/api/paper/positions/:id/close` | Closes an active paper position at market price and logs to trade journal. |
| `POST` | `/api/paper/account/reset` | Resets paper account balance back to starting capital ($100k) and clears open orders. |
| `GET` | `/api/trades` | Retrieves completed trade journal ledger with entry/exit timestamps, fees, and reasons. |
| `POST` | `/api/backtest` | Executes a zero look-ahead bias backtest using broker simulation parameters. |
| `GET` | `/api/news` | Aggregates multi-region live RSS financial wire feeds (Americas, Europe, Asia-Pacific). |
| `POST` | `/api/ai/analyze-setup` | Gemini AI analysis over structured technical setup data. |

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key used by the backend proxy for AI analysis. |
| `APP_URL` | Base application URL for self-referential links and reverse proxy headers. |
| `PORT` | Backend server port (defaults to 3000). |

---

## Verification Test Suite

The test suite in `src/services/tests/tradingSystem.test.ts` validates:
1. Arithmetic accuracy of SMA, EMA, RSI, and Bollinger Bands calculations.
2. In-forming candle exclusion in `get_closed_candles_for_backtest()`.
3. Sanitization of corrupted, negative, or NaN candle feeds.
4. Position sizing and dollar risk calculations with maximum risk caps.
5. Zero look-ahead bias validation during multi-bar historical simulations.
6. Balance accounting and capital preservation during trade execution.

Run the test suite at any time with:
```bash
npm test
```
