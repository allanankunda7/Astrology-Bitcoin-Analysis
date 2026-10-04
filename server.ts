import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { brokerManager } from './src/broker/BrokerFactory';
import { runHistoricalBacktest } from './src/services/backtestingEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// In-memory news cache
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

      // Smart asset detection
      const lower = (title + ' ' + summary).toLowerCase();
      const assets: string[] = [];
      if (lower.includes('gold') || lower.includes('bullion') || lower.includes('metal') || lower.includes('silver')) assets.push('XAU/USD');
      if (lower.includes('bitcoin') || lower.includes('btc') || lower.includes('crypto') || lower.includes('coinbase') || lower.includes('binance')) assets.push('BTC/USDT');
      if (lower.includes('ethereum') || lower.includes('ether') || lower.includes('eth ') || lower.includes('vitalik')) assets.push('ETH/USDT');
      if (lower.includes('solana') || lower.includes('sol ') || lower.includes('memecoin')) assets.push('SOL/USDT');
      if (lower.includes('euro') || lower.includes('ecb') || lower.includes('forex') || lower.includes('dollar') || lower.includes('dxy') || lower.includes('currency') || lower.includes('fx')) assets.push('EUR/USD');
      if (lower.includes('s&p') || lower.includes('sp500') || lower.includes('stock') || lower.includes('wall street') || lower.includes('fed') || lower.includes('treasury') || lower.includes('yield') || lower.includes('nasdaq') || lower.includes('dow')) assets.push('SPX');
      if (assets.length === 0) assets.push('SPX', 'BTC/USDT');

      // Comprehensive global region & flag detection
      let region = defaultRegion;
      let regionFlag = '🌐';
      if (lower.includes('china') || lower.includes('beijing') || lower.includes('shanghai') || lower.includes('pboc') || lower.includes('yuan')) {
        region = 'Asia-Pacific';
        regionFlag = '🇨🇳';
      } else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('boj') || lower.includes('yen') || lower.includes('nikkei')) {
        region = 'Asia-Pacific';
        regionFlag = '🇯🇵';
      } else if (lower.includes('india') || lower.includes('mumbai') || lower.includes('rupee') || lower.includes('rbi')) {
        region = 'Asia-Pacific';
        regionFlag = '🇮🇳';
      } else if (lower.includes('singapore') || lower.includes('hong kong') || lower.includes('taiwan') || lower.includes('korea') || lower.includes('asia')) {
        region = 'Asia-Pacific';
        regionFlag = '🌏';
      } else if (lower.includes('opec') || lower.includes('middle east') || lower.includes('saudi') || lower.includes('riyadh') || lower.includes('dubai') || lower.includes('abu dhabi') || lower.includes('uae') || lower.includes('crude') || lower.includes('oil')) {
        region = 'Middle East';
        regionFlag = '🇸🇦';
      } else if (lower.includes('fed') || lower.includes('us ') || lower.includes('u.s.') || lower.includes('wall street') || lower.includes('treasury') || lower.includes('sec') || lower.includes('america')) {
        region = 'Americas';
        regionFlag = '🇺🇸';
      } else if (lower.includes('ecb') || lower.includes('europe') || lower.includes('london') || lower.includes('germany') || lower.includes('uk ') || lower.includes('bank of england') || lower.includes('frankfurt') || lower.includes('swiss') || lower.includes('snb')) {
        region = 'Europe';
        regionFlag = '🇪🇺';
      }

      // Sentiment analysis
      let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let score = 0.0;
      const bullishWords = ['surge', 'soar', 'gain', 'rally', 'record', 'high', 'beat', 'cut', 'easing', 'jump', 'inflow', 'stimulus', 'rebound', 'boost', 'upgrade', 'profit', 'expansion'];
      const bearishWords = ['drop', 'fall', 'plunge', 'slump', 'down', 'hike', 'tariff', 'war', 'crackdown', 'outflow', 'decline', 'loss', 'miss', 'risk', 'warning', 'inflation', 'default'];

      let bCount = bullishWords.filter(w => lower.includes(w)).length;
      let rCount = bearishWords.filter(w => lower.includes(w)).length;

      if (bCount > rCount) {
        sentiment = 'BULLISH';
        score = Math.min(0.95, 0.4 + bCount * 0.2);
      } else if (rCount > bCount) {
        sentiment = 'BEARISH';
        score = -Math.min(0.95, 0.4 + rCount * 0.2);
      }

      // Urgency
      const isBreaking = lower.includes('breaking') || lower.includes('urgent') || lower.includes('emergency') || lower.includes('fed') || lower.includes('rate cut') || lower.includes('record') || lower.includes('soar') || lower.includes('plunge');
      const urgency = isBreaking ? 'BREAKING' : (bCount + rCount >= 2 ? 'HIGH' : 'MEDIUM');

      // Category detection
      let category = defaultCategory;
      if (lower.includes('gold') || lower.includes('silver') || lower.includes('bullion')) category = 'Gold & Metals';
      else if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum') || lower.includes('solana')) category = 'Crypto';
      else if (lower.includes('forex') || lower.includes('dollar') || lower.includes('euro') || lower.includes('yen') || lower.includes('currency')) category = 'Forex';
      else if (lower.includes('oil') || lower.includes('energy') || lower.includes('crude') || lower.includes('opec') || lower.includes('gas')) category = 'Energy & Geopolitics';
      else if (lower.includes('stock') || lower.includes('sp500') || lower.includes('nasdaq') || lower.includes('earnings') || lower.includes('nikkei')) category = 'Indices';
      else category = 'Macro';

      // Market impact note
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
        urgency,
        sentiment,
        sentimentScore: score,
        affectedAssets: assets,
        marketImpact,
        causalMechanism: `Causal transmission: ${sourceName} headline impacts macro risk appetite -> algorithmic re-pricing across ${assets[0] || 'market assets'}.`
      });
    }
  }
  return items;
}

