import React, { useState, useMemo } from 'react';
import {
  Target,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Zap,
  Info,
  Maximize2,
  BookmarkCheck,
  Percent,
  Activity,
  Calculator,
  Scale,
  RefreshCw,
  Award,
  ChevronRight
} from 'lucide-react';

interface FactorScore {
  category: string;
  score: number;
  maxScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'WEAK' | 'UNFAVORABLE';
  rationale: string;
}

interface TradeTarget {
  targetId: number;
  name: string;
  price: number;
  rrRatio: number;
  scaleOutPct: number;
  rationale: string;
}

interface MarketPreset {
  symbol: string;
  name: string;
  direction: 'LONG' | 'SHORT';
  currentPrice: number;
  atr: number;
  recentSwingLow: number;
  recentSwingHigh: number;
  timeframe: string;
  trendAligned: boolean;
  adxStrength: number;
  structureBosConfirmed: boolean;
  structureRegime: 'STRONG_UPTREND' | 'WEAK_UPTREND' | 'RANGING' | 'WEAK_DOWNTREND' | 'STRONG_DOWNTREND';
  atKeyReactionZone: boolean;
  reactionZoneStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  rsiValue: number;
  macdMomentumBullish: boolean;
  rvol: number;
  liquiditySweepConfirmed: boolean;
  narrative: string;
}

const PRESETS: MarketPreset[] = [
  {
    symbol: 'BTC/USDT',
    name: 'Bitcoin / Tether',
    direction: 'LONG',
    currentPrice: 88400.0,
    atr: 1380.0,
    recentSwingLow: 85650.0,
    recentSwingHigh: 93200.0,
    timeframe: '4h',
    trendAligned: true,
    adxStrength: 31.4,
    structureBosConfirmed: true,
    structureRegime: 'STRONG_UPTREND',
    atKeyReactionZone: true,
    reactionZoneStrength: 'STRONG',
    rsiValue: 53.8,
    macdMomentumBullish: true,
    rvol: 1.78,
    liquiditySweepConfirmed: true,
    narrative: '4H Bullish Order Block mitigation with confirmed Break of Structure and 1.78x relative volume absorption.'
  },
  {
    symbol: 'ETH/USDT',
    name: 'Ethereum / Tether',
    direction: 'LONG',
    currentPrice: 3340.0,
    atr: 64.0,
    recentSwingLow: 3190.0,
    recentSwingHigh: 3580.0,
    timeframe: '4h',
    trendAligned: true,
    adxStrength: 27.2,
    structureBosConfirmed: true,
    structureRegime: 'STRONG_UPTREND',
    atKeyReactionZone: true,
    reactionZoneStrength: 'STRONG',
    rsiValue: 51.2,
    macdMomentumBullish: true,
    rvol: 1.54,
    liquiditySweepConfirmed: true,
    narrative: 'Liquidity sweep of prior swing low followed by immediate displacement back above VWAP anchor.'
  },
  {
    symbol: 'SOL/USDT',
    name: 'Solana / Tether',
    direction: 'LONG',
    currentPrice: 182.50,
    atr: 4.80,
    recentSwingLow: 171.00,
    recentSwingHigh: 196.00,
    timeframe: '1h',
    trendAligned: true,
    adxStrength: 24.6,
    structureBosConfirmed: true,
    structureRegime: 'WEAK_UPTREND',
    atKeyReactionZone: true,
    reactionZoneStrength: 'MODERATE',
    rsiValue: 56.4,
    macdMomentumBullish: true,
    rvol: 1.42,
    liquiditySweepConfirmed: false,
    narrative: 'High volume consolidation retest with EMA 21 confluence; awaiting volume expansion confirmation.'
  },
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    direction: 'SHORT',
    currentPrice: 4136.90,
    atr: 28.50,
    recentSwingLow: 4050.00,
    recentSwingHigh: 4195.00,
    timeframe: '4h',
    trendAligned: true,
    adxStrength: 26.0,
    structureBosConfirmed: true,
    structureRegime: 'STRONG_DOWNTREND',
    atKeyReactionZone: true,
    reactionZoneStrength: 'STRONG',
    rsiValue: 44.5,
    macdMomentumBullish: false,
    rvol: 1.62,
    liquiditySweepConfirmed: true,
    narrative: 'Macro Bearish Fair Value Gap rejection at $2,712 liquidity pool with bearish MACD divergence.'
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    direction: 'SHORT',
    currentPrice: 1.0820,
    atr: 0.0042,
    recentSwingLow: 1.0740,
    recentSwingHigh: 1.0865,
    timeframe: '1h',
    trendAligned: false,
    adxStrength: 14.8,
    structureBosConfirmed: false,
    structureRegime: 'RANGING',
    atKeyReactionZone: false,
    reactionZoneStrength: 'WEAK',
    rsiValue: 50.1,
    macdMomentumBullish: false,
    rvol: 0.88,
    liquiditySweepConfirmed: false,
    narrative: 'Range chop with sub-15 ADX; unqualified setup failing minimum multi-factor confluence threshold.'
  }
];

