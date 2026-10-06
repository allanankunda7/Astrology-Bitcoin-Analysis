import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createSeriesMarkers,
} from 'lightweight-charts';
import { getAstroMarkersForCandles } from '../services/astrologyOverlay';

export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  candles: CandleData[];
  indicators: {
    showEma21: boolean;
    showEma50: boolean;
    showEma200: boolean;
    showBollinger: boolean;
    showSRLevels: boolean;
    showBOS: boolean;
    showAstroEvents?: boolean;
  };
  symbol?: string;
  supportLevel?: number;
  resistanceLevel?: number;
  entryZone?: { min: number; max: number };
  stopLoss?: number;
  target1?: number;
  target2?: number;
  height?: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  indicators,
  symbol,
  supportLevel,
  resistanceLevel,
  stopLoss,
  target1,
  target2,
  height = 480,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastCandlesRef = useRef<CandleData[]>([]);

  // Asset precision detection (Forex pairs like EUR/USD require 4-5 decimals and 0.0001 minMove)
  const isForex = symbol === 'EUR/USD' || (candles.length > 0 && candles[0].close < 10);
  const precision = isForex ? 4 : 2;
  const minMove = isForex ? 0.0001 : 0.01;

  // Helper for Exponential Moving Average with dynamic precision
  function calcEMA(data: CandleData[], period: number, prec: number = precision) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const res: { time: UTCTimestamp; value: number }[] = [];
    let ema = data[0].close;
    const factor = Math.pow(10, prec);

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema = data[i].close;
      } else {
        ema = data[i].close * k + ema * (1 - k);
      }
      if (i >= period - 1) {
        res.push({ time: data[i].time, value: Math.round(ema * factor) / factor });
      }
    }
    return res;
  }

  // Helper for Bollinger Bands (period 20, mult 2) with dynamic precision
  function calcBB(data: CandleData[], period = 20, mult = 2, prec: number = precision) {
    const upper: { time: UTCTimestamp; value: number }[] = [];
    const lower: { time: UTCTimestamp; value: number }[] = [];
    const middle: { time: UTCTimestamp; value: number }[] = [];
    const factor = Math.pow(10, prec);

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b.close, 0);
      const mean = sum / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
      const std = Math.sqrt(variance);

      middle.push({ time: data[i].time, value: Math.round(mean * factor) / factor });
      upper.push({ time: data[i].time, value: Math.round((mean + mult * std) * factor) / factor });
      lower.push({ time: data[i].time, value: Math.round((mean - mult * std) * factor) / factor });
    }
    return { upper, lower, middle };
  }

  // 1. Initial Chart Setup and structural indicators
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up prior chart instance if any
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    // Create TradingView lightweight chart instance
    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#07090E' },
        textColor: '#94A3B8',
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      crosshair: {
        vertLine: { color: '#64748B', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#64748B', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Always create Candlestick Series configured with asset-specific price format
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
      priceFormat: {
        type: 'price',
        precision: precision,
        minMove: minMove,
      },
    });
    candleSeriesRef.current = candleSeries;

    // 2. Always create Volume Series at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3B82F6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });
    volumeSeriesRef.current = volumeSeries;

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Sort and deduplicate candles if available
    const sortedCandles = candles.length > 0
      ? [...candles]
          .sort((a, b) => (a.time as number) - (b.time as number))
          .filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time)
      : [];

    if (sortedCandles.length > 0) {
      candleSeries.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeries.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
        }))
      );

      lastCandlesRef.current = sortedCandles;
    }

    const linePriceFormat = {
      type: 'price' as const,
      precision: precision,
      minMove: minMove,
    };

    // 3. Technical Indicators
    // EMA 21
    if (indicators.showEma21) {
      const ema21 = chart.addSeries(LineSeries, {
        color: '#06B6D4',
        lineWidth: 1,
        title: 'EMA 21',
        priceFormat: linePriceFormat,
      });
      ema21.setData(calcEMA(sortedCandles, 21, precision));
      ema21SeriesRef.current = ema21;
    }

    // EMA 50
    if (indicators.showEma50) {
      const ema50 = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        title: 'EMA 50',
        priceFormat: linePriceFormat,
      });
      ema50.setData(calcEMA(sortedCandles, 50, precision));
      ema50SeriesRef.current = ema50;
    }

    // EMA 200
    if (indicators.showEma200) {
      const ema200 = chart.addSeries(LineSeries, {
        color: '#A855F7',
        lineWidth: 2,
        title: 'EMA 200',
        priceFormat: linePriceFormat,
      });
      ema200.setData(calcEMA(sortedCandles, 200, precision));
      ema200SeriesRef.current = ema200;
    }

    // Bollinger Bands
    if (indicators.showBollinger) {
      const { upper, lower, middle } = calcBB(sortedCandles, 20, 2, precision);
      const upperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.65)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Upper',
        priceFormat: linePriceFormat,
      });
      const lowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.65)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Lower',
        priceFormat: linePriceFormat,
      });
      const midSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.35)',
        lineWidth: 1,
        title: 'BB Basis',
        priceFormat: linePriceFormat,
      });

      upperSeries.setData(upper);
      lowerSeries.setData(lower);
      midSeries.setData(middle);
    }

    // Current price reference to guard price lines from distorting the chart scale
    const lastPrice = sortedCandles.length > 0 ? sortedCandles[sortedCandles.length - 1].close : 0;
    const isValidPrice = (p?: number) => {
      if (!p || typeof p !== 'number' || p <= 0) return false;
      if (lastPrice > 0 && Math.abs(p - lastPrice) / lastPrice > 0.35) return false;
      return true;
    };

    // 4. Support & Resistance price lines
    if (indicators.showSRLevels && isValidPrice(supportLevel) && isValidPrice(resistanceLevel)) {
      candleSeries.createPriceLine({
        price: resistanceLevel!,
        color: '#F43F5E',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Major Resistance',
      });

      candleSeries.createPriceLine({
        price: supportLevel!,
        color: '#10B981',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Major Support',
      });
    }

    // 5. Setup Lines: Stop Loss & Profit Targets
    if (isValidPrice(stopLoss)) {
      candleSeries.createPriceLine({
        price: stopLoss!,
        color: '#E11D48',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Invalidation (SL)',
      });
    }

    if (isValidPrice(target1)) {
      candleSeries.createPriceLine({
        price: target1!,
        color: '#34D399',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target 1 (R:R 1:1.3)',
      });
    }

    if (isValidPrice(target2)) {
      candleSeries.createPriceLine({
        price: target2!,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Target 2 (R:R 1:2.4)',
      });
    }

    // 6. Astrological Events Overlay
    if (indicators.showAstroEvents) {
      const astroMarkers = getAstroMarkersForCandles(sortedCandles);
      if (astroMarkers.length > 0) {
        createSeriesMarkers(candleSeries, astroMarkers as any);
      }
    }

    // Fit content initial
    chart.timeScale().fitContent();

    lastCandlesRef.current = sortedCandles;

    // Resize listener
    const handleResize = () => {
      if (container && chartRef.current) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [
    symbol,
    indicators.showEma21,
    indicators.showEma50,
    indicators.showEma200,
    indicators.showBollinger,
    indicators.showSRLevels,
    indicators.showBOS,
    indicators.showAstroEvents,
    supportLevel,
    resistanceLevel,
    stopLoss,
    target1,
    target2,
    height,
  ]);

  // 2. Real-Time Tick & Candle Update Effect (zero flicker, 60fps)
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const prev = lastCandlesRef.current;
    const curr = candles;

    // If series was not populated initially, perform full initial population
    if (prev.length === 0) {
      const sortedCandles = [...curr]
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

      candleSeriesRef.current.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeriesRef.current.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
        }))
      );

      if (ema21SeriesRef.current) ema21SeriesRef.current.setData(calcEMA(sortedCandles, 21));
      if (ema50SeriesRef.current) ema50SeriesRef.current.setData(calcEMA(sortedCandles, 50));
      if (ema200SeriesRef.current) ema200SeriesRef.current.setData(calcEMA(sortedCandles, 200));

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }

      lastCandlesRef.current = sortedCandles;
      return;
    }

    const lastPrev = prev[prev.length - 1];
    const lastCurr = curr[curr.length - 1];

    // Check if this is a live tick update (updating active bar or appending next bar)
    const isTickUpdate =
      lastPrev &&
      lastCurr &&
      (curr.length === prev.length || curr.length === prev.length + 1) &&
      (lastCurr.time as number) >= (lastPrev.time as number);

    if (isTickUpdate) {
      try {
        candleSeriesRef.current.update({
          time: lastCurr.time,
          open: lastCurr.open,
          high: lastCurr.high,
          low: lastCurr.low,
          close: lastCurr.close,
        });

        volumeSeriesRef.current.update({
          time: lastCurr.time,
          value: lastCurr.volume,
          color: lastCurr.close >= lastCurr.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
        });

        lastCandlesRef.current = curr;
      } catch {
        // Fallback to setData if incremental update failed
        candleSeriesRef.current.setData(
          curr.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
        lastCandlesRef.current = curr;
      }
    } else {
      // Full data replacement (symbol or timeframe changed)
      const sortedCandles = [...curr]
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

      candleSeriesRef.current.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeriesRef.current.setData(
        sortedCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
        }))
      );

      if (ema21SeriesRef.current) ema21SeriesRef.current.setData(calcEMA(sortedCandles, 21, precision));
      if (ema50SeriesRef.current) ema50SeriesRef.current.setData(calcEMA(sortedCandles, 50, precision));
      if (ema200SeriesRef.current) ema200SeriesRef.current.setData(calcEMA(sortedCandles, 200, precision));

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }

      lastCandlesRef.current = sortedCandles;
    }
  }, [candles]);

  const latestCandle = candles[candles.length - 1];

  return (
    <div className="w-full relative">
      <div ref={chartContainerRef} className="w-full rounded overflow-hidden" />
      
      {/* Real-time Ticking Indicator HUD */}
      {latestCandle && (
        <div className="absolute top-2 left-3 z-10 flex items-center gap-2 px-2 py-0.5 bg-[#0B0E17]/85 backdrop-blur-sm border border-slate-800 rounded text-[11px] font-mono text-slate-300 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">O:</span>
          <span>{isForex ? latestCandle.open.toFixed(4) : latestCandle.open.toFixed(2)}</span>
          <span className="text-slate-400">H:</span>
          <span className="text-emerald-400">{isForex ? latestCandle.high.toFixed(4) : latestCandle.high.toFixed(2)}</span>
          <span className="text-slate-400">L:</span>
          <span className="text-rose-400">{isForex ? latestCandle.low.toFixed(4) : latestCandle.low.toFixed(2)}</span>
          <span className="text-slate-400">C:</span>
          <span className={latestCandle.close >= latestCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {isForex ? latestCandle.close.toFixed(4) : latestCandle.close.toFixed(2)}
          </span>
        </div>
      )}

      {/* Astro Overlay Legend */}
      {indicators.showAstroEvents && (
        <div className="absolute top-2 right-14 z-10 hidden sm:flex items-center gap-2.5 px-2.5 py-1 bg-[#0B0E17]/90 backdrop-blur-sm border border-purple-500/40 rounded text-[10px] font-mono text-slate-300 pointer-events-none shadow-sm">
          <span className="text-purple-400 font-bold flex items-center gap-1">
            <span>✨</span> ASTRO OVERLAY:
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <span>🌕</span> Full Moon
          </span>
          <span className="flex items-center gap-1 text-indigo-300">
            <span>🌑</span> New Moon
          </span>
          <span className="flex items-center gap-1 text-pink-300">
            <span>☿</span> Merc Rx
          </span>
        </div>
      )}
    </div>
  );
};