// Server-side live world news aggregator endpoint
app.get('/api/news', async (_req, res) => {
  const now = Date.now();
  // Return cached feed if within 30 seconds
  if (newsCache.data.length > 0 && now - newsCache.timestamp < 30000) {
    return res.json({ news: newsCache.data, cached: true, count: newsCache.data.length });
  }

  try {
    const feeds = await Promise.allSettled([
      fetch('https://feeds.bbci.co.uk/news/business/rss.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'BBC World Business', 'Europe', 'Macro')),
      fetch('https://finance.yahoo.com/news/rssindex', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'Yahoo Finance Global', 'Americas', 'Indices')),
      fetch('https://feeds.content.dowjones.io/public/rss/mw_topstories', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'MarketWatch Global', 'Americas', 'Macro')),
      fetch('https://www.scmp.com/rss/92/feed', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'SCMP Asia Business', 'Asia-Pacific', 'Macro')),
      fetch('https://www.aljazeera.com/xml/rss/all.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'Al Jazeera World Wire', 'Middle East', 'Energy & Geopolitics')),
      fetch('https://www.coindesk.com/arc/outboundfeeds/rss/', { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(r => r.text())
        .then(xml => parseRss(xml, 'CoinDesk Wire', 'Global', 'Crypto'))
    ]);

    const combined: any[] = [];
    feeds.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    });

    if (combined.length > 0) {
      // Sort newest first
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      newsCache = { data: combined, timestamp: now };
      return res.json({ news: combined, cached: false, count: combined.length });
    }
  } catch (err: any) {
    console.warn('[server /api/news] Live RSS fetch failed, returning curated fallback wire:', err.message);
  }

  res.json({ news: [], fallback: true });
});

// Server-side AI news impact deep-dive analysis endpoint
app.post('/api/news/analyze', async (req, res) => {
  try {
    const { headline, summary, asset } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze this breaking financial headline and explain its quantitative market impact:
Headline: "${headline}"
Context: "${summary || 'No further summary'}"
Focus Asset: "${asset || 'Gold and Bitcoin'}"

Please provide an institutional-grade breakdown covering:
1. Macro Transmission Mechanism (how this news flows through interest rates, inflation, or liquidity)
2. Directional Bias & Confidence (Bullish/Bearish/Neutral with confidence score %)
3. Key Invalidation / Risk Level to watch on the charts
4. Actionable Quant Advice (e.g. scale in, hold, protect stops)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an Institutional Senior Quantitative Strategist and Macro Intelligence Director. Provide concise, mathematically rigorous causal explanations without hype."
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Gemini news analysis error:', error);
    res.status(500).json({ error: error.message || 'Gemini API call failed' });
  }
});

