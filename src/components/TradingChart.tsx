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

  // Helper for Exponential Moving Average
  function calcEMA(data: CandleData[], period: number) {
    if (data.length === 0) return [];
    const k = 2 / (period + 1);
    const res: { time: UTCTimestamp; value: number }[] = [];
    let ema = data[0].close;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema = data[i].close;
      } else {
        ema = data[i].close * k + ema * (1 - k);
      }
      if (i >= period - 1) {
        res.push({ time: data[i].time, value: Math.round(ema * 100) / 100 });
      }
    }
    return res;
  }

  // Helper for Bollinger Bands (period 20, mult 2)
  function calcBB(data: CandleData[], period = 20, mult = 2) {
    const upper: { time: UTCTimestamp; value: number }[] = [];
    const lower: { time: UTCTimestamp; value: number }[] = [];
    const middle: { time: UTCTimestamp; value: number }[] = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b.close, 0);
      const mean = sum / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
      const std = Math.sqrt(variance);

      middle.push({ time: data[i].time, value: mean });
      upper.push({ time: data[i].time, value: mean + mult * std });
      lower.push({ time: data[i].time, value: mean - mult * std });
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

    if (candles.length === 0) return;

    // Sort and deduplicate candles
    const sortedCandles = [...candles]
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((c, idx, arr) => idx === 0 || c.time > arr[idx - 1].time);

    // 1. Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
    });
    candleSeriesRef.current = candleSeries;

    candleSeries.setData(
      sortedCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // 2. Add Volume Series at bottom
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

    volumeSeries.setData(
      sortedCandles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
      }))
    );

    // 3. Technical Indicators
    // EMA 21
    if (indicators.showEma21) {
      const ema21 = chart.addSeries(LineSeries, {
        color: '#06B6D4',
        lineWidth: 1,
        title: 'EMA 21',
      });
      ema21.setData(calcEMA(sortedCandles, 21));
      ema21SeriesRef.current = ema21;
    }

    // EMA 50
    if (indicators.showEma50) {
      const ema50 = chart.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        title: 'EMA 50',
      });
      ema50.setData(calcEMA(sortedCandles, 50));
      ema50SeriesRef.current = ema50;
    }

    // EMA 200
    if (indicators.showEma200) {
      const ema200 = chart.addSeries(LineSeries, {
        color: '#A855F7',
        lineWidth: 2,
        title: 'EMA 200',
      });
      ema200.setData(calcEMA(sortedCandles, 200));
      ema200SeriesRef.current = ema200;
    }

    // Bollinger Bands
    if (indicators.showBollinger) {
      const { upper, lower, middle } = calcBB(sortedCandles, 20, 2);
      const upperSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.65)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Upper',
      });
      const lowerSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.65)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: 'BB Lower',
      });
      const midSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.35)',
        lineWidth: 1,
        title: 'BB Basis',
      });

      upperSeries.setData(upper);
      lowerSeries.setData(lower);
      midSeries.setData(middle);
    }

    // 4. Support & Resistance price lines
    if (indicators.showSRLevels && supportLevel && resistanceLevel) {
      candleSeries.createPriceLine({
        price: resistanceLevel,
        color: '#F43F5E',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Major Resistance',
      });

      candleSeries.createPriceLine({
        price: supportLevel,
        color: '#10B981',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Major Support',
      });
    }

    // 5. Setup Lines: Stop Loss & Profit Targets
    if (stopLoss) {
      candleSeries.createPriceLine({
        price: stopLoss,
        color: '#E11D48',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'Invalidation (SL)',
      });
    }

    if (target1) {
      candleSeries.createPriceLine({
        price: target1,
        color: '#34D399',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Target 1 (R:R 1:1.3)',
      });
    }

    if (target2) {
      candleSeries.createPriceLine({
        price: target2,
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

    // Check if this is a live tick update (same count or +1)
    const isTickUpdate =
      prev.length > 0 &&
      (curr.length === prev.length || curr.length === prev.length + 1) &&
      Math.abs((curr[0]?.time as number) - (prev[0]?.time as number)) < 3600;

    if (isTickUpdate) {
      const lastCandle = curr[curr.length - 1];
      // Ultra-fast lightweight-charts series update
      candleSeriesRef.current.update({
        time: lastCandle.time,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
      });

      volumeSeriesRef.current.update({
        time: lastCandle.time,
        value: lastCandle.volume,
        color: lastCandle.close >= lastCandle.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
      });

      lastCandlesRef.current = curr;
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

      if (ema21SeriesRef.current) ema21SeriesRef.current.setData(calcEMA(sortedCandles, 21));
      if (ema50SeriesRef.current) ema50SeriesRef.current.setData(calcEMA(sortedCandles, 50));
      if (ema200SeriesRef.current) ema200SeriesRef.current.setData(calcEMA(sortedCandles, 200));

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
          <span>{latestCandle.open}</span>
          <span className="text-slate-400">H:</span>
          <span className="text-emerald-400">{latestCandle.high}</span>
          <span className="text-slate-400">L:</span>
          <span className="text-rose-400">{latestCandle.low}</span>
          <span className="text-slate-400">C:</span>
          <span className={latestCandle.close >= latestCandle.open ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {latestCandle.close}
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