export const SetupScoringViewer: React.FC = () => {
  // Navigation tabs within Phase 5
  const [activeTab, setActiveTab] = useState<'confluence_cockpit' | 'trade_ladder' | 'risk_calculator' | 'expectancy' | 'algorithms'>('confluence_cockpit');

  // Active Market Setup State
  const [selectedPreset, setSelectedPreset] = useState<string>('BTC/USDT');
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [currentPrice, setCurrentPrice] = useState<number>(88400.0);
  const [atr, setAtr] = useState<number>(1380.0);
  const [recentSwingLow, setRecentSwingLow] = useState<number>(85650.0);
  const [recentSwingHigh, setRecentSwingHigh] = useState<number>(93200.0);
  const [timeframe, setTimeframe] = useState<string>('4h');

  // 5 Quantitative Factors State
  const [trendAligned, setTrendAligned] = useState<boolean>(true);
  const [adxStrength, setAdxStrength] = useState<number>(31.4);
  const [structureBosConfirmed, setStructureBosConfirmed] = useState<boolean>(true);
  const [structureRegime, setStructureRegime] = useState<'STRONG_UPTREND' | 'WEAK_UPTREND' | 'RANGING' | 'WEAK_DOWNTREND' | 'STRONG_DOWNTREND'>('STRONG_UPTREND');
  const [atKeyReactionZone, setAtKeyReactionZone] = useState<boolean>(true);
  const [reactionZoneStrength, setReactionZoneStrength] = useState<'STRONG' | 'MODERATE' | 'WEAK'>('STRONG');
  const [rsiValue, setRsiValue] = useState<number>(53.8);
  const [macdMomentumBullish, setMacdMomentumBullish] = useState<boolean>(true);
  const [rvol, setRvol] = useState<number>(1.78);
  const [liquiditySweepConfirmed, setLiquiditySweepConfirmed] = useState<boolean>(true);

  // Risk Calculator State
  const [accountBalance, setAccountBalance] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [calcEntry, setCalcEntry] = useState<number>(88400);
  const [calcStopLoss, setCalcStopLoss] = useState<number>(84960); // Swing low - 0.5 * ATR

  // Expectancy Inputs
  const [expWinRate, setExpWinRate] = useState<number>(55.0);
  const [expAvgRR, setExpAvgRR] = useState<number>(2.4);
  const [expTradesPerMonth, setExpTradesPerMonth] = useState<number>(20);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Load a preset
  const loadPreset = (p: MarketPreset) => {
    setSelectedPreset(p.symbol);
    setSymbol(p.symbol);
    setDirection(p.direction);
    setCurrentPrice(p.currentPrice);
    setAtr(p.atr);
    setRecentSwingLow(p.recentSwingLow);
    setRecentSwingHigh(p.recentSwingHigh);
    setTimeframe(p.timeframe);

    setTrendAligned(p.trendAligned);
    setAdxStrength(p.adxStrength);
    setStructureBosConfirmed(p.structureBosConfirmed);
    setStructureRegime(p.structureRegime);
    setAtKeyReactionZone(p.atKeyReactionZone);
    setReactionZoneStrength(p.reactionZoneStrength);
    setRsiValue(p.rsiValue);
    setMacdMomentumBullish(p.macdMomentumBullish);
    setRvol(p.rvol);
    setLiquiditySweepConfirmed(p.liquiditySweepConfirmed);

    setCalcEntry(p.currentPrice);
    const isForex = p.symbol === 'EUR/USD' || p.currentPrice < 10;
    const fact = isForex ? 10000 : 100;
    const sl = p.direction === 'LONG'
      ? Math.round((p.recentSwingLow - 0.5 * p.atr) * fact) / fact
      : Math.round((p.recentSwingHigh + 0.5 * p.atr) * fact) / fact;
    setCalcStopLoss(sl);
  };

  // 1. Compute 5-factor scores
  const scoreBreakdown = useMemo(() => {
    const factors: FactorScore[] = [];

    // Factor 1: Trend & HTF Alignment (0 - 2.0 pts)
    let f1 = 0.0;
    if (trendAligned) {
      f1 += 1.2;
      if (adxStrength >= 25.0) f1 += 0.8;
      else if (adxStrength >= 18.0) f1 += 0.4;
    } else {
      if (adxStrength < 20.0) f1 = 0.5;
    }
    f1 = Math.min(2.0, f1);
    factors.push({
      category: 'Higher Timeframe & Trend Alignment',
      score: Math.round(f1 * 100) / 100,
      maxScore: 2.0,
      status: f1 >= 1.6 ? 'EXCELLENT' : f1 >= 1.0 ? 'GOOD' : 'WEAK',
      rationale: trendAligned
        ? `Trend aligned with EMA stack and ADX strength (${adxStrength.toFixed(1)})`
        : `Counter-trend or low-trend regime (ADX: ${adxStrength.toFixed(1)})`
    });

    // Factor 2: Market Structure Confluence (0 - 2.0 pts)
    let f2 = 0.0;
    if (structureRegime === 'STRONG_UPTREND' || structureRegime === 'STRONG_DOWNTREND') {
      f2 += 1.0;
    } else if (structureRegime === 'WEAK_UPTREND' || structureRegime === 'WEAK_DOWNTREND') {
      f2 += 0.5;
    }
    if (structureBosConfirmed) f2 += 1.0;
    f2 = Math.min(2.0, f2);
    factors.push({
      category: 'Market Structure Confluence',
      score: Math.round(f2 * 100) / 100,
      maxScore: 2.0,
      status: f2 >= 1.6 ? 'EXCELLENT' : f2 >= 1.0 ? 'GOOD' : 'WEAK',
      rationale: `${structureRegime.replace('_', ' ')} with ${structureBosConfirmed ? 'confirmed Break of Structure (BOS)' : 'no confirmed BOS'}`
    });

    // Factor 3: Key Reaction Zone Proximity (0 - 2.0 pts)
    let f3 = 0.0;
    if (atKeyReactionZone) {
      f3 = reactionZoneStrength === 'STRONG' ? 2.0 : 1.3;
    } else {
      f3 = 0.5;
    }
    factors.push({
      category: 'Key Reaction Zone Proximity',
      score: Math.round(f3 * 100) / 100,
      maxScore: 2.0,
      status: f3 >= 1.6 ? 'EXCELLENT' : f3 >= 1.0 ? 'GOOD' : 'WEAK',
      rationale: atKeyReactionZone
        ? `Entry inside validated reaction zone (${reactionZoneStrength} anchor)`
        : 'Entry outside high-volume reaction zone; elevated slippage risk'
    });

    // Factor 4: Momentum & Oscillators (0 - 2.0 pts)
    let f4 = 0.0;
    if (direction === 'LONG') {
      if (rsiValue >= 42.0 && rsiValue <= 62.0) f4 += 1.0;
      else if (rsiValue < 35.0) f4 += 0.7;
      if (macdMomentumBullish) f4 += 1.0;
    } else {
      if (rsiValue >= 38.0 && rsiValue <= 58.0) f4 += 1.0;
      else if (rsiValue > 65.0) f4 += 0.7;
      if (!macdMomentumBullish) f4 += 1.0;
    }
    f4 = Math.min(2.0, f4);
    factors.push({
      category: 'Momentum & Oscillators',
      score: Math.round(f4 * 100) / 100,
      maxScore: 2.0,
      status: f4 >= 1.6 ? 'EXCELLENT' : f4 >= 1.0 ? 'GOOD' : 'WEAK',
      rationale: `RSI (${rsiValue.toFixed(1)}) in ${rsiValue >= 40 && rsiValue <= 60 ? 'optimal continuation band' : 'divergent zone'} with ${macdMomentumBullish ? 'bullish' : 'bearish'} MACD expansion`
    });

    // Factor 5: Volume & Liquidity (0 - 2.0 pts)
    let f5 = 0.0;
    if (rvol >= 1.5) f5 += 1.2;
    else if (rvol >= 1.1) f5 += 0.7;
    if (liquiditySweepConfirmed) f5 += 0.8;
    f5 = Math.min(2.0, f5);
    factors.push({
      category: 'Volume & Liquidity Confirmation',
      score: Math.round(f5 * 100) / 100,
      maxScore: 2.0,
      status: f5 >= 1.6 ? 'EXCELLENT' : f5 >= 1.0 ? 'GOOD' : 'WEAK',
      rationale: `Relative Volume (${rvol.toFixed(2)}x) with ${liquiditySweepConfirmed ? 'confirmed liquidity absorption sweep' : 'no sweep confirmed'}`
    });

    const total = Math.round(factors.reduce((sum, f) => sum + f.score, 0) * 10) / 10;
    let grade: 'GRADE_A' | 'GRADE_B' | 'GRADE_C' | 'UNQUALIFIED';
    let summary: string;

    if (total >= 8.5) {
      grade = 'GRADE_A';
      summary = 'High-Confluence Institutional Setup: Exceptional multi-dimensional confluence across trend, structure, and volume.';
    } else if (total >= 7.0) {
      grade = 'GRADE_B';
      summary = 'Standard Quality Setup: Strong trade parameters with solid structural foundation. Standard risk allocation.';
    } else if (total >= 5.0) {
      grade = 'GRADE_C';
      summary = 'Speculative Setup: Moderate confluence. Reduced position sizing and tight trailing stop recommended.';
    } else {
      grade = 'UNQUALIFIED';
      summary = 'Unqualified Setup: Insufficient confluence to justify capital deployment. Capital preservation active.';
    }

    return {
      total,
      grade,
      factors,
      summary,
      bias: total >= 5.0 ? direction : 'NO_TRADE'
    };
  }, [
    trendAligned,
    adxStrength,
    structureRegime,
    structureBosConfirmed,
    atKeyReactionZone,
    reactionZoneStrength,
    rsiValue,
    macdMomentumBullish,
    rvol,
    liquiditySweepConfirmed,
    direction
  ]);

  // 2. Compute Trade Plan & Multi-Target Ladder
  const tradePlan = useMemo(() => {
    const isForex = symbol === 'EUR/USD' || currentPrice < 10;
    const prec = isForex ? 4 : 2;
    const fact = Math.pow(10, prec);
    const roundP = (v: number) => Math.round(v * fact) / fact;
    const isLong = direction === 'LONG';
    const entryOptimal = currentPrice;
    const entryZoneLower = roundP(currentPrice * (isForex ? 0.999 : (isLong ? 0.995 : 0.997)));
    const entryZoneUpper = roundP(currentPrice * (isForex ? 1.001 : (isLong ? 1.003 : 1.005)));

    const invalidationSL = isLong
      ? roundP(recentSwingLow - 0.5 * atr)
      : roundP(recentSwingHigh + 0.5 * atr);

    const riskDistance = Math.abs(entryOptimal - invalidationSL);
    const stopDistPct = Math.round((riskDistance / entryOptimal) * 10000) / 100;

    let targets: TradeTarget[] = [];
    if (isLong) {
      targets = [
        {
          targetId: 1,
          name: 'TP1 (Partial 1.5R)',
          price: roundP(entryOptimal + 1.5 * riskDistance),
          rrRatio: 1.5,
          scaleOutPct: 40.0,
          rationale: 'First resistance cluster; locks in 1.5R gains and triggers trailing SL to Breakeven.'
        },
        {
          targetId: 2,
          name: 'TP2 (Macro Liquidity 2.8R)',
          price: roundP(entryOptimal + 2.8 * riskDistance),
          rrRatio: 2.8,
          scaleOutPct: 40.0,
          rationale: 'Major structural swing high liquidity pool; core institutional profit harvest.'
        },
        {
          targetId: 3,
          name: 'TP3 (Trend Runner 4.5R)',
          price: roundP(entryOptimal + 4.5 * riskDistance),
          rrRatio: 4.5,
          scaleOutPct: 20.0,
          rationale: 'Fibonacci 1.618 expansion runner targeting unmitigated macro liquidity.'
        }
      ];
    } else {
      targets = [
        {
          targetId: 1,
          name: 'TP1 (Partial 1.5R)',
          price: roundP(entryOptimal - 1.5 * riskDistance),
          rrRatio: 1.5,
          scaleOutPct: 40.0,
          rationale: 'First intermediate support cluster; secures 1.5R and moves SL to Breakeven.'
        },
        {
          targetId: 2,
          name: 'TP2 (Swing Low Liquidity 2.8R)',
          price: roundP(entryOptimal - 2.8 * riskDistance),
          rrRatio: 2.8,
          scaleOutPct: 40.0,
          rationale: 'Structural swing low resting sell-stop liquidity sweep extraction.'
        },
        {
          targetId: 3,
          name: 'TP3 (Macro Demand Zone 4.5R)',
          price: roundP(entryOptimal - 4.5 * riskDistance),
          rrRatio: 4.5,
          scaleOutPct: 20.0,
          rationale: 'Deep capitulation target at higher-timeframe demand block.'
        }
      ];
    }

    const blendedRR = Math.round(((1.5 * 0.40) + (2.8 * 0.40) + (4.5 * 0.20)) * 100) / 100;
    const invalidationRationale = isLong
      ? `Close below Higher Low ($${isForex ? recentSwingLow.toFixed(4) : recentSwingLow.toLocaleString()}) minus 0.5×ATR ($${(0.5 * atr).toFixed(isForex ? 4 : 1)}) structurally invalidates the bullish sequence.`
      : `Close above Lower High ($${isForex ? recentSwingHigh.toFixed(4) : recentSwingHigh.toLocaleString()}) plus 0.5×ATR ($${(0.5 * atr).toFixed(isForex ? 4 : 1)}) structurally invalidates the bearish sequence.`;

    return {
      entryZoneLower,
      entryZoneUpper,
      entryOptimal,
      invalidationSL,
      riskDistance,
      stopDistPct,
      targets,
      blendedRR,
      invalidationRationale
    };
  }, [direction, currentPrice, atr, recentSwingLow, recentSwingHigh]);

  // 3. Compute Position Sizing & Liquidation Buffer
  const positionSizing = useMemo(() => {
    const riskDollars = accountBalance * (riskPercent / 100.0);
    let stopDistance = Math.abs(calcEntry - calcStopLoss);
    if (stopDistance <= 0) stopDistance = calcEntry * 0.01;

    const stopDistPct = (stopDistance / calcEntry) * 100.0;
    const units = riskDollars / stopDistance;
    const notional = units * calcEntry;

    const rawLeverage = notional / accountBalance;
    const recLeverage = Math.max(1.0, Math.round(rawLeverage * 10) / 10);

    // Estimated liquidation price assuming 0.5% maintenance margin
    let estLiq = 0;
    let safeFromStop = true;
    let liqBufferPct = 0;

    if (direction === 'LONG') {
      estLiq = calcEntry * (1.0 - (1.0 / recLeverage) + 0.005);
      liqBufferPct = ((calcEntry - estLiq) / calcEntry) * 100.0;
      safeFromStop = estLiq < calcStopLoss;
    } else {
      estLiq = calcEntry * (1.0 + (1.0 / recLeverage) - 0.005);
      liqBufferPct = ((estLiq - calcEntry) / calcEntry) * 100.0;
      safeFromStop = estLiq > calcStopLoss;
    }

    return {
      riskDollars: Math.round(riskDollars * 100) / 100,
      stopDistance: Math.round(stopDistance * 100) / 100,
      stopDistPct: Math.round(stopDistPct * 100) / 100,
      units: Math.round(units * 10000) / 10000,
      notional: Math.round(notional * 100) / 100,
      recLeverage,
      estLiq: Math.round(estLiq * 100) / 100,
      liqBufferPct: Math.round(liqBufferPct * 100) / 100,
      safeFromStop
    };
  }, [accountBalance, riskPercent, calcEntry, calcStopLoss, direction]);

  // 4. Compute Expectancy & Kelly
  const expectancy = useMemo(() => {
    const w = expWinRate / 100.0;
    const l = 1.0 - w;
    const r = expAvgRR;

    const rExp = (w * r) - (l * 1.0);
    const riskDollar = accountBalance * (riskPercent / 100.0);
    const dollarExp = rExp * riskDollar;
    const monthlyR = rExp * expTradesPerMonth;
    const monthlyUsd = dollarExp * expTradesPerMonth;

    const kellyFraction = r > 0 ? (w * (r + 1.0) - 1.0) / r : 0;
    const kellyPct = Math.max(0.0, Math.round(kellyFraction * 1000) / 10);

    return {
      rExp: Math.round(rExp * 1000) / 1000,
      dollarExp: Math.round(dollarExp * 100) / 100,
      monthlyR: Math.round(monthlyR * 100) / 100,
      monthlyUsd: Math.round(monthlyUsd * 100) / 100,
      isPositive: rExp > 0,
      kellyPct,
      halfKellyPct: Math.round((kellyPct / 2) * 10) / 10
    };
  }, [expWinRate, expAvgRR, expTradesPerMonth, accountBalance, riskPercent]);

  // Grade colors
  const gradeConfig = {
    GRADE_A: {
      badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      label: 'GRADE A · Institutional Prime',
      desc: 'High Confluence setup (≥8.5/10). Eligible for standard-to-full risk sizing.'
    },
    GRADE_B: {
      badge: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
      text: 'text-cyan-400',
      bar: 'bg-cyan-500',
      label: 'GRADE B · Solid Continuation',
      desc: 'Standard quality setup (7.0 - 8.4/10). Eligible for normal 1.0% risk sizing.'
    },
    GRADE_C: {
      badge: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      label: 'GRADE C · Speculative / Counter',
      desc: 'Moderate confluence (5.0 - 6.9/10). Restrict to 0.5% half-risk and fast profit taking.'
    },
    UNQUALIFIED: {
      badge: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
      label: 'UNQUALIFIED · No Capital Allocation',
      desc: 'Sub-threshold score (<5.0/10). Fails quantitative filters. Capital preservation engaged.'
    }
  }[scoreBreakdown.grade];

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER BANNER & PRESET SELECTOR                     */}
      {/* ========================================================= */}
      <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                Phase 5 Engine
              </span>
              <span className="text-slate-500 text-xs font-mono">
                Multi-Factor Confluence · Dynamic Invalidation · Position Sizing
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Technical Setup Scoring & Entry/Exit Engine
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Institutional algorithmic setup evaluation framework: Multi-factor scoring (0–10),
              structural invalidation with 0.5×ATR buffers, multi-tier profit targets (TP1–TP3),
              and fixed-fractional risk sizing to protect capital.
            </p>
          </div>

          {/* Setup Presets Ribbon */}
          <div className="flex flex-wrap items-center gap-2 bg-[#07090E] p-2 rounded-lg border border-slate-800/90">
            <span className="text-[11px] font-mono text-slate-400 px-1">PRESETS:</span>
            {PRESETS.map((p) => {
              const isSelected = selectedPreset === p.symbol;
              return (
                <button
                  key={p.symbol}
                  onClick={() => loadPreset(p)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-[#0F1420] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={p.direction === 'LONG' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {p.direction === 'LONG' ? '▲' : '▼'}
                  </span>
                  <span>{p.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Setup Telemetry Summary Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">ACTIVE ASSET</div>
            <div className="text-white font-bold flex items-center gap-1.5 mt-0.5">
              <span>{symbol}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded ${direction === 'LONG' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'}`}>
                {direction}
              </span>
            </div>
          </div>
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">CONFLUENCE SCORE</div>
            <div className={`text-base font-bold mt-0.5 flex items-baseline gap-1 ${gradeConfig.text}`}>
              <span>{scoreBreakdown.total.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 font-normal">/ 10.0</span>
            </div>
          </div>
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">CONFLUENCE GRADE</div>
            <div className="mt-0.5">
              <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${gradeConfig.badge}`}>
                {scoreBreakdown.grade.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">BLENDED R:R</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">
              {tradePlan.blendedRR.toFixed(2)} : 1
            </div>
          </div>
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">RISK DISTANCE</div>
            <div className="text-slate-200 font-bold mt-0.5">
              {tradePlan.stopDistPct.toFixed(2)}%
              <span className="text-[10px] text-slate-500 font-normal ml-1">(${tradePlan.riskDistance.toLocaleString()})</span>
            </div>
          </div>
          <div className="bg-[#07090E] p-2.5 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-500">TRADE BIAS</div>
            <div className="mt-0.5 font-bold">
              {scoreBreakdown.bias === 'LONG' && <span className="text-emerald-400">QUALIFIED LONG</span>}
              {scoreBreakdown.bias === 'SHORT' && <span className="text-rose-400">QUALIFIED SHORT</span>}
              {scoreBreakdown.bias === 'NO_TRADE' && <span className="text-slate-400">CAPITAL PRESERVATION</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SUB-NAVIGATION TABS                                    */}
      {/* ========================================================= */}
      <div className="flex border-b border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('confluence_cockpit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'confluence_cockpit'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Multi-Factor Scoring Cockpit (0–10)</span>
        </button>

        <button
          onClick={() => setActiveTab('trade_ladder')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'trade_ladder'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Entry Zones & Invalidation Ladder</span>
        </button>

        <button
          onClick={() => setActiveTab('risk_calculator')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'risk_calculator'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Institutional Risk & Position Sizing</span>
        </button>

        <button
          onClick={() => setActiveTab('expectancy')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'expectancy'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Expectancy & Kelly Sizing</span>
        </button>

        <button
          onClick={() => setActiveTab('algorithms')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === 'algorithms'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Formulas & Python Code</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MULTI-FACTOR SCORING COCKPIT (0–10)               */}
      {/* ========================================================= */}
      {activeTab === 'confluence_cockpit' && (
        <div className="space-y-6">
          {/* Top Score Dial & Grade Banner */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Dial Gauge Left */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-[#07090E] rounded-lg border border-slate-800 text-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Outer circle */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#1e293b"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke={
                        scoreBreakdown.grade === 'GRADE_A' ? '#10b981' :
                        scoreBreakdown.grade === 'GRADE_B' ? '#06b6d4' :
                        scoreBreakdown.grade === 'GRADE_C' ? '#f59e0b' : '#f43f5e'
                      }
                      strokeWidth="8"
                      strokeDasharray="264"
                      strokeDashoffset={264 - (264 * (scoreBreakdown.total / 10.0))}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold font-mono text-white">
                      {scoreBreakdown.total.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      out of 10.0
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-mono font-bold border ${gradeConfig.badge}`}>
                    {gradeConfig.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 max-w-xs leading-normal">
                  {gradeConfig.desc}
                </p>
              </div>

              {/* Summary Description Right */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" />
                      Algorithmic Confluence Synthesis
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluates 5 independent dimensions (2.0 max points each) against quantitative thresholds.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Direction Bias:</span>
                    <div className="flex items-center rounded border border-slate-700 overflow-hidden text-xs font-mono">
                      <button
                        onClick={() => setDirection('LONG')}
                        className={`px-3 py-1 font-bold transition-colors ${
                          direction === 'LONG'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-[#0B0E17] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        LONG ▲
                      </button>
                      <button
                        onClick={() => setDirection('SHORT')}
                        className={`px-3 py-1 font-bold transition-colors ${
                          direction === 'SHORT'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-[#0B0E17] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        SHORT ▼
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Progress Breakdown Bars */}
                <div className="space-y-3">
                  {scoreBreakdown.factors.map((f, idx) => (
                    <div key={idx} className="bg-[#07090E] p-3 rounded border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold">0{idx + 1}.</span>
                          <span className="text-white font-medium">{f.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            f.status === 'EXCELLENT' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' :
                            f.status === 'GOOD' ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/40' :
                            'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                          }`}>
                            {f.status}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {f.score.toFixed(2)} <span className="text-slate-500 font-normal">/ {f.maxScore.toFixed(1)}</span>
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            f.score >= 1.6 ? 'bg-emerald-500' : f.score >= 1.0 ? 'bg-cyan-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${(f.score / f.maxScore) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {f.rationale}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Algorithmic Decision Banner */}
                <div className="p-3 bg-[#07090E] rounded border border-slate-800 text-xs font-mono flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-300 font-semibold">ENGINE DISPOSITION: </span>
                    <span className="text-slate-400">{scoreBreakdown.summary}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Factor Tuning Controls */}
          <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Interactive Factor Tuning Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust market conditions to observe real-time confluence score adjustments.
                </p>
              </div>
              <button
                onClick={() => {
                  const curr = PRESETS.find(p => p.symbol === selectedPreset) || PRESETS[0];
                  loadPreset(curr);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Preset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Factor 1: Trend & ADX */}
              <div className="bg-[#0F1420] p-4 rounded-lg border border-slate-800/90 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>DIMENSION 1: TREND & HTF</span>
                  <span className="text-[10px] text-slate-500">MAX 2.0 PTS</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Trend Aligned (EMA stack):</span>
                  <input
                    type="checkbox"
                    checked={trendAligned}
                    onChange={(e) => setTrendAligned(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">ADX Strength:</span>
                    <span className="text-emerald-400 font-bold">{adxStrength.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="0.5"
                    value={adxStrength}
                    onChange={(e) => setAdxStrength(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Weak &lt;20</span>
                    <span>Moderate 20-25</span>
                    <span>Strong &gt;25</span>
                  </div>
                </div>
              </div>

              {/* Factor 2: Market Structure */}
              <div className="bg-[#0F1420] p-4 rounded-lg border border-slate-800/90 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>DIMENSION 2: MARKET STRUCTURE</span>
                  <span className="text-[10px] text-slate-500">MAX 2.0 PTS</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono block">Regime:</label>
                  <select
                    value={structureRegime}
                    onChange={(e) => setStructureRegime(e.target.value as any)}
                    className="w-full bg-[#07090E] border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STRONG_UPTREND">STRONG_UPTREND (+1.0)</option>
                    <option value="WEAK_UPTREND">WEAK_UPTREND (+0.5)</option>
                    <option value="RANGING">RANGING (+0.0)</option>
                    <option value="WEAK_DOWNTREND">WEAK_DOWNTREND (+0.5)</option>
                    <option value="STRONG_DOWNTREND">STRONG_DOWNTREND (+1.0)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300">BOS Confirmed (Close):</span>
                  <input
                    type="checkbox"
                    checked={structureBosConfirmed}
                    onChange={(e) => setStructureBosConfirmed(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Factor 3: Key Reaction Zone */}
              <div className="bg-[#0F1420] p-4 rounded-lg border border-slate-800/90 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>DIMENSION 3: REACTION ZONE</span>
                  <span className="text-[10px] text-slate-500">MAX 2.0 PTS</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">At Key Reaction Zone:</span>
                  <input
                    type="checkbox"
                    checked={atKeyReactionZone}
                    onChange={(e) => setAtKeyReactionZone(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono block">Zone Strength Anchor:</label>
                  <select
                    value={reactionZoneStrength}
                    onChange={(e) => setReactionZoneStrength(e.target.value as any)}
                    className="w-full bg-[#07090E] border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 font-mono focus:outline-none focus:border-emerald-500"
                  >
                    <option value="STRONG">STRONG (3+ touches / Macro FVG - 2.0 pts)</option>
                    <option value="MODERATE">MODERATE (2 touches - 1.3 pts)</option>
                    <option value="WEAK">WEAK (Minor intraday - 0.5 pts)</option>
                  </select>
                </div>
              </div>

              {/* Factor 4: Momentum & Oscillators */}
              <div className="bg-[#0F1420] p-4 rounded-lg border border-slate-800/90 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>DIMENSION 4: MOMENTUM (RSI/MACD)</span>
                  <span className="text-[10px] text-slate-500">MAX 2.0 PTS</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">RSI (14-period):</span>
                    <span className="text-cyan-400 font-bold">{rsiValue.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="85"
                    step="0.5"
                    value={rsiValue}
                    onChange={(e) => setRsiValue(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Oversold &lt;35</span>
                    <span>Optimal 42-62</span>
                    <span>Overbought &gt;70</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300">MACD Histogram Aligned:</span>
                  <input
                    type="checkbox"
                    checked={macdMomentumBullish}
                    onChange={(e) => setMacdMomentumBullish(e.target.checked)}
                    className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Factor 5: Volume & Liquidity */}
              <div className="bg-[#0F1420] p-4 rounded-lg border border-slate-800/90 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>DIMENSION 5: VOLUME & SWEEP</span>
                  <span className="text-[10px] text-slate-500">MAX 2.0 PTS</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Relative Volume (RVOL):</span>
                    <span className="text-emerald-400 font-bold">{rvol.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.05"
                    value={rvol}
                    onChange={(e) => setRvol(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Sub-par &lt;1.0x</span>
                    <span>Standard 1.1x</span>
                    <span>Climactic &gt;1.5x</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300">Liquidity Sweep Rejection:</span>
                  <input
                    type="checkbox"
                    checked={liquiditySweepConfirmed}
                    onChange={(e) => setLiquiditySweepConfirmed(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Fast Grade Rules Box */}
              <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                  QUALIFICATION CRITERIA
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-emerald-400 font-semibold">Grade A (≥8.5):</span>
                    <span className="text-slate-400">100% Risk Allocation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400 font-semibold">Grade B (7.0–8.4):</span>
                    <span className="text-slate-400">Standard 1.0% Allocation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-semibold">Grade C (5.0–6.9):</span>
                    <span className="text-slate-400">50% Half-Risk Allocation</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-400 font-semibold">Unqualified (&lt;5.0):</span>
                    <span className="text-rose-400 font-semibold">NO TRADE / PASS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ENTRY ZONES & INVALIDATION LADDER                 */}
      {/* ========================================================= */}
      {activeTab === 'trade_ladder' && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Algorithmic Trade Execution Ladder & Target Scaling
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Structural invalidation level cushioned with 0.5×ATR volatility buffer and 3-stage profit targets.
                </p>
              </div>

              {/* R:R Telemetry Badge */}
              <div className="flex items-center gap-3">
                <div className="bg-[#07090E] px-4 py-2 rounded border border-slate-800 text-right font-mono">
                  <div className="text-[10px] text-slate-500">BLENDED RISK/REWARD</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {tradePlan.blendedRR.toFixed(2)} : 1
                  </div>
                </div>
                <div className="bg-[#07090E] px-4 py-2 rounded border border-slate-800 text-right font-mono">
                  <div className="text-[10px] text-slate-500">STOP DISTANCE</div>
                  <div className="text-lg font-bold text-amber-400">
                    {tradePlan.stopDistPct.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Vertical Trade Ladder */}
            <div className="max-w-3xl mx-auto space-y-4 py-4">
              {/* Target 3 */}
              <div className="bg-[#07090E] border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between font-mono relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400" />
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      TP3 · 4.5R Runner
                    </span>
                    <span className="text-xs text-slate-400">Scale out: 20% position</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {tradePlan.targets[2]?.rationale}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-400">
                    ${symbol === 'EUR/USD' || currentPrice < 10 ? tradePlan.targets[2]?.price.toFixed(4) : tradePlan.targets[2]?.price.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    +{Math.abs(Math.round(((tradePlan.targets[2]?.price - currentPrice) / currentPrice) * 10000) / 100).toFixed(2)}% from entry
                  </div>
                </div>
              </div>

              {/* Target 2 */}
              <div className="bg-[#07090E] border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between font-mono relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                      TP2 · 2.8R Macro Liquidity
                    </span>
                    <span className="text-xs text-slate-400">Scale out: 40% position</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {tradePlan.targets[1]?.rationale}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-400">
                    ${symbol === 'EUR/USD' || currentPrice < 10 ? tradePlan.targets[1]?.price.toFixed(4) : tradePlan.targets[1]?.price.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    +{Math.abs(Math.round(((tradePlan.targets[1]?.price - currentPrice) / currentPrice) * 10000) / 100).toFixed(2)}% from entry
                  </div>
                </div>
              </div>

              {/* Target 1 */}
              <div className="bg-[#07090E] border border-cyan-500/20 rounded-lg p-4 flex items-center justify-between font-mono relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-400" />
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40">
                      TP1 · 1.5R Partial Lock
                    </span>
                    <span className="text-xs text-slate-400">Scale out: 40% position · Trigger Breakeven</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {tradePlan.targets[0]?.rationale}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-cyan-300">
                    ${symbol === 'EUR/USD' || currentPrice < 10 ? tradePlan.targets[0]?.price.toFixed(4) : tradePlan.targets[0]?.price.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    +{Math.abs(Math.round(((tradePlan.targets[0]?.price - currentPrice) / currentPrice) * 10000) / 100).toFixed(2)}% from entry
                  </div>
                </div>
              </div>

              {/* Entry Zone Band */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#0F1420] to-amber-500/10 border-2 border-dashed border-amber-500/40 rounded-lg p-4 font-mono relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                        OPTIMAL ENTRY ZONE
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        Limit: ${symbol === 'EUR/USD' || currentPrice < 10 ? `${tradePlan.entryZoneLower.toFixed(4)} – ${tradePlan.entryZoneUpper.toFixed(4)}` : `${tradePlan.entryZoneLower.toLocaleString()} – ${tradePlan.entryZoneUpper.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Optimal Limit execution benchmark: <span className="text-white font-bold">${symbol === 'EUR/USD' || currentPrice < 10 ? tradePlan.entryOptimal.toFixed(4) : tradePlan.entryOptimal.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-amber-300 font-bold">ACTIVE QUOTE</div>
                    <div className="text-sm font-extrabold text-white">
                      ${symbol === 'EUR/USD' || currentPrice < 10 ? currentPrice.toFixed(4) : currentPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invalidation Stop Loss */}
              <div className="bg-[#07090E] border border-rose-500/40 rounded-lg p-4 flex items-center justify-between font-mono relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />
                <div className="pl-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/40">
                      STRUCTURAL INVALIDATION (STOP LOSS)
                    </span>
                    <span className="text-xs text-slate-400">0.5×ATR Buffer: ${symbol === 'EUR/USD' || currentPrice < 10 ? (0.5 * atr).toFixed(4) : (0.5 * atr).toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-rose-300/80 mt-1">
                    {tradePlan.invalidationRationale}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-rose-400">
                    ${symbol === 'EUR/USD' || currentPrice < 10 ? tradePlan.invalidationSL.toFixed(4) : tradePlan.invalidationSL.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-rose-400/80">
                    -{tradePlan.stopDistPct.toFixed(2)}% risk distance
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action: Send to Risk Calculator */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Ready to compute lot sizes and safe leverage for this plan?
              </span>
              <button
                onClick={() => {
                  setCalcEntry(tradePlan.entryOptimal);
                  setCalcStopLoss(tradePlan.invalidationSL);
                  setActiveTab('risk_calculator');
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs font-mono rounded flex items-center gap-2 transition-colors"
              >
                <span>Export to Position Sizing Calculator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: INSTITUTIONAL RISK & POSITION SIZING CALCULATOR    */}
      {/* ========================================================= */}
      {activeTab === 'risk_calculator' && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Institutional Fixed-Fractional Position Sizing Calculator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculates exact unit quantities to guarantee that being stopped out costs strictly your pre-set risk budget.
                </p>
              </div>

              {/* Liquidation Safety Alert */}
              <div className="flex items-center gap-2 font-mono text-xs">
                {positionSizing.safeFromStop ? (
                  <div className="px-3 py-1.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Safe: Stop triggers before Liquidation</span>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/40 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Warning: Liquidation level too close!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs Column */}
              <div className="lg:col-span-5 space-y-4 bg-[#07090E] p-5 rounded-lg border border-slate-800">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-2">
                  CAPITAL & RISK PARAMETERS
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-mono flex justify-between">
                    <span>Account Balance ($ USD):</span>
                    <span className="text-white font-bold">${accountBalance.toLocaleString()}</span>
                  </label>
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(Math.max(100, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#0F1420] border border-slate-700 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Risk Allocation Per Trade:</span>
                    <span className="text-emerald-400 font-bold">{riskPercent.toFixed(2)}% (${(accountBalance * (riskPercent / 100)).toLocaleString()})</span>
                  </div>
                  <div className="flex gap-2">
                    {[0.5, 1.0, 1.5, 2.0].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRiskPercent(r)}
                        className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                          riskPercent === r
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                            : 'bg-[#0F1420] text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3.0"
                    step="0.05"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Entry Price ($):</label>
                    <input
                      type="number"
                      step={symbol === 'EUR/USD' || currentPrice < 10 ? "0.0001" : "any"}
                      value={calcEntry}
                      onChange={(e) => setCalcEntry(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0F1420] border border-slate-700 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono">Stop Loss ($):</label>
                    <input
                      type="number"
                      step={symbol === 'EUR/USD' || currentPrice < 10 ? "0.0001" : "any"}
                      value={calcStopLoss}
                      onChange={(e) => setCalcStopLoss(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0F1420] border border-slate-700 rounded px-3 py-2 text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono pt-2 leading-relaxed border-t border-slate-800/80">
                  Formula: <code className="text-slate-300">Units = Risk_Dollars / |Entry - Stop_Loss|</code>. Guarantees zero account blowup risk.
                </div>
              </div>

              {/* Computed Outputs Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">DOLLAR RISK AT STAKE</div>
                    <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                      ${positionSizing.riskDollars.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Exactly {riskPercent.toFixed(2)}% of total equity
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">EXACT POSITION SIZE</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {positionSizing.units.toLocaleString()} <span className="text-xs text-slate-400">{symbol.split('/')[0]}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Notional: ${positionSizing.notional.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">RECOMMENDED LEVERAGE</div>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                      {positionSizing.recLeverage.toFixed(1)}x
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Based on ${positionSizing.notional.toLocaleString()} notional / equity
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">EST. LIQUIDATION PRICE</div>
                    <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                      ${symbol === 'EUR/USD' || currentPrice < 10 ? positionSizing.estLiq.toFixed(4) : positionSizing.estLiq.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono mt-1 text-slate-400">
                      Buffer: {positionSizing.liqBufferPct.toFixed(1)}% ({positionSizing.safeFromStop ? 'SL triggers first' : 'Liquidation risk!'})
                    </div>
                  </div>
                </div>

                {/* Visual Distance Comparison Bar */}
                <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Risk vs Liquidation Safety Visualizer:</span>
                    <span className="text-emerald-400 font-bold">SL triggers at {positionSizing.stopDistPct.toFixed(2)}%</span>
                  </div>
                  <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden flex items-center">
                    <div
                      className="h-full bg-rose-500/80"
                      style={{ width: `${Math.min(100, (positionSizing.stopDistPct / positionSizing.liqBufferPct) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-500">
                    <span>Entry: ${symbol === 'EUR/USD' || currentPrice < 10 ? calcEntry.toFixed(4) : calcEntry.toLocaleString()}</span>
                    <span className="text-rose-400 font-semibold">Stop Loss: ${symbol === 'EUR/USD' || currentPrice < 10 ? calcStopLoss.toFixed(4) : calcStopLoss.toLocaleString()}</span>
                    <span className="text-slate-400">Liquidation: ${symbol === 'EUR/USD' || currentPrice < 10 ? positionSizing.estLiq.toFixed(4) : positionSizing.estLiq.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MATHEMATICAL EXPECTANCY & KELLY SIZING             */}
      {/* ========================================================= */}
      {activeTab === 'expectancy' && (
        <div className="space-y-6">
          <div className="bg-[#0F1420] border border-slate-800 rounded-lg p-6">
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-400" />
                Mathematical Expectancy & Kelly Criterion Model
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Quantifies statistical edge: <code className="text-slate-300">E = (WinRate × AvgWin_R) - (LossRate × 1.0)</code>.
                Proves long-term profitability over large trade sample sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders Left */}
              <div className="lg:col-span-5 space-y-4 bg-[#07090E] p-5 rounded-lg border border-slate-800">
                <div className="text-xs font-mono font-bold text-amber-300 border-b border-slate-800 pb-2">
                  HISTORICAL SYSTEM METRICS
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">System Win Rate:</span>
                    <span className="text-emerald-400 font-bold">{expWinRate.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="75"
                    step="0.5"
                    value={expWinRate}
                    onChange={(e) => setExpWinRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Average Reward-to-Risk (R):</span>
                    <span className="text-cyan-400 font-bold">{expAvgRR.toFixed(1)} : 1</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.1"
                    value={expAvgRR}
                    onChange={(e) => setExpAvgRR(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Monthly Trade Volume:</span>
                    <span className="text-amber-400 font-bold">{expTradesPerMonth} trades</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={expTradesPerMonth}
                    onChange={(e) => setExpTradesPerMonth(parseInt(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Outputs Right */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">PER-TRADE EXPECTANCY</div>
                    <div className={`text-2xl font-bold font-mono mt-1 ${expectancy.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {expectancy.rExp > 0 ? `+${expectancy.rExp.toFixed(2)}R` : `${expectancy.rExp.toFixed(2)}R`}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      ${expectancy.dollarExp.toLocaleString()} per executed setup
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">PROJECTED MONTHLY GAIN</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                      +{expectancy.monthlyR.toFixed(1)}R
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      +${expectancy.monthlyUsd.toLocaleString()} at {riskPercent}% risk
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">FULL KELLY LIMIT</div>
                    <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                      {expectancy.kellyPct.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Theoretical maximum growth without ruin
                    </div>
                  </div>

                  <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-500">INSTITUTIONAL 1/4 KELLY</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                      {(expectancy.kellyPct / 4).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Standard volatility dampening ceiling
                    </div>
                  </div>
                </div>

                <div className="bg-[#07090E] p-4 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
                  <div className="text-slate-300 font-bold">MATHEMATICAL VERDICT:</div>
                  <p className="text-slate-400 leading-relaxed">
                    With a {expWinRate.toFixed(1)}% win rate and {expAvgRR.toFixed(1)}:1 reward-to-risk ratio,
                    your system generates a positive expected value of <strong className="text-emerald-400">+{expectancy.rExp.toFixed(2)}R per trade</strong>.
                    Over 100 trades, this translates into an expected capital accumulation of <strong className="text-white">+{Math.round(expectancy.rExp * 100)}R</strong> regardless of short-term losing streaks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MATHEMATICAL FORMULAS & CODE                     */}
      {/* ========================================================= */}
      {activeTab === 'algorithms' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Formula 1 */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="text-amber-300 font-bold">1. FIXED-FRACTIONAL POSITION SIZING</div>
              <div className="bg-[#07090E] p-3 rounded border border-slate-800 text-slate-300">
                Units = (Account_Balance × Risk_Pct) / |Entry - Stop_Loss|
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Guarantees that regardless of asset volatility or stop distance, a stop loss execution never loses more than the predefined risk percentage.
              </p>
            </div>

            {/* Formula 2 */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="text-amber-300 font-bold">2. STRUCTURAL INVALIDATION WITH ATR CUSHION</div>
              <div className="bg-[#07090E] p-3 rounded border border-slate-800 text-slate-300">
                SL_Long = Swing_Low - (0.5 × ATR_14)<br />
                SL_Short = Swing_High + (0.5 × ATR_14)
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Prevents premature stop hunting on market wick sweeps by anchoring the stop outside structural swings plus half of average true range.
              </p>
            </div>

            {/* Formula 3 */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="text-amber-300 font-bold">3. BLENDED MULTI-TIER REWARD-TO-RISK</div>
              <div className="bg-[#07090E] p-3 rounded border border-slate-800 text-slate-300">
                Blended_RR = (1.5 × 0.40) + (2.8 × 0.40) + (4.5 × 0.20) = 2.62R
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Scales out partial profit at TP1 (locking gains & moving to breakeven), harvesting macro liquidity at TP2, and letting 20% run at TP3.
              </p>
            </div>

            {/* Formula 4 */}
            <div className="bg-[#0B0E17] border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="text-amber-300 font-bold">4. MATHEMATICAL EXPECTANCY (E)</div>
              <div className="bg-[#07090E] p-3 rounded border border-slate-800 text-slate-300">
                E = (WinRate × AvgWin_R) - ((1 - WinRate) × 1.0)
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                A system with E &gt; 0 is mathematically robust. With WinRate=55% and RR=2.4: E = (0.55×2.4) - (0.45×1.0) = +0.87R per trade.
              </p>
            </div>
          </div>

          {/* Copyable Python Module */}
          <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
            <div className="p-3 bg-[#0F1420] border-b border-slate-800 flex items-center justify-between">
              <span className="text-slate-300 font-bold">backend/app/services/setup_scoring.py</span>
              <button
                onClick={() => handleCopy("setup_scoring_engine = SetupScoringEngine()", "code")}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1.5"
              >
                {copiedText === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText === 'code' ? 'Copied' : 'Copy Python'}</span>
              </button>
            </div>
            <div className="p-4 bg-[#07090E] overflow-x-auto max-h-80 text-slate-300">
              <pre>{`class SetupScoringEngine:
    @classmethod
    def calculate_score(cls, trend_aligned, adx_strength, structure_bos_confirmed, ...):
        # 1. Trend Alignment (0 - 2.0 pts)
        # 2. Market Structure Confluence (0 - 2.0 pts)
        # 3. Key Reaction Zone Proximity (0 - 2.0 pts)
        # 4. Momentum & Oscillators (0 - 2.0 pts)
        # 5. Volume & Liquidity Confirmation (0 - 2.0 pts)
        total = round(sum(f.score for f in factors), 1)
        grade = "GRADE_A" if total >= 8.5 else "GRADE_B" if total >= 7.0 else "GRADE_C" if total >= 5.0 else "UNQUALIFIED"
        return SetupScoreBreakdown(total_score=total, grade=grade, ...)

    @classmethod
    def calculate_position_sizing(cls, inp: PositionSizingInput) -> PositionSizingResult:
        risk_dollars = inp.account_balance * (inp.risk_percentage / 100.0)
        stop_distance = abs(inp.entry_price - inp.stop_loss_price)
        units = risk_dollars / stop_distance
        notional = units * inp.entry_price
        rec_leverage = max(1.0, round(notional / inp.account_balance, 1))
        return PositionSizingResult(...)`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