// Server-side structured AI Analyst endpoint
app.post('/api/ai/analyze-setup', async (req, res) => {
  try {
    const { symbol, timeframe, currentPrice, regime, indicators, structure, signal } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze this structured market dataset for ${symbol} on the ${timeframe} timeframe:
- Current Market Price: $${currentPrice}
- Classified Market Regime: ${regime || 'Unclear'}
- Key Indicators: EMA 21: ${indicators?.ema21 ?? 'N/A'}, EMA 50: ${indicators?.ema50 ?? 'N/A'}, RSI(14): ${indicators?.rsi ?? 'N/A'}, ATR: ${indicators?.atr ?? 'N/A'}
- Structural Levels: Nearest Support: $${structure?.support ?? 'N/A'}, Nearest Resistance: $${structure?.resistance ?? 'N/A'}, Recent Event: ${structure?.lastEvent ?? 'None'}
- Rule-Based Setup: Action: ${signal?.action ?? 'WAIT'}, Strategy: ${signal?.strategy ?? 'N/A'}, Proposed Entry: $${signal?.entry ?? currentPrice}, Proposed Stop Loss: $${signal?.stopLoss ?? 'N/A'}, Target: $${signal?.target ?? 'N/A'}

Provide an institutional, objective breakdown covering:
1. Market Context & Trend (Explain what the EMAs and structure indicate)
2. Indicator Agreement vs Disagreement (Note whether RSI, ATR, and moving averages agree or conflict)
3. Actionable Setup Evaluation & Risks (Why this setup is valid or why caution is warranted)
4. Exact Invalidation Level (What price breach strictly invalidates the premise)
Do NOT invent unavailable prices or promise profits. Keep the analysis rigorous and capital-preservation focused.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a Chief Risk Officer and Senior Quantitative Technical Analyst. You provide rigorous, honest technical breakdowns using only the supplied structured data. Never promise certainty or profit."
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Gemini analyze-setup error:', error);
    res.status(500).json({ error: error.message || 'Gemini API call failed' });
  }
});

// Server-side Gemini chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;
    
    // Always use @google/genai SDK on the server side
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    // Format contents for multi-turn chat:
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content || m.text || '' }]
    }));

    // Use gemini-3.5-flash for general tasks as specified in guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction || 
          "You are a Senior Quantitative Trading Analyst and Financial Astrology Researcher. You provide disciplined technical analysis, market structure commentary (BOS, CHoCH, key S/R levels), probability assessments, and statistical evaluations of astrological cycles (lunar phases, planetary retrograde stations) with strict capital preservation principles. You always emphasize risk management, invalidation levels, and position sizing.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini chat server error:', error);
    res.status(500).json({ error: error.message || 'Gemini API call failed' });
  }
});

// ==========================================
// BROKER ABSTRACTION LAYER & PAPER TRADING REST API
// ==========================================

// GET /api/account - Full simulated account status
app.get('/api/account', async (_req, res) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const account = await broker.getAccount();
    res.json({ success: true, account });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve account summary' });
  }
});

// GET /api/market-data - Latest quotes for tracked assets
app.get('/api/market-data', async (_req, res) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const quotes = await broker.getAllMarketData();
    res.json({ success: true, quotes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve market data' });
  }
});

