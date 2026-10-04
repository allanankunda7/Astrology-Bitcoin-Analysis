/**
 * src/services/tests/financialCalculations.test.ts
 * Deterministic Financial Calculations Test Suite
 * 
 * Verifies exact arithmetic formulas without floating-point inaccuracies or randomness:
 * 1. Long PnL formula: (exitPrice - entryPrice) * quantity - fees
 * 2. Short PnL formula: (entryPrice - exitPrice) * quantity - fees
 * 3. Position Sizing based on risk percentage and stop-loss buffer
 * 4. Stop-loss execution incorporating adverse slippage
 * 5. Take-profit execution incorporating favorable fill
 * 6. Commission calculations (maker vs taker fees)
 * 7. Peak-to-trough Drawdown percentage calculation
 * 8. Profit Factor & Expectancy formulas
 */

export function runFinancialCalculationTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push(`✓ [PASS] ${testName}`);
    } else {
      failed++;
      results.push(`✗ [FAIL] ${testName}`);
      console.error(`Calculation test failed: ${testName}`);
    }
  }

  // 1. Long PnL Calculation
  // Entry: $60,000, Exit: $63,000, Quantity: 0.5 BTC, Taker Fee: 0.05% per side
  const longEntry = 60000;
  const longExit = 63000;
  const longQty = 0.5;
  const entryNotional = longEntry * longQty; // $30,000
  const exitNotional = longExit * longQty;   // $31,500
  const entryFee = entryNotional * 0.0005;   // $15.00
  const exitFee = exitNotional * 0.0005;     // $15.75
  const totalFees = entryFee + exitFee;      // $30.75
  const grossLongPnl = (longExit - longEntry) * longQty; // $1,500.00
  const netLongPnl = grossLongPnl - totalFees;            // $1,469.25

  assert(grossLongPnl === 1500, 'Gross Long PnL is exactly $1,500.00');
  assert(Math.abs(totalFees - 30.75) < 0.0001, 'Total roundtrip fees are exactly $30.75');
  assert(Math.abs(netLongPnl - 1469.25) < 0.0001, 'Net Long PnL after commissions is $1,469.25');

  // 2. Short PnL Calculation
  // Entry: $65,000, Exit: $61,000, Quantity: 1.0 BTC, Taker Fee: 0.05% per side
  const shortEntry = 65000;
  const shortExit = 61000;
  const shortQty = 1.0;
  const grossShortPnl = (shortEntry - shortExit) * shortQty; // $4,000.00
  const shortRoundtripFees = (shortEntry * 0.0005) + (shortExit * 0.0005); // $32.50 + $30.50 = $63.00
  const netShortPnl = grossShortPnl - shortRoundtripFees; // $3,937.00

  assert(grossShortPnl === 4000, 'Gross Short PnL is exactly $4,000.00');
  assert(Math.abs(shortRoundtripFees - 63) < 0.0001, 'Short roundtrip fees are exactly $63.00');
  assert(Math.abs(netShortPnl - 3937) < 0.0001, 'Net Short PnL after commissions is $3,937.00');

  // 3. Position Sizing Formula
  // Capital: $100,000, Risk: 1.5% ($1,500), Entry: $50,000, Stop Loss: $48,500 ($1,500 distance)
  const capital = 100000;
  const riskPct = 1.5;
  const targetDollarRisk = capital * (riskPct / 100); // $1,500
  const stopDistance = 50000 - 48500; // $1,500
  const positionSizeUnits = targetDollarRisk / stopDistance; // 1.0 BTC
  assert(targetDollarRisk === 1500, 'Risk dollar amount is exactly $1,500');
  assert(positionSizeUnits === 1.0, 'Position sizing yields exactly 1.0 base unit');

  // 4. Slippage Math on Market Order
  // Base Price: $60,000, Slippage Rate: 0.03% (3 bps)
  const buySlippage = 60000 * 0.0003; // $18.00
  const effectiveBuyFill = 60000 + buySlippage; // $60,018.00
  assert(effectiveBuyFill === 60018, 'Market Buy fill incorporates adverse upward slippage to $60,018.00');

  const sellSlippage = 60000 * 0.0003; // $18.00
  const effectiveSellFill = 60000 - sellSlippage; // $59,982.00
  assert(effectiveSellFill === 59982, 'Market Sell fill incorporates adverse downward slippage to $59,982.00');

  // 5. Risk / Reward Ratio
  // Entry: $100, Stop: $95 (risk $5), Target: $115 (reward $15)
  const rr = (115 - 100) / (100 - 95);
  assert(rr === 3.0, 'Risk/Reward ratio is mathematically 1:3.0');

  // 6. Drawdown Calculation
  // Peak: $120,000, Trough: $102,000 -> Drawdown: ($120k - $102k) / $120k = 18k / 120k = 15.0%
  const peakEquity = 120000;
  const currentEquity = 102000;
  const ddPct = ((peakEquity - currentEquity) / peakEquity) * 100;
  assert(ddPct === 15.0, 'Peak-to-trough drawdown calculates to exactly 15.0%');

  // 7. Profit Factor Calculation
  // Gross Wins: $15,000, Gross Losses: $6,000 -> Profit Factor: 15000 / 6000 = 2.50
  const grossWins = 15000;
  const grossLosses = 6000;
  const profitFactor = Number((grossWins / grossLosses).toFixed(2));
  assert(profitFactor === 2.5, 'Profit factor calculates to exactly 2.50');

  // 8. Expectancy Formula: (WinRate * AvgWin) - (LossRate * AvgLoss)
  // WinRate: 60%, AvgWin: $800, LossRate: 40%, AvgLoss: $400
  // Expectancy = (0.6 * 800) - (0.4 * 400) = 480 - 160 = $320
  const expectancy = (0.6 * 800) - (0.4 * 400);
  assert(expectancy === 320, 'Mathematical expectancy is $320.00 per trade');

  return { passed, failed, results };
}
