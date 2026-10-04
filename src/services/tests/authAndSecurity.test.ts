/**
 * src/services/tests/authAndSecurity.test.ts
 * Verification Test Suite for Authentication, Security, RBAC & Backend Risk Engine
 */

import { AuthService } from '../authService';
import { BackendRiskEngine } from '../backendRiskEngine';
import { relationalDb } from '../../db/relationalStore';

export function runAuthAndSecurityTests(): { passed: number; failed: number; results: string[] } {
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
      console.error(`Auth/Security test failed: ${testName}`);
    }
  }

  // --- 1. AUTHENTICATION & PASSWORD HASHING ---
  const validPassword = 'SecurePassword2026!';
  const weakPassword1 = 'short';
  const weakPassword2 = 'alllowercase123';
  const weakPassword3 = 'ALLUPPERCASE123';

  assert(AuthService.validatePasswordStrength(validPassword).valid, 'Valid password passes strength validation');
  assert(!AuthService.validatePasswordStrength(weakPassword1).valid, 'Short password (<8 chars) is rejected');
  assert(!AuthService.validatePasswordStrength(weakPassword2).valid, 'Password lacking uppercase is rejected');
  assert(!AuthService.validatePasswordStrength(weakPassword3).valid, 'Password lacking lowercase is rejected');

  // Hash & Verify
  const hash = AuthService.hashPassword(validPassword);
  assert(hash.includes(':'), 'Hash format contains salt:hash delimiter');
  assert(AuthService.verifyPassword(validPassword, hash), 'Correct password verifies successfully');
  assert(!AuthService.verifyPassword('WrongPassword123!', hash), 'Incorrect password is mathematically rejected');

  // User Registration & Bearer Token
  const testEmail = `researcher_${Date.now()}@quantlab.internal`;
  const regResult = AuthService.register({
    email: testEmail,
    password: validPassword,
    role: 'RESEARCHER'
  });

  assert(Boolean(regResult.user.id), 'Registered user receives unique ID');
  assert(regResult.user.role === 'RESEARCHER', 'User role assigned as RESEARCHER');
  assert(Boolean(regResult.token), 'Bearer token generated on registration');

  // Token Verification
  const decoded = AuthService.verifyToken(regResult.token);
  assert(decoded !== null, 'Valid token decodes successfully');
  assert(decoded?.email === testEmail, 'Token payload preserves verified email');
  assert(decoded?.role === 'RESEARCHER', 'Token payload preserves role');

  // Token Tamper Detection
  const tamperedToken = `${regResult.token.substring(0, regResult.token.length - 4)}fake`;
  assert(AuthService.verifyToken(tamperedToken) === null, 'Tampered token signature is rejected');

  // Password Reset Flow
  const resetReq = AuthService.requestPasswordReset(testEmail);
  assert(Boolean(resetReq.resetToken), 'Password reset token generated');
  const newPass = 'UpdatedSecurePass2026!';
  const resetSuccess = AuthService.resetPassword(resetReq.resetToken, newPass);
  assert(resetSuccess === true, 'Password reset succeeded with valid token');

  // Cannot reuse single-use token
  let tokenReused = false;
  try {
    AuthService.resetPassword(resetReq.resetToken, 'AnotherPass2026!');
  } catch {
    tokenReused = true;
  }
  assert(tokenReused === true, 'Single-use reset token cannot be reused');

  // Verify new password works for login
  const loginResult = AuthService.login(testEmail, newPass);
  assert(loginResult.user.email === testEmail, 'Login succeeds with updated password');

  // --- 2. BACKEND RISK ENGINE ENFORCEMENT ---
  // A. Stale Market Data Detection
  BackendRiskEngine.updateMarketDataTimestamp('BTC/USDT', Date.now() - 10 * 60 * 1000); // 10 mins ago
  assert(BackendRiskEngine.isMarketDataStale('BTC/USDT'), 'Market data older than 5 minutes is marked stale');

  const staleOrderCheck = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 65000,
    currentEquity: 100000,
    openPositionsCount: 1,
    currentDrawdownPct: 2.0
  });
  assert(!staleOrderCheck.allowed, 'Order rejected when market data is stale');
  assert(staleOrderCheck.rejectReason?.includes('stale') === true, 'Stale data message returned to user');

  // Refresh data timestamp
  BackendRiskEngine.updateMarketDataTimestamp('BTC/USDT', Date.now());
  assert(!BackendRiskEngine.isMarketDataStale('BTC/USDT'), 'Fresh market data is marked healthy');

  // B. Drawdown Circuit Breaker Check
  const circuitBreakerCheck = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'BUY',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 65000,
    currentEquity: 84000,
    openPositionsCount: 1,
    currentDrawdownPct: 16.0 // Exceeds 15% limit
  });
  assert(!circuitBreakerCheck.allowed, 'Order rejected by portfolio drawdown circuit breaker');
  assert(circuitBreakerCheck.circuitBreakerActive === true, 'Circuit breaker flag set');

  // C. Invalid Stop-Loss Orientation
  const invalidLongStop = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'LONG',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 65000,
    stopLoss: 66000, // Stop ABOVE entry on a long
    currentEquity: 100000,
    openPositionsCount: 0,
    currentDrawdownPct: 0
  });
  assert(!invalidLongStop.allowed, 'LONG order with stop-loss above entry price is rejected');

  const invalidShortStop = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'SHORT',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 65000,
    stopLoss: 64000, // Stop BELOW entry on a short
    currentEquity: 100000,
    openPositionsCount: 0,
    currentDrawdownPct: 0
  });
  assert(!invalidShortStop.allowed, 'SHORT order with stop-loss below entry price is rejected');

  // D. Excessive Risk Per Trade Check (>3%)
  // Entry: $60,000, Stop: $50,000 (distance $10,000), Quantity: 0.5 BTC -> Risk = $5,000 (5% of $100k equity)
  const excessiveRisk = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'LONG',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 60000,
    stopLoss: 50000,
    currentEquity: 100000,
    openPositionsCount: 0,
    currentDrawdownPct: 1.0
  });
  assert(!excessiveRisk.allowed, 'Order risking 5% of equity rejected by 3% risk cap');

  // E. Valid Order with Proper R:R Ratio
  // Entry: $60,000, Stop: $59,000 (distance $1,000), TP: $63,000 (profit $3,000) -> R:R = 3:1, Risk: 0.5 * 1000 = $500 (0.5%)
  const validOrder = BackendRiskEngine.evaluateOrder({
    symbol: 'BTC/USDT',
    side: 'LONG',
    type: 'MARKET',
    quantity: 0.5,
    entryPrice: 60000,
    stopLoss: 59000,
    takeProfit: 63000,
    currentEquity: 100000,
    openPositionsCount: 0,
    currentDrawdownPct: 1.0
  });
  assert(validOrder.allowed, 'Compliant order with 3:1 R:R and 0.5% risk is approved');
  assert(validOrder.riskRewardRatio === 3.0, 'Risk/reward ratio evaluated accurately as 3.0');

  // --- 3. RELATIONAL DATABASE PERSISTENCE & TRANSACTIONS ---
  // A. Transaction Rollback
  const txResult = relationalDb.executeTransaction(() => {
    relationalDb.insertOrder({
      id: 'ord-temp-tx',
      accountId: 'acc-paper-001',
      symbol: 'BTC/USDT',
      side: 'BUY',
      type: 'MARKET',
      status: 'PENDING',
      quantity: 1,
      fee: 0,
      slippage: 0,
      createdAt: new Date().toISOString()
    });
    // Force abort
    throw new Error('Simulated database write conflict');
  });

  assert(txResult.success === false, 'Transaction aborted cleanly on error');
  const tempOrder = relationalDb.getOrdersByAccount('acc-paper-001').find((o) => o.id === 'ord-temp-tx');
  assert(tempOrder === undefined, 'Aborted transaction rolled back cleanly without orphaned record');

  // B. Database Backup & Restore
  const backup = relationalDb.createBackup();
  assert(Boolean(backup.backupJson), 'Database snapshot generated');
  assert(backup.tablesCount.users > 0, 'Backup includes user records');

  const restore = relationalDb.restoreBackup(backup.backupJson);
  assert(restore.success === true, 'Database successfully restored from snapshot');

  return { passed, failed, results };
}