// POST /api/market-data/tick - Ingest price tick to update valuations & triggers
app.post('/api/market-data/tick', (req, res) => {
  try {
    const { symbol, price } = req.body;
    if (!symbol || typeof price !== 'number' || isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, error: 'Valid symbol and positive numerical price required.' });
    }
    const broker = brokerManager.getActiveBroker();
    broker.updateMarketPrice(symbol, price);
    res.json({ success: true, message: `Tick updated for ${symbol} at $${price}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update tick' });
  }
});

// GET /api/positions - Active open simulated positions
app.get('/api/positions', async (_req, res) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const positions = await broker.getPositions();
    res.json({ success: true, positions, count: positions.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve positions' });
  }
});

// GET /api/orders - Active open and pending paper orders
app.get('/api/orders', async (_req, res) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const orders = await broker.getOpenOrders();
    res.json({ success: true, orders, count: orders.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve orders' });
  }
});

// POST /api/paper/orders - Submit a new paper order
app.post('/api/paper/orders', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, stopPrice, stopLoss, takeProfit, strategy, timeframe, reason } = req.body;

    // Strict Server-Side Input Validation
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ success: false, error: 'Validation failed: A valid symbol string is required.' });
    }
    if (!side || !['BUY', 'SELL', 'LONG', 'SHORT'].includes(side)) {
      return res.status(400).json({ success: false, error: "Validation failed: Order side must be 'BUY', 'SELL', 'LONG', or 'SHORT'." });
    }
    if (!type || !['MARKET', 'LIMIT', 'STOP'].includes(type)) {
      return res.status(400).json({ success: false, error: "Validation failed: Order type must be 'MARKET', 'LIMIT', or 'STOP'." });
    }
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Validation failed: Order quantity must be a strictly positive number.' });
    }

    const broker = brokerManager.getActiveBroker();
    const order = await broker.placePaperOrder({
      symbol,
      side,
      type,
      quantity,
      price: typeof price === 'number' ? price : undefined,
      stopPrice: typeof stopPrice === 'number' ? stopPrice : undefined,
      stopLoss: typeof stopLoss === 'number' ? stopLoss : undefined,
      takeProfit: typeof takeProfit === 'number' ? takeProfit : undefined,
      strategy,
      timeframe,
      reason
    });

    res.status(201).json({
      success: true,
      order,
      message: `Simulated paper ${order.type} order placed successfully.`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to place paper order' });
  }
});

// POST /api/paper/orders/:id/cancel - Cancel pending paper order
app.post('/api/paper/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const broker = brokerManager.getActiveBroker();
    const order = await broker.cancelPaperOrder(id);
    res.json({ success: true, order, message: `Paper order ${id} successfully cancelled.` });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to cancel paper order' });
  }
});

// POST /api/paper/positions/:id/close - Close simulated position
app.post('/api/paper/positions/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const broker = brokerManager.getActiveBroker();
    const position = await broker.closePaperPosition(id, reason || 'MANUAL_DASHBOARD_CLOSE');
    res.json({
      success: true,
      position,
      message: `Simulated position ${id} successfully closed and logged to trade journal.`
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to close position' });
  }
});

// POST /api/paper/account/reset - Reset simulated paper account
app.post('/api/paper/account/reset', async (req, res) => {
  try {
    const { startingBalance } = req.body;
    const broker = brokerManager.getActiveBroker();
    const account = await broker.resetAccount(typeof startingBalance === 'number' ? startingBalance : 100000);
    res.json({
      success: true,
      account,
      message: `Paper account successfully reset to $${account.balance.toLocaleString()} starting balance.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to reset account' });
  }
});

// GET /api/trades - Completed simulated trade journal ledger
app.get('/api/trades', async (_req, res) => {
  try {
    const broker = brokerManager.getActiveBroker();
    const trades = await broker.getTrades();
    res.json({ success: true, trades, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve trade ledger' });
  }
});

// POST /api/backtest - Run historical backtest using broker simulation rules
app.post('/api/backtest', (req, res) => {
  try {
    const { candles, strategyId, symbol, timeframe, config } = req.body;

    if (!Array.isArray(candles) || candles.length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed: At least 15 historical candlestick bars required for statistical simulation.'
      });
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
    res.status(500).json({ success: false, error: error.message || 'Backtest simulation failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Express + Vite server running on http://0.0.0.0:${port}`);
  });
}

startServer();
